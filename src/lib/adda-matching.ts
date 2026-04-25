// =============================================================================
// WIMC — Adda Matching Engine
// Scores and ranks Adda venues against an event's requirements.
// =============================================================================

import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import type { AddaProfile } from '@/types/database'
import type { CreateEventInput } from '@/types/events'
import type { PricingModel } from '@/types/marketplace'

// ---------------------------------------------------------------------------
// Internal scoring helpers
// ---------------------------------------------------------------------------

/** Maximum social-proof points (caps at `MAX_SOCIAL_PROOF_POINTS`). */
const MAX_SOCIAL_PROOF_POINTS = 10

/**
 * Maps an event type keyword (from INTEREST_TAGS / creator_type) to the Adda
 * types that are a natural fit.
 *
 * Used by `calculateAddaMatchScore` to award the +30 event-type match bonus.
 */
const EVENT_TYPE_TO_ADDA_TYPES: Record<string, string[]> = {
  music_performance:  ['cafe', 'rooftop', 'restaurant', 'garden'],
  comedy_open_mic:    ['cafe', 'rooftop', 'community_hall', 'restaurant'],
  art_design:         ['gallery', 'studio', 'coworking'],
  workshops_teaching: ['coworking', 'studio', 'library', 'community_hall'],
  food_lifestyle:     ['restaurant', 'cafe', 'garden', 'rooftop'],
  content_creation:   ['studio', 'coworking', 'library'],
}

// ---------------------------------------------------------------------------
// calculateAddaMatchScore
// ---------------------------------------------------------------------------

/**
 * Scores a single Adda venue against an event's requirements on a 0–100 scale.
 *
 * | Criterion                                    | Points |
 * |----------------------------------------------|--------|
 * | adda_type matches the event category          | +30    |
 * | capacity_max ≥ expected_attendees             | +20    |
 * | pricing_model matches the maker's preference | +15    |
 * | each matching amenity (e.g. projector, pa)   | +10    |
 * | social proof (total_events_hosted, capped)   | ≤ +10  |
 * | adda.city matches event city (future-proof)  | +5     |
 *
 * Amenity points are individually capped so a single uber-equipped venue can't
 * score above 100 — the raw total is `Math.min(score, 100)`.
 *
 * @param event   Partial event data (from onboarding / proposal form).
 * @param adda    Full Adda profile row.
 * @param eventCity Optional: city of the event (defaults to adda.city for v1).
 * @param preferredPricingModel Optional: the maker's preferred pricing model.
 * @returns Integer score 0–100.
 */
export function calculateAddaMatchScore(
  event: Partial<CreateEventInput> & {
    event_type?: string           // creator_type of the maker
    expected_attendees?: number
    preferred_pricing_model?: PricingModel
  },
  adda: AddaProfile,
  eventCity?: string,
): number {
  let score = 0

  // +30: adda_type aligns with the event type
  const compatibleTypes = EVENT_TYPE_TO_ADDA_TYPES[event.event_type ?? ''] ?? []
  const hasTypeMatch = adda.adda_type.some((t) => compatibleTypes.includes(t))
  if (hasTypeMatch) score += 30

  // +20: venue can fit the expected headcount
  const expectedAttendees = event.expected_attendees ?? 0
  if (expectedAttendees > 0 && adda.capacity_max != null && adda.capacity_max >= expectedAttendees) {
    score += 20
  } else if (expectedAttendees === 0) {
    // No headcount requirement — give partial credit
    score += 10
  }

  // +15: pricing model preference match
  if (event.preferred_pricing_model && adda.pricing_model === event.preferred_pricing_model) {
    score += 15
  }

  // +10 per matching amenity (each amenity from the event's requirements)
  // We infer required amenities from the event type
  const impliedAmenities = inferRequiredAmenities(event.event_type)
  for (const amenity of impliedAmenities) {
    if (adda.amenities.includes(amenity)) {
      score += 10
    }
  }

  // +10 social proof: log-scale capped at MAX_SOCIAL_PROOF_POINTS
  const socialProof = Math.min(adda.total_events_hosted, MAX_SOCIAL_PROOF_POINTS)
  score += socialProof

  // +5 city match (always true in v1 since search is city-scoped; future-proofs multi-city)
  const addaCity = (eventCity ?? adda.city).toLowerCase()
  if (adda.city.toLowerCase() === addaCity) {
    score += 5
  }

  return Math.min(score, 100)
}

