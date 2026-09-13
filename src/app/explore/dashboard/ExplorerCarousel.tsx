'use client'

import PersonaTabSwitcher from '@/components/shared/PersonaTabSwitcher'

interface Props {
  mapSlot:         React.ReactNode
  homeSlot:        React.ReactNode
  communitiesSlot: React.ReactNode
  /** Which page lands active on mount — e.g. from a `?panel=` link on a sub-route. Defaults to Home. */
  defaultIndex?:   number
}

// Nav-pages metadata (key/label/icon, no content) for the persistent
// PersonaNavGate on sub-routes lives in src/lib/constants/personaNavPages.ts
// (EXPLORER_NAV_PAGES) — NOT here. This file is 'use client', and every
// export from a 'use client' module becomes a client-only reference, which
// the Server Component layout/page can't import — keep the metadata's
// key/label/icon in sync with the `pages` array below by hand.

// Thin wrapper around the shared PersonaTabSwitcher base (see
// src/components/shared/PersonaTabSwitcher.tsx, and CreatorCarousel.tsx /
// VenueCarousel.tsx / BrandCarousel.tsx, its other consumers). Map keeps
// fullBleed (edge-to-edge Leaflet, no rounded-corner/scroll-clip treatment)
// — it no longer needs gutterOnly, since there's no swipe gesture left to
// arbitrate against; single-finger pan on the map is untouched by construction
// now, not by a gesture-capture rule.
export default function ExplorerCarousel({ mapSlot, homeSlot, communitiesSlot, defaultIndex = 1 }: Props) {
  return (
    <PersonaTabSwitcher
      pages={[
        { key: 'map',         label: 'Map',         icon: 'map',    content: mapSlot, fullBleed: true },
        { key: 'home',        label: 'Home',        icon: 'home',   content: homeSlot },
        { key: 'communities', label: 'Communities', icon: 'groups', content: communitiesSlot },
      ]}
      defaultIndex={defaultIndex}
      accentColor="var(--venue-accent)"
      mutedColor="var(--venue-text-secondary)"
      bgColor="var(--venue-bg-base)"
      elevatedBgColor="var(--venue-bg-elevated)"
      borderColor="var(--venue-border-default)"
    />
  )
}
