'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { requireAuth } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { hasOverlap } from '@/lib/venue/availabilityOverlap'
import { fromPgTime } from '@/lib/venue/timeFormat'

// ---------------------------------------------------------------------------
// Calendar event types (relocated from the deleted mock file — real data only)
// ---------------------------------------------------------------------------

export type BookingStatus = 'confirmed' | 'pending' | 'blocked' | 'external' | 'buffer'

/** Client-facing shape (used by calendar UI components) — start/end are real Date objects. */
export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  status: BookingStatus
  source: 'proposal' | 'block' | 'google'
  creatorName?: string
  isLocked: boolean
  display?: 'background'
  bufferFor?: string
}

/** Wire shape returned by server actions — start/end are ISO strings (Dates don't survive the RPC boundary). */
export type CalendarEventDTO = Omit<CalendarEvent, 'start' | 'end'> & { start: string; end: string }

export interface VenueBufferConfig {
  bufferBeforeMinutes: number
  bufferAfterMinutes: number
}

// ---------------------------------------------------------------------------
// Initiate Google Calendar OAuth
// ---------------------------------------------------------------------------

/**
 * Builds a Google OAuth2 URL requesting read-only calendar scope and
 * redirects the user there. A CSRF state token (venue_id:uuid) is stored
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

  const { data: venue } = await admin
    .from('venue_profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!venue) redirect('/business/venue/onboard')

  const state = `${venue.id}:${crypto.randomUUID()}`

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
 * Clears the stored refresh token and marks the venue as disconnected.
 * Returns { error } on failure so the caller can surface it in the UI.
 */
