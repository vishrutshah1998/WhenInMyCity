'use server'

// =============================================================================
// WIMC — Link-click analytics
//
// trackLinkClick is called client-side (fire-and-forget) every time a visitor
// taps a link or embed block on a creator's public profile page.
//
// Design:
//   - Uses the admin client so the INSERT works for anonymous visitors without
//     requiring them to hold a Supabase session.
//   - User-Agent and Referer are read from request headers server-side so they
//     are never sent as client-supplied POST body fields (prevents spoofing).
//   - Validation is lightweight — block_id and creator_id must be valid UUIDs;
//     everything else is inferred or capped server-side.
//   - Failures are silently swallowed: analytics must never break the UI.
// =============================================================================

import { z } from 'zod'
import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth/requireAuth'
import { checkAnalyticsRateLimit } from '@/lib/ratelimit'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function detectDevice(ua: string): 'mobile' | 'tablet' | 'desktop' {
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet'
  if (/mobile|iphone|ipod|android|blackberry|windows phone/i.test(ua)) return 'mobile'
  return 'desktop'
}

// ---------------------------------------------------------------------------
// trackLinkClick
// ---------------------------------------------------------------------------

const TrackSchema = z.object({
  blockId:   z.string().uuid(),
  creatorId: z.string().uuid(),
})

/**
 * Records a single link-tap event in `link_clicks`.
 *
 * Called fire-and-forget from the ClickTracker client component; the caller
 * does not await the result and the function swallows all errors so analytics
 * failures are invisible to the visitor.
 *
 * Device class and referrer are inferred server-side from request headers —
 * the client only supplies the block + creator identifiers.
 */
export async function trackLinkClick(
  blockId: string,
  creatorId: string,
): Promise<void> {
  try {
    const rl = await checkAnalyticsRateLimit()
    if (!rl.success) return  // silently drop — analytics must never break the UI

    const parsed = TrackSchema.safeParse({ blockId, creatorId })
    if (!parsed.success) return

    const headersList = await headers()
    const ua       = headersList.get('user-agent') ?? ''
    const referer  = headersList.get('referer') ?? null

    const device   = detectDevice(ua)
    const referrer = referer ? referer.slice(0, 500) : null

    const admin = createAdminClient()
    await admin.from('link_clicks').insert({
      block_id:   parsed.data.blockId,
      creator_id: parsed.data.creatorId,
      device,
      referrer,
    })
  } catch {
    // Never surface analytics errors to the user
  }
}

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
    .from('link_clicks')
    .select('block_id, clicked_at, device')
    .eq('creator_id', creatorId)
    .gte('clicked_at', since)
    .order('clicked_at', { ascending: false })

  if (error || !data) return empty

  // Aggregate in JS
  const blockMap: Record<string, { count: number; lastClicked: string }> = {}
  const deviceBreakdown: ClickDeviceBreakdown = { mobile: 0, tablet: 0, desktop: 0 }

  for (const row of data) {
    // Per-block count
    if (!blockMap[row.block_id]) {
      blockMap[row.block_id] = { count: 0, lastClicked: row.clicked_at }
    }
    blockMap[row.block_id].count++
    // clicked_at is ordered DESC so first seen = most recent
    if (row.clicked_at > blockMap[row.block_id].lastClicked) {
      blockMap[row.block_id].lastClicked = row.clicked_at
    }

    // Device breakdown
    const d = row.device as keyof ClickDeviceBreakdown | null
    if (d && d in deviceBreakdown) deviceBreakdown[d]++
  }

  const byBlock: BlockClickStat[] = Object.entries(blockMap)
    .map(([blockId, { count, lastClicked }]) => ({ blockId, count, lastClicked }))
    .sort((a, b) => b.count - a.count)

  // Build dense day-by-day series (oldest → newest), filling gaps with 0
  const dayMap: Record<string, number> = {}
  for (const row of data) {
    const day = row.clicked_at.slice(0, 10)
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
