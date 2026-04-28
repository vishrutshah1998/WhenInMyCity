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
