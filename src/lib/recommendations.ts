// =============================================================================
// WIMC — Explorer Recommendation Engine
//
// Three exported functions:
//
//   scoreEventForExplorer  — pure scoring function (0–100) used by the feed
//   getPersonalisedFeed    — fetches + scores + returns the ranked event feed
//   updateExplorerScore    — recalculates the stored explorer_score (0–100)
// =============================================================================

import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import type { Event, ExplorerProfile, UserProfile } from '@/types/database'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal shape of explorer_event_history rows used for scoring. */
export interface AttendanceRecord {
  event_id: string
  attended: boolean
  rating: number | null
  rated_at: string | null
}

export interface ScoredEvent extends Event {
  score: number
  matchReasons: string[]
}

// ---------------------------------------------------------------------------
// scoreEventForExplorer
// ---------------------------------------------------------------------------

/**
 * Pure scoring function (0–100) used to rank events in an Explorer's feed.
 *
 * Scoring breakdown:
 *   TAG MATCH          max 40 pts  (+8 per matching tag, up to 5)
 *   FORMAT MATCH       max 15 pts  (+15 if event format in preferred_formats)
 *   PRICE MATCH        max 15 pts  (+15 within range, +7 within 150% of range)
 *   MAKER RELATIONSHIP max 20 pts  (+20 followed, +10 prior attendee)
 *   FRESHNESS          max 10 pts  (+10 <24h, +5 <72h)
 *   REVEALED PREF BONUS            (+3 per tag where explorer attended 3+ events)
 */
export async function scoreEventForExplorer(
  event: Event & { maker: UserProfile },
  explorer: ExplorerProfile,
  attendanceHistory: AttendanceRecord[],
): Promise<number> {
  let score = 0
  const makerTags = event.maker.interest_tags ?? []
  const explorerTags = new Set(explorer.interest_tags)

  // ── TAG MATCH (max 40) ────────────────────────────────────────────────────
  let tagMatches = 0
  for (const tag of makerTags) {
    if (explorerTags.has(tag) && tagMatches < 5) {
      score += 8
      tagMatches++
    }
  }

  // ── FORMAT MATCH (max 15) ─────────────────────────────────────────────────
  // Events don't carry a format field directly; we infer from the maker's
  // creator_type by mapping to the preferred_formats vocabulary.
  const formatMap: Record<string, string> = {
    workshops_teaching: 'workshop',
    music_performance:  'performance',
    comedy_open_mic:    'performance',
    art_design:         'workshop',
    food_lifestyle:     'dining',
    content_creation:   'networking',
  }
  const derivedFormat = formatMap[event.maker.creator_type] ?? null
  if (derivedFormat && (explorer.preferred_formats ?? []).includes(derivedFormat)) {
    score += 15
  }

  // ── PRICE MATCH (max 15) ──────────────────────────────────────────────────
  const maxPaise = explorer.price_range_max_paise
  if (event.ticket_price <= maxPaise) {
    score += 15
  } else if (event.ticket_price <= maxPaise * 1.5) {
    score += 7
  }

  // ── MAKER RELATIONSHIP (max 20) ───────────────────────────────────────────
  const followedSet = new Set(explorer.followed_maker_ids ?? [])
  if (followedSet.has(event.maker.id)) {
    score += 20
  } else {
    // +10 if the Explorer has attended a previous event by this maker.
    // We rely on the attendanceHistory passed in — caller pre-fetches these.
    const attendedMakerEventIds = new Set(
      attendanceHistory
        .filter((h) => h.attended)
        .map((h) => h.event_id),
    )
    // We don't have the maker's other event IDs here — the caller should pass
    // the full history including event–maker join. We check via the admin
    // client below in getPersonalisedFeed instead; this path is a no-op when
    // called from the pure version.
    void attendedMakerEventIds
  }

  // ── FRESHNESS (max 10) ────────────────────────────────────────────────────
  const listedAt   = new Date(event.created_at).getTime()
  const ageMs      = Date.now() - listedAt
  const h24        = 24 * 60 * 60 * 1000
  const h72        = 72 * 60 * 60 * 1000
  if (ageMs <= h24) {
    score += 10
  } else if (ageMs <= h72) {
    score += 5
  }

  // ── REVEALED PREFERENCE BONUS ─────────────────────────────────────────────
  // For each tag in attendanceHistory where the Explorer attended 3+ events,
  // add +3 for every match with the event's maker tags.
  // attendance history must have been enriched with creator tags externally.
  // Here we use the simple version: +3 for each of explorer's own interest
  // tags that also appear on the maker, when the Explorer has 3+ attendance.
  if (attendanceHistory.filter((h) => h.attended).length >= 3) {
    for (const tag of makerTags) {
      if (explorerTags.has(tag)) {
        score += 3
      }
    }
  }

  return Math.min(score, 100)
}

