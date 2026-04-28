'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { TIER_THRESHOLDS } from '@/lib/constants/interests'
import type {
  UserTier,
  TierMetrics,
  TierEvaluationResult,
  NextTierProgress,
  TierGap,
} from '@/types/marketplace'

// ---------------------------------------------------------------------------
// Tier qualification logic
// ---------------------------------------------------------------------------

// Wanderer is the default tier — no active qualification needed.
// A user stays Wanderer until they meet Local gates.

/**
 * Local gate: rolling 90-day window.
 *   ≥6 events attended in 90d
 *   ≥1 review per 3 events attended (ratio ≥ 0.333)
 *   no-show rate < 15%
 */
function qualifiesForLocal(
  recentEventsAttended: number,
  reviewsPosted: number,
  rsvpsTotal: number,
  noShows: number,
): boolean {
  const t = TIER_THRESHOLDS.local
  if (recentEventsAttended < t.eventsAttendedIn90d) return false
  const reviewRatio = recentEventsAttended > 0 ? reviewsPosted / recentEventsAttended : 0
  if (reviewRatio < t.reviewsPerEventsRatio) return false
  const noShowRate = rsvpsTotal > 0 ? noShows / rsvpsTotal : 0
  if (noShowRate >= t.maxNoShowRate) return false
  return true
}

/**
 * Lantern gate: rolling 180-day window.
 *   ≥3 events hosted
 *   ≥4.5★ average rating
 *   cancellation rate < 5%
 *   on-time start rate ≥ 80% (Phase 2 data — skipped until tracked)
 */
function qualifiesForLantern(
  eventsHostedIn180d: number,
  averageRating: number,
  eventsTotal: number,
  cancelledEvents: number,
): boolean {
  const t = TIER_THRESHOLDS.lantern
  if (eventsHostedIn180d < t.eventsHostedIn180d) return false
  if (averageRating < t.minAverageRating) return false
  const cancellationRate = eventsTotal > 0 ? cancelledEvents / eventsTotal : 0
  if (cancellationRate >= t.maxCancellationRate) return false
  return true
}

/**
 * Beacon gate: rolling 365-day window.
 *   ≥36 events hosted in 12 months OR ≥1,200 paid tickets sold
 *   ≥4.7★ average rating
 *   ≥30% repeat-attendance rate
 *   ≥50 active subscribers (whatsapp_subscriber_count proxy until Phase 2)
 *   cancellation rate < 1%
 */
function qualifiesForBeacon(
  eventsHostedIn365d: number,
  paidTicketsIn365d: number,
  averageRating: number,
  repeatAttendanceRate: number,
  activeSubscribers: number,
  eventsTotal: number,
  cancelledEvents: number,
): boolean {
  const t = TIER_THRESHOLDS.beacon
  const volumeMet =
    eventsHostedIn365d >= t.eventsHostedIn365d ||
    paidTicketsIn365d  >= t.altPaidTickets
  if (!volumeMet) return false
  if (averageRating < t.minAverageRating) return false
  if (repeatAttendanceRate < t.minRepeatAttendanceRate) return false
  if (activeSubscribers < t.minActiveSubscribers) return false
  const cancellationRate = eventsTotal > 0 ? cancelledEvents / eventsTotal : 0
  if (cancellationRate >= t.maxCancellationRate) return false
  return true
}

/** Determines the highest tier the user currently qualifies for. */
function determineTier(
  recentEventsAttended: number,
  reviewsPosted: number,
  rsvpsTotal: number,
  noShows: number,
  eventsHostedIn180d: number,
  eventsHostedIn365d: number,
  paidTicketsIn365d: number,
  metrics: TierMetrics,
  cancelledEvents: number,
  eventsTotal: number,
): UserTier {
  if (qualifiesForBeacon(
    eventsHostedIn365d,
    paidTicketsIn365d,
    metrics.average_event_rating,
    metrics.repeat_attendee_rate,
    metrics.whatsapp_subscriber_count,
    eventsTotal,
    cancelledEvents,
  )) return 'beacon'

  if (qualifiesForLantern(
    eventsHostedIn180d,
    metrics.average_event_rating,
    eventsTotal,
    cancelledEvents,
  )) return 'lantern'

  if (qualifiesForLocal(
    recentEventsAttended,
    reviewsPosted,
    rsvpsTotal,
    noShows,
  )) return 'local'

  return 'wanderer'
}

