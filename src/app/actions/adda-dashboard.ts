'use server'

// =============================================================================
// WIMC — Adda dashboard server actions
// Data-fetching and write actions called by the Adda owner's dashboard UI.
// =============================================================================

import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth/requireAuth'
import { calculateRevenueSplit } from '@/lib/revenue'
import { REVENUE_SPLITS } from '@/lib/constants/interests'
import type {
  AddaProfile,
  AddaAvailability,
  MakerAddaProposal,
  Event,
  UserProfile,
  UserTier,
  AvailabilitySlotType,
  AvailabilityStatus,
  Json,
} from '@/types/database'
import type { RevenueSplitConfig } from '@/lib/revenue'

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

/** A single entry in the Adda's recent revenue stream. */
export interface RevenueEntry {
  event_id: string
  event_title: string
  event_date: string
  ticket_revenue_paise: number
  adda_share_paise: number
  attendee_count: number
}

/** Aggregate statistics for the Adda dashboard hero section. */
export interface AddaDashboardStats {
  total_events_hosted: number
  total_revenue_paise: number
  average_maker_rating: number
  this_month_events: number
}

// ---------------------------------------------------------------------------
// Ownership helper
// ---------------------------------------------------------------------------

/**
 * Resolves the `adda_profiles` row owned by the currently authenticated user.
 * Returns `null` if the user has no Adda profile.
 */
async function resolveOwnedAdda(
  userId: string,
  admin: ReturnType<typeof createAdminClient>,
): Promise<AddaProfile | null> {
  const { data, error } = await admin
    .from('adda_profiles')
    .select('*')
    .eq('auth_user_id', userId)
    .maybeSingle()

  if (error) console.error('[resolveOwnedAdda]', error.message)
  return data ?? null
}

// ---------------------------------------------------------------------------
// getAddaDashboardData
// ---------------------------------------------------------------------------

/**
 * Returns all data needed to render the Adda dashboard in a single round-trip.
 *
 * Fetches:
 *  - Full Adda profile
 *  - Upcoming published events at this Adda (next 60 days)
 *  - Pending + counter-offered proposals
 *  - Recent revenue entries (last 10 completed events)
 *  - This month's availability slots
 *  - Aggregate stats
 *
 * Access control: `requireAuth()` + ownership check via `auth_user_id`.
 *
 * @param addaId  The `adda_profiles.id` to load. Must belong to the caller.
 */
