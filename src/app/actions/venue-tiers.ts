'use server'

// =============================================================================
// WIMC — Venue Tier Evaluation
//
// Two-axis tier system:
//   Trust axis (permanent):  Open → Verified → Beloved → Legendary
//   Velocity overlay (monthly, time-bound): Trending
//
// Called by /api/cron/evaluate-venue-tiers on a monthly schedule.
// =============================================================================

import { createAdminClient } from '@/lib/supabase/admin'
import type { VenueTier } from '@/types/database'

const DAY_MS = 24 * 60 * 60 * 1000

// ---------------------------------------------------------------------------
// Thresholds (from §6.7 design spec)
// ---------------------------------------------------------------------------

const THRESHOLDS = {
  verified: {
    minEventsLifetime: 3,
    minReviews: 10,
    minRating: 4.0,
  },
  beloved: {
    minEventsIn180d: 30,
    minReviews: 100,
    minRating: 4.6,
    minUniqueLanternBeaconHosts: 3,
    maxComplaintRate: 0.02,
    minOnTimeRate: 0.90,
  },
  legendary: {
    minEventsIn365d: 150,
    minReviews: 500,
    minRating: 4.7,
    minUniqueBeaconHosts: 10,
    minRepeatAttendeeRate: 0.40,
    minBelovedYears: 2,
  },
  trending: {
    minEventsIn30d: 10,
    minAttendanceGrowth: 0.30,   // 30 % MoM
    minRatingIn30d: 4.5,
    minCapacityUtilization: 0.70,
    validityDays: 30,
  },
} as const

// ---------------------------------------------------------------------------
// evaluateVenueTier
// ---------------------------------------------------------------------------

export interface VenueTierEvaluationResult {
  venueId: string
  previousTier: VenueTier
  newTier: VenueTier
  tierChanged: boolean
  metrics: {
    totalEventsHosted: number
    eventsIn180d: number
    eventsIn365d: number
    reviewCount: number
    averageRating: number
    uniqueLanternBeaconHosts: number
    repeatAttendeeRate: number
    onTimeRate: number
    complaintRate: number
    beloved_since: string | null
  }
}

