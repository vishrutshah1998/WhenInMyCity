'use server'

import { requireAuth } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { CITIES } from '@/lib/constants/interests'
import type { UserTier } from '@/types/marketplace'

// ---------------------------------------------------------------------------
// getCityPulse
// ---------------------------------------------------------------------------

export interface CityPulseEntry {
  cityId:        string
  cityName:      string
  emoji:         string
  recentCount:   number   // events in last 30 days
  upcomingCount: number   // events in next 14 days
}

/**
 * Returns event-activity counts per city for the last 30 days and upcoming
 * 14 days, sorted by total activity descending.
 * Only cities with at least one event are included.
 */
export async function getCityPulse(): Promise<CityPulseEntry[]> {
  const admin = createAdminClient()
  const now = new Date()
  const nowIso    = now.toISOString()
  const past30    = new Date(now.getTime() - 30  * 24 * 60 * 60 * 1000).toISOString()
  const future14  = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString()

  // Step 1: Get all creators' cities
  const { data: creators } = await admin
    .from('user_profiles')
    .select('id, city')

  if (!creators?.length) return []
  const creatorCityMap = new Map(creators.map((c) => [c.id, c.city]))

  // Step 2: Get recent + upcoming events (creator_id to resolve city)
  const { data: events } = await admin
    .from('events')
    .select('creator_id, starts_at')
    .in('status', ['published', 'completed'])
    .gte('starts_at', past30)

  if (!events?.length) return []

  const cityMap = new Map<string, { recent: number; upcoming: number }>()

  for (const row of events) {
    const city = creatorCityMap.get(row.creator_id)
    if (!city) continue
    const entry = cityMap.get(city) ?? { recent: 0, upcoming: 0 }
    entry.recent++
    if (row.starts_at >= nowIso && row.starts_at <= future14) entry.upcoming++
    cityMap.set(city, entry)
  }

  const cityLookup = new Map(CITIES.map((c) => [c.id, c]))

  return [...cityMap.entries()]
    .map(([cityId, { recent, upcoming }]) => {
      const meta = cityLookup.get(cityId)
      return {
        cityId,
        cityName:      meta?.name  ?? cityId,
        emoji:         meta?.emoji ?? '🏙️',
        recentCount:   recent,
        upcomingCount: upcoming,
      }
    })
    .sort((a, b) => (b.recentCount + b.upcomingCount) - (a.recentCount + a.upcomingCount))
}

// ---------------------------------------------------------------------------
// getCityLeaderboard
// ---------------------------------------------------------------------------

export interface LeaderboardEntry {
  rank:                number
  displayName:         string
  userTier:            UserTier
  attendanceStreak:    number
  eventsAttendedCount: number
  isCurrentUser:       boolean
}

export interface CityLeaderboard {
  entries:         LeaderboardEntry[]
  currentUserRank: number | null
  cityName:        string
}

/**
 * Returns the top 25 explorers in `city` ranked by attendance streak
 * (then events attended as tiebreaker). Marks the current user's row.
 *
 * Uses a two-step fetch (explorer_profiles → user_profiles) to avoid
 * needing a Postgres JOIN function.
 */
export async function getCityLeaderboard(city: string): Promise<CityLeaderboard> {
  const { user } = await requireAuth()
  const admin = createAdminClient()
  const cityMeta = CITIES.find((c) => c.id === city)
  const cityName = cityMeta?.name ?? city

  const empty: CityLeaderboard = { entries: [], currentUserRank: null, cityName }

  // 1. All explorers in this city
  const { data: explorers } = await admin
    .from('explorer_profiles')
    .select('auth_user_id, display_name')
    .eq('city', city)

  if (!explorers?.length) return empty

  const ids = explorers.map((e) => e.auth_user_id)
  const nameMap = new Map(explorers.map((e) => [e.auth_user_id, e.display_name]))

  // 2. Pull streak + tier + events_attended from user_profiles
  const { data: profiles } = await admin
    .from('user_profiles')
    .select('id, user_tier, attendance_streak, events_attended_count')
    .in('id', ids)

  if (!profiles?.length) return empty

  // Sort: streak DESC, events_attended_count DESC
  const sorted = profiles.slice().sort((a, b) => {
    const sdiff = (b.attendance_streak ?? 0) - (a.attendance_streak ?? 0)
    if (sdiff !== 0) return sdiff
    return (b.events_attended_count ?? 0) - (a.events_attended_count ?? 0)
  })

  // Top 25 entries, always include current user even if outside top 25
  const TOP_N = 25
  const topIds = new Set(sorted.slice(0, TOP_N).map((p) => p.id))
  let currentUserRank: number | null = null

  const entries: LeaderboardEntry[] = sorted
    .map((p, idx) => ({ ...p, rank: idx + 1 }))
    .filter((p, idx) => idx < TOP_N || p.id === user.id)
    .map((p) => {
      const isCurrentUser = p.id === user.id
      if (isCurrentUser) currentUserRank = p.rank
      return {
        rank:                p.rank,
        displayName:         nameMap.get(p.id) ?? 'Explorer',
        userTier:            (p.user_tier ?? 'wanderer') as UserTier,
        attendanceStreak:    p.attendance_streak ?? 0,
        eventsAttendedCount: p.events_attended_count ?? 0,
        isCurrentUser,
      }
    })

  // Suppress entries outside top 25 that aren't the current user
  // (already handled by filter above, but keep the gap visible)
  void topIds

  return { entries, currentUserRank, cityName }
}

