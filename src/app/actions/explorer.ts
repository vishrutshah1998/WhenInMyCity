'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth/requireAuth'
import { INTEREST_TAGS } from '@/lib/constants/interests'
import { CreateExplorerSchema, type CreateExplorerInput } from '@/types/marketplace'
import type { Event, ExplorerProfile, Rsvp } from '@/types/database'
import { evaluateMakerTier } from '@/app/actions/tier'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { bumpUserMetric } from '@/lib/metrics'

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Resolves the explorer_profiles row for the current auth user.
 * Returns null if the user hasn't created an Explorer profile yet.
 */
async function getExplorerForUser(userId: string): Promise<ExplorerProfile | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('explorer_profiles')
    .select('*')
    .eq('auth_user_id', userId)
    .maybeSingle()
  return data ?? null
}

// ---------------------------------------------------------------------------
// createExplorerProfile
// ---------------------------------------------------------------------------

/**
 * Creates an Explorer profile for the authenticated user.
 *
 * @returns `{ error: string | null }`
 */
export async function createExplorerProfile(
  data: CreateExplorerInput,
): Promise<{ error: string | null }> {
  const { user } = await requireAuth('/onboarding')

  const parsed = CreateExplorerSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  const admin = createAdminClient()

  // Idempotency: skip insert if a profile already exists.
  const { data: existing } = await admin
    .from('explorer_profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (existing) return { error: null }

  const { error: insertError } = await admin.from('explorer_profiles').insert({
    auth_user_id:             user.id,
    display_name:             parsed.data.display_name,
    avatar_url:               parsed.data.avatar_url || null,
    city:                     parsed.data.city,
    interest_tags:            parsed.data.interest_tags,
    preferred_formats:        parsed.data.preferred_formats,
    price_range_max_paise:    parsed.data.price_range_max_paise,
    neighbourhood_preference: parsed.data.neighbourhood_preference ?? null,
    notification_preferences: parsed.data.notification_preferences,
  })

  if (insertError) {
    console.error('[createExplorerProfile]', insertError.message)
    return { error: 'Failed to create your Explorer profile. Please try again.' }
  }

  return { error: null }
}

// ---------------------------------------------------------------------------
// updateExplorerInterests
// ---------------------------------------------------------------------------

/**
 * Updates the interest tags for the authenticated Explorer.
 * Validates that 3–5 tags are provided and all are valid INTEREST_TAGS ids.
 *
 * @returns `{ error: string | null }`
 */
export async function updateExplorerInterests(
  tags: string[],
): Promise<{ error: string | null }> {
  const { user } = await requireAuth()

  if (tags.length < 3 || tags.length > 5) {
    return { error: 'Please select between 3 and 5 interests.' }
  }

  const validIds = new Set(INTEREST_TAGS.map((t) => t.id))
  const invalid = tags.filter((t) => !validIds.has(t))
  if (invalid.length) {
    return { error: `Invalid interest tag(s): ${invalid.join(', ')}` }
  }

  const admin = createAdminClient()

  const { error } = await admin
    .from('explorer_profiles')
    .update({ interest_tags: tags })
    .eq('auth_user_id', user.id)

  if (error) {
    console.error('[updateExplorerInterests]', error.message)
    return { error: 'Failed to update your interests. Please try again.' }
  }

  return { error: null }
}

// ---------------------------------------------------------------------------
// getPersonalisedEvents
// ---------------------------------------------------------------------------

/**
 * Returns upcoming published events ranked by relevance to the Explorer's profile.
 *
 * Relevance scoring (higher = shown first):
 *   +3 per matching interest tag (via creator's interest_tags)
 *   +2 if event is by a followed Maker
 *   +1 if event ticket_price ≤ Explorer's price_range_max_paise
 *   +1 if event creator is in the same city as the Explorer
 *
 * Excludes:
 *   - Events the Explorer has already RSVP'd to (captured payment)
 *   - Past events
 *
 * @param limit - Maximum events to return (default 20, max 20).
 */
export async function getPersonalisedEvents(
  limit = 20,
): Promise<{ events: Event[] }> {
  const { user } = await requireAuth()

  const admin = createAdminClient()

  const explorer = await getExplorerForUser(user.id)
  if (!explorer) return { events: [] }

  const cap = Math.min(limit, 20)
  const now = new Date()
  const nowIso = now.toISOString()

  // Parallel fetches: RSVP'd events + attendance history.
  const [rsvpResult, historyResult] = await Promise.all([
    admin
      .from('rsvps')
      .select('event_id')
      .eq('attendee_user_id', user.id)
      .eq('payment_status', 'captured'),
    admin
      .from('explorer_event_history')
      .select('event_id, event:events(creator_id)')
      .eq('explorer_id', explorer.id),
  ])

  const rsvpdEventIds = new Set((rsvpResult.data ?? []).map((r) => r.event_id))
  const savedEventIds = new Set(explorer.saved_event_ids)

  // Build a set of creator IDs this explorer has attended before.
  const attendedCreatorIds = new Set<string>(
    (historyResult.data ?? []).flatMap((h) => {
      const ev = h.event as { creator_id: string } | null
      return ev ? [ev.creator_id] : []
    }),
  )

  // Fetch upcoming published events (broad pool, ranked in JS).
  const { data: events, error } = await admin
    .from('events')
    .select('*, creator:user_profiles(id, city, interest_tags)')
    .eq('status', 'published')
    .gt('starts_at', nowIso)
    .order('starts_at', { ascending: true })
    .limit(300)

  if (error) {
    console.error('[getPersonalisedEvents]', error.message)
    return { events: [] }
  }

  const explorerTagSet = new Set(explorer.interest_tags)
  const followedSet    = new Set(explorer.followed_maker_ids)

  type ScoredEvent = { event: Event; score: number; creatorId: string }
  const scored: ScoredEvent[] = []

  for (const row of events ?? []) {
    // Exclude already-booked or saved events.
    if (rsvpdEventIds.has(row.id)) continue
    if (savedEventIds.has(row.id)) continue

    const creator = row.creator as { id: string; city: string; interest_tags: string[] } | null

    let score = 0

    // +3 per matching interest tag (creator's tags vs explorer's tags).
    if (creator?.interest_tags) {
      for (const tag of creator.interest_tags) {
        if (explorerTagSet.has(tag)) score += 3
      }
    }

    // +4 if followed Maker (strongest personal signal).
    if (creator && followedSet.has(creator.id)) score += 4

    // +3 if explorer has attended this creator before (repeat-attendee signal).
    if (creator && attendedCreatorIds.has(creator.id)) score += 3

    // +2 if same city as explorer.
    if (creator?.city === explorer.city) score += 2

    // +1 if ticket price fits budget.
    if (row.ticket_price <= explorer.price_range_max_paise) score += 1

    // +2 urgency bonus — event starts within 7 days.
    const daysUntil = (new Date(row.starts_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    if (daysUntil <= 7) score += 2

    const { creator: _creator, ...plainEvent } = row as typeof row & { creator: unknown }
    scored.push({ event: plainEvent as Event, score, creatorId: creator?.id ?? '' })
  }

  scored.sort((a, b) => b.score - a.score)

  // Diversity cap: at most 3 events per creator in the final result.
  const creatorCount = new Map<string, number>()
  const result: Event[] = []
  for (const s of scored) {
    if (result.length >= cap) break
    const count = creatorCount.get(s.creatorId) ?? 0
    if (count >= 3) continue
    creatorCount.set(s.creatorId, count + 1)
    result.push(s.event)
  }

  return { events: result }
}

// ---------------------------------------------------------------------------
// followMaker
// ---------------------------------------------------------------------------

/**
 * Adds the given Maker ID to the Explorer's followed_maker_ids array.
 *
 * @returns `{ error: string | null }`
 */
export async function followMaker(makerId: string): Promise<{ error: string | null }> {
  const { user } = await requireAuth()

  const admin = createAdminClient()

  const explorer = await getExplorerForUser(user.id)
  if (!explorer) return { error: 'Explorer profile not found.' }

  if (explorer.followed_maker_ids.includes(makerId)) return { error: null }

  const { error } = await admin
    .from('explorer_profiles')
    .update({ followed_maker_ids: [...explorer.followed_maker_ids, makerId] })
    .eq('auth_user_id', user.id)

  if (error) {
    console.error('[followMaker]', error.message)
    return { error: 'Failed to follow Maker. Please try again.' }
  }

  bumpUserMetric(admin, user.id, 'creators_followed_count', 1, 'followMaker')

  return { error: null }
}

// ---------------------------------------------------------------------------
// unfollowMaker
// ---------------------------------------------------------------------------

/**
 * Removes the given Maker ID from the Explorer's followed_maker_ids array.
 *
 * @returns `{ error: string | null }`
 */
export async function unfollowMaker(makerId: string): Promise<{ error: string | null }> {
  const { user } = await requireAuth()

  const admin = createAdminClient()

  const explorer = await getExplorerForUser(user.id)
  if (!explorer) return { error: 'Explorer profile not found.' }

  const updated = explorer.followed_maker_ids.filter((id) => id !== makerId)

  const { error } = await admin
    .from('explorer_profiles')
    .update({ followed_maker_ids: updated })
    .eq('auth_user_id', user.id)

  if (error) {
    console.error('[unfollowMaker]', error.message)
    return { error: 'Failed to unfollow Maker. Please try again.' }
  }

  bumpUserMetric(admin, user.id, 'creators_followed_count', -1, 'unfollowMaker')

  return { error: null }
}

// ---------------------------------------------------------------------------
// saveEvent
// ---------------------------------------------------------------------------

/**
 * Adds an event to the Explorer's saved_event_ids list.
 *
 * @returns `{ error: string | null }`
 */
export async function saveEvent(eventId: string): Promise<{ error: string | null }> {
  const { user } = await requireAuth()

  const admin = createAdminClient()

  const explorer = await getExplorerForUser(user.id)
  if (!explorer) return { error: 'Explorer profile not found.' }

  if (explorer.saved_event_ids.includes(eventId)) return { error: null }

  const { error } = await admin
    .from('explorer_profiles')
    .update({ saved_event_ids: [...explorer.saved_event_ids, eventId] })
    .eq('auth_user_id', user.id)

  if (error) {
    console.error('[saveEvent]', error.message)
    return { error: 'Failed to save event. Please try again.' }
  }

  bumpUserMetric(admin, user.id, 'events_saved_count', 1, 'saveEvent')

  return { error: null }
}

// ---------------------------------------------------------------------------
// unsaveEvent
// ---------------------------------------------------------------------------

export async function unsaveEvent(eventId: string): Promise<{ error: string | null }> {
  const { user } = await requireAuth()

  const admin = createAdminClient()

  const explorer = await getExplorerForUser(user.id)
  if (!explorer) return { error: 'Explorer profile not found.' }

  const updated = explorer.saved_event_ids.filter((id) => id !== eventId)

  const { error } = await admin
    .from('explorer_profiles')
    .update({ saved_event_ids: updated })
    .eq('auth_user_id', user.id)

  if (error) {
    console.error('[unsaveEvent]', error.message)
    return { error: 'Failed to unsave event. Please try again.' }
  }

  bumpUserMetric(admin, user.id, 'events_saved_count', -1, 'unsaveEvent')

  return { error: null }
}

// ---------------------------------------------------------------------------
// browseEvents
// ---------------------------------------------------------------------------

export interface BrowseEvent {
  id: string
  title: string
  description: string | null
  cover_image_url: string | null
  venue_name: string
  venue_address: string
  starts_at: string
  ends_at: string | null
  ticket_price: number
  capacity: number | null
  slug: string
  average_rating: number
  rating_count: number
  creator_id: string
  creator_city: string
  creator_interest_tags: string[]
}

export interface BrowseFilters {
  city?: string
  interest_tag?: string
  date?: string  // ISO date string (YYYY-MM-DD), filters to events starting on that day
}

/**
 * Returns upcoming published events filterable by city, interest tag, and date.
 * City and interest_tag are matched against the creator's profile.
 */
export async function browseEvents(
  filters: BrowseFilters = {},
  limit = 40,
): Promise<{ events: BrowseEvent[] }> {
  const admin = createAdminClient()
  const now = new Date().toISOString()

  const { data, error } = await admin
    .from('events')
    .select('id, title, description, cover_image_url, venue_name, venue_address, starts_at, ends_at, ticket_price, capacity, slug, average_rating, rating_count, creator_id, creator:user_profiles(city, interest_tags)')
    .eq('status', 'published')
    .gt('starts_at', now)
    .order('starts_at', { ascending: true })
    .limit(200)

  if (error) {
    console.error('[browseEvents]', error.message)
    return { events: [] }
  }

  type RawRow = typeof data extends (infer T)[] | null ? T : never

  const rows = (data ?? []) as Array<RawRow & {
    creator: { city: string; interest_tags: string[] } | null
  }>

  let results = rows.map((row) => ({
    id:                   row.id,
    title:                row.title,
    description:          row.description,
    cover_image_url:      row.cover_image_url,
    venue_name:           row.venue_name,
    venue_address:        row.venue_address,
    starts_at:            row.starts_at,
    ends_at:              row.ends_at,
    ticket_price:         row.ticket_price,
    capacity:             row.capacity,
    slug:                 row.slug,
    average_rating:       row.average_rating,
    rating_count:         row.rating_count,
    creator_id:           row.creator_id,
    creator_city:         row.creator?.city ?? '',
    creator_interest_tags: row.creator?.interest_tags ?? [],
  } satisfies BrowseEvent))

  if (filters.city) {
    const city = filters.city.toLowerCase()
    results = results.filter((e) => e.creator_city.toLowerCase() === city)
  }

  if (filters.interest_tag) {
    const tag = filters.interest_tag
    results = results.filter((e) => e.creator_interest_tags.includes(tag))
  }

  if (filters.date) {
    results = results.filter((e) => e.starts_at.startsWith(filters.date!))
  }

  return { events: results.slice(0, limit) }
}

// ---------------------------------------------------------------------------
// getSavedEvents
// ---------------------------------------------------------------------------

/**
 * Returns the current Explorer's saved events (upcoming and past, sorted by starts_at asc).
 */
export async function getSavedEvents(): Promise<{ events: Event[]; error: string | null }> {
  const { user } = await requireAuth()

  const admin = createAdminClient()

  const explorer = await getExplorerForUser(user.id)
  if (!explorer) return { events: [], error: 'Explorer profile not found.' }

  const savedIds = explorer.saved_event_ids ?? []
  if (!savedIds.length) return { events: [], error: null }

  const { data, error } = await admin
    .from('events')
    .select('*')
    .in('id', savedIds)
    .order('starts_at', { ascending: true })

  if (error) {
    console.error('[getSavedEvents]', error.message)
    return { events: [], error: 'Failed to load saved events.' }
  }

  return { events: data ?? [], error: null }
}

// ---------------------------------------------------------------------------
// getFollowedFeed
// ---------------------------------------------------------------------------

/**
 * Returns upcoming published events from creators the Explorer follows,
 * sorted by starts_at ascending.
 */
export async function getFollowedFeed(): Promise<{ events: Event[]; followedCount: number; error: string | null }> {
  const { user } = await requireAuth()

  const admin = createAdminClient()

  const explorer = await getExplorerForUser(user.id)
  if (!explorer) return { events: [], followedCount: 0, error: 'Explorer profile not found.' }

  const followedIds = explorer.followed_maker_ids ?? []
  if (!followedIds.length) return { events: [], followedCount: 0, error: null }

  const now = new Date().toISOString()

  const { data, error } = await admin
    .from('events')
    .select('*')
    .in('creator_id', followedIds)
    .eq('status', 'published')
    .gt('starts_at', now)
    .order('starts_at', { ascending: true })

  if (error) {
    console.error('[getFollowedFeed]', error.message)
    return { events: [], followedCount: followedIds.length, error: 'Failed to load feed.' }
  }

  return { events: data ?? [], followedCount: followedIds.length, error: null }
}

// ---------------------------------------------------------------------------
// rateEvent
// ---------------------------------------------------------------------------

/**
 * Lets an Explorer rate an event they attended (1–5 stars, optional review).
 *
 * Validates that the Explorer has an explorer_event_history row for this event
 * (i.e. they attended it). On success, updates the aggregate rating on the
 * events table.
 *
 * @returns `{ error: string | null }`
 */
export async function rateEvent(
  eventId: string,
  rating: number,
  review?: string,
): Promise<{ error: string | null }> {
  const { user } = await requireAuth()

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: 'Rating must be a whole number between 1 and 5.' }
  }

  const admin = createAdminClient()

  const explorer = await getExplorerForUser(user.id)
  if (!explorer) return { error: 'Explorer profile not found.' }

  // Verify the Explorer attended this event.
  const { data: historyRow, error: historyError } = await admin
    .from('explorer_event_history')
    .select('id, attended')
    .eq('explorer_id', explorer.id)
    .eq('event_id', eventId)
    .maybeSingle()

  if (historyError || !historyRow) {
    return { error: 'You can only rate events you have attended.' }
  }

  if (!historyRow.attended) {
    return { error: 'Your attendance for this event has not been confirmed yet.' }
  }

  // Write the rating to the history row.
  const { error: rateError } = await admin
    .from('explorer_event_history')
    .update({
      rating,
      review:   review ?? null,
      rated_at: new Date().toISOString(),
    })
    .eq('id', historyRow.id)

  if (rateError) {
    console.error('[rateEvent] history update', rateError.message)
    return { error: 'Failed to save your rating. Please try again.' }
  }

  // Recalculate and update the aggregate rating on the events table.
  const { data: allRatings } = await admin
    .from('explorer_event_history')
    .select('rating')
    .eq('event_id', eventId)
    .not('rating', 'is', null)

  if (allRatings?.length) {
    const avg =
      allRatings.reduce((sum, r) => sum + (r.rating ?? 0), 0) / allRatings.length

    // Store the rating in user_profiles.average_event_rating for the creator
    // by joining via the events table.
    const { data: event } = await admin
      .from('events')
      .select('creator_id')
      .eq('id', eventId)
      .maybeSingle()

    if (event) {
      await admin
        .from('user_profiles')
        .update({ average_event_rating: Math.round(avg * 100) / 100 })
        .eq('id', event.creator_id)
    }
  }

  return { error: null }
}

// ---------------------------------------------------------------------------
// triggerPostEventRating
// ---------------------------------------------------------------------------

/**
 * Called by the reconcile-payments cron 24 hours after an event's ends_at.
 *
 * For every captured RSVP on the event:
 *   1. Looks up the attendee's explorer_profile (skip if none).
 *   2. Upserts an explorer_event_history row with attended=true.
 *   3. Sets { pending_rating_<eventId>: true } in the attendee's auth
 *      user_metadata so the Explorer dashboard can show the rating prompt.
 *
 * This function uses the admin client throughout — it is server-only and
 * intentionally bypasses RLS.
 */
export async function triggerPostEventRating(eventId: string): Promise<void> {
  const admin = createAdminClient()

  // Fetch event details for the review prompt message.
  const { data: event } = await admin
    .from('events')
    .select('title, slug')
    .eq('id', eventId)
    .maybeSingle()

  // Fetch all captured RSVPs for this event that have a known auth user.
  const { data: rsvps, error: rsvpError } = await admin
    .from('rsvps')
    .select('id, attendee_user_id')
    .eq('event_id', eventId)
    .eq('payment_status', 'captured')
    .not('attendee_user_id', 'is', null)

  if (rsvpError) {
    console.error('[triggerPostEventRating] rsvps fetch failed', rsvpError.message)
    return
  }

  if (!rsvps?.length) return

  for (const rsvp of rsvps) {
    if (!rsvp.attendee_user_id) continue

    // Check if the attendee has an explorer profile.
    const { data: explorer } = await admin
      .from('explorer_profiles')
      .select('id')
      .eq('auth_user_id', rsvp.attendee_user_id)
      .maybeSingle()

    if (!explorer) continue

    // Upsert the history row — idempotent on (explorer_id, event_id).
    const { error: historyError } = await admin
      .from('explorer_event_history')
      .upsert(
        {
          explorer_id: explorer.id,
          event_id:    eventId,
          rsvp_id:     rsvp.id,
          attended:    true,
        },
        { onConflict: 'explorer_id,event_id', ignoreDuplicates: false },
      )

    if (historyError) {
      console.error(
        '[triggerPostEventRating] history upsert failed',
        { explorerId: explorer.id, eventId },
        historyError.message,
      )
      continue
    }

    // Set the pending_rating flag in user_metadata so the dashboard can
    // surface the rating prompt.
    const metaKey = `pending_rating_${eventId}`
    const { error: metaError } = await admin.auth.admin.updateUserById(
      rsvp.attendee_user_id,
      { user_metadata: { [metaKey]: true } },
    )

    if (metaError) {
      console.error(
        '[triggerPostEventRating] user_metadata update failed',
        { userId: rsvp.attendee_user_id },
        metaError.message,
      )
    }

    // Send WhatsApp review prompt if the attendee has a phone number.
    if (event) {
      const { data: authUser } = await admin.auth.admin.getUserById(rsvp.attendee_user_id)
      const phone = authUser?.user?.phone
      if (phone) {
        const reviewUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.wheninmycity.com'}/events/${event.slug}`
        const msg = [
          `⭐ How was "${event.title}"?`,
          `Your review helps other Explorers discover great events. Drop a quick rating here:`,
          reviewUrl,
        ].join('\n')
        sendWhatsAppMessage(phone, msg).catch((err) => {
          console.error('[triggerPostEventRating] WhatsApp review prompt failed', { userId: rsvp.attendee_user_id }, String(err))
        })
      }
    }
  }
}

// ---------------------------------------------------------------------------
// submitEventRating
// ---------------------------------------------------------------------------

/**
 * Lets an Explorer submit a star rating (1–5) and optional review (max 200 chars)
 * for an event they attended.
 *
 * Supersedes the earlier `rateEvent` with additional steps:
 *   - Uses the update_event_rating_aggregate RPC for atomic aggregation.
 *   - Calls evaluateMakerTier so new ratings can unlock tier upgrades.
 *   - Clears the pending_rating flag from auth user_metadata.
 *
 * @returns `{ error: string | null }`
 */
export async function submitEventRating(
  eventId: string,
  rating: number,
  review?: string,
): Promise<{ error: string | null }> {
  const { user } = await requireAuth()

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: 'Rating must be a whole number between 1 and 5.' }
  }

  if (review && review.length > 200) {
    return { error: 'Review must be 200 characters or fewer.' }
  }

  const admin = createAdminClient()

  const explorer = await getExplorerForUser(user.id)
  if (!explorer) return { error: 'Explorer profile not found.' }

  // Verify the Explorer attended this event.
  const { data: historyRow, error: historyFetchError } = await admin
    .from('explorer_event_history')
    .select('id, attended, rating')
    .eq('explorer_id', explorer.id)
    .eq('event_id', eventId)
    .maybeSingle()

  if (historyFetchError || !historyRow) {
    return { error: 'You can only rate events you have attended.' }
  }

  if (!historyRow.attended) {
    return { error: 'Your attendance for this event has not been confirmed yet.' }
  }

  const isFirstReview = historyRow.rating === null

  // Write the rating.
  const { error: rateError } = await admin
    .from('explorer_event_history')
    .update({
      rating,
      review:   review ?? null,
      rated_at: new Date().toISOString(),
    })
    .eq('id', historyRow.id)

  if (rateError) {
    console.error('[submitEventRating] history update failed', rateError.message)
    return { error: 'Failed to save your rating. Please try again.' }
  }

  if (isFirstReview) {
    bumpUserMetric(admin, user.id, 'reviews_posted_count', 1, 'submitEventRating')
  }

  // Recalculate event aggregate via SECURITY DEFINER RPC.
  const { error: rpcError } = await admin.rpc('update_event_rating_aggregate', {
    event_id_param: eventId,
  })

  if (rpcError) {
    // Non-fatal: log and continue so the rating is not lost.
    console.error('[submitEventRating] rating aggregate RPC failed', rpcError.message)
  }

  // Fetch creator_id and venue_adda_id to re-evaluate tier and notify adda owner.
  const { data: event } = await admin
    .from('events')
    .select('creator_id, venue_adda_id')
    .eq('id', eventId)
    .maybeSingle()

  if (event?.creator_id) {
    // Fire-and-forget: tier evaluation failure should not block the response.
    evaluateMakerTier(event.creator_id).catch((err) => {
      console.error('[submitEventRating] evaluateMakerTier failed', String(err))
    })
  }

  // Notify adda owner of the new rating (fire-and-forget)
  const venueAddaId = event?.venue_adda_id ?? null
  if (venueAddaId) {
    void (async () => {
      try {
        const { data: addaOwner } = await admin
          .from('adda_profiles')
          .select('auth_user_id, name')
          .eq('id', venueAddaId)
          .maybeSingle()
        if (addaOwner?.auth_user_id) {
          const { createNotification } = await import('@/app/actions/notifications')
          await createNotification({
            recipientId: addaOwner.auth_user_id,
            type: 'adda_new_rating',
            title: 'New event rating',
            body: `An attendee gave ${rating}★ for an event at ${addaOwner.name}.`,
            actionUrl: '/business/venue/analytics',
          })
        }
      } catch {}
    })()
  }

  // Clear the pending_rating flag from user_metadata.
  const metaKey = `pending_rating_${eventId}`
  await admin.auth.admin
    .updateUserById(user.id, {
      user_metadata: { [metaKey]: null },
    })
    .catch((err) => {
      console.error('[submitEventRating] metadata clear failed', String(err))
    })

  return { error: null }
}