export async function evaluateVenueTier(venueId: string): Promise<VenueTierEvaluationResult> {
  const admin = createAdminClient()
  const now   = new Date()

  // ── 1. Fetch venue profile ──────────────────────────────────────────────────
  const { data: venue, error: venueError } = await admin
    .from('venue_profiles')
    .select('id, is_verified, is_active, name, address, city, total_events_hosted, average_maker_rating, venue_tier, on_time_rate, complaint_rate, beloved_since')
    .eq('id', venueId)
    .maybeSingle()

  if (venueError || !venue) {
    throw new Error(`[evaluateVenueTier] venue not found: ${venueId}`)
  }

  const previousTier = venue.venue_tier as VenueTier

  // ── 2. Fetch event IDs at this venue in rolling windows ────────────────────
  const d180 = new Date(now.getTime() - 180 * DAY_MS).toISOString()
  const d365 = new Date(now.getTime() - 365 * DAY_MS).toISOString()

  const [events180Result, events365Result, allEventsResult] = await Promise.all([
    admin.from('events').select('id').eq('venue_id', venueId).in('status', ['published', 'completed']).gte('starts_at', d180),
    admin.from('events').select('id').eq('venue_id', venueId).in('status', ['published', 'completed']).gte('starts_at', d365),
    admin.from('events').select('id').eq('venue_id', venueId).in('status', ['published', 'completed']),
  ])

  const ids180 = (events180Result.data ?? []).map((e) => e.id)
  const ids365 = (events365Result.data ?? []).map((e) => e.id)
  const allIds = (allEventsResult.data ?? []).map((e) => e.id)

  // ── 3. Review count and average rating (all-time) ─────────────────────────
  let reviewCount   = 0
  let averageRating = 0

  if (allIds.length > 0) {
    const { data: ratings } = await admin
      .from('explorer_event_history')
      .select('rating')
      .in('event_id', allIds)
      .not('rating', 'is', null)

    reviewCount = ratings?.length ?? 0
    if (reviewCount > 0) {
      averageRating = (ratings!.reduce((s, r) => s + (r.rating ?? 0), 0) / reviewCount)
      averageRating = Math.round(averageRating * 100) / 100
    }
  }

  // ── 4. Unique Lantern/Beacon makers who hosted here ───────────────────────
  let uniqueLanternBeaconHosts = 0

  const { data: acceptedProposals } = await admin
    .from('maker_venue_proposals')
    .select('maker_id')
    .eq('venue_id', venueId)
    .eq('status', 'accepted')

  const uniqueMakerIds = [...new Set((acceptedProposals ?? []).map((p) => p.maker_id))]

  if (uniqueMakerIds.length > 0) {
    const { data: highTierMakers } = await admin
      .from('user_profiles')
      .select('id')
      .in('id', uniqueMakerIds)
      .in('user_tier', ['lantern', 'beacon'])

    uniqueLanternBeaconHosts = highTierMakers?.length ?? 0
  }

  // ── 5. Repeat attendee rate ───────────────────────────────────────────────
  let repeatAttendeeRate = venue.beloved_since ? (venue as unknown as { repeat_attendee_rate: number }).repeat_attendee_rate : 0

  if (allIds.length > 0) {
    const { data: rsvpRows } = await admin
      .from('rsvps')
      .select('attendee_user_id, event_id')
      .in('event_id', allIds)
      .eq('payment_status', 'captured')
      .not('attendee_user_id', 'is', null)

    if (rsvpRows?.length) {
      // Count unique events per attendee (using a Set to handle quantity > 1 orders)
      const attendeeEvents = new Map<string, Set<string>>()
      for (const r of rsvpRows) {
        if (!r.attendee_user_id) continue
        const events = attendeeEvents.get(r.attendee_user_id) ?? new Set<string>()
        events.add(r.event_id)
        attendeeEvents.set(r.attendee_user_id, events)
      }
      const totalUnique = attendeeEvents.size
      const repeatCount = [...attendeeEvents.values()].filter((s) => s.size > 1).length
      repeatAttendeeRate = totalUnique > 0 ? Math.round((repeatCount / totalUnique) * 1000) / 1000 : 0
    }
  }

  // ── 6. On-time rate (reuse stored value — updated separately by check-in flow) ──
  const onTimeRate    = venue.on_time_rate
  const complaintRate = venue.complaint_rate

  // ── 7. Determine new tier (gates applied top-down) ────────────────────────
  const profileComplete = venue.is_verified && !!venue.name && !!venue.address && !!venue.city

  let newTier: VenueTier = 'open'

  if (
    profileComplete &&
    venue.total_events_hosted >= THRESHOLDS.verified.minEventsLifetime &&
    reviewCount   >= THRESHOLDS.verified.minReviews &&
    averageRating >= THRESHOLDS.verified.minRating
  ) {
    newTier = 'verified'
  }

  if (
    newTier === 'verified' &&
    ids180.length  >= THRESHOLDS.beloved.minEventsIn180d &&
    reviewCount    >= THRESHOLDS.beloved.minReviews &&
    averageRating  >= THRESHOLDS.beloved.minRating &&
    uniqueLanternBeaconHosts >= THRESHOLDS.beloved.minUniqueLanternBeaconHosts &&
    complaintRate  <= THRESHOLDS.beloved.maxComplaintRate &&
    onTimeRate     >= THRESHOLDS.beloved.minOnTimeRate
  ) {
    newTier = 'beloved'
  }

  // Legendary requires Beloved tenure of ≥ 2 consecutive years
  const belovedSince      = venue.beloved_since ? new Date(venue.beloved_since) : null
  const belovedYears      = belovedSince ? (now.getTime() - belovedSince.getTime()) / (365 * DAY_MS) : 0
  const hasBelovedTenure  = belovedYears >= THRESHOLDS.legendary.minBelovedYears

  if (
    newTier === 'beloved' &&
    hasBelovedTenure &&
    ids365.length    >= THRESHOLDS.legendary.minEventsIn365d &&
    reviewCount      >= THRESHOLDS.legendary.minReviews &&
    averageRating    >= THRESHOLDS.legendary.minRating &&
    uniqueLanternBeaconHosts >= THRESHOLDS.legendary.minUniqueBeaconHosts &&
    repeatAttendeeRate >= THRESHOLDS.legendary.minRepeatAttendeeRate
  ) {
    newTier = 'legendary'
  }

  // ── 8. Persist updated metrics + new tier ─────────────────────────────────
  const tierChanged  = newTier !== previousTier
  const belovedSinceUpdate =
    newTier === 'beloved' && previousTier !== 'beloved' && previousTier !== 'legendary'
      ? now.toISOString()
      : venue.beloved_since

  const { error: updateError } = await admin
    .from('venue_profiles')
    .update({
      venue_tier:                  newTier,
      unique_lantern_beacon_hosts: uniqueLanternBeaconHosts,
      repeat_attendee_rate:       repeatAttendeeRate,
      beloved_since:              belovedSinceUpdate,
      updated_at:                 now.toISOString(),
    })
    .eq('id', venueId)

  if (updateError) {
    console.error('[evaluateVenueTier] update failed', { venueId, error: updateError.message })
  }

  return {
    venueId,
    previousTier,
    newTier,
    tierChanged,
    metrics: {
      totalEventsHosted:       venue.total_events_hosted,
      eventsIn180d:            ids180.length,
      eventsIn365d:            ids365.length,
      reviewCount,
      averageRating,
      uniqueLanternBeaconHosts,
      repeatAttendeeRate,
      onTimeRate,
      complaintRate,
      beloved_since:           venue.beloved_since,
    },
  }
}

// ---------------------------------------------------------------------------
// computeTrendingVenues
// ---------------------------------------------------------------------------

export interface TrendingResult {
  venueId: string
  isTrending: boolean
  metrics: {
    eventsIn30d: number
    eventsInPrev30d: number
    attendanceGrowth: number
    avgRatingIn30d: number
    capacityUtilization: number
  }
}

