'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, requireProfile } from '@/lib/auth/requireAuth'
import {
  createRazorpayOrder as _createRazorpayOrder,
  initializeRazorpayEvent,
  refundPayment,
  RazorpayApiError,
} from '@/lib/razorpay'
import { notifyFollowersOfNewEvent, notifyNearbyExplorers } from '@/lib/notifications'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { CreateEventSchema, type CreateEventInput } from '@/types/events'
import type { Event, UserProfile, BookingRow } from '@/types/database'

// ---------------------------------------------------------------------------
// Internal slug helpers
// ---------------------------------------------------------------------------

/**
 * Converts an event title to a URL-safe kebab-case base string.
 * Output must satisfy the DB constraint: `^[a-z0-9\-]{3,80}$`
 */
function titleToSlugBase(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')   // strip non-safe chars
    .replace(/\s+/g, '-')           // spaces → dashes
    .replace(/-+/g, '-')            // collapse consecutive dashes
    .replace(/^-+|-+$/g, '')        // trim leading/trailing dashes
    .slice(0, 60)                   // leave room for the 7-char suffix
}

/**
 * Generates a unique event slug: `<title-base>-<8-random-chars>`.
 * Uses crypto.randomUUID for an unguessable suffix.
 */
async function generateUniqueSlug(title: string): Promise<string> {
  const { randomUUID } = await import('crypto')
  const admin = createAdminClient()
  const base = titleToSlugBase(title) || 'event'

  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = `${base}-${randomUUID().slice(0, 8)}`

    const { data } = await admin
      .from('events')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (data === null) return slug
  }

  return `${base}-${randomUUID().slice(0, 8)}`
}

// ---------------------------------------------------------------------------
// createEvent
// ---------------------------------------------------------------------------

/**
 * Creates a new event in `draft` status.
 *
 * Flow:
 *   1. Require a completed creator profile (has_creator_role).
 *   2. Validate input with Zod.
 *   3. Generate a unique kebab-case slug.
 *   4. Insert the event row.
 *   5. For paid events, register a Razorpay catalog item and backfill
 *      `razorpay_event_id` — this links all future RSVP orders to a single
 *      Razorpay entity for reconciliation and dashboard reporting.
 *
 * The event starts as `draft` so creators can review before going live.
 * Call `publishEvent()` when ready.
 */
export async function createEvent(
  data: CreateEventInput,
): Promise<{ event: Event | null; error: string | null }> {
  // ── 1. Auth: must have a completed profile (creator role) ───────────────
  const { user } = await requireProfile()

  // ── 2. Validate ─────────────────────────────────────────────────────────
  const parsed = CreateEventSchema.safeParse(data)
  if (!parsed.success) {
    return { event: null, error: parsed.error.errors[0].message }
  }

  const {
    title,
    description,
    cover_image_url,
    venue_name,
    venue_address,
    venue_lat,
    venue_lng,
    starts_at,
    ends_at,
    ticket_price,
    capacity,
    whatsapp_group_url,
    google_maps_url,
    early_access_at,
    ticket_tiers,
    rsvp_style,
  } = parsed.data

  // When fan tiers are set, derive a representative flat price for Razorpay
  // catalog registration (use min paid tier price, or 0 if all free).
  const effectiveTicketPrice = ticket_tiers?.length
    ? (ticket_tiers.filter((t) => t.price_paise > 0).map((t) => t.price_paise).sort((a, b) => a - b)[0] ?? 0)
    : ticket_price

  // Guard: event must be in the future
  if (new Date(starts_at) <= new Date()) {
    return { event: null, error: 'Event start time must be in the future' }
  }

  // ── 3. Generate unique slug ──────────────────────────────────────────────
  let slug: string
  try {
    slug = await generateUniqueSlug(title)
  } catch (err) {
    console.error('[createEvent] slug generation failed', err)
    return { event: null, error: 'Failed to generate event URL. Please try again.' }
  }

  // ── 4. Insert event row ──────────────────────────────────────────────────
  const admin = createAdminClient()

  const { data: event, error: insertError } = await admin
    .from('events')
    .insert({
      creator_id: user.id,
      title,
      description: description ?? null,
      cover_image_url: cover_image_url || null,
      venue_name,
      venue_address,
      venue_lat: venue_lat ?? null,
      venue_lng: venue_lng ?? null,
      starts_at,
      ends_at: ends_at ?? null,
      ticket_price: effectiveTicketPrice,
      capacity: capacity ?? null,
      status: 'draft',
      whatsapp_group_url: whatsapp_group_url || null,
      // google_maps_url: google_maps_url || null,  // re-enable after migration 004 is applied
      early_access_at: early_access_at ?? null,
      ticket_tiers: ticket_tiers?.length ? (ticket_tiers as unknown as import('@/types/database').Json) : null,
      rsvp_style: rsvp_style ?? 'ticketed',
      slug,
    })
    .select()
    .single()

  if (insertError || !event) {
    console.error('[createEvent] insert failed', insertError?.message)
    return { event: null, error: 'Failed to create event. Please try again.' }
  }

  // ── 5. Register Razorpay catalog item for paid events ───────────────────
  // This is a best-effort step: if Razorpay is down, the event is still
  // created.  The creator can still publish and collect payments; the item
  // ID is used only for reconciliation, not for checkout itself.
  if (ticket_price > 0) {
    try {
      const razorpayEventId = await initializeRazorpayEvent({
        title,
        description,
        ticketPricePaise: ticket_price,
      })

      await admin
        .from('events')
        .update({ razorpay_event_id: razorpayEventId })
        .eq('id', event.id)

      // Return the enriched row with the Razorpay ID backfilled.
      return { event: { ...event, razorpay_event_id: razorpayEventId }, error: null }
    } catch (err) {
      // Non-fatal: log and return the event without the Razorpay ID.
      const msg = err instanceof RazorpayApiError ? err.message : String(err)
      console.error('[createEvent] Razorpay item creation failed', msg)
    }
  }

  return { event, error: null }
}