// ---------------------------------------------------------------------------
// getExplorerEventHistory
// ---------------------------------------------------------------------------

export interface ExplorerEventHistoryResult {
  upcoming: Array<Event & { rsvp: Rsvp }>
  past:     Array<Event & { attended: boolean; rating: number | null; review: string | null }>
  saved:    Event[]
}

/**
 * Returns the Explorer's complete event history and saved events.
 * Used for the Explorer's "My Events" page.
 *
 * - upcoming: events the Explorer has a captured RSVP for that haven't started yet.
 * - past:     events from explorer_event_history (attended records).
 * - saved:    events in explorer_profiles.saved_event_ids.
 */
export async function getExplorerEventHistory(
  explorerId: string,
): Promise<ExplorerEventHistoryResult> {
  const admin   = createAdminClient()
  const empty   = { upcoming: [], past: [], saved: [] }

  const { data: explorer } = await admin
    .from('explorer_profiles')
    .select('auth_user_id, saved_event_ids')
    .eq('id', explorerId)
    .maybeSingle()

  if (!explorer) return empty

  const now = new Date().toISOString()

  // ── Upcoming: captured RSVPs for future events ────────────────────────────
  const { data: upcomingRsvps } = await admin
    .from('rsvps')
    .select('*, events(*)')
    .eq('attendee_user_id', explorer.auth_user_id)
    .eq('payment_status', 'captured')

  const upcoming: Array<Event & { rsvp: Rsvp }> = []
  for (const row of upcomingRsvps ?? []) {
    const event = row.events as Event | null
    if (!event || event.starts_at <= now) continue
    const { events: _events, ...rsvp } = row as typeof row & { events: unknown }
    upcoming.push({ ...event, rsvp: rsvp as Rsvp })
  }
  upcoming.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())

  // ── Past: events with explorer_event_history rows ─────────────────────────
  const { data: historyRows } = await admin
    .from('explorer_event_history')
    .select('event_id, attended, rating, review')
    .eq('explorer_id', explorerId)

  const historyByEventId = new Map(
    (historyRows ?? []).map((h) => [
      h.event_id,
      { attended: h.attended, rating: h.rating, review: h.review },
    ]),
  )

  const pastEventIds = [...historyByEventId.keys()]
  const past: Array<Event & { attended: boolean; rating: number | null; review: string | null }> = []

  if (pastEventIds.length > 0) {
    const { data: pastEvents } = await admin
      .from('events')
      .select('*')
      .in('id', pastEventIds)

    for (const event of pastEvents ?? []) {
      const meta = historyByEventId.get(event.id)!
      past.push({ ...event, ...meta })
    }
    past.sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime())
  }

  // ── Saved events ──────────────────────────────────────────────────────────
  const savedIds = explorer.saved_event_ids ?? []
  let saved: Event[] = []

  if (savedIds.length > 0) {
    const { data: savedEvents } = await admin
      .from('events')
      .select('*')
      .in('id', savedIds)
      .order('starts_at', { ascending: true })

    saved = savedEvents ?? []
  }

  return { upcoming, past, saved }
}

