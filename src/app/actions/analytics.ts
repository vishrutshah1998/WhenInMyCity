'use server'

// =============================================================================
// WIMC — Creator link-click analytics
//
// Click events are recorded by `trackBlockAnalytics` (src/app/actions/blocks.ts)
// into `block_analytics` (owner_type='creator', event_type='click'), called
// fire-and-forget from the ClickTracker client component wrapping each block
// on a creator's public profile page. getLinkClickStats below reads that same
// table back out for the creator analytics dashboard.
//
// block_analytics superseded the older `link_clicks` table as of migration
// 049 — link_clicks is retained for historical audit only and is no longer
// written to.
// =============================================================================

import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth/requireAuth'

// ---------------------------------------------------------------------------
// getLinkClickStats
// ---------------------------------------------------------------------------

export interface BlockClickStat {
  blockId:     string
  count:       number
  lastClicked: string    // ISO timestamp
}

export interface ClickDeviceBreakdown {
  mobile:  number
  tablet:  number
  desktop: number
}

export interface DayClickStat {
  date:  string   // YYYY-MM-DD
  count: number
}

export interface LinkClickStats {
  totalClicks:     number
  byBlock:         BlockClickStat[]
  deviceBreakdown: ClickDeviceBreakdown
  byDay:           DayClickStat[]
  windowDays:      number
}

/**
 * Returns aggregated click statistics for the given creator over the last
 * `windowDays` days (default 30).
 *
 * Aggregation is done in JS rather than via a Postgres GROUP BY so we avoid
 * adding an RPC function to the schema.  At typical WIMC creator scale
 * (< 500 clicks / month) the payload is small and this is fine.
 *
 * Must be called from a server context with the creator's authenticated
 * session, or with a known creatorId in a server action/route handler.
 */
export async function getLinkClickStats(
  creatorId: string,
  windowDays = 30,
): Promise<LinkClickStats> {
  const empty: LinkClickStats = {
    totalClicks: 0,
    byBlock: [],
    deviceBreakdown: { mobile: 0, tablet: 0, desktop: 0 },
    byDay: [],
    windowDays,
  }

  const parsed = z.string().uuid().safeParse(creatorId)
  if (!parsed.success) return empty

  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString()

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('block_analytics')
    .select('block_id, occurred_at, device_type')
    .eq('owner_type', 'creator')
    .eq('owner_id', creatorId)
    .eq('event_type', 'click')
    .gte('occurred_at', since)
    .order('occurred_at', { ascending: false })

  if (error || !data) return empty

  // Aggregate in JS
  const blockMap: Record<string, { count: number; lastClicked: string }> = {}
  const deviceBreakdown: ClickDeviceBreakdown = { mobile: 0, tablet: 0, desktop: 0 }

  for (const row of data) {
    const blockId = row.block_id ?? 'unknown'
    // Per-block count
    if (!blockMap[blockId]) {
      blockMap[blockId] = { count: 0, lastClicked: row.occurred_at }
    }
    blockMap[blockId].count++
    // occurred_at is ordered DESC so first seen = most recent
    if (row.occurred_at > blockMap[blockId].lastClicked) {
      blockMap[blockId].lastClicked = row.occurred_at
    }

    // Device breakdown
    const d = row.device_type as keyof ClickDeviceBreakdown | null
    if (d && d in deviceBreakdown) deviceBreakdown[d]++
  }

  const byBlock: BlockClickStat[] = Object.entries(blockMap)
    .map(([blockId, { count, lastClicked }]) => ({ blockId, count, lastClicked }))
    .sort((a, b) => b.count - a.count)

  // Build dense day-by-day series (oldest → newest), filling gaps with 0
  const dayMap: Record<string, number> = {}
  for (const row of data) {
    const day = row.occurred_at.slice(0, 10)
    dayMap[day] = (dayMap[day] ?? 0) + 1
  }
  const byDay: DayClickStat[] = []
  for (let d = windowDays - 1; d >= 0; d--) {
    const date = new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    byDay.push({ date, count: dayMap[date] ?? 0 })
  }

  return {
    totalClicks: data.length,
    byBlock,
    deviceBreakdown,
    byDay,
    windowDays,
  }
}

// ---------------------------------------------------------------------------
// getAudienceBreakdown
// ---------------------------------------------------------------------------

export interface AudienceBreakdown {
  wanderer: number
  local:    number
  lantern:  number
  beacon:   number
  total:    number
}

/**
 * Counts the caller's followers (explorers who have this creator in their
 * `followed_maker_ids`) broken down by their `user_tier`.
 *
 * Requires the caller to be authenticated.
 */
export async function getAudienceBreakdown(): Promise<AudienceBreakdown> {
  const { user } = await requireAuth()
  const admin     = createAdminClient()

  const empty: AudienceBreakdown = { wanderer: 0, local: 0, lantern: 0, beacon: 0, total: 0 }

  // 1. Find all explorer_profiles that follow this creator.
  const { data: followers, error: followError } = await admin
    .from('explorer_profiles')
    .select('auth_user_id')
    .contains('followed_maker_ids', [user.id])

  if (followError || !followers?.length) return empty

  const followerIds = followers.map((f) => f.auth_user_id)

  // 2. Fetch the user_tier for each follower from user_profiles.
  const { data: profiles, error: profileError } = await admin
    .from('user_profiles')
    .select('user_tier')
    .in('id', followerIds)

  if (profileError || !profiles?.length) return empty

  const breakdown = { ...empty }
  for (const p of profiles) {
    const tier = (p.user_tier ?? 'wanderer') as keyof Omit<AudienceBreakdown, 'total'>
    if (tier in breakdown) breakdown[tier]++
    breakdown.total++
  }

  return breakdown
}

