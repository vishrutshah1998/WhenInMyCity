'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { requireAuth } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'

// ---------------------------------------------------------------------------
// Instagram Connect — OAuth (Instagram API with Instagram Login)
// ---------------------------------------------------------------------------
//
// A creator connects their own Instagram Business/Creator account via OAuth
// so WIMC can read their own media via graph.instagram.com/me/media. This
// powers two things:
//   1. The instagram_feed block (src/lib/constants/blocks.ts) — a live grid
//      of the creator's recent posts, refreshed on-demand (see
//      refreshInstagramTokenIfNeeded below).
//   2. Single-post instagram_embed/instagram_post blocks now render via
//      Instagram's public embed.js widget (no connection required for
//      those — see BlockRenderer.tsx / PublicProfilePage.tsx) — the
//      connected-account media sync exists only for the feed block.
//
// This mirrors src/app/actions/venue-calendar.ts's Google Calendar OAuth
// flow (same CSRF-state-cookie shape), but stores the token pgcrypto-
// encrypted (mirroring encrypt_upi_vpa / get_decrypted_upi_vpa) rather than
// the plaintext the Calendar flow left in place.
//
// Requires INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET env vars from a
// manually-created Meta Developer App. Until that app passes App Review for
// the instagram_business_basic scope, only Instagram accounts added as
// testers in the App Dashboard can complete this flow.

const AUTHORIZE_URL  = 'https://api.instagram.com/oauth/authorize'
const GRAPH_BASE_URL = 'https://graph.instagram.com'

export type InstagramAccountType = 'BUSINESS' | 'MEDIA_CREATOR' | 'PERSONAL'

type InstagramMediaType = 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'

interface InstagramMediaItem {
  id: string
  media_type: InstagramMediaType
  media_url?: string
  thumbnail_url?: string
  permalink: string
}

// ---------------------------------------------------------------------------
// Initiate / disconnect
// ---------------------------------------------------------------------------

/**
 * Builds the Instagram Login authorization URL and redirects the user
 * there. A CSRF state token (profile_id:uuid) is stored in a short-lived
 * httpOnly cookie so the callback can validate it.
 */
export async function initiateInstagramConnect(): Promise<void> {
  if (!process.env.INSTAGRAM_APP_ID) {
    redirect('/dashboard/profile/settings?error=instagram_not_configured')
  }

  const { user } = await requireAuth('/dashboard/profile/settings')

  const state = `${user.id}:${crypto.randomUUID()}`

  const cookieStore = await cookies()
  cookieStore.set('ig_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600, // 10 minutes
    path: '/',
    sameSite: 'lax',
  })

  const params = new URLSearchParams({
    client_id:     process.env.INSTAGRAM_APP_ID,
    redirect_uri:  `${process.env.NEXT_PUBLIC_APP_URL}/api/instagram/callback`,
    response_type: 'code',
    scope:         'instagram_business_basic',
    state,
  })

  redirect(`${AUTHORIZE_URL}?${params}`)
}

/**
 * Popup-mode variant of initiateInstagramConnect. A server action can't
 * hand a URL back to window.open() after the fact (redirect() never
 * returns), and window.open() itself must be called synchronously inside
 * the click handler to avoid popup blockers — so this returns the
 * authorize URL instead of redirecting, letting the caller open the popup
 * first and then navigate it here once this resolves. State carries a
 * third ":popup" segment (profileId:uuid:popup) so callback/route.ts knows
 * to respond with a postMessage page instead of a full-page redirect;
 * initiateInstagramConnect's 2-segment state and full-redirect behavior
 * are untouched.
 */
export async function getInstagramPopupAuthorizeUrl(): Promise<{ url: string } | { error: string }> {
  if (!process.env.INSTAGRAM_APP_ID) {
    return { error: 'instagram_not_configured' }
  }

  const { user } = await requireAuth('/dashboard/profile/settings')

  const state = `${user.id}:${crypto.randomUUID()}:popup`

  const cookieStore = await cookies()
  cookieStore.set('ig_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600, // 10 minutes
    path: '/',
    sameSite: 'lax',
  })

  const params = new URLSearchParams({
    client_id:     process.env.INSTAGRAM_APP_ID,
    redirect_uri:  `${process.env.NEXT_PUBLIC_APP_URL}/api/instagram/callback`,
    response_type: 'code',
    scope:         'instagram_business_basic',
    state,
  })

  return { url: `${AUTHORIZE_URL}?${params}` }
}

/**
 * Wipes all Instagram Connect state for a profile — token, expiry, account
 * type, and cached thumbnails. Shared by disconnectInstagram (user-initiated,
 * keyed by the authenticated user's own id) and the deauthorize/data-deletion
 * webhook routes (Meta-initiated, keyed by instagram_user_id instead — see
 * src/app/api/instagram/deauthorize and .../data-deletion).
 */