// ---------------------------------------------------------------------------
// getExplorerProfile (public-facing — for the settings page)
// ---------------------------------------------------------------------------

/**
 * Returns the explorer_profiles row for the authenticated user.
 * Used by the settings page to pre-fill the form.
 */
export async function getExplorerProfile(): Promise<{ profile: ExplorerProfile | null; error: string | null }> {
  const { user } = await requireAuth()
  const profile = await getExplorerForUser(user.id)
  return { profile, error: null }
}

// ---------------------------------------------------------------------------
// updateExplorerProfile
// ---------------------------------------------------------------------------

export interface UpdateExplorerInput {
  display_name: string
  city: string
  interest_tags: string[]
  neighbourhood_preference: string | null
  price_range_max_paise: number
  preferred_formats: string[]
  notification_preferences: {
    whatsapp: boolean
    digest_frequency: 'daily' | 'weekly' | 'never'
  }
  explorer_scene?: string
  explorer_creator_intent?: string[]
}

/**
 * Updates the explorer's profile settings. All fields are replaced on save.
 */
export async function updateExplorerProfile(
  data: UpdateExplorerInput,
): Promise<{ error: string | null }> {
  const { user } = await requireAuth()

  if (!data.display_name.trim()) return { error: 'Name is required.' }
  if (!data.city) return { error: 'City is required.' }

  if (data.interest_tags.length < 3 || data.interest_tags.length > 5) {
    return { error: 'Please select between 3 and 5 interests.' }
  }

  const validIds = new Set(INTEREST_TAGS.map((t) => t.id))
  const invalid = data.interest_tags.filter((t) => !validIds.has(t))
  if (invalid.length) return { error: `Invalid interest tag(s): ${invalid.join(', ')}` }

  const admin = createAdminClient()

  const { error: epError } = await admin
    .from('explorer_profiles')
    .update({
      display_name:             data.display_name.trim(),
      city:                     data.city,
      interest_tags:            data.interest_tags,
      neighbourhood_preference: data.neighbourhood_preference || null,
      price_range_max_paise:    data.price_range_max_paise,
      preferred_formats:        data.preferred_formats,
      notification_preferences: data.notification_preferences,
    })
    .eq('auth_user_id', user.id)

  if (epError) {
    console.error('[updateExplorerProfile]', epError.message)
    return { error: 'Failed to save your settings. Please try again.' }
  }

  if (data.explorer_scene !== undefined || data.explorer_creator_intent !== undefined) {
    const upUpdates: Record<string, unknown> = {}
    if (data.explorer_scene !== undefined) upUpdates.explorer_scene = data.explorer_scene || null
    if (data.explorer_creator_intent !== undefined) upUpdates.explorer_creator_intent = data.explorer_creator_intent

    const { error: upError } = await admin
      .from('user_profiles')
      .update(upUpdates)
      .eq('id', user.id)

    if (upError) {
      console.error('[updateExplorerProfile] user_profiles', upError.message)
      return { error: 'Failed to save your settings. Please try again.' }
    }
  }

  return { error: null }
}