/** Calculates gaps between current metrics and the next tier's gates. */
function calculateNextTierProgress(
  currentTier: UserTier,
  recentEventsAttended: number,
  reviewsPosted: number,
  rsvpsTotal: number,
  noShows: number,
  eventsHostedIn180d: number,
  eventsHostedIn365d: number,
  paidTicketsIn365d: number,
  metrics: TierMetrics,
  cancelledEvents: number,
  eventsTotal: number,
): NextTierProgress {
  const tierOrder: UserTier[] = ['wanderer', 'local', 'lantern', 'beacon']
  const currentIdx = tierOrder.indexOf(currentTier)
  const nextTier = currentIdx < tierOrder.length - 1 ? tierOrder[currentIdx + 1] : null

  if (!nextTier) return { currentTier, nextTier: null, gaps: {}, meetsAll: true }

  const gaps: TierGap = {}

  if (nextTier === 'local') {
    const t = TIER_THRESHOLDS.local
    if (recentEventsAttended < t.eventsAttendedIn90d)
      gaps.eventsAttended = t.eventsAttendedIn90d - recentEventsAttended
    const reviewRatio = recentEventsAttended > 0 ? reviewsPosted / recentEventsAttended : 0
    if (reviewRatio < t.reviewsPerEventsRatio)
      gaps.reviewRate = Math.round((t.reviewsPerEventsRatio - reviewRatio) * 100) / 100
    const noShowRate = rsvpsTotal > 0 ? noShows / rsvpsTotal : 0
    if (noShowRate >= t.maxNoShowRate)
      gaps.noShowRate = Math.round((noShowRate - t.maxNoShowRate) * 100) / 100

  } else if (nextTier === 'lantern') {
    const t = TIER_THRESHOLDS.lantern
    if (eventsHostedIn180d < t.eventsHostedIn180d)
      gaps.eventsHosted = t.eventsHostedIn180d - eventsHostedIn180d
    if (metrics.average_event_rating < t.minAverageRating)
      gaps.rating = Math.round((t.minAverageRating - metrics.average_event_rating) * 100) / 100
    const cancellationRate = eventsTotal > 0 ? cancelledEvents / eventsTotal : 0
    if (cancellationRate >= t.maxCancellationRate)
      gaps.cancellationRate = Math.round((cancellationRate - t.maxCancellationRate) * 100) / 100

  } else if (nextTier === 'beacon') {
    const t = TIER_THRESHOLDS.beacon
    if (eventsHostedIn365d < t.eventsHostedIn365d && paidTicketsIn365d < t.altPaidTickets) {
      gaps.eventsHosted = t.eventsHostedIn365d - eventsHostedIn365d
      gaps.paidTickets  = t.altPaidTickets - paidTicketsIn365d
    }
    if (metrics.average_event_rating < t.minAverageRating)
      gaps.rating = Math.round((t.minAverageRating - metrics.average_event_rating) * 100) / 100
    if (metrics.repeat_attendee_rate < t.minRepeatAttendanceRate)
      gaps.repeatRate = Math.round((t.minRepeatAttendanceRate - metrics.repeat_attendee_rate) * 100) / 100
    if (metrics.whatsapp_subscriber_count < t.minActiveSubscribers)
      gaps.activeSubscribers = t.minActiveSubscribers - metrics.whatsapp_subscriber_count
    const cancellationRate = eventsTotal > 0 ? cancelledEvents / eventsTotal : 0
    if (cancellationRate >= t.maxCancellationRate)
      gaps.cancellationRate = Math.round((cancellationRate - t.maxCancellationRate) * 100) / 100
  }

  return { currentTier, nextTier, gaps, meetsAll: Object.keys(gaps).length === 0 }
}

// ---------------------------------------------------------------------------
// evaluateUserTier
// ---------------------------------------------------------------------------