/**
 * Recomputes Trending status for all active venues in a given city.
 * Sets `trending_until = now + 30 days` for qualifying venues,
 * clears it for those that no longer qualify.
 *
 * Criteria:
 *   ≥10 events in last 30 d
 *   ≥30 % MoM attendance growth (vs previous 30 d)
 *   ≥4.5★ average rating in last 30 d
 *   ≥70 % capacity utilisation in last 30 d
 */
export async function computeTrendingVenues(cityId: string): Promise<TrendingResult[]> {
  const admin = createAdminClient()
  const now   = new Date()

  const d30  = new Date(now.getTime() -  30 * DAY_MS).toISOString()
  const d60  = new Date(now.getTime() -  60 * DAY_MS).toISOString()

  // Fetch all active venues in this city
  const { data: venues, error: venueError } = await admin
    .from('venue_profiles')
    .select('id, trending_until')
    .eq('city', cityId)
    .eq('is_active', true)

  if (venueError || !venues?.length) return []

  const results: TrendingResult[] = []

  for (const venue of venues) {
    // ── Events in last 30 d ──────────────────────────────────────────────────
    const [curr30Result, prev30Result] = await Promise.all([
      admin.from('events')
        .select('id, capacity')
        .eq('venue_id', venue.id)
        .in('status', ['published', 'completed'])
        .gte('starts_at', d30),
      admin.from('events')
        .select('id')
        .eq('venue_id', venue.id)
        .in('status', ['published', 'completed'])
        .gte('starts_at', d60)
        .lt('starts_at', d30),
    ])

    const curr30Events = curr30Result.data ?? []
    const eventsIn30d     = curr30Events.length
    const eventsInPrev30d = (prev30Result.data ?? []).length

    if (eventsIn30d < THRESHOLDS.trending.minEventsIn30d) {
      // Clear trending if below minimum
      if (venue.trending_until) {
        await admin.from('venue_profiles').update({ trending_until: null }).eq('id', venue.id)
      }
      results.push({ venueId: venue.id, isTrending: false, metrics: { eventsIn30d, eventsInPrev30d, attendanceGrowth: 0, avgRatingIn30d: 0, capacityUtilization: 0 } })
      continue
    }

    const curr30Ids = curr30Events.map((e) => e.id)
    const prev30Ids = (prev30Result.data ?? []).map((e) => e.id)

    // ── Attendance (captured RSVPs) ──────────────────────────────────────────
    const [currRsvpResult, prevRsvpResult] = await Promise.all([
      curr30Ids.length ? admin.from('rsvps').select('id', { count: 'exact', head: true }).in('event_id', curr30Ids).eq('payment_status', 'captured') : Promise.resolve({ count: 0 }),
      prev30Ids.length ? admin.from('rsvps').select('id', { count: 'exact', head: true }).in('event_id', prev30Ids).eq('payment_status', 'captured') : Promise.resolve({ count: 0 }),
    ])

    const currAttendees = currRsvpResult.count ?? 0
    const prevAttendees = prevRsvpResult.count ?? 0
    const attendanceGrowth = prevAttendees > 0
      ? (currAttendees - prevAttendees) / prevAttendees
      : currAttendees > 0 ? 1 : 0

    // ── Average rating in last 30 d ──────────────────────────────────────────
    let avgRatingIn30d = 0
    if (curr30Ids.length > 0) {
      const { data: ratings } = await admin
        .from('explorer_event_history')
        .select('rating')
        .in('event_id', curr30Ids)
        .not('rating', 'is', null)

      if (ratings?.length) {
        avgRatingIn30d = ratings.reduce((s, r) => s + (r.rating ?? 0), 0) / ratings.length
      }
    }

    // ── Capacity utilisation ──────────────────────────────────────────────────
    let capacityUtilization = 0
    const eventsWithCapacity = curr30Events.filter((e) => (e.capacity ?? 0) > 0)

    if (eventsWithCapacity.length > 0 && currAttendees > 0) {
      const totalCapacity = eventsWithCapacity.reduce((s, e) => s + (e.capacity ?? 0), 0)
      capacityUtilization = totalCapacity > 0 ? Math.min(1, currAttendees / totalCapacity) : 0
    }

    // ── Apply criteria ────────────────────────────────────────────────────────
    const T = THRESHOLDS.trending
    const qualifies =
      eventsIn30d       >= T.minEventsIn30d &&
      attendanceGrowth  >= T.minAttendanceGrowth &&
      avgRatingIn30d    >= T.minRatingIn30d &&
      capacityUtilization >= T.minCapacityUtilization

    const trendingUntil = qualifies
      ? new Date(now.getTime() + T.validityDays * DAY_MS).toISOString()
      : null

    await admin
      .from('venue_profiles')
      .update({ trending_until: trendingUntil })
      .eq('id', venue.id)

    results.push({
      venueId: venue.id,
      isTrending: qualifies,
      metrics: { eventsIn30d, eventsInPrev30d, attendanceGrowth, avgRatingIn30d, capacityUtilization },
    })
  }

  return results
}
