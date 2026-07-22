import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncInstagramMedia, getInstagramAccountType } from '@/app/actions/instagram'

const CODE_EXCHANGE_URL = 'https://api.instagram.com/oauth/access_token'
const GRAPH_BASE_URL    = 'https://graph.instagram.com'

/**
 * GET /api/instagram/callback
 *
 * Handles the Instagram Login OAuth callback. Validates the CSRF state
 * cookie, exchanges the code for a short-lived token, exchanges that for a
 * 60-day long-lived token, checks the account type (rejecting Personal
 * accounts before ever persisting their token — they can't use
 * graph.instagram.com/me/media), encrypts and stores it on user_profiles,
 * then triggers an immediate media sync so the instagram_feed block
 * populates right away.
 *
 * Required env vars: INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const oauthError = searchParams.get('error')

  const settingsPage = new URL('/dashboard/profile/settings', origin)

  if (oauthError) {
    console.error('[instagram/callback] OAuth denied:', oauthError)
    settingsPage.searchParams.set('error', 'instagram_denied')
    return NextResponse.redirect(settingsPage)
  }

  if (!code || !state) {
    settingsPage.searchParams.set('error', 'instagram_invalid')
    return NextResponse.redirect(settingsPage)
  }

  // ── CSRF check ──────────────────────────────────────────────────────────
  const cookieStore = await cookies()
  const storedState = cookieStore.get('ig_oauth_state')?.value
  cookieStore.delete('ig_oauth_state')

  if (!storedState || storedState !== state) {
    console.error('[instagram/callback] state mismatch', { storedState, state })
    settingsPage.searchParams.set('error', 'instagram_invalid')
    return NextResponse.redirect(settingsPage)
  }

  const profileId = storedState.split(':')[0]
  if (!profileId) {
    settingsPage.searchParams.set('error', 'instagram_invalid')
    return NextResponse.redirect(settingsPage)
  }

  // ── Token exchange ───────────────────────────────────────────────────────
  if (!process.env.INSTAGRAM_APP_ID || !process.env.INSTAGRAM_APP_SECRET) {
    settingsPage.searchParams.set('error', 'instagram_not_configured')
    return NextResponse.redirect(settingsPage)
  }

  let longLivedToken: string | null = null
  let expiresIn = 60 * 24 * 60 * 60 // seconds, default to Meta's stated 60-day window
  let instagramUserId: string | null = null

  try {
    const shortLivedRes = await fetch(CODE_EXCHANGE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     process.env.INSTAGRAM_APP_ID,
        client_secret: process.env.INSTAGRAM_APP_SECRET,
        redirect_uri:  `${process.env.NEXT_PUBLIC_APP_URL}/api/instagram/callback`,
        grant_type:    'authorization_code',
      }),
    })

    if (!shortLivedRes.ok) {
      const body = await shortLivedRes.text()
      console.error('[instagram/callback] code exchange failed', shortLivedRes.status, body)
      settingsPage.searchParams.set('error', 'instagram_token_failed')
      return NextResponse.redirect(settingsPage)
    }

    const shortLivedData = await shortLivedRes.json() as { access_token: string; user_id: string }
    instagramUserId = shortLivedData.user_id

    const longLivedParams = new URLSearchParams({
      grant_type:    'ig_exchange_token',
      client_secret: process.env.INSTAGRAM_APP_SECRET,
      access_token:  shortLivedData.access_token,
    })

    const longLivedRes = await fetch(`${GRAPH_BASE_URL}/access_token?${longLivedParams}`)

    if (!longLivedRes.ok) {
      const body = await longLivedRes.text()
      console.error('[instagram/callback] long-lived exchange failed', longLivedRes.status, body)
      settingsPage.searchParams.set('error', 'instagram_token_failed')
      return NextResponse.redirect(settingsPage)
    }

    const longLivedData = await longLivedRes.json() as { access_token: string; expires_in: number }
    longLivedToken = longLivedData.access_token
    expiresIn = longLivedData.expires_in
  } catch (err) {
    console.error('[instagram/callback] fetch error', err)
    settingsPage.searchParams.set('error', 'instagram_token_failed')
    return NextResponse.redirect(settingsPage)
  }

  if (!longLivedToken) {
    settingsPage.searchParams.set('error', 'instagram_token_failed')
    return NextResponse.redirect(settingsPage)
  }

  // ── Account-type gate ────────────────────────────────────────────────────
  // Personal accounts can authorize this flow but graph.instagram.com/me/media
  // doesn't work for them — reject up front rather than let someone connect
  // and discover nothing works later. Nothing is persisted for a rejected
  // account: no token, no encryption call.
  const accountType = await getInstagramAccountType(longLivedToken)

  if (accountType !== 'BUSINESS' && accountType !== 'MEDIA_CREATOR') {
    settingsPage.searchParams.set('error', 'instagram_personal_account')
    return NextResponse.redirect(settingsPage)
  }

  // ── Encrypt + persist ────────────────────────────────────────────────────
  const admin = createAdminClient()

  const { data: encrypted, error: encryptError } = await admin.rpc('encrypt_instagram_token', {
    p_token: longLivedToken,
  })

  if (encryptError || !encrypted) {
    console.error('[instagram/callback] encryption failed', encryptError?.message)
    settingsPage.searchParams.set('error', 'instagram_save_failed')
    return NextResponse.redirect(settingsPage)
  }

  const { error: dbError } = await admin
    .from('user_profiles')
    .update({
      instagram_connected: true,
      instagram_access_token_encrypted: encrypted,
      instagram_token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
      instagram_account_type: accountType,
      instagram_last_refresh_attempt_at: new Date().toISOString(),
      instagram_user_id: instagramUserId,
    })
    .eq('id', profileId)

  if (dbError) {
    console.error('[instagram/callback] db update failed', dbError.message)
    settingsPage.searchParams.set('error', 'instagram_save_failed')
    return NextResponse.redirect(settingsPage)
  }

  // Populate the instagram_feed block's media cache immediately rather than
  // waiting for the creator's next dashboard visit. Best-effort —
  // syncInstagramMedia never throws, and a failure here doesn't undo the
  // successful connection (the next on-demand refresh will retry).
  await syncInstagramMedia(profileId)

  settingsPage.searchParams.set('instagram', 'connected')
  return NextResponse.redirect(settingsPage)
}