/**
 * Core tier evaluation function for the unified Wanderer→Local→Lantern→Beacon ladder.
 *
 * 1. Fetches current metrics from user_profiles.
 * 2. Queries rolling-window event counts from events and rsvps tables.
 * 3. Determines the highest tier the user qualifies for.
 * 4. Applies downgrade guards:
 *    - Downgrade only if inactive for the tier's window period.
 *    - Beacons in recovery (tier_recovery_until set) are not dropped immediately.
 *    - tier_locked_until blocks any downgrade while active.
 *    - is_founding_maker prevents drops from beacon.
 * 5. On tier change: inserts a user_tier_history row and updates user_profiles.
 *    On upgrade: sets tier_locked_until to now + 30 days.
 *
 * @param userId - The user_profiles.id (= auth.users.id)
 */
export async function evaluateUserTier(userId: string): Promise<TierEvaluationResult> {
  const admin = createAdminClient()

  const { data: user, error: fetchError } = await admin
    .from('user_profiles')
    .select(`
      user_tier, tier_locked_until, tier_recovery_until,
      is_founding_maker, average_event_rating, repeat_attendee_rate,
      monthly_page_visitors, last_event_hosted_at,
      cumulative_events_hosted, cumulative_unique_attendees, cumulative_gmv_paise,
      events_attended_count, rsvps_total_count, no_shows_count, reviews_posted_count,
      whatsapp_subscriber_count, lantern_since, beacon_since
    `)
    .eq('id', userId)
    .single()

  if (fetchError || !user) {
    throw new Error(`[evaluateUserTier] Failed to fetch user ${userId}: ${fetchError?.message}`)
  }

  const currentTier = user.user_tier as UserTier
  const now = new Date()

  // ── Rolling window counts ────────────────────────────────────────────────

  const d90  = new Date(now.getTime() - 90  * 24 * 60 * 60 * 1000).toISOString()
  const d180 = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString()
  const d365 = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString()

  // Events attended by this user in the last 90 days (from explorer_event_history)
  const { count: recentAttended } = await admin
    .from('explorer_event_history')
    .select('id', { count: 'exact', head: true })
    .eq('explorer_id', userId)
    .eq('attended', true)
    .gte('created_at', d90)

  // Events hosted in 180 days (any non-draft)
  const { count: hosted180 } = await admin
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('creator_id', userId)
    .neq('status', 'draft')
    .gte('starts_at', d180)

  // Events hosted in 365 days
  const { count: hosted365 } = await admin
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('creator_id', userId)
    .neq('status', 'draft')
    .gte('starts_at', d365)

  // Paid tickets sold in 365 days
  const { count: paidTickets365 } = await admin
    .from('rsvps')
    .select('id', { count: 'exact', head: true })
    .eq('payment_status', 'captured')
    .gte('created_at', d365)
    // Filter by creator via event join — approximate via stored count for now
    // Phase 2: join events table properly

  // Total and cancelled events for cancellation rate
  const { count: totalEvents } = await admin
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('creator_id', userId)
    .neq('status', 'draft')

  const { count: cancelledEvents } = await admin
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('creator_id', userId)
    .eq('status', 'cancelled')

  const recentEventsAttended = recentAttended   ?? 0
  const eventsHostedIn180d   = hosted180        ?? 0
  const eventsHostedIn365d   = hosted365        ?? 0
  const paidTicketsIn365d    = paidTickets365   ?? 0
  const eventsTotal          = totalEvents      ?? 0
  const cancelledEventsCount = cancelledEvents  ?? 0

  const metrics: TierMetrics = {
    cumulative_events_hosted:    user.cumulative_events_hosted,
    cumulative_unique_attendees: user.cumulative_unique_attendees,
    cumulative_gmv_paise:        Number(user.cumulative_gmv_paise),
    average_event_rating:        Number(user.average_event_rating),
    repeat_attendee_rate:        Number(user.repeat_attendee_rate),
    monthly_page_visitors:       user.monthly_page_visitors,
    last_event_hosted_at:        user.last_event_hosted_at,
    is_founding_maker:           user.is_founding_maker,
    events_attended_count:       user.events_attended_count,
    rsvps_total_count:           user.rsvps_total_count,
    no_shows_count:              user.no_shows_count,
    reviews_posted_count:        user.reviews_posted_count,
    // Internal use only — not in TierMetrics interface, accessed via user directly
    whatsapp_subscriber_count:   user.whatsapp_subscriber_count,
  }

  const qualifyingTier = determineTier(
    recentEventsAttended,
    user.reviews_posted_count,
    user.rsvps_total_count,
    user.no_shows_count,
    eventsHostedIn180d,
    eventsHostedIn365d,
    paidTicketsIn365d,
    metrics,
    cancelledEventsCount,
    eventsTotal,
  )

  const tierOrder: Record<UserTier, number> = { wanderer: 0, local: 1, lantern: 2, beacon: 3 }
  const currentRank  = tierOrder[currentTier]
  const qualifyRank  = tierOrder[qualifyingTier]

  let newTier = currentTier
  let recoveryStarted = false

  if (qualifyRank > currentRank) {
    // Upgrade — always allowed regardless of lock.
    newTier = qualifyingTier

    // Clear any active Beacon Recovery period on upgrade.
    if (user.tier_recovery_until) {
      await admin
        .from('user_profiles')
        .update({ tier_recovery_until: null })
        .eq('id', userId)
    }
  } else if (qualifyRank < currentRank) {
    const isFoundingBeacon = user.is_founding_maker && currentTier === 'beacon'
    const isLocked         = user.tier_locked_until && new Date(user.tier_locked_until) > now

    // Beacon Recovery: instead of instant drop, set a 90-day grace period.
    if (currentTier === 'beacon' && !isFoundingBeacon && !isLocked) {
      if (!user.tier_recovery_until) {
        const recoveryEnd = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString()
        await admin
          .from('user_profiles')
          .update({ tier_recovery_until: recoveryEnd })
          .eq('id', userId)
        recoveryStarted = true
      } else if (new Date(user.tier_recovery_until) < now) {
        // Grace period expired — drop to Lantern.
        newTier = 'lantern'
        await admin
          .from('user_profiles')
          .update({ tier_recovery_until: null })
          .eq('id', userId)
      }
      // Else: still in recovery window, do nothing.
    } else if (currentTier !== 'beacon' && !isFoundingBeacon && !isLocked) {
      // Standard downgrade — drop exactly one tier.
      const tiers: UserTier[] = ['wanderer', 'local', 'lantern', 'beacon']
      newTier = tiers[currentRank - 1]
    }
  }

  const tierChanged = newTier !== currentTier

  if (tierChanged) {
    const isUpgrade = tierOrder[newTier] > currentRank

    await admin.from('user_tier_history').insert({
      user_id:       userId,
      previous_tier: currentTier,
      new_tier:      newTier,
      snapshot:      metrics as unknown as import('@/types/database').Json,
    })

    await admin
      .from('user_profiles')
      .update({
        user_tier:         newTier,
        tier_evaluated_at: now.toISOString(),
        ...(isUpgrade
          ? { tier_locked_until: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString() }
          : {}),
        // Stamp first-ever lantern/beacon date — never overwrite once set.
        ...(isUpgrade && newTier === 'lantern' && !user.lantern_since
          ? { lantern_since: now.toISOString() }
          : {}),
        ...(isUpgrade && newTier === 'beacon' && !user.beacon_since
          ? { beacon_since: now.toISOString() }
          : {}),
      })
      .eq('id', userId)
  } else {
    await admin
      .from('user_profiles')
      .update({ tier_evaluated_at: now.toISOString() })
      .eq('id', userId)
  }

  const nextTierProgress = calculateNextTierProgress(
    newTier,
    recentEventsAttended,
    user.reviews_posted_count,
    user.rsvps_total_count,
    user.no_shows_count,
    eventsHostedIn180d,
    eventsHostedIn365d,
    paidTicketsIn365d,
    metrics,
    cancelledEventsCount,
    eventsTotal,
  )

  return { currentTier, newTier, tierChanged, recoveryStarted, metricsSnapshot: metrics, nextTierProgress }
}