// ---------------------------------------------------------------------------
// buildMatchReasons
// ---------------------------------------------------------------------------

function buildMatchReasons(
  event: Event & { maker: UserProfile },
  explorer: ExplorerProfile,
  score: number,
): string[] {
  const reasons: string[] = []
  const explorerTags  = new Set(explorer.interest_tags)
  const makerTags     = event.maker.interest_tags ?? []
  const followedSet   = new Set(explorer.followed_maker_ids ?? [])

  // Tag match reason — use first matching tag for the chip label.
  const matchedTag = makerTags.find((t) => explorerTags.has(t))
  if (matchedTag) {
    const label = matchedTag.replace(/_/g, ' ')
    reasons.push(`Matches your interest in ${label}`)
  }

  // Followed maker.
  if (followedSet.has(event.maker.id)) {
    reasons.push(`By a maker you follow`)
  }

  // Price range.
  if (event.ticket_price <= explorer.price_range_max_paise) {
    if (event.ticket_price === 0) {
      reasons.push('Free event')
    } else {
      reasons.push('Within your budget')
    }
  }

  // Freshness.
  const ageMs = Date.now() - new Date(event.created_at).getTime()
  if (ageMs <= 24 * 60 * 60 * 1000) {
    reasons.push('Just listed')
  }

  // High score catch-all.
  if (reasons.length === 0 && score >= 30) {
    reasons.push('Recommended for you')
  }

  return reasons
}

// ---------------------------------------------------------------------------
// getPersonalisedFeed
// ---------------------------------------------------------------------------

/**
 * Returns upcoming published events ranked by relevance to the Explorer's
 * profile. Each result is annotated with `score` and `matchReasons`.
 *
 * @param explorerId - The explorer_profiles.id (not auth_user_id).
 * @param options.limit  - Max results to return (default 20).
 * @param options.offset - Pagination offset (default 0).
 * @param options.city   - Override city filter (defaults to explorer's city).
 */
