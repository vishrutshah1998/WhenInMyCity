'use client'

import SwipeCarousel from '@/components/shared/SwipeCarousel'

interface Props {
  homeSlot:      React.ReactNode
  enquiriesSlot: React.ReactNode
  creatorsSlot:  React.ReactNode
  /** Which page lands active on mount — e.g. from a `?panel=` link on a sub-route. Defaults to Home. */
  defaultIndex?: number
}

// Nav-pages metadata (key/label/icon, no content) for the persistent
// PersonaNavGate on sub-routes lives in src/lib/constants/personaNavPages.ts
// (BRAND_NAV_PAGES) — NOT here. This file is 'use client', and every export
// from a 'use client' module becomes a client-only reference, which the
// Server Component layout/page can't import — keep the metadata's
// key/label/icon in sync with the `pages` array below by hand.

// Thin wrapper around the shared SwipeCarousel base (see
// src/components/shared/SwipeCarousel.tsx, and ExplorerCarousel.tsx /
// CreatorCarousel.tsx / VenueCarousel.tsx, its other consumers). Fixed 3
// pages mapped directly onto Brand's real destinations (Home / Enquiries /
// Creators) — Brand's nav is thin enough (4 destinations total, My Page
// already reachable from Home) that no card-list hub consolidation is
// needed, unlike Creator/Venue. No gutterOnly page — Enquiries is a static
// empty state and Creators' one horizontal-scroll row (filter chips) is
// already covered by the generic nested-scroll handoff, not a raw gesture
// surface like Explorer's Leaflet map.
export default function BrandCarousel({ homeSlot, enquiriesSlot, creatorsSlot, defaultIndex = 1 }: Props) {
  return (
    <SwipeCarousel
      pages={[
        { key: 'enquiries', label: 'Enquiries', icon: 'inbox',     content: enquiriesSlot },
        { key: 'home',      label: 'Home',      icon: 'dashboard', content: homeSlot },
        { key: 'creators',  label: 'Creators',  icon: 'search',    content: creatorsSlot },
      ]}
      defaultIndex={defaultIndex}
      hintStorageKey="wimc_brand_carousel_hint_v1"
      accentColor="var(--venue-accent)"
      mutedColor="var(--venue-text-secondary)"
      bgColor="var(--venue-bg-base)"
      elevatedBgColor="var(--venue-bg-elevated)"
      borderColor="var(--venue-border-default)"
    />
  )
}
