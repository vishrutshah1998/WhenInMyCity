'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { requireAuth } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'

// ---------------------------------------------------------------------------
// Initiate Google Calendar OAuth
// ---------------------------------------------------------------------------

/**
 * Builds a Google OAuth2 URL requesting read-only calendar scope and
 * redirects the user there. A CSRF state token (adda_id:uuid) is stored
 * in a short-lived httpOnly cookie so the callback can validate it.
 *
 * Requires GOOGLE_CLIENT_ID env var. Falls back with an error redirect
 * if the env var is absent so development is not silently broken.
 */
export async function initiateCalendarSync(): Promise<void> {
  if (!process.env.GOOGLE_CLIENT_ID) {
    redirect('/business/venue/calendar?error=gcal_not_configured')
  }

  const { user } = await requireAuth('/business/venue/calendar')
  const admin = createAdminClient()

  const { data: adda } = await admin
    .from('adda_profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!adda) redirect('/business/venue/onboard')

  const state = `${adda.id}:${crypto.randomUUID()}`

  const cookieStore = await cookies()
  cookieStore.set('gcal_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600, // 10 minutes
    path: '/',
    sameSite: 'lax',
  })

  const params = new URLSearchParams({
    client_id:     process.env.GOOGLE_CLIENT_ID,
    redirect_uri:  `${process.env.NEXT_PUBLIC_APP_URL}/api/google/calendar/callback`,
    response_type: 'code',
    scope:         'https://www.googleapis.com/auth/calendar.readonly',
    access_type:   'offline',
    prompt:        'consent',
    state,
  })

  redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
}

// ---------------------------------------------------------------------------
// Disconnect Google Calendar
// ---------------------------------------------------------------------------

/**
 * Clears the stored refresh token and marks the adda as disconnected.
 * Returns { error } on failure so the caller can surface it in the UI.
 */
export async function disconnectCalendarSync(): Promise<{ error: string | null }> {
  const { user } = await requireAuth('/business/venue/calendar')
  const admin = createAdminClient()

  const { error } = await admin
    .from('adda_profiles')
    .update({
      google_calendar_connected:     false,
      google_calendar_refresh_token: null,
    })
    .eq('auth_user_id', user.id)

  if (error) {
    console.error('[disconnectCalendarSync]', error.message)
    return { error: 'Failed to disconnect. Please try again.' }
  }

  return { error: null }
}
