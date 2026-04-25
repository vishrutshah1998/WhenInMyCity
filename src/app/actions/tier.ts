'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { TIER_THRESHOLDS } from '@/lib/constants/interests'
import type {
  MakerTier,
  TierMetrics,
  TierEvaluationResult,
  NextTierProgress,
  TierGap,
} from '@/types/marketplace'

// ---------------------------------------------------------------------------
// Tier qualification logic
// ---------------------------------------------------------------------------

/**
 * Returns true if the maker's cumulative metrics meet the Nukkad threshold.
 * Nukkad requires: events in last 90 days, not cumulative total.
 */
function qualifiesForNukkad(metrics: TierMetrics, recentEventsCount: number): boolean {
  const t = TIER_THRESHOLDS.nukkad
  return (
    recentEventsCount                  >= t.events &&
    metrics.cumulative_unique_attendees >= t.uniqueAttendees &&
    metrics.cumulative_gmv_paise        >= t.gmvPaise &&
    metrics.average_event_rating        >= t.averageRating
  )
}

/**
 * Returns true if the maker qualifies for the Chowk tier.
 */
function qualifiesForChowk(metrics: TierMetrics): boolean {
  const t = TIER_THRESHOLDS.chowk
  return (
    metrics.cumulative_events_hosted    >= t.events &&
    metrics.cumulative_unique_attendees >= t.uniqueAttendees &&
    metrics.cumulative_gmv_paise        >= t.gmvPaise &&
    metrics.average_event_rating        >= t.averageRating &&
    metrics.repeat_attendee_rate        >= t.repeatAttendeeRate &&
    metrics.monthly_page_visitors       >= t.monthlyPageVisitors
  )
}

/**
 * Returns true if the maker qualifies for the Maidan tier.
 * The multipleEventTypes threshold is administratively managed and is not
 * enforced here — it requires a manual review process.
 */
function qualifiesForMaidan(metrics: TierMetrics): boolean {
  const t = TIER_THRESHOLDS.maidan
  return (
    metrics.cumulative_events_hosted    >= t.events &&
    metrics.cumulative_unique_attendees >= t.uniqueAttendees &&
    metrics.cumulative_gmv_paise        >= t.gmvPaise &&
    metrics.average_event_rating        >= t.averageRating &&
    metrics.repeat_attendee_rate        >= t.repeatAttendeeRate
  )
}

/**
 * Determines the highest tier the maker currently qualifies for,
 * given their cumulative metrics and recent event count.
 */
function determineTier(metrics: TierMetrics, recentEventsCount: number): MakerTier {
  if (qualifiesForMaidan(metrics)) return 'maidan'
  if (qualifiesForChowk(metrics))  return 'chowk'
  if (qualifiesForNukkad(metrics, recentEventsCount)) return 'nukkad'
  return 'mohalla'
}

/**
 * Calculates the gaps between the maker's current metrics and the next tier.
 * Returns an empty object if the maker is already at Maidan.
 */
function calculateNextTierProgress(
  currentTier: MakerTier,
  metrics: TierMetrics,
  recentEventsCount: number,
): NextTierProgress {
  const tierOrder: MakerTier[] = ['mohalla', 'nukkad', 'chowk', 'maidan']
  const currentIdx = tierOrder.indexOf(currentTier)
  const nextTier = currentIdx < tierOrder.length - 1
    ? tierOrder[currentIdx + 1]
    : null

  if (!nextTier) {
    return { currentTier, nextTier: null, gaps: {}, meetsAll: true }
  }

  const gaps: TierGap = {}

  if (nextTier === 'nukkad') {
    const t = TIER_THRESHOLDS.nukkad
    if (recentEventsCount < t.events)
      gaps.events = t.events - recentEventsCount
    if (metrics.cumulative_unique_attendees < t.uniqueAttendees)
      gaps.attendees = t.uniqueAttendees - metrics.cumulative_unique_attendees
    if (metrics.cumulative_gmv_paise < t.gmvPaise)
      gaps.gmv = t.gmvPaise - metrics.cumulative_gmv_paise
    if (metrics.average_event_rating < t.averageRating)
      gaps.rating = Math.round((t.averageRating - metrics.average_event_rating) * 100) / 100
  } else if (nextTier === 'chowk') {
    const t = TIER_THRESHOLDS.chowk
    if (metrics.cumulative_events_hosted < t.events)
      gaps.events = t.events - metrics.cumulative_events_hosted
    if (metrics.cumulative_unique_attendees < t.uniqueAttendees)
      gaps.attendees = t.uniqueAttendees - metrics.cumulative_unique_attendees
    if (metrics.cumulative_gmv_paise < t.gmvPaise)
      gaps.gmv = t.gmvPaise - metrics.cumulative_gmv_paise
    if (metrics.average_event_rating < t.averageRating)
      gaps.rating = Math.round((t.averageRating - metrics.average_event_rating) * 100) / 100
    if (metrics.repeat_attendee_rate < t.repeatAttendeeRate)
      gaps.repeatRate = Math.round((t.repeatAttendeeRate - metrics.repeat_attendee_rate) * 10000) / 10000
    if (metrics.monthly_page_visitors < t.monthlyPageVisitors)
      gaps.pageVisitors = t.monthlyPageVisitors - metrics.monthly_page_visitors
  } else if (nextTier === 'maidan') {
    const t = TIER_THRESHOLDS.maidan
    if (metrics.cumulative_events_hosted < t.events)
      gaps.events = t.events - metrics.cumulative_events_hosted
    if (metrics.cumulative_unique_attendees < t.uniqueAttendees)
      gaps.attendees = t.uniqueAttendees - metrics.cumulative_unique_attendees
    if (metrics.cumulative_gmv_paise < t.gmvPaise)
      gaps.gmv = t.gmvPaise - metrics.cumulative_gmv_paise
    if (metrics.average_event_rating < t.averageRating)
      gaps.rating = Math.round((t.averageRating - metrics.average_event_rating) * 100) / 100
    if (metrics.repeat_attendee_rate < t.repeatAttendeeRate)
      gaps.repeatRate = Math.round((t.repeatAttendeeRate - metrics.repeat_attendee_rate) * 10000) / 10000
  }

  return {
    currentTier,
    nextTier,
    gaps,
    meetsAll: Object.keys(gaps).length === 0,
  }
}