export async function clearInstagramConnection(profileId: string): Promise<{ error: string | null }> {
  const admin = createAdminClient()

  const { error } = await admin
    .from('user_profiles')
    .update({
      instagram_connected: false,
      instagram_access_token_encrypted: null,
      instagram_token_expires_at: null,
      instagram_account_type: null,
      instagram_last_refresh_attempt_at: null,
      instagram_user_id: null,
    })
    .eq('id', profileId)

  if (error) {
    console.error('[clearInstagramConnection]', error.message)
    return { error: error.message }
  }

  await admin.from('instagram_thumbnail_cache').delete().eq('profile_id', profileId)

  return { error: null }
}

/**
 * Clears the stored token and marks the profile as disconnected.
 * Returns { error } on failure so the caller can surface it in the UI.
 */
export async function disconnectInstagram(): Promise<{ error: string | null }> {
  const { user } = await requireAuth('/dashboard/profile/settings')

  const { error } = await clearInstagramConnection(user.id)
  if (error) {
    return { error: 'Failed to disconnect. Please try again.' }
  }

  return { error: null }
}

// ---------------------------------------------------------------------------
// Account-type detection — called once from the OAuth callback, right after
// token exchange, so we can reject Personal accounts before ever persisting
// a token for them (Personal accounts can't use graph.instagram.com/me/media).
// ---------------------------------------------------------------------------

export async function getInstagramAccountType(accessToken: string): Promise<InstagramAccountType | null> {
  try {
    const res = await fetch(
      `${GRAPH_BASE_URL}/me?fields=account_type&access_token=${encodeURIComponent(accessToken)}`,
      { signal: AbortSignal.timeout(8000) },
    )

    if (!res.ok) {
      console.warn('[getInstagramAccountType] lookup failed', res.status)
      return null
    }

    const body = await res.json() as { account_type?: string }
    if (body.account_type === 'BUSINESS' || body.account_type === 'MEDIA_CREATOR' || body.account_type === 'PERSONAL') {
      return body.account_type
    }
    return null
  } catch (err) {
    console.error('[getInstagramAccountType] error', err)
    return null
  }
}

// ---------------------------------------------------------------------------
// Media sync — called from the OAuth callback and refreshInstagramTokenIfNeeded
// ---------------------------------------------------------------------------

/**
 * Refreshes the stored token if it's refresh-eligible, fetches the
 * connected account's recent media, and upserts it into
 * `instagram_thumbnail_cache` (scoped to this profile, ordered by recency)
 * for the instagram_feed block. Every failure mode is caught and logged —
 * this never throws, since it's called from best-effort paths where a
 * broken sync must not break the surrounding request.
 */
export async function syncInstagramMedia(profileId: string): Promise<void> {
  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('user_profiles')
    .select('instagram_token_expires_at')
    .eq('id', profileId)
    .maybeSingle()

  if (!profile) return

  const { data: token, error: decryptError } = await admin.rpc('get_decrypted_instagram_token', {
    p_profile_id: profileId,
  })

  if (decryptError || !token) {
    console.warn('[syncInstagramMedia] no token available', { profileId, err: decryptError?.message })
    return
  }

  let activeToken = token

  // Refresh if the token is at least 24h old (Meta's minimum) and not yet expired.
  const expiresAt = profile.instagram_token_expires_at ? new Date(profile.instagram_token_expires_at) : null
  const issuedAt  = expiresAt ? new Date(expiresAt.getTime() - 60 * 24 * 60 * 60 * 1000) : null
  const tokenAgeMs = issuedAt ? Date.now() - issuedAt.getTime() : Infinity

  if (expiresAt && expiresAt.getTime() > Date.now() && tokenAgeMs >= 24 * 60 * 60 * 1000) {
    try {
      const refreshRes = await fetch(
        `${GRAPH_BASE_URL}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(activeToken)}`,
        { signal: AbortSignal.timeout(8000) },
      )

      if (refreshRes.ok) {
        const refreshed = await refreshRes.json() as { access_token: string; expires_in: number }
        activeToken = refreshed.access_token

        const { data: encrypted, error: encryptError } = await admin.rpc('encrypt_instagram_token', {
          p_token: activeToken,
        })

        if (!encryptError && encrypted) {
          await admin
            .from('user_profiles')
            .update({
              instagram_access_token_encrypted: encrypted,
              instagram_token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
            })
            .eq('id', profileId)
        }
      } else {
        console.warn('[syncInstagramMedia] token refresh failed', { profileId, status: refreshRes.status })
      }
    } catch (err) {
      console.error('[syncInstagramMedia] refresh error', { profileId, err })
      // Continue with the pre-refresh token — it may still be valid.
    }
  }

  // ── Fetch media ────────────────────────────────────────────────────────
  let items: InstagramMediaItem[]
  try {
    const mediaRes = await fetch(
      `${GRAPH_BASE_URL}/me/media?fields=id,media_type,media_url,thumbnail_url,permalink&access_token=${encodeURIComponent(activeToken)}`,
      { signal: AbortSignal.timeout(8000) },
    )

    if (!mediaRes.ok) {
      console.warn('[syncInstagramMedia] media fetch failed', { profileId, status: mediaRes.status })
      return
    }

    const body = await mediaRes.json() as { data?: InstagramMediaItem[] }
    items = body.data ?? []
  } catch (err) {
    console.error('[syncInstagramMedia] media fetch error', { profileId, err })
    return
  }

  // ── Upsert recent media, most recent first ─────────────────────────────
  const rows = items
    .map((item, index) => ({
      post_url: item.permalink,
      thumbnail_url: item.media_type === 'VIDEO' ? item.thumbnail_url : item.media_url,
      cached_at: new Date().toISOString(),
      profile_id: profileId,
      sort_order: index,
    }))
    .filter((row): row is { post_url: string; thumbnail_url: string; cached_at: string; profile_id: string; sort_order: number } => !!row.thumbnail_url)

  if (rows.length === 0) return

  const { error: upsertError } = await admin
    .from('instagram_thumbnail_cache')
    .upsert(rows, { onConflict: 'post_url' })

  if (upsertError) {
    console.error('[syncInstagramMedia] cache upsert failed', { profileId, err: upsertError.message })
  }
}