// ---------------------------------------------------------------------------
// updateExplorerStudioProfile — lightweight studio content save
// Updates only the public-facing identity fields on explorer_profiles
// ---------------------------------------------------------------------------

export async function updateExplorerStudioProfile(input: {
  display_name: string
  city:         string
  interest_tags: string[]
}): Promise<{ error: string | null }> {
  const { user } = await requireAuth()

  if (!input.display_name.trim()) return { error: 'Name is required.' }
  if (!input.city) return { error: 'City is required.' }
  if (input.interest_tags.length < 1 || input.interest_tags.length > 5) {
    return { error: 'Select between 1 and 5 interests.' }
  }

  const admin = createAdminClient()

  const { error } = await admin
    .from('explorer_profiles')
    .update({
      display_name:  input.display_name.trim(),
      city:          input.city,
      interest_tags: input.interest_tags,
    })
    .eq('auth_user_id', user.id)

  if (error) {
    console.error('[updateExplorerStudioProfile]', error.message)
    return { error: 'Failed to save. Please try again.' }
  }

  revalidatePath('/explore/dashboard/studio')
  return { error: null }
}

// ---------------------------------------------------------------------------
// getExplorerIdentity — identity card data for the profile surface
// Joins explorer_profiles (display name, avatar, city, interests) with
// user_profiles (bio, instagram) into one type-safe response.
// ---------------------------------------------------------------------------

