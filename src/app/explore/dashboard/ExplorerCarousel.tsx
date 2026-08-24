'use client'

import SwipeCarousel from '@/components/shared/SwipeCarousel'

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

// Thin wrapper around the shared SwipeCarousel base (extracted alongside
// Creator's own swipe carousel — see src/components/shared/SwipeCarousel.tsx
// for the drag/hint/nested-scroll mechanics, all unchanged from this file's
// original hand-rolled implementation). Map is the one gutter-only page here
// (Leaflet needs untouched single-finger pan) — every other consumer of
// SwipeCarousel defaults to full-surface capture.
export default function ExplorerCarousel({ mapSlot, homeSlot, communitiesSlot, defaultIndex = 1 }: Props) {
  return (
    <SwipeCarousel
      pages={[
        { key: 'map',         label: 'Map',         icon: 'map',    content: mapSlot,         gutterOnly: true, fullBleed: true },
        { key: 'home',        label: 'Home',        icon: 'home',   content: homeSlot },
        { key: 'communities', label: 'Communities', icon: 'groups', content: communitiesSlot },
      ]}
      defaultIndex={defaultIndex}
      hintStorageKey="wimc_explorer_carousel_hint_v1"
      accentColor="var(--venue-accent)"
      mutedColor="var(--venue-text-secondary)"
      bgColor="var(--venue-bg-base)"
      elevatedBgColor="var(--venue-bg-elevated)"
      borderColor="var(--venue-border-default)"
    />
  )
}