export async function getPersonalisedFeed(
  explorerId: string,
  options: { limit?: number; offset?: number; city?: string } = {},
): Promise<ScoredEvent[]> {
  const { limit = 20, offset = 0, city } = options
  const admin = createAdminClient()

  // Fetch explorer profile.
  const { data: explorer, error: explorerError } = await admin
    .from('explorer_profiles')
    .select('*')
    .eq('id', explorerId)
    .maybeSingle()

  if (explorerError || !explorer) {
    console.error('[getPersonalisedFeed] explorer not found', explorerError?.message)
    return []
  }

  const targetCity = city ?? explorer.city
  const now        = new Date().toISOString()

  // Fetch already-RSVP'd event IDs to exclude.
  const { data: rsvpRows } = await admin
    .from('rsvps')
    .select('event_id')
    .eq('attendee_user_id', explorer.auth_user_id)
    .eq('payment_status', 'captured')

  const rsvpdIds = new Set((rsvpRows ?? []).map((r) => r.event_id))

  // Fetch Explorer's attendance history enriched with maker info.
  // We fetch the event_id so we can look up which makers they've attended.
  const { data: historyRows } = await admin
    .from('explorer_event_history')
    .select('event_id, attended, rating, rated_at')
    .eq('explorer_id', explorerId)

  const attendanceHistory: AttendanceRecord[] = historyRows ?? []

  // Determine which maker IDs the Explorer has previously attended.
  // We need a small join: fetch attended event IDs → get their creator_ids.
  const attendedEventIds = attendanceHistory
    .filter((h) => h.attended)
    .map((h) => h.event_id)

  const attendedMakerIds = new Set<string>()
  if (attendedEventIds.length > 0) {
    const { data: attendedEvents } = await admin
      .from('events')
      .select('id, creator_id')
      .in('id', attendedEventIds)

    for (const e of attendedEvents ?? []) {
      attendedMakerIds.add(e.creator_id)
    }
  }

  // Fetch broad pool of upcoming published events in city, with maker profile.
  const { data: rows, error: eventsError } = await admin
    .from('events')
    .select('*, maker:user_profiles!events_creator_id_fkey(*)')
    .eq('status', 'published')
    .gt('starts_at', now)
    .order('starts_at', { ascending: true })
    .limit(500)  // score in JS, return top N

  if (eventsError) {
    console.error('[getPersonalisedFeed] events fetch failed', eventsError.message)
    return []
  }

  const followedSet   = new Set(explorer.followed_maker_ids ?? [])
  const explorerTags  = new Set(explorer.interest_tags)

  const scored: ScoredEvent[] = []

  for (const row of rows ?? []) {
    if (rsvpdIds.has(row.id)) continue

    const maker = row.maker as UserProfile | null
    if (!maker) continue

    // Filter to city — narrow the pool now that we have creator city.
    if (maker.city !== targetCity) continue

    // Strip the joined relation for the pure Event type.
    const { maker: _maker, ...plainEvent } = row as typeof row & { maker: unknown }
    const event = plainEvent as Event

    let score = 0
    const makerTags = maker.interest_tags ?? []

    // TAG MATCH (max 40)
    let tagHits = 0
    for (const tag of makerTags) {
      if (explorerTags.has(tag) && tagHits < 5) {
        score += 8
        tagHits++
      }
    }

    // FORMAT MATCH (max 15)
    const formatMap: Record<string, string> = {
      workshops_teaching: 'workshop',
      music_performance:  'performance',
      comedy_open_mic:    'performance',
      art_design:         'workshop',
      food_lifestyle:     'dining',
      content_creation:   'networking',
    }
    const derivedFormat = formatMap[maker.creator_type] ?? null
    if (derivedFormat && (explorer.preferred_formats ?? []).includes(derivedFormat)) {
      score += 15
    }

    // PRICE MATCH (max 15)
    const maxPaise = explorer.price_range_max_paise
    if (event.ticket_price <= maxPaise) {
      score += 15
    } else if (event.ticket_price <= maxPaise * 1.5) {
      score += 7
    }

    // MAKER RELATIONSHIP (max 20)
    if (followedSet.has(maker.id)) {
      score += 20
    } else if (attendedMakerIds.has(maker.id)) {
      score += 10
    }

    // FRESHNESS (max 10)
    const ageMs = Date.now() - new Date(event.created_at).getTime()
    if (ageMs <= 24 * 60 * 60 * 1000) {
      score += 10
    } else if (ageMs <= 72 * 60 * 60 * 1000) {
      score += 5
    }

    // REVEALED PREFERENCE BONUS
    if (attendanceHistory.filter((h) => h.attended).length >= 3) {
      for (const tag of makerTags) {
        if (explorerTags.has(tag)) {
          score += 3
        }
      }
    }

    score = Math.min(score, 100)

    const matchReasons = buildMatchReasons(
      { ...event, maker },
      explorer,
      score,
    )

    scored.push({ ...event, score, matchReasons })
  }

  scored.sort((a, b) => b.score - a.score)

  return scored.slice(offset, offset + limit)
}

// ---------------------------------------------------------------------------
// updateExplorerScore
// ---------------------------------------------------------------------------

