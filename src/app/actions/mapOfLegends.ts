'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { CITIES } from '@/lib/constants/interests'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LegendaryAdda {
  id:                      string
  slug:                    string
  name:                    string
  description:             string | null
  cityId:                  string
  cityName:                string
  cityEmoji:               string
  neighbourhood:           string | null
  coverImageUrl:           string | null
  addaType:                string[]
  capacityMax:             number | null
  totalEventsHosted:       number
  averageMakerRating:      number
  repeatAttendeeRate:      number   // 0–1 fraction
  onTimeRate:              number   // 0–1 fraction
  uniqueLanternBeaconHosts: number
  belovedSince:            string | null   // ISO date
  isTrending:              boolean
}

// ---------------------------------------------------------------------------
// getLegendaryAddas
// ---------------------------------------------------------------------------

const cityLookup = new Map(CITIES.map((c) => [c.id, { name: c.name, emoji: c.emoji }]))

/**
 * Returns all active Legendary-tier Addas, grouped by city.
 * Within each city, sorted by total_events_hosted DESC.
 * Public — no auth required.
 */
export async function getLegendaryAddas(): Promise<LegendaryAdda[]> {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('adda_profiles')
    .select('id, slug, name, description, city, neighbourhood, cover_image_url, adda_type, capacity_max, total_events_hosted, average_maker_rating, repeat_attendee_rate, on_time_rate, unique_lantern_beacon_hosts, beloved_since, trending_until')
    .eq('adda_tier', 'legendary')
    .eq('is_active', true)
    .order('city')
    .order('total_events_hosted', { ascending: false })

  if (error || !data) return []

  const now = new Date().toISOString()

  return data.map((row) => {
    const city = cityLookup.get(row.city)
    return {
      id:                       row.id,
      slug:                     row.slug,
      name:                     row.name,
      description:              row.description,
      cityId:                   row.city,
      cityName:                 city?.name  ?? row.city,
      cityEmoji:                city?.emoji ?? '🏙️',
      neighbourhood:            row.neighbourhood,
      coverImageUrl:            row.cover_image_url,
      addaType:                 row.adda_type ?? [],
      capacityMax:              row.capacity_max,
      totalEventsHosted:        row.total_events_hosted,
      averageMakerRating:       row.average_maker_rating,
      repeatAttendeeRate:       row.repeat_attendee_rate,
      onTimeRate:               row.on_time_rate,
      uniqueLanternBeaconHosts: row.unique_lantern_beacon_hosts,
      belovedSince:             row.beloved_since,
      isTrending:               !!(row.trending_until && row.trending_until > now),
    }
  })
}
