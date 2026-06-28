// =============================================================================
// WIMC — Event Reminder Cron
//
// Runs daily at 20:00 UTC (01:30 IST) via Vercel Cron.
// Finds events starting 22–26 hours from now and sends reminders to:
//   - Attendees (in-app + WhatsApp)
//   - Creators (in-app + WhatsApp with ticket stats)
//
// The 4-hour window (22–26h) accounts for cron timing variance and catches
// events starting between ~23:30 IST tonight and ~03:30 IST the next morning.
//
// Duplicate-reminder guard: checks notifications table for an existing
// event_reminder sent in the last 24h before sending.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { createNotification } from '@/app/actions/notifications'

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return request.headers.get('authorization') === `Bearer ${cronSecret}`
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // 22–26 hour window from now
  const now         = new Date()
  const windowStart = new Date(now.getTime() + 22 * 60 * 60 * 1000)
  const windowEnd   = new Date(now.getTime() + 26 * 60 * 60 * 1000)
  const dedupCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

  const { data: upcomingEvents, error: fetchError } = await admin
    .from('events')
    .select(`
      id, title, slug, starts_at, capacity,
      creator_id, venue_name, venue_address,
      creator:creator_id (
        display_name, username, city, phone
      )
    `)
    .eq('status', 'published')
    .gte('starts_at', windowStart.toISOString())
    .lte('starts_at', windowEnd.toISOString())

  if (fetchError) {
    console.error('[event-reminders] fetch error', fetchError.message)
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (!upcomingEvents?.length) {
    return NextResponse.json({ reminded: 0, message: 'No upcoming events in window' })
  }

  let attendeeReminders = 0
  let creatorReminders  = 0
  const errors: string[] = []

  for (const event of upcomingEvents) {
    const eventTime = new Date(event.starts_at).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short',
    })

    // ── ATTENDEE REMINDERS ──────────────────────────────────────────────────

    const { data: rsvps } = await admin
      .from('rsvps')
      .select('attendee_user_id, attendee_name, attendee_phone')
      .eq('event_id', event.id)
      .eq('payment_status', 'captured')

    for (const rsvp of rsvps ?? []) {
      try {
        // Dedup check: skip if already reminded in last 24h
        if (rsvp.attendee_user_id) {
          const { data: existingNotif } = await admin
            .from('notifications')
            .select('id')
            .eq('recipient_id', rsvp.attendee_user_id)
            .eq('type', 'event_reminder')
            .eq('action_url', `/events/${event.slug}`)
            .gte('created_at', dedupCutoff)
            .maybeSingle()

          if (!existingNotif) {
            void createNotification({
              recipientId: rsvp.attendee_user_id,
              type: 'event_reminder',
              title: `${event.title} is tomorrow`,
              body: `${eventTime} · ${event.venue_name}`,
              actionUrl: `/events/${event.slug}`,
            })
          }
        }

        if (rsvp.attendee_phone) {
          const msg =
            `🎟️ Reminder: *${event.title}* is tomorrow!\n\n` +
            `📅 ${eventTime}\n` +
            `📍 ${event.venue_name}${event.venue_address ? `, ${event.venue_address}` : ''}\n\n` +
            `See you there! 🎉`
          await sendWhatsAppMessage(rsvp.attendee_phone, msg)
        }

        attendeeReminders++
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`rsvp:${rsvp.attendee_user_id ?? 'anon'} event:${event.id} — ${msg}`)
      }
    }

    // ── CREATOR REMINDER ───────────────────────────────────────────────────

    try {
      // Dedup check for creator
      const { data: existingCreatorNotif } = await admin
        .from('notifications')
        .select('id')
        .eq('recipient_id', event.creator_id)
        .eq('type', 'event_reminder')
        .eq('action_url', `/dashboard/events/${event.id}`)
        .gte('created_at', dedupCutoff)
        .maybeSingle()

      const { count: ticketCount } = await admin
        .from('rsvps')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', event.id)
        .eq('payment_status', 'captured')

      const sold     = ticketCount ?? 0
      const capacity = event.capacity ?? 0
      const pct      = capacity > 0 ? Math.round((sold / capacity) * 100) : 0

      if (!existingCreatorNotif) {
        void createNotification({
          recipientId: event.creator_id,
          type: 'event_reminder',
          title: 'Your event starts in 24 hours',
          body: `${event.title} · ${sold}${capacity > 0 ? `/${capacity}` : ''} tickets sold${capacity > 0 ? ` (${pct}%)` : ''}`,
          actionUrl: `/dashboard/events/${event.id}`,
        })
      }

      const creator = Array.isArray(event.creator) ? event.creator[0] : event.creator
      if (creator && 'phone' in creator && creator.phone) {
        const creatorCity = 'city' in creator && creator.city
          ? String(creator.city).toLowerCase().replace(/\s+/g, '-') + '/'
          : ''
        const creatorUsername = 'username' in creator ? String(creator.username ?? '') : ''
        const msg =
          `⏰ *${event.title}* starts in 24 hours!\n\n` +
          `🎟️ Tickets sold: ${sold}${capacity > 0 ? `/${capacity} (${pct}% full)` : ''}\n` +
          `📍 ${event.venue_name}\n` +
          `📅 ${eventTime}\n\n` +
          `Share your page to get last-minute RSVPs:\n` +
          `wheninmycity.com/${creatorCity}${creatorUsername}`
        await sendWhatsAppMessage(String(creator.phone), msg)
      }

      creatorReminders++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`creator:${event.creator_id} event:${event.id} — ${msg}`)
    }
  }

  const result = {
    eventsProcessed: upcomingEvents.length,
    attendeeReminders,
    creatorReminders,
    ...(errors.length ? { errors } : {}),
  }

  console.info('[event-reminders] run complete', result)
  return NextResponse.json(result)
}