// ---------------------------------------------------------------------------
// evaluateMakerTier
// ---------------------------------------------------------------------------

/**
 * Core tier evaluation function.
 *
 * 1. Fetches the maker's current metrics from user_profiles.
 * 2. Counts events hosted in the last 90 days (for Nukkad qualification).
 * 3. Determines the tier the maker currently qualifies for.
 * 4. Applies downgrade rules:
 *    - Downgrade only if last_event_hosted_at < (now - 180 days).
 *    - Downgrade by one tier only.
 *    - Founding Makers and Maidan tier are never auto-downgraded.
 *    - tier_locked_until blocks any downgrade while active.
 * 5. If tier changed: inserts a maker_tier_history row, updates user_profiles.
 *    On upgrade: sets tier_locked_until to now + 30 days.
 *
 * @param makerId - The user_profiles.id (= auth.users.id) of the maker.
 */
export async function evaluateMakerTier(makerId: string): Promise<TierEvaluationResult> {
  const admin = createAdminClient()

  const { data: maker, error: fetchError } = await admin
    .from('user_profiles')
    .select('maker_tier, tier_locked_until, is_founding_maker, cumulative_events_hosted, cumulative_unique_attendees, cumulative_gmv_paise, average_event_rating, repeat_attendee_rate, monthly_page_visitors, last_event_hosted_at')
    .eq('id', makerId)
    .single()

  if (fetchError || !maker) {
    throw new Error(`[evaluateMakerTier] Failed to fetch maker ${makerId}: ${fetchError?.message}`)
  }

  const currentTier = maker.maker_tier as MakerTier

  const metrics: TierMetrics = {
    cumulative_events_hosted:    maker.cumulative_events_hosted,
    cumulative_unique_attendees: maker.cumulative_unique_attendees,
    cumulative_gmv_paise:        Number(maker.cumulative_gmv_paise),
    average_event_rating:        Number(maker.average_event_rating),
    repeat_attendee_rate:        Number(maker.repeat_attendee_rate),
    monthly_page_visitors:       maker.monthly_page_visitors,
    last_event_hosted_at:        maker.last_event_hosted_at,
    is_founding_maker:           maker.is_founding_maker,
  }

  // Count events hosted in the last 90 days (for Nukkad threshold).
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  const { count: recentCount } = await admin
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('creator_id', makerId)
    .eq('status', 'completed')
    .gte('starts_at', ninetyDaysAgo)

  const recentEventsCount = recentCount ?? 0

  // Determine the highest qualifying tier.
  const qualifyingTier = determineTier(metrics, recentEventsCount)

  const tierOrder: Record<MakerTier, number> = { mohalla: 0, nukkad: 1, chowk: 2, maidan: 3 }
  const currentRank   = tierOrder[currentTier]
  const qualifyRank   = tierOrder[qualifyingTier]

  let newTier = currentTier

  if (qualifyRank > currentRank) {
    // Upgrade — always allowed regardless of lock.
    newTier = qualifyingTier
  } else if (qualifyRank < currentRank) {
    // Potential downgrade — check all guards.
    const isFoundingMaidan = maker.is_founding_maker && currentTier === 'maidan'
    const isMaidan         = currentTier === 'maidan'
    const isLocked         = maker.tier_locked_until && new Date(maker.tier_locked_until) > new Date()
    const inactiveLongEnough =
      maker.last_event_hosted_at == null ||
      new Date(maker.last_event_hosted_at) < new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)

    if (!isMaidan && !isFoundingMaidan && !isLocked && inactiveLongEnough) {
      // Downgrade by exactly one tier.
      const tiers: MakerTier[] = ['mohalla', 'nukkad', 'chowk', 'maidan']
      newTier = tiers[currentRank - 1]
    }
  }

  const tierChanged = newTier !== currentTier

  if (tierChanged) {
    const now = new Date().toISOString()
    const isUpgrade = tierOrder[newTier] > currentRank

    // Insert audit row.
    await admin.from('maker_tier_history').insert({
      maker_id:      makerId,
      previous_tier: currentTier,
      new_tier:      newTier,
      snapshot:      metrics as unknown as import('@/types/database').Json,
    })

    // Update the profile row.
    await admin
      .from('user_profiles')
      .update({
        maker_tier:        newTier,
        tier_evaluated_at: now,
        // Set lock only on upgrades to prevent immediate downgrade.
        ...(isUpgrade
          ? { tier_locked_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() }
          : {}),
      })
      .eq('id', makerId)
  } else {
    // Just update the evaluated_at timestamp.
    await admin
      .from('user_profiles')
      .update({ tier_evaluated_at: new Date().toISOString() })
      .eq('id', makerId)
  }

  const nextTierProgress = calculateNextTierProgress(newTier, metrics, recentEventsCount)

  return {
    currentTier,
    newTier,
    tierChanged,
    metricsSnapshot: metrics,
    nextTierProgress,
  }
}

