'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { CITIES } from '@/lib/constants/interests'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ShowcasedCreator {
  id:                   string
  username:             string
  displayName:          string
  cityId:               string
  cityName:             string
  creatorType:          string
  avatarUrl:            string | null
  isFoundingMaker:      boolean
  userTier:             'lantern' | 'beacon'
  cumEventsHosted:      number
  cumUniqueAttendees:   number
  cumGmvPaise:          number
  avgRating:            number
  createdAt:            string
}

// ---------------------------------------------------------------------------
// getBeaconCreators
// ---------------------------------------------------------------------------

const cityLookup = new Map(CITIES.map((c) => [c.id, c.name]))

const TIER_RANK: Record<string, number> = { beacon: 1, lantern: 2 }

/**
 * Returns all Lantern- and Beacon-tier creators, sorted by tier (Beacon
 * first) then lifetime GMV descending. Public — no auth required.
 */
export async function getShowcasedCreators(): Promise<ShowcasedCreator[]> {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('user_profiles')
    .select('id, username, display_name, city, creator_type, avatar_url, is_founding_maker, user_tier, cumulative_events_hosted, cumulative_unique_attendees, cumulative_gmv_paise, average_event_rating, created_at')
    .in('user_tier', ['lantern', 'beacon'])
    .order('cumulative_gmv_paise', { ascending: false })

  if (error || !data) return []

  return data
    .map((row) => ({
      id:                 row.id,
      username:           row.username,
      displayName:        row.display_name,
      cityId:             row.city,
      cityName:           cityLookup.get(row.city) ?? row.city,
      creatorType:        row.creator_type,
      avatarUrl:          row.avatar_url,
      isFoundingMaker:    row.is_founding_maker,
      userTier:           row.user_tier as 'lantern' | 'beacon',
      cumEventsHosted:    row.cumulative_events_hosted,
      cumUniqueAttendees: row.cumulative_unique_attendees,
      cumGmvPaise:        row.cumulative_gmv_paise,
      avgRating:          row.average_event_rating,
      createdAt:          row.created_at,
    }))
    .sort((a, b) => {
      const tierDiff = (TIER_RANK[a.userTier] ?? 9) - (TIER_RANK[b.userTier] ?? 9)
      if (tierDiff !== 0) return tierDiff
      return b.cumGmvPaise - a.cumGmvPaise
    })
}