/**
 * Returns the amenities most relevant to a given event type.
 * Used internally to compute amenity-match points.
 */
function inferRequiredAmenities(eventType?: string): string[] {
  switch (eventType) {
    case 'music_performance': return ['pa_system', 'natural_light', 'outdoor_space']
    case 'comedy_open_mic':   return ['pa_system', 'ac']
    case 'art_design':        return ['natural_light', 'whiteboard']
    case 'workshops_teaching':return ['projector', 'whiteboard', 'wifi']
    case 'food_lifestyle':    return ['kitchen', 'outdoor_space']
    case 'content_creation':  return ['wifi', 'natural_light']
    default:                  return []
  }
}

// ---------------------------------------------------------------------------
// getSuggestedAddas
// ---------------------------------------------------------------------------

/**
 * Fetches Adda venues matching the basic city + criteria, scores each using
 * `calculateAddaMatchScore`, checks availability for the target date, and
 * returns results sorted by match score descending (available Addas first).
 *
 * Requires the admin client because it is used from a Server Action that
 * already enforces Nukkad+ tier gating.
 *
 * @param makerId   The maker's `user_profiles.id` (used to fetch their city).
 * @param eventData Partial event data supplied during the proposal form.
 * @param date      Optional ISO date string — if provided, availability is
 *                  checked against `adda_availability` for that date.
 * @returns Sorted array of `AddaProfile & { matchScore; isAvailable }`.
 */
export async function getSuggestedAddas(
  makerId: string,
  eventData: Partial<CreateEventInput> & {
    event_type?: string
    expected_attendees?: number
    preferred_pricing_model?: PricingModel
  },
  date?: string,
): Promise<Array<AddaProfile & { matchScore: number; isAvailable: boolean }>> {
  const admin = createAdminClient()

  // Fetch maker's city to scope the search
  const { data: maker } = await admin
    .from('user_profiles')
    .select('city, creator_type')
    .eq('id', makerId)
    .maybeSingle()

  if (!maker) return []

  const eventType = eventData.event_type ?? maker.creator_type

  // Fetch active Addas in the same city
  const { data: addas, error } = await admin
    .from('adda_profiles')
    .select('*')
    .eq('is_active', true)
    .eq('city', maker.city)
    .order('total_events_hosted', { ascending: false })
    .limit(60)

  if (error || !addas?.length) return []

  // Check availability for the target date (if provided)
  const availabilityMap = new Map<string, boolean>() // addaId → isAvailable

  if (date && addas.length) {
    const addaIds = addas.map((a) => a.id)

    const { data: fullDayBlocked } = await admin
      .from('adda_availability')
      .select('adda_id')
      .in('adda_id', addaIds)
      .eq('date', date)
      .eq('slot_type', 'full_day')
      .in('status', ['blocked', 'confirmed'])

    const blockedSet = new Set((fullDayBlocked ?? []).map((s) => s.adda_id))

    for (const adda of addas) {
      availabilityMap.set(adda.id, !blockedSet.has(adda.id))
    }
  }

  // Score each adda
  const scored = addas.map((adda) => ({
    ...adda,
    matchScore:  calculateAddaMatchScore({ ...eventData, event_type: eventType }, adda, maker.city),
    isAvailable: date ? (availabilityMap.get(adda.id) ?? true) : true,
  }))

  // Sort: available first, then by score descending
  scored.sort((a, b) => {
    if (a.isAvailable !== b.isAvailable) return a.isAvailable ? -1 : 1
    return b.matchScore - a.matchScore
  })

  return scored
}