export async function getAddaDashboardData(addaId: string): Promise<{
  adda: AddaProfile
  upcomingEvents: Event[]
  pendingProposals: MakerAddaProposal[]
  recentRevenue: RevenueEntry[]
  availabilityThisMonth: AddaAvailability[]
  stats: AddaDashboardStats
} | { error: string }> {
  const { user } = await requireAuth('/adda/dashboard')

  // Validate addaId is a UUID
  const uuidResult = z.string().uuid().safeParse(addaId)
  if (!uuidResult.success) return { error: 'Invalid Adda ID.' }

  const admin = createAdminClient()

  const adda = await resolveOwnedAdda(user.id, admin)
  if (!adda || adda.id !== addaId) {
    return { error: 'Adda not found or you do not own this profile.' }
  }

  const now = new Date().toISOString()
  const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString()
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split('T')[0]
  const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
    .toISOString()
    .split('T')[0]

  const [
    upcomingResult,
    pendingProposalsResult,
    revenueResult,
    availabilityResult,
  ] = await Promise.all([
    // Upcoming events linked to this adda
    admin
      .from('events')
      .select('*')
      .eq('venue_adda_id', addaId)
      .eq('status', 'published')
      .gte('starts_at', now)
      .lte('starts_at', endOfMonth)
      .order('starts_at', { ascending: true })
      .limit(20),

    // Pending or counter-offered proposals
    admin
      .from('maker_adda_proposals')
      .select('*')
      .eq('adda_id', addaId)
      .in('status', ['pending', 'counter_offered'])
      .order('created_at', { ascending: false })
      .limit(20),

    // Last 10 completed events with RSVPs
    admin
      .from('events')
      .select('id, title, starts_at, ticket_price')
      .eq('venue_adda_id', addaId)
      .eq('status', 'completed')
      .order('starts_at', { ascending: false })
      .limit(10),

    // This month's availability
    admin
      .from('adda_availability')
      .select('*')
      .eq('adda_id', addaId)
      .gte('date', monthStart)
      .lte('date', monthEnd)
      .order('date', { ascending: true }),
  ])

  // Build revenue entries by fetching RSVP counts per event
  const revenueEvents = revenueResult.data ?? []
  const recentRevenue: RevenueEntry[] = []

  if (revenueEvents.length) {
    const eventIds = revenueEvents.map((e) => e.id)

    const { data: rsvpCounts } = await admin
      .from('rsvps')
      .select('event_id, amount_paid')
      .in('event_id', eventIds)
      .eq('payment_status', 'captured')

    const countMap = new Map<string, { count: number; total: number }>()
    for (const r of rsvpCounts ?? []) {
      const existing = countMap.get(r.event_id) ?? { count: 0, total: 0 }
      countMap.set(r.event_id, {
        count: existing.count + 1,
        total: existing.total + (r.amount_paid ?? 0),
      })
    }

    for (const ev of revenueEvents) {
      const agg = countMap.get(ev.id) ?? { count: 0, total: 0 }
      // Use mohalla split as conservative default (actual split stored separately)
      const split = calculateRevenueSplit(ev.ticket_price, agg.count, 'wanderer', true)
      recentRevenue.push({
        event_id:            ev.id,
        event_title:         ev.title,
        event_date:          ev.starts_at,
        ticket_revenue_paise: agg.total,
        adda_share_paise:    split.venuePaise,
        attendee_count:      agg.count,
      })
    }
  }

  // This-month event count
  const { count: thisMonthCount } = await admin
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('venue_adda_id', addaId)
    .gte('starts_at', monthStart)
    .lte('starts_at', monthEnd)

  const stats: AddaDashboardStats = {
    total_events_hosted:  adda.total_events_hosted,
    total_revenue_paise:  adda.total_revenue_earned_paise,
    average_maker_rating: adda.average_maker_rating,
    this_month_events:    thisMonthCount ?? 0,
  }

  return {
    adda,
    upcomingEvents:         upcomingResult.data ?? [],
    pendingProposals:       pendingProposalsResult.data ?? [],
    recentRevenue,
    availabilityThisMonth:  availabilityResult.data ?? [],
    stats,
  }
}

// ---------------------------------------------------------------------------
// bulkUpdateAvailability
// ---------------------------------------------------------------------------

const BulkSlotSchema = z.object({
  date:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  slot_type: z.enum(['morning', 'afternoon', 'evening', 'full_day']),
  status:    z.enum(['available', 'blocked']),
})

/**
 * Upserts multiple availability slots for an Adda in a single operation.
 * Intended for calendar drag-to-block interactions where many dates change
 * at once.
 *
 * Access control: caller must own the Adda.
 *
 * @param addaId  Target Adda profile ID.
 * @param slots   Array of `{ date, slot_type, status }` — only 'available' and
 *                'blocked' are writable here; 'confirmed' and 'pending' are
 *                managed by the proposal system.
 * @returns `{ error: string | null }`
 */
export async function bulkUpdateAvailability(
  addaId: string,
  slots: Array<{ date: string; slot_type: string; status: 'available' | 'blocked' }>,
): Promise<{ error: string | null }> {
  const { user } = await requireAuth()

  if (!slots.length) return { error: null }

  const slotsParsed = z.array(BulkSlotSchema).safeParse(slots)
  if (!slotsParsed.success) {
    return { error: slotsParsed.error.errors[0].message }
  }

  const admin = createAdminClient()

  const adda = await resolveOwnedAdda(user.id, admin)
  if (!adda || adda.id !== addaId) {
    return { error: 'Adda not found or you do not own this profile.' }
  }

  // Only allow updating non-confirmed / non-pending slots (don't clobber accepted proposals)
  const rows = slotsParsed.data.map((s) => ({
    adda_id:   addaId,
    date:      s.date,
    slot_type: s.slot_type as AvailabilitySlotType,
    status:    s.status as AvailabilityStatus,
  }))

  // Fetch existing confirmed/pending slots to exclude from the upsert
  const dateSet = [...new Set(rows.map((r) => r.date))]
  const { data: locked } = await admin
    .from('adda_availability')
    .select('date, slot_type')
    .eq('adda_id', addaId)
    .in('date', dateSet)
    .in('status', ['confirmed', 'pending'])

  const lockedSet = new Set(
    (locked ?? []).map((l) => `${l.date}::${l.slot_type}`)
  )

  const upsertRows = rows.filter(
    (r) => !lockedSet.has(`${r.date}::${r.slot_type}`)
  )

  if (!upsertRows.length) return { error: null }

  const { error: upsertError } = await admin
    .from('adda_availability')
    .upsert(upsertRows, { onConflict: 'adda_id,date,slot_type' })

  if (upsertError) {
    console.error('[bulkUpdateAvailability]', upsertError.message)
    return { error: 'Failed to update availability. Please try again.' }
  }

  return { error: null }
}