// ---------------------------------------------------------------------------
// getMakerTierProgress
// ---------------------------------------------------------------------------

/**
 * Returns the maker's current tier and progress toward the next tier.
 * Used by the dashboard progress nudge card.
 *
 * @param makerId - The user_profiles.id of the maker.
 */
export async function getMakerTierProgress(makerId: string): Promise<NextTierProgress> {
  const admin = createAdminClient()

  const { data: maker } = await admin
    .from('user_profiles')
    .select('maker_tier, is_founding_maker, cumulative_events_hosted, cumulative_unique_attendees, cumulative_gmv_paise, average_event_rating, repeat_attendee_rate, monthly_page_visitors, last_event_hosted_at')
    .eq('id', makerId)
    .maybeSingle()

  if (!maker) {
    return {
      currentTier: 'mohalla',
      nextTier:    'nukkad',
      gaps:        {},
      meetsAll:    false,
    }
  }

  const metrics: TierMetrics = {
    cumulative_events_hosted:    maker.cumulative_events_hosted,
    cumulative_unique_attendees: maker.cumulative_unique_attendees,
    cumulative_gmv_paise:        Number(maker.cumulative_gmv_paise),
    average_event_rating:        Number(maker.average_event_rating),
    repeat_attendee_rate:        Number(maker.repeat_attendee_rate),
    monthly_page_visitors:       maker.monthly_page_visitors,
    last_event_hosted_at:        maker.last_event_hosted_at,
    is_founding_maker:           maker.is_founding_maker,
  }

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  const { count: recentCount } = await admin
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('creator_id', makerId)
    .eq('status', 'completed')
    .gte('starts_at', ninetyDaysAgo)

  return calculateNextTierProgress(
    maker.maker_tier as MakerTier,
    metrics,
    recentCount ?? 0,
  )
}

// ---------------------------------------------------------------------------
// triggerTierCelebration
// ---------------------------------------------------------------------------

/**
 * Marks a pending tier celebration in the maker's user metadata.
 * The dashboard reads the `pending_tier_celebration` flag, shows the
 * celebration UI, then clears it.
 *
 * Called immediately after a tier upgrade is confirmed.
 *
 * @param makerId - The auth.users.id of the maker.
 */
export async function triggerTierCelebration(makerId: string): Promise<void> {
  const admin = createAdminClient()

  const { data: maker } = await admin
    .from('user_profiles')
    .select('maker_tier')
    .eq('id', makerId)
    .maybeSingle()

  if (!maker) return

  // Update user metadata via the admin auth API.
  const { error } = await admin.auth.admin.updateUserById(makerId, {
    user_metadata: {
      pending_tier_celebration: true,
      new_tier:                 maker.maker_tier,
    },
  })

  if (error) {
    console.error('[triggerTierCelebration]', error.message)
  }
}