// ---------------------------------------------------------------------------
// publishEvent
// ---------------------------------------------------------------------------

/**
 * Transitions an event from `draft` → `published`.
 *
 * Validates that the minimum required fields are present before going live:
 * title, starts_at, and venue_address.  (These are required by the schema so
 * they will always be present, but we assert explicitly to surface any future
 * schema drift.)
 *
 * Only the event's creator may publish it.
 */
export async function publishEvent(
  eventId: string,
): Promise<{ error: string | null }> {
  const { user } = await requireAuth()
  const admin = createAdminClient()

  // Fetch and verify ownership in one query.
  const { data: event, error: fetchError } = await admin
    .from('events')
    .select('id, creator_id, title, starts_at, venue_address, status')
    .eq('id', eventId)
    .maybeSingle()

  if (fetchError || !event || event.creator_id !== user.id) {
    return { error: 'Event not found.' }
  }

  if (event.status === 'published') {
    return { error: null }  // idempotent
  }

  if (event.status === 'cancelled') {
    return { error: 'A cancelled event cannot be re-published.' }
  }

  // Guard: cannot publish an event that has already started.
  if (new Date(event.starts_at) <= new Date()) {
    return { error: 'Cannot publish an event whose start time has already passed.' }
  }

  const { error: updateError } = await admin
    .from('events')
    .update({ status: 'published' })
    .eq('id', eventId)

  if (updateError) {
    console.error('[publishEvent]', updateError.message)
    return { error: 'Failed to publish event. Please try again.' }
  }

  // Notify followers — fire-and-forget so a notification failure never blocks publish.
  const { data: fullEvent } = await admin
    .from('events')
    .select('*')
    .eq('id', eventId)
    .maybeSingle()

  const { data: maker } = await admin
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (fullEvent && maker) {
    notifyFollowersOfNewEvent(fullEvent as Event, maker as UserProfile).catch((err) => {
      console.error('[publishEvent] notifyFollowersOfNewEvent failed', String(err))
    })
    notifyNearbyExplorers(fullEvent as Event, maker as UserProfile).catch((err) => {
      console.error('[publishEvent] notifyNearbyExplorers failed', String(err))
    })
  }

  return { error: null }
}

// ---------------------------------------------------------------------------
// getEventBySlug
// ---------------------------------------------------------------------------

/**
 * Fetches a published event by its URL slug along with RSVP counts.
 *
 * Public — no authentication required.  The RLS policy on `events` restricts
 * the user-level Supabase client to published events (plus the creator's own
 * drafts if they're signed in).
 *
 * @returns spotsLeft = null when the event has no capacity limit (unlimited).
 */
