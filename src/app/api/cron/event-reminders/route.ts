// =============================================================================
// WIMC — Event Reminder Cron
//
// Runs daily at 20:00 UTC (01:30 IST) via a Netlify Scheduled Function
// (netlify/functions/event-reminders.mts).
// Finds events starting 22–26 hours from now and sends reminders to:
//   - Attendees (in-app + WhatsApp)
//   - Creators (in-app + WhatsApp with ticket stats)
//   - The event's Venue owner, if the event has a linked venue_id and a
//     linked auth account (in-app + WhatsApp)
//
// The 4-hour window (22–26h) accounts for cron timing variance and catches
// events starting between ~23:30 IST tonight and ~03:30 IST the next morning.
//
// Duplicate-reminder guard: each recipient's WhatsApp send and in-app
// notification are gated by the SAME existing-notification check (last 24h)
// — they fire together or not at all, so a retried/re-triggered cron run
// can't double-send. Guest RSVPs (no attendee_user_id) are the one
// exception: notifications.recipient_id is a NOT NULL FK to auth.users, so
// there's no record to key a dedup check off of for them — their WhatsApp
// send stays unguarded, as it always has been.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsAppTemplate } from '@/lib/whatsapp'
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
      creator_id, venue_name, venue_address, venue_id,
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
  let venueReminders    = 0
  const errors: string[] = []

  for (const event of upcomingEvents) {
    const eventTime = new Date(event.starts_at).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short',
    })

    // ── ATTENDEE REMINDERS ──────────────────────────────────────────────────

    // Excludes casual "Can't go" responses — a decline shouldn't get a "see you
    // there tomorrow" reminder. "Maybe" guests still get one, as a nudge; ticketed
    // bookings (casual_intent = null) are unaffected. Same filter as
    // getEventAttendees (src/app/actions/rsvp.ts).
    const { data: rsvps } = await admin
      .from('rsvps')
      .select('attendee_user_id, attendee_name, attendee_phone, qr_code_token')
      .eq('event_id', event.id)
      .eq('payment_status', 'captured')
      .or('casual_intent.is.null,casual_intent.neq.not_going')

    for (const rsvp of rsvps ?? []) {
      try {
        // Dedup check: skip both the in-app record and the WhatsApp send if
        // already reminded in the last 24h. Guest RSVPs (no attendee_user_id)
        // have no user to key a notification/dedup record off of — the
        // WhatsApp send for those remains unguarded, same as before this fix.
        let alreadyReminded = false
        if (rsvp.attendee_user_id) {
          const { data: existingNotif } = await admin
            .from('notifications')
            .select('id')
            .eq('recipient_id', rsvp.attendee_user_id)
            .eq('type', 'event_reminder')
            .eq('action_url', `/events/${event.slug}`)
            .gte('created_at', dedupCutoff)
            .maybeSingle()

          alreadyReminded = !!existingNotif
          if (!alreadyReminded) {
            void createNotification({
              recipientId: rsvp.attendee_user_id,
              type: 'event_reminder',
              title: `${event.title} is tomorrow`,
              body: `${eventTime} · ${event.venue_name}`,
              actionUrl: `/events/${event.slug}`,
            })
          }
        }

        if (!alreadyReminded && rsvp.attendee_phone) {
          const venueLine = `${event.venue_name}${event.venue_address ? `, ${event.venue_address}` : ''}`
          await sendWhatsAppTemplate(rsvp.attendee_phone, 'event_reminder_attendee_v2', 'en', [
            event.title, eventTime, venueLine,
          ], [
            { index: 0, urlParameter: rsvp.qr_code_token ?? '' },
            // Button 2 ("Get Directions") is a Google Maps search link
            // (https://www.google.com/maps/search/?api=1&query={{1}}), not an
            // internal route — the dynamic value is the venue address, not an
            // event identifier.
            { index: 1, urlParameter: encodeURIComponent(venueLine) },
          ])
        }

        if (!alreadyReminded) attendeeReminders++
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`rsvp:${rsvp.attendee_user_id ?? 'anon'} event:${event.id} — ${msg}`)
      }
    }

    // ── CREATOR REMINDER ───────────────────────────────────────────────────

    try {
      // Ticket-sold figures are shared by the creator body and the venue
      // body below, so compute them once regardless of either dedup outcome.
      const { count: ticketCount } = await admin
        .from('rsvps')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', event.id)
        .eq('payment_status', 'captured')

      const sold       = ticketCount ?? 0
      const capacity   = event.capacity ?? 0
      const pct        = capacity > 0 ? Math.round((sold / capacity) * 100) : 0
      const soldString = `${sold}${capacity > 0 ? `/${capacity} (${pct}% full)` : ''}`
      const creator    = Array.isArray(event.creator) ? event.creator[0] : event.creator

      // Dedup check for creator — gates the in-app record AND the WhatsApp
      // send together, so neither fires without the other.
      const { data: existingCreatorNotif } = await admin
        .from('notifications')
        .select('id')
        .eq('recipient_id', event.creator_id)
        .eq('type', 'event_reminder')
        .eq('action_url', `/dashboard/events/${event.id}`)
        .gte('created_at', dedupCutoff)
        .maybeSingle()

      if (!existingCreatorNotif) {
        void createNotification({
          recipientId: event.creator_id,
          type: 'event_reminder',
          title: 'Your event starts in 24 hours',
          body: `${event.title} · ${sold}${capacity > 0 ? `/${capacity}` : ''} tickets sold${capacity > 0 ? ` (${pct}%)` : ''}`,
          actionUrl: `/dashboard/events/${event.id}`,
        })

        if (creator && 'phone' in creator && creator.phone) {
          // Template body reads "...at {{2}}. Total tickets booked so far: {{3}}." —
          // {{3}} is a ticket count, not the event date/time (eventTime isn't used
          // by this template at all).
          await sendWhatsAppTemplate(String(creator.phone), 'event_reminder_creator_v2', 'en', [
            event.title, event.venue_name, soldString,
          ], [{ index: 0, urlParameter: event.id }])
        }

        creatorReminders++
      }

      // ── VENUE REMINDER ─────────────────────────────────────────────────
      // Only for events booked at a partner Venue (venue_id set) — self-hosted
      // events with just a free-text venue_name/venue_address have no owner to notify.
      // Independently deduped from the creator reminder above (own recipient,
      // own notification record) — gates the in-app record AND the WhatsApp
      // send together, same coupling as attendee/creator.
      if (event.venue_id) {
        const { data: venue } = await admin
          .from('venue_profiles')
          .select('name, contact_whatsapp, auth_user_id')
          .eq('id', event.venue_id)
          .maybeSingle()

        if (venue?.contact_whatsapp && venue.auth_user_id) {
          const { data: existingVenueNotif } = await admin
            .from('notifications')
            .select('id')
            .eq('recipient_id', venue.auth_user_id)
            .eq('type', 'event_reminder')
            .eq('action_url', '/business/venue/bookings')
            .gte('created_at', dedupCutoff)
            .maybeSingle()

          if (!existingVenueNotif) {
            const hostName = creator && 'display_name' in creator ? String(creator.display_name ?? 'the host') : 'the host'

            void createNotification({
              recipientId: venue.auth_user_id,
              type: 'event_reminder',
              title: `${event.title} is tomorrow`,
              body: `${eventTime} · ${soldString} tickets sold`,
              actionUrl: '/business/venue/bookings',
            })

            await sendWhatsAppTemplate(venue.contact_whatsapp, 'venue_reminder', 'en', [
              event.title, eventTime, soldString, hostName,
            ], [{ index: 0, urlParameter: event.id }])

            venueReminders++
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`creator:${event.creator_id} event:${event.id} — ${msg}`)
    }
  }

  const result = {
    eventsProcessed: upcomingEvents.length,
    attendeeReminders,
    creatorReminders,
    venueReminders,
    ...(errors.length ? { errors } : {}),
  }

  console.info('[event-reminders] run complete', result)
  return NextResponse.json(result)
}
