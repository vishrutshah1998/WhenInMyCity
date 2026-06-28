/**
 * Maps raw Google Places `types` array to WIMC venue types and amenity labels.
 * Used by V4 (type pre-selection) and V6 (amenity pre-fill).
 */

// WIMC adda_type enum values
export type WimcVenueType =
  | 'cafe' | 'coworking' | 'gallery' | 'community_hall'
  | 'rooftop' | 'garden' | 'studio' | 'library' | 'restaurant'

// Maps Google place type strings → WIMC venue types
const GOOGLE_TO_WIMC: Partial<Record<string, WimcVenueType[]>> = {
  cafe:              ['cafe'],
  coffee_shop:       ['cafe'],
  restaurant:        ['restaurant'],
  food:              ['restaurant'],
  bar:               ['cafe'],
  night_club:        ['cafe'],
  art_gallery:       ['gallery'],
  museum:            ['gallery'],
  library:           ['library'],
  book_store:        ['library'],
  park:              ['garden'],
  garden:            ['garden'],
  gym:               ['studio'],
  health:            ['studio'],
  beauty_salon:      ['studio'],
  spa:               ['studio'],
  coworking_space:   ['coworking'],
  banquet_hall:      ['community_hall'],
  event_venue:       ['community_hall'],
  auditorium:        ['community_hall'],
  lodging:           ['community_hall'],
}

/**
 * Derives a deduplicated list of WIMC venue types from Google place types.
 * Skips generic types like 'establishment', 'point_of_interest', 'premise'.
 */
export function deriveWimcTypes(googleTypes: string[]): WimcVenueType[] {
  const seen = new Set<WimcVenueType>()
  for (const gt of googleTypes) {
    const mapped = GOOGLE_TO_WIMC[gt]
    if (mapped) mapped.forEach(t => seen.add(t))
  }
  return [...seen]
}

// Maps Google place type strings → V6 amenity display labels
// These labels must exactly match the items in AMENITY_CATEGORIES in V6/page.tsx
const GOOGLE_TYPE_TO_AMENITIES: Partial<Record<string, string[]>> = {
  cafe:        ['In-House Café', 'Coffee & Tea'],
  coffee_shop: ['In-House Café', 'Coffee & Tea'],
  restaurant:  ['In-House Café', 'Bar & Alcohol'],
  food:        ['In-House Café'],
  bar:         ['Bar & Alcohol', 'DJ / Live Music OK', 'Late Night (12am+)'],
  night_club:  ['Bar & Alcohol', 'DJ / Live Music OK', 'Late Night (12am+)'],
  art_gallery: ['Photography Friendly', 'Natural Light', 'Art Walls'],
  museum:      ['Photography Friendly', 'Natural Light'],
  library:     ['Natural Light', 'Silent Zone', 'WiFi (Fibre)'],
  park:        ['Outdoor Terrace', 'Garden / Lawn'],
  garden:      ['Outdoor Terrace', 'Garden / Lawn'],
  gym:         ['AC Throughout'],
  spa:         ['AC Throughout', 'Natural Light'],
}

/**
 * Infers a set of V6 amenity labels from Google place types and wheelchair data.
 * The caller merges these with venue-type defaults before setting state.
 */
export function inferAmenitiesFromGoogle(
  googleTypes: string[],
  wheelchairAccessible: boolean | null,
): Set<string> {
  const amenities = new Set<string>()
  for (const gt of googleTypes) {
    const items = GOOGLE_TYPE_TO_AMENITIES[gt]
    if (items) items.forEach(a => amenities.add(a))
  }
  if (wheelchairAccessible === true) {
    amenities.add('Wheelchair Ramp')
    amenities.add('Accessible Toilets')
  }
  return amenities
}