export async function disconnectCalendarSync(): Promise<{ error: string | null }> {
  const { user } = await requireAuth('/business/venue/calendar')
  const admin = createAdminClient()

  const { error } = await admin
    .from('venue_profiles')
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

// ---------------------------------------------------------------------------
// Ownership helper
// ---------------------------------------------------------------------------

async function resolveOwnedVenue(
  userId: string,
  venueId: string,
  admin: ReturnType<typeof createAdminClient>,
): Promise<{ id: string; buffer_before_minutes: number; buffer_after_minutes: number; google_calendar_connected: boolean; google_calendar_refresh_token: string | null } | null> {
  const { data } = await admin
    .from('venue_profiles')
    .select('id, buffer_before_minutes, buffer_after_minutes, google_calendar_connected, google_calendar_refresh_token')
    .eq('id', venueId)
    .eq('auth_user_id', userId)
    .maybeSingle()
  return data ?? null
}

function toLocalDateTime(date: string, time: string): string {
  return new Date(`${date}T${fromPgTime(time)}:00+05:30`).toISOString()
}

// ---------------------------------------------------------------------------
// getVenueCalendarEvents
// ---------------------------------------------------------------------------

/**
 * Fetches real calendar events for a venue over a date range: confirmed/
 * pending bookings and venue-created blocks from venue_availability, joined
 * with maker_venue_proposals for creator names, plus (if connected) real
 * Google Calendar busy events merged in as read-only 'external' entries.
 */
export async function getVenueCalendarEvents(
  venueId: string,
  rangeStart: string,
  rangeEnd: string,
): Promise<{ events: CalendarEventDTO[]; bufferConfig: VenueBufferConfig; error: string | null }> {
  const { user } = await requireAuth('/business/venue/calendar')
  const admin = createAdminClient()
  const defaultBuffer: VenueBufferConfig = { bufferBeforeMinutes: 30, bufferAfterMinutes: 45 }

  const venue = await resolveOwnedVenue(user.id, venueId, admin)
  if (!venue) return { events: [], bufferConfig: defaultBuffer, error: 'Venue not found or you do not own this profile.' }

  const bufferConfig: VenueBufferConfig = {
    bufferBeforeMinutes: venue.buffer_before_minutes,
    bufferAfterMinutes: venue.buffer_after_minutes,
  }

  const { data: rows, error } = await admin
    .from('venue_availability')
    .select('id, date, start_time, end_time, status, notes')
    .eq('venue_id', venueId)
    .gte('date', rangeStart)
    .lte('date', rangeEnd)
    .in('status', ['confirmed', 'pending', 'blocked'])

  if (error) {
    console.error('[getVenueCalendarEvents]', error.message)
    return { events: [], bufferConfig, error: 'Failed to load calendar events.' }
  }

  // Join accepted/pending proposals in range to get creator names for real bookings
  const { data: proposals } = await admin
    .from('maker_venue_proposals')
    .select('proposed_date, start_time, end_time, event_title, maker_id, status')
    .eq('venue_id', venueId)
    .gte('proposed_date', rangeStart)
    .lte('proposed_date', rangeEnd)
    .in('status', ['accepted', 'counter_offered', 'pending'])

  const makerIds = [...new Set((proposals ?? []).map(p => p.maker_id))]
  const { data: makers } = makerIds.length
    ? await admin.from('user_profiles').select('id, display_name').in('id', makerIds)
    : { data: [] as { id: string; display_name: string }[] }
  const makerNameMap = new Map((makers ?? []).map(m => [m.id, m.display_name]))

  const proposalMap = new Map(
    (proposals ?? [])
      .filter(p => p.start_time && p.end_time)
      .map(p => [`${p.proposed_date}|${p.start_time}|${p.end_time}`, p]),
  )

  const events: CalendarEventDTO[] = (rows ?? [])
    .filter(r => r.start_time && r.end_time)
    .map(r => {
      const matched = proposalMap.get(`${r.date}|${r.start_time}|${r.end_time}`)
      const creatorName = matched ? makerNameMap.get(matched.maker_id) : undefined
      const title = r.status === 'blocked'
        ? (r.notes ?? 'Blocked')
        : matched
          ? `${creatorName ?? 'Creator'} · ${matched.event_title}`
          : (r.notes ?? 'Booking')

      return {
        id: r.id,
        title,
        start: toLocalDateTime(r.date, r.start_time as string),
        end: toLocalDateTime(r.date, r.end_time as string),
        status: r.status as BookingStatus,
        source: 'block' as const,
        creatorName,
        isLocked: r.status !== 'blocked',
      }
    })

  // Real Google Calendar busy events (best-effort — never fails the whole page)
  if (venue.google_calendar_connected && venue.google_calendar_refresh_token) {
    const googleEvents = await fetchGoogleCalendarEvents(
      venue.google_calendar_refresh_token,
      rangeStart,
      rangeEnd,
      admin,
      venueId,
    )
    events.push(...googleEvents)
  }

  return { events, bufferConfig, error: null }
}

// ---------------------------------------------------------------------------
// blockVenueTime / unblockVenueTime / moveVenueBlock
// ---------------------------------------------------------------------------

export async function blockVenueTime(
  venueId: string,
  payload: { date: string; startTime: string; endTime: string; reason: string; note: string },
): Promise<{ id: string; error: string | null }> {
  const { user } = await requireAuth('/business/venue/calendar')
  const admin = createAdminClient()

  const venue = await resolveOwnedVenue(user.id, venueId, admin)
  if (!venue) return { id: '', error: 'Venue not found or you do not own this profile.' }

  if (payload.startTime >= payload.endTime) {
    return { id: '', error: 'End time must be after start time.' }
  }

  const conflicting = await hasOverlap(admin, {
    venueId,
    date: payload.date,
    startTime: payload.startTime,
    endTime: payload.endTime,
    statuses: ['blocked', 'pending', 'confirmed'],
  })
  if (conflicting) {
    return { id: '', error: 'That time overlaps an existing booking or block.' }
  }

  const notes = payload.note.trim() ? `${payload.reason} — ${payload.note.trim()}` : payload.reason

  const { data, error } = await admin
    .from('venue_availability')
    .insert({
      venue_id: venueId,
      date: payload.date,
      start_time: payload.startTime,
      end_time: payload.endTime,
      status: 'blocked',
      notes,
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('[blockVenueTime]', error?.message)
    return { id: '', error: 'Failed to block this time. Please try again.' }
  }

  return { id: data.id, error: null }
}

export async function unblockVenueTime(venueId: string, blockId: string): Promise<{ error: string | null }> {
  const { user } = await requireAuth('/business/venue/calendar')
  const admin = createAdminClient()

  const venue = await resolveOwnedVenue(user.id, venueId, admin)
  if (!venue) return { error: 'Venue not found or you do not own this profile.' }

  const { error } = await admin
    .from('venue_availability')
    .delete()
    .eq('id', blockId)
    .eq('venue_id', venueId)
    .eq('status', 'blocked')

  if (error) {
    console.error('[unblockVenueTime]', error.message)
    return { error: 'Failed to remove this block. Please try again.' }
  }

  return { error: null }
}

export async function moveVenueBlock(
  venueId: string,
  blockId: string,
  newDate: string,
  newStartTime: string,
  newEndTime: string,
): Promise<{ error: string | null }> {
  const { user } = await requireAuth('/business/venue/calendar')
  const admin = createAdminClient()

  const venue = await resolveOwnedVenue(user.id, venueId, admin)
  if (!venue) return { error: 'Venue not found or you do not own this profile.' }

  if (newStartTime >= newEndTime) {
    return { error: 'End time must be after start time.' }
  }

  const conflicting = await hasOverlap(admin, {
    venueId,
    date: newDate,
    startTime: newStartTime,
    endTime: newEndTime,
    statuses: ['blocked', 'pending', 'confirmed'],
    excludeId: blockId,
  })
  if (conflicting) {
    return { error: 'That time overlaps an existing booking or block.' }
  }

  const { error } = await admin
    .from('venue_availability')
    .update({ date: newDate, start_time: newStartTime, end_time: newEndTime })
    .eq('id', blockId)
    .eq('venue_id', venueId)
    .eq('status', 'blocked')

  if (error) {
    console.error('[moveVenueBlock]', error.message)
    return { error: 'Failed to move this block. Please try again.' }
  }

  return { error: null }
}

// ---------------------------------------------------------------------------
// Google Calendar — real busy-event fetch (on-demand, no cron)
// ---------------------------------------------------------------------------

/**
 * Exchanges the stored refresh token for a fresh access token and fetches
 * real events from the venue owner's primary Google Calendar within range.
 * Best-effort: any failure returns an empty array rather than breaking the
 * page. On a revoked/invalid token, disconnects the venue so the UI reflects
 * reality instead of silently retrying a dead connection forever.
 */
async function fetchGoogleCalendarEvents(
  refreshToken: string,
  rangeStart: string,
  rangeEnd: string,
  admin: ReturnType<typeof createAdminClient>,
  venueId: string,
): Promise<CalendarEventDTO[]> {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) return []

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        grant_type: 'refresh_token',
      }),
    })

    if (!tokenRes.ok) {
      if (tokenRes.status === 400 || tokenRes.status === 401) {
        // Refresh token revoked/invalid — disconnect so the UI stops
        // pretending the connection is live.
        await admin
          .from('venue_profiles')
          .update({ google_calendar_connected: false, google_calendar_refresh_token: null })
          .eq('id', venueId)
      }
      console.error('[fetchGoogleCalendarEvents] token refresh failed', tokenRes.status)
      return []
    }

    const { access_token: accessToken } = await tokenRes.json() as { access_token: string }

    const timeMin = new Date(`${rangeStart}T00:00:00+05:30`).toISOString()
    const timeMax = new Date(`${rangeEnd}T23:59:59+05:30`).toISOString()
    const params = new URLSearchParams({
      timeMin, timeMax,
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '250',
    })

    const eventsRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )

    if (!eventsRes.ok) {
      console.error('[fetchGoogleCalendarEvents] events fetch failed', eventsRes.status)
      return []
    }

    const data = await eventsRes.json() as {
      items?: Array<{
        id: string
        summary?: string
        start?: { dateTime?: string; date?: string }
        end?: { dateTime?: string; date?: string }
        status?: string
      }>
    }

    return (data.items ?? [])
      .filter(ev => ev.status !== 'cancelled' && (ev.start?.dateTime || ev.start?.date))
      .map(ev => {
        const start = ev.start?.dateTime ?? `${ev.start?.date}T00:00:00`
        const end = ev.end?.dateTime ?? ev.end?.date ?? start
        return {
          id: `gcal-${ev.id}`,
          title: ev.summary ? `${ev.summary} (GCal)` : 'Busy (GCal)',
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          status: 'external' as const,
          source: 'google' as const,
          isLocked: true,
        }
      })
  } catch (err) {
    console.error('[fetchGoogleCalendarEvents]', err)
    return []
  }
}