// ---------------------------------------------------------------------------
// getUserTierProgress
// ---------------------------------------------------------------------------

/**
 * Returns the user's current tier and progress toward the next tier.
 * Used by the dashboard progress nudge card.
 */
export async function getUserTierProgress(userId: string): Promise<NextTierProgress> {
  const admin = createAdminClient()

  const { data: user } = await admin
    .from('user_profiles')
    .select(`
      user_tier, is_founding_maker, average_event_rating, repeat_attendee_rate,
      monthly_page_visitors, last_event_hosted_at,
      cumulative_events_hosted, cumulative_unique_attendees, cumulative_gmv_paise,
      events_attended_count, rsvps_total_count, no_shows_count, reviews_posted_count,
      whatsapp_subscriber_count
    `)
    .eq('id', userId)
    .maybeSingle()

  if (!user) {
    return { currentTier: 'wanderer', nextTier: 'local', gaps: {}, meetsAll: false }
  }

  const now = new Date()
  const d90  = new Date(now.getTime() - 90  * 24 * 60 * 60 * 1000).toISOString()
  const d180 = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString()
  const d365 = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: recentAttended },
    { count: hosted180 },
    { count: hosted365 },
    { count: totalEvents },
    { count: cancelledEvents },
  ] = await Promise.all([
    admin.from('explorer_event_history').select('id', { count: 'exact', head: true }).eq('explorer_id', userId).eq('attended', true).gte('created_at', d90),
    admin.from('events').select('id', { count: 'exact', head: true }).eq('creator_id', userId).neq('status', 'draft').gte('starts_at', d180),
    admin.from('events').select('id', { count: 'exact', head: true }).eq('creator_id', userId).neq('status', 'draft').gte('starts_at', d365),
    admin.from('events').select('id', { count: 'exact', head: true }).eq('creator_id', userId).neq('status', 'draft'),
    admin.from('events').select('id', { count: 'exact', head: true }).eq('creator_id', userId).eq('status', 'cancelled'),
  ])

  const metrics: TierMetrics = {
    cumulative_events_hosted:    user.cumulative_events_hosted,
    cumulative_unique_attendees: user.cumulative_unique_attendees,
    cumulative_gmv_paise:        Number(user.cumulative_gmv_paise),
    average_event_rating:        Number(user.average_event_rating),
    repeat_attendee_rate:        Number(user.repeat_attendee_rate),
    monthly_page_visitors:       user.monthly_page_visitors,
    last_event_hosted_at:        user.last_event_hosted_at,
    is_founding_maker:           user.is_founding_maker,
    events_attended_count:       user.events_attended_count,
    rsvps_total_count:           user.rsvps_total_count,
    no_shows_count:              user.no_shows_count,
    reviews_posted_count:        user.reviews_posted_count,
    whatsapp_subscriber_count:   user.whatsapp_subscriber_count,
  }

  return calculateNextTierProgress(
    user.user_tier as UserTier,
    recentAttended  ?? 0,
    user.reviews_posted_count,
    user.rsvps_total_count,
    user.no_shows_count,
    hosted180       ?? 0,
    hosted365       ?? 0,
    0, // paidTickets365 — Phase 2
    metrics,
    cancelledEvents ?? 0,
    totalEvents     ?? 0,
  )
}

// ---------------------------------------------------------------------------
// triggerTierCelebration
// ---------------------------------------------------------------------------

/**
 * Marks a pending tier celebration in the user's auth metadata.
 * The dashboard reads `pending_tier_celebration` and shows the upgrade UI,
 * then clears the flag.
 */
export async function triggerTierCelebration(userId: string): Promise<void> {
  const admin = createAdminClient()

  const { data: user } = await admin
    .from('user_profiles')
    .select('user_tier')
    .eq('id', userId)
    .maybeSingle()

  if (!user) return

  const { error } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: {
      pending_tier_celebration: true,
      new_tier:                 user.user_tier,
    },
  })

  if (error) console.error('[triggerTierCelebration]', error.message)
}

// ---------------------------------------------------------------------------
// Legacy export aliases — remove once all callers are updated
// ---------------------------------------------------------------------------

/** @deprecated Use evaluateUserTier */
export const evaluateMakerTier = evaluateUserTier
/** @deprecated Use getUserTierProgress */
export const getMakerTierProgress = getUserTierProgress