// ---------------------------------------------------------------------------
// getAddaEventHistory
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20

/** Event row joined with maker profile and revenue aggregates. */
export interface AddaEventHistoryRow {
  id: string
  title: string
  starts_at: string
  ends_at: string | null
  cover_image_url: string | null
  status: string
  ticket_price: number
  maker: Pick<UserProfile, 'display_name' | 'username' | 'avatar_url' | 'creator_type'>
  attendee_count: number
  revenue_paise: number
}

/**
 * Returns a paginated history of events hosted at this Adda, joined with the
 * Maker's profile and RSVP aggregates.
 *
 * Access control: caller must own the Adda.
 *
 * @param addaId  Target Adda profile ID.
 * @param page    1-indexed page number (default: 1).
 * @returns `{ events, totalCount, error }`
 */
export async function getAddaEventHistory(
  addaId: string,
  page = 1,
): Promise<{ events: AddaEventHistoryRow[]; totalCount: number; error: string | null }> {
  const { user } = await requireAuth()

  const admin = createAdminClient()

  const adda = await resolveOwnedAdda(user.id, admin)
  if (!adda || adda.id !== addaId) {
    return { events: [], totalCount: 0, error: 'Adda not found or you do not own this profile.' }
  }

  const offset = (Math.max(page, 1) - 1) * PAGE_SIZE

  const [eventsResult, countResult] = await Promise.all([
    admin
      .from('events')
      .select('id, title, starts_at, ends_at, cover_image_url, status, ticket_price, creator_id')
      .eq('venue_adda_id', addaId)
      .in('status', ['completed', 'published', 'cancelled'])
      .order('starts_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1),

    admin
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('venue_adda_id', addaId)
      .in('status', ['completed', 'published', 'cancelled']),
  ])

  const events = eventsResult.data ?? []
  const totalCount = countResult.count ?? 0

  if (!events.length) return { events: [], totalCount, error: null }

  // Batch-fetch maker profiles
  const creatorIds = [...new Set(events.map((e) => e.creator_id))]
  const { data: makers } = await admin
    .from('user_profiles')
    .select('id, display_name, username, avatar_url, creator_type')
    .in('id', creatorIds)

  const makerMap = new Map(
    (makers ?? []).map((m) => [m.id, m])
  )

  // Batch-fetch RSVP aggregates
  const eventIds = events.map((e) => e.id)
  const { data: rsvps } = await admin
    .from('rsvps')
    .select('event_id, amount_paid')
    .in('event_id', eventIds)
    .eq('payment_status', 'captured')

  const rsvpMap = new Map<string, { count: number; total: number }>()
  for (const r of rsvps ?? []) {
    const agg = rsvpMap.get(r.event_id) ?? { count: 0, total: 0 }
    rsvpMap.set(r.event_id, { count: agg.count + 1, total: agg.total + (r.amount_paid ?? 0) })
  }

  const rows: AddaEventHistoryRow[] = events.map((ev) => {
    const maker = makerMap.get(ev.creator_id)
    const agg = rsvpMap.get(ev.id) ?? { count: 0, total: 0 }
    return {
      id:              ev.id,
      title:           ev.title,
      starts_at:       ev.starts_at,
      ends_at:         ev.ends_at,
      cover_image_url: ev.cover_image_url,
      status:          ev.status,
      ticket_price:    ev.ticket_price,
      maker: {
        display_name: maker?.display_name ?? 'Unknown Maker',
        username:     maker?.username ?? '',
        avatar_url:   maker?.avatar_url ?? null,
        creator_type: maker?.creator_type ?? 'content_creation',
      },
      attendee_count: agg.count,
      revenue_paise:  agg.total,
    }
  })

  return { events: rows, totalCount, error: null }
}

// ---------------------------------------------------------------------------
// getAddaRevenueSplits
// ---------------------------------------------------------------------------

/**
 * Calculates and returns the three-way revenue split for a specific event
 * hosted at this Adda.
 *
 * The maker's tier at event time is inferred from `user_tier_history` —
 * the most recent tier change record whose `triggered_at` is ≤ the event's
 * `starts_at`. Falls back to 'wanderer' if no history exists.
 *
 * Revenue figures are computed from captured RSVPs (`payment_status = 'captured'`).
 *
 * Access control: caller must own the Adda.
 *
 * @param addaId   Adda profile ID.
 * @param eventId  Event ID.
 * @returns Revenue breakdown or an `{ error }` object.
 */
export async function getAddaRevenueSplits(
  addaId: string,
  eventId: string,
): Promise<{
  total_ticket_revenue_paise: number
  adda_share_paise: number
  maker_share_paise: number
  platform_share_paise: number
  split_config: RevenueSplitConfig
  status: 'pending' | 'paid'
} | { error: string }> {
  const { user } = await requireAuth()

  const admin = createAdminClient()

  const adda = await resolveOwnedAdda(user.id, admin)
  if (!adda || adda.id !== addaId) {
    return { error: 'Adda not found or you do not own this profile.' }
  }

  // Fetch the event
  const { data: event } = await admin
    .from('events')
    .select('id, creator_id, starts_at, ticket_price, status, venue_adda_id')
    .eq('id', eventId)
    .eq('venue_adda_id', addaId)
    .maybeSingle()

  if (!event) {
    return { error: 'Event not found at this Adda.' }
  }

  // Determine maker tier at time of event
  const { data: tierHistory } = await admin
    .from('user_tier_history')
    .select('new_tier, triggered_at')
    .eq('user_id', event.creator_id)
    .lte('triggered_at', event.starts_at)
    .order('triggered_at', { ascending: false })
    .limit(1)

  const makerTierAtEvent = (tierHistory?.[0]?.new_tier ?? 'wanderer') as UserTier

  // Sum captured RSVP revenue
  const { data: rsvps } = await admin
    .from('rsvps')
    .select('amount_paid')
    .eq('event_id', eventId)
    .eq('payment_status', 'captured')

  const totalRevenuePaise = (rsvps ?? []).reduce((sum, r) => sum + (r.amount_paid ?? 0), 0)
  const quantity = rsvps?.length ?? 0

  // Compute split using per-ticket price × quantity
  const result = calculateRevenueSplit(
    quantity > 0 ? Math.round(totalRevenuePaise / quantity) : event.ticket_price,
    quantity,
    makerTierAtEvent,
    true, // hasVenue = true (this Adda)
  )

  // Check if a settled revenue record already exists
  const { data: revenueRecord } = await admin
    .from('adda_event_revenue')
    .select('status')
    .eq('adda_id', addaId)
    .eq('event_id', eventId)
    .maybeSingle()

  // Upsert the revenue record with current figures
  await admin
    .from('adda_event_revenue')
    .upsert(
      {
        adda_id:               addaId,
        event_id:              eventId,
        total_revenue_paise:   result.totalPaise,
        adda_share_paise:      result.venuePaise,
        maker_share_paise:     result.makerPaise,
        platform_share_paise:  result.platformPaise,
        razorpay_fee_paise:    result.razorpayFeePaise,
        gst_on_platform_paise: result.gstOnPlatformFeePaise,
        split_config:          result.config as unknown as Json,
        status:                revenueRecord?.status ?? 'pending',
      },
      { onConflict: 'adda_id,event_id' },
    )
    .then(
      () => { /* success */ },
      (e: Error) => console.error('[getAddaRevenueSplits] upsert', e.message),
    )

  const splitFromTier = REVENUE_SPLITS[makerTierAtEvent] ?? REVENUE_SPLITS['wanderer']

  const splitConfig: RevenueSplitConfig = {
    makerFraction:    splitFromTier.maker,
    venueFraction:    splitFromTier.venue,
    platformFraction: splitFromTier.platform,
    payoutDays:       splitFromTier.payoutDays,
    makerTier:        makerTierAtEvent,
    hasVenue:         true,
  }

  return {
    total_ticket_revenue_paise: result.totalPaise,
    adda_share_paise:           result.venuePaise,
    maker_share_paise:          result.makerPaise,
    platform_share_paise:       result.platformPaise,
    split_config:               splitConfig,
    status:                     (revenueRecord?.status ?? 'pending') as 'pending' | 'paid',
  }
}
