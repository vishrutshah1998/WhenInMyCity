import type { PersonaNavPage } from '@/components/shared/PersonaNav'

// Nav bar height — the single source of truth. Also lives here (not in
// PersonaNav.tsx, which is 'use client') so Server Component persona
// layouts can reserve matching bottom padding on <main> for the standalone
// nav without hitting the same server/client export restriction described
// below. PersonaNav.tsx re-exports this rather than redefining it.
//
// 72, not 56: the button's content (a fixed 52px icon slot + a label with up
// to 4px margin-top + ~13px of text) is genuinely taller than 56px. Buttons
// flex-stretch to fill this height, then center that taller content inside
// via justify-content — at 56px the content overflowed the box by ~6-7px on
// BOTH edges; the overflow above was fine (nothing there to clip it — that's
// the intended "active circle pokes above the bar" look), but the overflow
// below pushed past the nav's own bottom edge, which sits exactly at the
// visible viewport's bottom — so labels ran off the actual screen edge, not
// something any overflow:hidden in this codebase controls. 72 gives the
// content room to fit without needing to overflow the box at all.
export const NAV_HEIGHT = 72

// Deliberately NOT 'use client' — the persona Carousel wrapper files (which
// build the live carousel's own `pages` array) ARE 'use client', so every
// export from them is treated as a client-only reference; importing a plain
// function/constant from a 'use client' module into a Server Component
// layout throws ("Attempted to call X from the server but X is on the
// client"). This metadata has zero client-only behavior (no hooks, no JSX),
// so it lives here instead — safely importable from both the Server
// Component persona layouts and the client Carousel wrappers/pages.
// Keep each array in sync with its Carousel wrapper's own `pages` array
// (key/label/icon must match exactly).

export const EXPLORER_NAV_PAGES: PersonaNavPage[] = [
  { key: 'map',         label: 'Map',         icon: 'map' },
  { key: 'home',        label: 'Home',        icon: 'home' },
  { key: 'communities', label: 'Communities', icon: 'groups' },
]

export const VENUE_NAV_PAGES: PersonaNavPage[] = [
  { key: 'venue',    label: 'Venue',    icon: 'storefront' },
  { key: 'home',     label: 'Home',     icon: 'dashboard' },
  { key: 'business', label: 'Business', icon: 'bar_chart_4_bars' },
]

export const BRAND_NAV_PAGES: PersonaNavPage[] = [
  { key: 'enquiries', label: 'Enquiries', icon: 'inbox' },
  { key: 'home',      label: 'Home',      icon: 'dashboard' },
  { key: 'creators',  label: 'Creators',  icon: 'search' },
]

// Always exactly 4 pages, for every tier — Community used to be gated out
// below Local (Community and Progress shared a single 3rd slot, swapped by
// isHubEnabled), but the "Communities" tab inside the Community page has no
// tier gate anywhere else in the system, so the whole page is no longer
// tier-gated either. Community's own "Creator Hub" sub-tab keeps its
// existing Local+ gate internally (CreatorCommunitySlot.tsx renders
// HubLocked for that one tab, not the whole page). Kept as a function
// (rather than a static array) for signature stability with existing
// callers, even though it no longer branches on anything.
export function getCreatorNavPages(): PersonaNavPage[] {
  return [
    { key: 'business',  label: 'Business',  icon: 'storefront' },
    { key: 'home',      label: 'Home',      icon: 'dashboard' },
    { key: 'community', label: 'Community', icon: 'diversity_3' },
    { key: 'progress',  label: 'Progress',  icon: 'workspace_premium' },
  ]
}

// ── Sub-route → nav tab mapping ─────────────────────────────────────────────
// On a sub-route (e.g. tapping into "Earn" from Creator's Business tab), the
// persistent nav should show the TAB that sub-route belongs to as active, not
// always fall back to Home. Each entry maps a page `key` to the route path
// prefixes that count as "inside" that tab — grounded in what each tab's own
// content component actually links out to (CreatorBusinessSlot.tsx,
// CreatorCommunitySlot.tsx, VenueSettingsSlot.tsx, VenueOperationsSlot.tsx),
// not guessed from folder names. Routes not listed anywhere fall back to
// Home — that's still the right default for genuinely tab-agnostic pages
// (profile, notifications, settings, etc.).

export const EXPLORER_SECTION_ROUTES: Record<string, string[]> = {
  // Full City Guide (Civic/Transit/Emergency) is reached from, and returns
  // to, the Map tab (ExplorerMapPanel.tsx's floating guide button).
  map: ['/explore/dashboard/guide'],
}

export const CREATOR_SECTION_ROUTES: Record<string, string[]> = {
  business: [
    '/dashboard/earn', '/dashboard/payouts', '/dashboard/analytics',
    '/dashboard/leads', '/dashboard/bookings', '/dashboard/venues',
  ],
  community: ['/dashboard/hub', '/dashboard/community'],
}

export const VENUE_SECTION_ROUTES: Record<string, string[]> = {
  venue: [
    '/business/venue/venue', '/business/venue/pricing',
    '/business/venue/availability', '/business/venue/studio',
  ],
  business: [
    '/business/venue/bookings', '/business/venue/calendar',
    '/business/venue/notifications', '/business/venue/analytics', '/business/venue/payouts',
  ],
}

export const BRAND_SECTION_ROUTES: Record<string, string[]> = {
  enquiries: ['/business/brand/enquiries'],
  creators:  ['/business/brand/creators'],
}

// Shared resolver — which page key should the nav rest on for a given
// pathname. Matches by exact path or a `/` boundary (so `/dashboard/earn`
// doesn't accidentally match a hypothetical `/dashboard/earnings`), and only
// returns a section key if it's actually present in `pages` (guards the
// Creator community-vs-progress case above). Falls back to `homeKey`.
export function resolveActiveNavKey(
  pathname: string,
  pages: PersonaNavPage[],
  homeKey: string,
  sectionRoutes: Record<string, string[]>,
): string {
  for (const [key, prefixes] of Object.entries(sectionRoutes)) {
    const inSection = prefixes.some(p => pathname === p || pathname.startsWith(`${p}/`))
    if (inSection && pages.some(p => p.key === key)) return key
  }
  return homeKey
}