// ---------------------------------------------------------------------------
// On-demand refresh — replaces the daily cron. Called (best-effort, never
// throws) from server components that render for the connected creator
// themselves (Studio, profile settings) — never from the public page, so a
// broken/expired connection can't trigger a live Meta call on every visitor.
//
// Guarded on two conditions so a broken connection backs off instead of
// retrying Meta on every dashboard load:
//   - only bother when the token is actually within 7 days of expiry
//   - only attempt once per 6 hours (instagram_last_refresh_attempt_at)
// ---------------------------------------------------------------------------

const REFRESH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000
const RETRY_BACKOFF_MS  = 6 * 60 * 60 * 1000

export async function refreshInstagramTokenIfNeeded(profileId: string): Promise<void> {
  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('user_profiles')
    .select('instagram_connected, instagram_token_expires_at, instagram_last_refresh_attempt_at')
    .eq('id', profileId)
    .maybeSingle()

  if (!profile?.instagram_connected) return

  const expiresAt   = profile.instagram_token_expires_at ? new Date(profile.instagram_token_expires_at) : null
  const lastAttempt = profile.instagram_last_refresh_attempt_at ? new Date(profile.instagram_last_refresh_attempt_at) : null

  const nearExpiry = !expiresAt || expiresAt.getTime() - Date.now() < REFRESH_WINDOW_MS
  const cooledDown = !lastAttempt || Date.now() - lastAttempt.getTime() > RETRY_BACKOFF_MS

  if (!nearExpiry || !cooledDown) return

  await admin
    .from('user_profiles')
    .update({ instagram_last_refresh_attempt_at: new Date().toISOString() })
    .eq('id', profileId)

  await syncInstagramMedia(profileId)
}

// ---------------------------------------------------------------------------
// Feed lookup — called from the instagram_feed block's render path
// ---------------------------------------------------------------------------

/**
 * Returns the connected creator's most recent synced media, most recent
 * first. Reads only from the cache populated by syncInstagramMedia — never
 * makes a live Meta call itself, so it's safe to call from public page render.
 */
export async function getInstagramFeedMedia(
  profileId: string,
  limit = 9,
): Promise<Array<{ post_url: string; thumbnail_url: string }>> {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('instagram_thumbnail_cache')
    .select('post_url, thumbnail_url')
    .eq('profile_id', profileId)
    .order('sort_order', { ascending: true })
    .limit(limit)

  if (error) {
    console.error('[getInstagramFeedMedia] lookup failed', error.message)
    return []
  }

  return data ?? []
}

/**
 * Combined connection-status + media lookup for the instagram_feed block's
 * Studio preview and editor form (called client-side, so it needs both
 * pieces in one round trip — never touches the encrypted token).
 */
export async function getInstagramFeedStatus(profileId: string): Promise<{
  connected: boolean
  media: Array<{ post_url: string; thumbnail_url: string }>
}> {
  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('user_profiles')
    .select('instagram_connected')
    .eq('id', profileId)
    .maybeSingle()

  const connected = profile?.instagram_connected ?? false
  const media = connected ? await getInstagramFeedMedia(profileId) : []

  return { connected, media }
}