// ---------------------------------------------------------------------------
// getFriendLeaderboard
// ---------------------------------------------------------------------------

export interface FriendLeaderboardEntry {
  rank:                number
  displayName:         string
  username:            string
  avatarUrl:           string | null
  userTier:            UserTier
  attendanceStreak:    number
  eventsAttendedCount: number
}

/**
 * Returns the attendance-streak ranking of creators the current user follows,
 * filtered to those in `city`. No cap — a follow graph is naturally small.
 */
export async function getFriendLeaderboard(city: string): Promise<FriendLeaderboardEntry[]> {
  const { user } = await requireAuth()
  const admin = createAdminClient()

  // 1. Followed maker IDs from the explorer's profile
  const { data: explorer } = await admin
    .from('explorer_profiles')
    .select('followed_maker_ids')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  const followedIds = explorer?.followed_maker_ids ?? []
  if (!followedIds.length) return []

  // 2. Filter to those in the same city, pull streak + tier
  const { data: profiles } = await admin
    .from('user_profiles')
    .select('id, display_name, username, avatar_url, user_tier, attendance_streak, events_attended_count')
    .in('id', followedIds)
    .eq('city', city)

  if (!profiles?.length) return []

  return profiles
    .slice()
    .sort((a, b) => {
      const sd = (b.attendance_streak ?? 0) - (a.attendance_streak ?? 0)
      if (sd !== 0) return sd
      return (b.events_attended_count ?? 0) - (a.events_attended_count ?? 0)
    })
    .map((p, i) => ({
      rank:                i + 1,
      displayName:         p.display_name,
      username:            p.username,
      avatarUrl:           p.avatar_url ?? null,
      userTier:            (p.user_tier ?? 'wanderer') as UserTier,
      attendanceStreak:    p.attendance_streak ?? 0,
      eventsAttendedCount: p.events_attended_count ?? 0,
    }))
}

// ---------------------------------------------------------------------------
// getNeighbourhoodLeaderboards
// ---------------------------------------------------------------------------

export interface NeighbourhoodCreator {
  rank:            number
  displayName:     string
  username:        string
  avatarUrl:       string | null
  userTier:        UserTier
  eventsHosted:    number
}

export interface NeighbourhoodLeaderboard {
  neighbourhood: string
  creators:      NeighbourhoodCreator[]
}

/**
 * Returns top-5 Lantern/Beacon creators per neighbourhood within `city`.
 * Ranked by cumulative_events_hosted DESC.
 * Neighbourhoods with no Lantern+ creators are omitted.
 */
export async function getNeighbourhoodLeaderboards(city: string): Promise<NeighbourhoodLeaderboard[]> {
  const admin = createAdminClient()

  const { data: profiles } = await admin
    .from('user_profiles')
    .select('id, display_name, username, avatar_url, user_tier, neighbourhood, cumulative_events_hosted')
    .eq('city', city)
    .in('user_tier', ['lantern', 'beacon'])
    .not('neighbourhood', 'is', null)

  if (!profiles?.length) return []

  const byNeighbourhood = new Map<string, typeof profiles>()
  for (const p of profiles) {
    if (!p.neighbourhood) continue
    const arr = byNeighbourhood.get(p.neighbourhood) ?? []
    arr.push(p)
    byNeighbourhood.set(p.neighbourhood, arr)
  }

  return [...byNeighbourhood.entries()]
    .map(([neighbourhood, creators]) => {
      const sorted = creators
        .slice()
        .sort((a, b) => (b.cumulative_events_hosted ?? 0) - (a.cumulative_events_hosted ?? 0))
        .slice(0, 5)
      return {
        neighbourhood,
        creators: sorted.map((p, i) => ({
          rank:         i + 1,
          displayName:  p.display_name,
          username:     p.username,
          avatarUrl:    p.avatar_url ?? null,
          userTier:     (p.user_tier ?? 'lantern') as UserTier,
          eventsHosted: p.cumulative_events_hosted ?? 0,
        })),
      }
    })
    .sort((a, b) => a.neighbourhood.localeCompare(b.neighbourhood))
}
