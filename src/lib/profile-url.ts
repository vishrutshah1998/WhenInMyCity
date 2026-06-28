/** Convert a city display name to a URL-safe slug. e.g. "New Delhi" → "new-delhi" */
export function cityToSlug(city: string | null | undefined): string {
  if (!city) return 'india'
  return city.toLowerCase().replace(/\s+/g, '-')
}

/**
 * Canonical public profile URL.
 * Format: /{citySlug}/{username}
 */
export function profileUrl(city: string | null | undefined, username: string): string {
  return `/${cityToSlug(city)}/${username}`
}