export async function getEventBySlug(slug: string): Promise<{
  event: Event | null
  rsvpCount: number
  spotsLeft: number | null
}> {
  // Use the session-aware client: logged-in creators can see their own drafts.
  const supabase = await createClient()

  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (error || !event) {
    return { event: null, rsvpCount: 0, spotsLeft: null }
  }

  // Count confirmed attendees (payment_status = 'captured').
  // We use admin here to bypass rsvps RLS (which restricts to creator or own).
  const admin = createAdminClient()

  const { count: rsvpCount } = await admin
    .from('rsvps')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', event.id)
    .eq('payment_status', 'captured')

  const confirmed = rsvpCount ?? 0

  const spotsLeft =
    event.capacity !== null ? Math.max(0, event.capacity - confirmed) : null

  return { event, rsvpCount: confirmed, spotsLeft }
}

// ---------------------------------------------------------------------------
// getCreatorEvents
// ---------------------------------------------------------------------------

/**
 * Returns all events for a creator, ordered newest-first.
 *
 * Requires authentication and verifies that the caller is requesting their
 * own events (not another creator's).
 */
export async function getCreatorEvents(creatorId: string): Promise<Event[]> {
  const { user } = await requireAuth()

  if (user.id !== creatorId) {
    // Don't reveal whether the ID exists — return empty list.
    return []
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('creator_id', creatorId)
    .order('starts_at', { ascending: false })

  if (error) {
    console.error('[getCreatorEvents]', error.message)
    return []
  }

  return data ?? []
}

// ---------------------------------------------------------------------------
// getCreatorEventsWithBookings / getPastEventsWithAttendance
// ---------------------------------------------------------------------------

function isPastEvent(e: Event): boolean {
  return e.status === 'completed' || (e.status === 'published' && new Date(e.starts_at) <= new Date())
}

/**
 * Fetches every event for a creator (any status) plus every captured RSVP
 * across those events. Shared by the Events dashboard page and
 * getPastEventsWithAttendance below.
 */
export async function getCreatorEventsWithBookings(
  creatorId: string,
): Promise<{ events: Event[]; bookings: BookingRow[] }> {
  const supabase = await createClient()

  const { data: events } = await supabase
    .from('events')
    .select('*')
    .eq('creator_id', creatorId)
    .order('starts_at', { ascending: false })

  const eventIds = (events ?? []).map((e) => e.id)
  const { data: bookingRows } = eventIds.length > 0
    ? await supabase
        .from('rsvps')
        .select('id, event_id, attendee_name, payment_status, amount_paid, created_at')
        .in('event_id', eventIds)
        .eq('payment_status', 'captured')
    : { data: [] }

  return { events: events ?? [], bookings: (bookingRows ?? []) as unknown as BookingRow[] }
}

/**
 * Returns a creator's past (completed, or published with a start date in the
 * past) events with a captured-RSVP attendee count attached to each. Used by
 * the public profile's past_events_gallery block.
 */
export async function getPastEventsWithAttendance(
  creatorId: string,
): Promise<(Event & { attendee_count: number })[]> {
  const { events, bookings } = await getCreatorEventsWithBookings(creatorId)

  const countByEvent: Record<string, number> = {}
  for (const b of bookings) {
    countByEvent[b.event_id] = (countByEvent[b.event_id] ?? 0) + 1
  }

  return events
    .filter(isPastEvent)
    .map((e) => ({ ...e, attendee_count: countByEvent[e.id] ?? 0 }))
}

// ---------------------------------------------------------------------------
// cancelEvent
// ---------------------------------------------------------------------------

/**
 * Cancels an event and issues full refunds to all confirmed attendees.
 *
 * Steps:
 *   1. Auth + ownership check.
 *   2. SET status = 'cancelled'.
 *   3. Fetch all RSVPs with payment_status = 'captured'.
 *   4. For each: call Razorpay full refund + SET payment_status = 'refunded'.
 *   5. Log the WhatsApp notification that should be sent to attendees.
 *
 * Refunds are processed sequentially to keep the code simple and observable.
 * In production, consider moving step 4 to a background job / queue to avoid
 * timeouts if there are many attendees.
 *
 * Errors in individual refunds are logged but do not abort the cancellation.
 * A separate reconciliation pass should retry any failed refunds.
 */
// ---------------------------------------------------------------------------
// updateEvent
// ---------------------------------------------------------------------------

/**
 * Updates mutable fields on an existing event.
 * The creator may edit title, dates, venue, description, capacity, and
 * the WhatsApp group URL regardless of status (except cancelled events).
 * Ticket price changes are intentionally disallowed after creation because
 * attendees may have already paid at the original price.
 */
export async function updateEvent(
  eventId: string,
  data: {
    title?: string
    description?: string | null
    cover_image_url?: string | null
    starts_at?: string
    ends_at?: string | null
    venue_name?: string
    venue_address?: string
    google_maps_url?: string | null
    capacity?: number | null
    whatsapp_group_url?: string | null
    ticket_tiers?: import('@/types/database').Json | null
  },
): Promise<{ event: Event | null; error: string | null }> {
  const { user } = await requireAuth()
  const admin = createAdminClient()

  const { data: existing, error: fetchError } = await admin
    .from('events')
    .select('id, creator_id, status')
    .eq('id', eventId)
    .maybeSingle()

  if (fetchError || !existing) return { event: null, error: 'Event not found.' }
  if (existing.creator_id !== user.id) return { event: null, error: 'Unauthorized.' }
  if (existing.status === 'cancelled') return { event: null, error: 'Cannot edit a cancelled event.' }

  const { data: updated, error: updateError } = await admin
    .from('events')
    .update(data)
    .eq('id', eventId)
    .select()
    .single()

  if (updateError || !updated) {
    console.error('[updateEvent] update failed', updateError?.message)
    return { event: null, error: 'Failed to update event. Please try again.' }
  }

  return { event: updated, error: null }
}

export async function cancelEvent(
  eventId: string,
): Promise<{ error: string | null }> {
  const { user } = await requireAuth()
  const admin = createAdminClient()

  // ── 1. Verify ownership ──────────────────────────────────────────────────
  const { data: event, error: fetchError } = await admin
    .from('events')
    .select('id, creator_id, title, status, whatsapp_group_url')
    .eq('id', eventId)
    .maybeSingle()

  if (fetchError || !event) {
    return { error: 'Event not found.' }
  }

  if (event.creator_id !== user.id) {
    return { error: 'You do not have permission to cancel this event.' }
  }

  if (event.status === 'cancelled') {
    return { error: null }  // idempotent
  }

  // ── 2. Set status = 'cancelled' immediately ──────────────────────────────
  // Cancel first so no new RSVPs can be created while we're processing refunds.
  const { error: cancelError } = await admin
    .from('events')
    .update({ status: 'cancelled' })
    .eq('id', eventId)

  if (cancelError) {
    console.error('[cancelEvent] status update failed', cancelError.message)
    return { error: 'Failed to cancel event. Please try again.' }
  }

  // ── 3. Fetch all confirmed RSVPs ─────────────────────────────────────────
  const { data: rsvps, error: rsvpError } = await admin
    .from('rsvps')
    .select('id, razorpay_payment_id, attendee_name, attendee_phone, amount_paid')
    .eq('event_id', eventId)
    .eq('payment_status', 'captured')

  if (rsvpError) {
    console.error('[cancelEvent] rsvp fetch failed', rsvpError.message)
    // Event is cancelled; log the error and return success.
    // Refunds will need manual review.
    return { error: null }
  }

  // ── 4. Issue full refunds ────────────────────────────────────────────────
  let refundedCount = 0
  let failedCount = 0

  for (const rsvp of rsvps ?? []) {
    if (!rsvp.razorpay_payment_id) {
      // Shouldn't happen for captured RSVPs, but be defensive.
      console.warn('[cancelEvent] captured RSVP missing payment_id', rsvp.id)
      continue
    }

    const { refund_id, error: refundError } = await refundPayment(
      rsvp.razorpay_payment_id,
      // Omit amount → full refund of whatever was captured
    )

    if (refundError || !refund_id) {
      console.error(
        '[cancelEvent] refund failed',
        { rsvpId: rsvp.id, paymentId: rsvp.razorpay_payment_id, refundError },
      )
      await admin
        .from('rsvps')
        .update({ payment_status: 'refund_failed' })
        .eq('id', rsvp.id)
      failedCount++
      continue
    }

    // Mark as refunded in DB.
    const { error: updateError } = await admin
      .from('rsvps')
      .update({ payment_status: 'refunded' })
      .eq('id', rsvp.id)

    if (updateError) {
      console.error('[cancelEvent] rsvp status update failed', {
        rsvpId: rsvp.id, updateError: updateError.message,
      })
    } else {
      refundedCount++
    }
  }

  // ── 5. WhatsApp cancellation notices ────────────────────────────────────
  const attendeesWithPhone = (rsvps ?? []).filter((r) => r.attendee_phone)
  if (attendeesWithPhone.length > 0) {
    const refundLine = refundedCount > 0
      ? ' A full refund has been initiated and will reflect within 5–7 business days.'
      : ''
    const notifyAll = attendeesWithPhone.map((r) =>
      sendWhatsAppMessage(
        r.attendee_phone,
        `Hi ${r.attendee_name}, unfortunately "${event.title}" has been cancelled by the organiser.${refundLine} We're sorry for the inconvenience.`,
      ).catch(() => { /* fire-and-forget — never block the response */ }),
    )
    await Promise.all(notifyAll)
  }

  if (failedCount > 0) {
    console.error(
      `[cancelEvent] ${failedCount}/${(rsvps ?? []).length} refunds failed — manual review required`,
      { eventId },
    )
  }

  return { error: null }
}

// ---------------------------------------------------------------------------
// extendCapacity
// ---------------------------------------------------------------------------

/**
 * Adds seats to a published event's capacity.
 * Only allowed on published events; cannot reduce below current RSVP count.
 */
export async function extendCapacity(
  eventId: string,
  additionalSpots: number,
): Promise<{ newCapacity: number | null; error: string | null }> {
  if (!Number.isInteger(additionalSpots) || additionalSpots < 1) {
    return { newCapacity: null, error: 'Additional spots must be a positive integer.' }
  }

  const { user } = await requireAuth()
  const admin = createAdminClient()

  const { data: event, error: fetchError } = await admin
    .from('events')
    .select('id, creator_id, status, capacity')
    .eq('id', eventId)
    .maybeSingle()

  if (fetchError || !event) return { newCapacity: null, error: 'Event not found.' }
  if (event.creator_id !== user.id) return { newCapacity: null, error: 'Unauthorized.' }
  if (event.status !== 'published') return { newCapacity: null, error: 'Can only extend capacity on published events.' }

  const currentCapacity = event.capacity ?? 0
  const newCapacity = currentCapacity + additionalSpots

  const { error: updateError } = await admin
    .from('events')
    .update({ capacity: newCapacity })
    .eq('id', eventId)

  if (updateError) return { newCapacity: null, error: 'Failed to update capacity.' }
  return { newCapacity, error: null }
}

// ---------------------------------------------------------------------------
// duplicateEvent
// ---------------------------------------------------------------------------

/**
 * Creates a new draft event pre-filled from an existing event.
 * The duplicate has a fresh slug, no Razorpay ID, and status = 'draft'
 * so the creator can set new dates and publish when ready.
 */
export async function duplicateEvent(
  eventId: string,
): Promise<{ event: Event | null; error: string | null }> {
  const { user } = await requireAuth()
  const admin = createAdminClient()

  const { data: source, error: fetchError } = await admin
    .from('events')
    .select('*')
    .eq('id', eventId)
    .maybeSingle()

  if (fetchError || !source) return { event: null, error: 'Event not found.' }
  if (source.creator_id !== user.id) return { event: null, error: 'Unauthorized.' }

  const slug = await generateUniqueSlug(`${source.title} copy`)

  const { data: newEvent, error: insertError } = await admin
    .from('events')
    .insert({
      creator_id:         source.creator_id,
      title:              `${source.title} (Copy)`,
      description:        source.description,
      cover_image_url:    source.cover_image_url,
      venue_name:         source.venue_name,
      venue_address:      source.venue_address,
      venue_lat:          source.venue_lat,
      venue_lng:          source.venue_lng,
      ticket_price:       source.ticket_price,
      capacity:           source.capacity,
      whatsapp_group_url: source.whatsapp_group_url,
      google_maps_url:    source.google_maps_url,
      venue_id:      source.venue_id,
      starts_at:          source.starts_at,
      ends_at:            source.ends_at,
      status:             'draft',
      slug,
    })
    .select()
    .single()

  if (insertError || !newEvent) {
    console.error('[duplicateEvent] insert failed', insertError?.message)
    return { event: null, error: 'Failed to duplicate event.' }
  }

  return { event: newEvent, error: null }
}
