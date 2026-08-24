// Shared category display metadata for city attractions — single source of
// truth for CityMap, PlaceCard, GuideClient, and the Explorer Map tab's
// category pill row (previously 4 separately-duplicated copies). Keeping
// this in one file means swapping in a new taxonomy later is a one-file
// edit instead of a four-file hunt.
export const CATEGORY_META: Record<string, { emoji: string; label: string; color: string }> = {
  all:        { emoji: '🗺',  label: 'All',       color: '#9B8FFF' },
  heritage:   { emoji: '🏛',  label: 'Heritage',  color: '#E8A838' },
  park:       { emoji: '🌳',  label: 'Parks',     color: '#4CAF50' },
  market:     { emoji: '🛍',  label: 'Markets',   color: '#E8705A' },
  food:       { emoji: '🍽',  label: 'Food',      color: '#FF7043' },
  temple:     { emoji: '🛕',  label: 'Temples',   color: '#9C27B0' },
  nature:     { emoji: '🌿',  label: 'Nature',    color: '#2E7D32' },
  arts:       { emoji: '🎨',  label: 'Arts',      color: '#1976D2' },
  shopping:   { emoji: '🏬',  label: 'Shopping',  color: '#0288D1' },
  attraction: { emoji: '⭐',  label: 'Must-See',  color: '#F5A800' },
}
