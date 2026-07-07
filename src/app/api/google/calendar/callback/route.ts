import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/google/calendar/callback
 *
 * Handles the Google OAuth2 callback for Calendar access.
 * Validates the CSRF state cookie, exchanges the code for tokens,
 * stores the refresh_token in venue_profiles, and redirects back to
 * the calendar page.
 *
 * Required env vars: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const oauthError = searchParams.get('error')

  const calendarPage = new URL('/business/venue/calendar', origin)

  if (oauthError) {
    console.error('[gcal/callback] OAuth denied:', oauthError)
    calendarPage.searchParams.set('error', 'gcal_denied')
    return NextResponse.redirect(calendarPage)
  }

  if (!code || !state) {
    calendarPage.searchParams.set('error', 'gcal_invalid')
    return NextResponse.redirect(calendarPage)
  }

  // ── CSRF check ──────────────────────────────────────────────────────────
  const cookieStore = await cookies()
  const storedState = cookieStore.get('gcal_oauth_state')?.value
  cookieStore.delete('gcal_oauth_state')

  if (!storedState || storedState !== state) {
    console.error('[gcal/callback] state mismatch', { storedState, state })
    calendarPage.searchParams.set('error', 'gcal_invalid')
    return NextResponse.redirect(calendarPage)
  }

  const venueId = storedState.split(':')[0]
  if (!venueId) {
    calendarPage.searchParams.set('error', 'gcal_invalid')
    return NextResponse.redirect(calendarPage)
  }

  // ── Token exchange ───────────────────────────────────────────────────────
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    calendarPage.searchParams.set('error', 'gcal_not_configured')
    return NextResponse.redirect(calendarPage)
  }

  let refreshToken: string | null = null

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri:  `${process.env.NEXT_PUBLIC_APP_URL}/api/google/calendar/callback`,
        grant_type:    'authorization_code',
      }),
    })

    if (!tokenRes.ok) {
      const body = await tokenRes.text()
      console.error('[gcal/callback] token exchange failed', tokenRes.status, body)
      calendarPage.searchParams.set('error', 'gcal_token_failed')
      return NextResponse.redirect(calendarPage)
    }

    const tokenData = await tokenRes.json() as {
      access_token:  string
      refresh_token?: string
      expires_in:    number
      token_type:    string
    }

    refreshToken = tokenData.refresh_token ?? null
  } catch (err) {
    console.error('[gcal/callback] fetch error', err)
    calendarPage.searchParams.set('error', 'gcal_token_failed')
    return NextResponse.redirect(calendarPage)
  }

  // ── Persist to DB ────────────────────────────────────────────────────────
  const admin = createAdminClient()

  const { error: dbError } = await admin
    .from('venue_profiles')
    .update({
      google_calendar_connected:     true,
      google_calendar_refresh_token: refreshToken,
    })
    .eq('id', venueId)

  if (dbError) {
    console.error('[gcal/callback] db update failed', dbError.message)
    calendarPage.searchParams.set('error', 'gcal_save_failed')
    return NextResponse.redirect(calendarPage)
  }

  calendarPage.searchParams.set('gcal', 'connected')
  return NextResponse.redirect(calendarPage)
}