// ---------------------------------------------------------------------------
// getSupportedCreators
// ---------------------------------------------------------------------------

export interface SupportedCreator {
  creatorId:    string
  displayName:  string
  username:     string
  avatarUrl:    string | null
  creatorType:  string
  userTier:     string
  rsvpCount:    number
  supportLevel: string
}

function supportLevel(count: number): string {
  if (count >= 11) return 'Superfan'
  if (count >= 7)  return 'Devoted Fan'
  if (count >= 4)  return 'Fan'
  if (count >= 2)  return 'Regular'
  return 'First Timer'
}

/**
 * Returns the top-5 creators this user has attended most (by captured/free RSVP count).
 * Gated to Local+ — callers should check user_tier before calling.
 */
export async function getSupportedCreators(): Promise<SupportedCreator[]> {
  const { user } = await requireAuth()
  const admin = createAdminClient()

  // 1. All confirmed RSVPs by this user
  const { data: rsvps } = await admin
    .from('rsvps')
    .select('event_id, payment_status')
    .eq('attendee_user_id', user.id)
    .eq('payment_status', 'captured')

  if (!rsvps?.length) return []

  // 2. Resolve event_id → creator_id
  const eventIds = [...new Set(rsvps.map((r) => r.event_id))]
  const { data: events } = await admin
    .from('events')
    .select('id, creator_id')
    .in('id', eventIds)

  if (!events?.length) return []

  const eventCreatorMap = new Map(events.map((e) => [e.id, e.creator_id]))

  // 3. Count RSVPs per creator
  const countMap = new Map<string, number>()
  for (const r of rsvps) {
    const cid = eventCreatorMap.get(r.event_id)
    if (!cid) continue
    countMap.set(cid, (countMap.get(cid) ?? 0) + 1)
  }

  // 4. Top 5 creators by count
  const top5 = [...countMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  if (!top5.length) return []

  // 5. Fetch creator profiles
  const creatorIds = top5.map(([id]) => id)
  const { data: profiles } = await admin
    .from('user_profiles')
    .select('id, display_name, username, avatar_url, creator_type, user_tier')
    .in('id', creatorIds)

  if (!profiles?.length) return []

  const profileMap = new Map(profiles.map((p) => [p.id, p]))

  const results: SupportedCreator[] = []
  for (const [creatorId, rsvpCount] of top5) {
    const p = profileMap.get(creatorId)
    if (!p) continue
    results.push({
      creatorId,
      displayName:  p.display_name,
      username:     p.username,
      avatarUrl:    p.avatar_url ?? null,
      creatorType:  p.creator_type as string,
      userTier:     (p.user_tier ?? 'wanderer') as string,
      rsvpCount,
      supportLevel: supportLevel(rsvpCount),
    })
  }
  return results
}

// =============================================================================
// getCityMasteryMap
// =============================================================================

export interface MasteryNeighbourhood {
  label:      string   // neighbourhood name or venue name fallback
  city:       string
  eventCount: number
}

/**
 * Returns the distinct neighbourhoods (or venue names) where a user has
 * attended events (payment_status = 'captured'), sorted by event count desc.
 * Used to render the city mastery sticker grid on the public profile.
 */
export async function getCityMasteryMap(profileId: string): Promise<MasteryNeighbourhood[]> {
  const admin = createAdminClient()

  // Fetch all confirmed RSVPs for this user, joined to events + adda_profiles
  const { data: rows } = await admin
    .from('rsvps')
    .select(`
      event:events (
        venue_name,
        venue_id,
        adda:adda_profiles ( neighbourhood, city )
      )
    `)
    .eq('attendee_user_id', profileId)
    .eq('payment_status', 'captured')

  if (!rows?.length) return []

  // Tally events per neighbourhood label
  const counts = new Map<string, { city: string; count: number }>()

  for (const row of rows) {
    const event = (row.event as unknown) as {
      venue_name: string
      venue_id: string | null
      adda: { neighbourhood: string | null; city: string } | { neighbourhood: string | null; city: string }[] | null
    } | null
    if (!event) continue

    const addaRaw = event.adda
    const adda = Array.isArray(addaRaw) ? addaRaw[0] ?? null : addaRaw
    const neighbourhood = adda?.neighbourhood ?? null
    const label = neighbourhood ?? event.venue_name
    const city  = adda?.city ?? 'Other'

    const existing = counts.get(label)
    if (existing) {
      existing.count += 1
    } else {
      counts.set(label, { city, count: 1 })
    }
  }

  return Array.from(counts.entries())
    .map(([label, { city, count }]) => ({ label, city, eventCount: count }))
    .sort((a, b) => b.eventCount - a.eventCount)
}