export interface ExplorerIdentity {
  displayName:     string
  avatarUrl:       string | null
  city:            string
  interestTags:    string[]
  bio:             string | null
  instagramHandle: string | null
}

export async function getExplorerIdentity(): Promise<ExplorerIdentity | null> {
  const { user } = await requireAuth('/signin')
  const admin    = createAdminClient()

  const [ep, up] = await Promise.all([
    admin
      .from('explorer_profiles')
      .select('display_name, avatar_url, city, interest_tags')
      .eq('auth_user_id', user.id)
      .maybeSingle(),
    admin
      .from('user_profiles')
      .select('bio, instagram_handle')
      .eq('id', user.id)
      .maybeSingle(),
  ])

  if (!ep.data) return null

  return {
    displayName:     ep.data.display_name,
    avatarUrl:       ep.data.avatar_url   ?? null,
    city:            ep.data.city,
    interestTags:    ep.data.interest_tags ?? [],
    bio:             up.data?.bio              ?? null,
    instagramHandle: up.data?.instagram_handle ?? null,
  }
}

// ---------------------------------------------------------------------------
// updateExplorerPublicProfile — updates user_profiles fields (bio, instagram)
// that appear on the explorer's public page
// ---------------------------------------------------------------------------

export async function updateExplorerPublicProfile(input: {
  bio?:              string
  instagram_handle?: string
}): Promise<{ error: string | null }> {
  const { user } = await requireAuth()
  const admin = createAdminClient()

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.bio              !== undefined) updates.bio              = input.bio || null
  if (input.instagram_handle !== undefined) updates.instagram_handle = input.instagram_handle || null

  const { error } = await admin.from('user_profiles').update(updates).eq('id', user.id)

  if (error) {
    console.error('[updateExplorerPublicProfile]', error.message)
    return { error: 'Failed to save changes.' }
  }

  revalidatePath('/explore/dashboard/studio')
  return { error: null }
}