/**
 * Recalculates the private explorer_score (0–100) for the given Explorer
 * based on behavioural signals, then persists it to explorer_profiles.
 *
 * Score breakdown:
 *   +30  Attendance consistency  (events attended / events RSVP'd, last 90 days)
 *   +30  Variety                 (unique tags across attended events / explorer's total tags)
 *   +20  Rating behaviour        (rated events / attended events)
 *   +20  Tenure                  (months since profile creation, capped at 12 → 20 pts)
 *
 * @param explorerId - The explorer_profiles.id.
 */
export async function updateExplorerScore(explorerId: string): Promise<void> {
  const admin = createAdminClient()

  // Fetch the explorer profile for tenure.
  const { data: explorer, error: explorerError } = await admin
    .from('explorer_profiles')
    .select('id, created_at, interest_tags')
    .eq('id', explorerId)
    .maybeSingle()

  if (explorerError || !explorer) {
    console.error('[updateExplorerScore] explorer not found', explorerError?.message)
    return
  }

  // Fetch RSVPs in last 90 days via auth_user_id join.
  const { data: explorerFull } = await admin
    .from('explorer_profiles')
    .select('auth_user_id')
    .eq('id', explorerId)
    .maybeSingle()

  const cutoff90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

  const { data: rsvpRows } = await admin
    .from('rsvps')
    .select('event_id, payment_status')
    .eq('attendee_user_id', explorerFull?.auth_user_id ?? '')
    .gte('created_at', cutoff90)

  const rsvpd   = (rsvpRows ?? []).length
  const captured = (rsvpRows ?? []).filter((r) => r.payment_status === 'captured').length

  // Fetch attendance history.
  const { data: historyRows } = await admin
    .from('explorer_event_history')
    .select('event_id, attended, rating')
    .eq('explorer_id', explorerId)

  const history     = historyRows ?? []
  const attended    = history.filter((h) => h.attended)
  const ratedCount  = history.filter((h) => h.attended && h.rating !== null).length

  // ── Consistency (max 30) ──────────────────────────────────────────────────
  const consistency =
    rsvpd > 0 ? Math.round((captured / rsvpd) * 30) : 0

  // ── Variety (max 30) ──────────────────────────────────────────────────────
  // Fetch the maker tags for every attended event.
  let varietyScore = 0
  if (attended.length > 0) {
    const { data: attendedEvents } = await admin
      .from('events')
      .select('creator_id')
      .in('id', attended.map((h) => h.event_id))

    const creatorIds = [...new Set((attendedEvents ?? []).map((e) => e.creator_id))]

    const { data: creatorProfiles } = await admin
      .from('user_profiles')
      .select('interest_tags')
      .in('id', creatorIds)

    const uniqueTagsSeen = new Set<string>()
    for (const cp of creatorProfiles ?? []) {
      for (const tag of cp.interest_tags ?? []) {
        uniqueTagsSeen.add(tag)
      }
    }

    const totalProfileTags = (explorer.interest_tags ?? []).length
    if (totalProfileTags > 0) {
      varietyScore = Math.min(
        30,
        Math.round((uniqueTagsSeen.size / totalProfileTags) * 30),
      )
    }
  }

  // ── Rating behaviour (max 20) ─────────────────────────────────────────────
  const ratingScore =
    attended.length > 0
      ? Math.round((ratedCount / attended.length) * 20)
      : 0

  // ── Tenure (max 20, capped at 12 months) ──────────────────────────────────
  const monthsSince =
    (Date.now() - new Date(explorer.created_at).getTime()) /
    (1000 * 60 * 60 * 24 * 30.44)
  const tenureScore = Math.min(20, Math.round((monthsSince / 12) * 20))

  const newScore = Math.min(
    100,
    consistency + varietyScore + ratingScore + tenureScore,
  )

  const { error: updateError } = await admin
    .from('explorer_profiles')
    .update({ explorer_score: newScore })
    .eq('id', explorerId)

  if (updateError) {
    console.error('[updateExplorerScore] update failed', updateError.message)
  }
}
