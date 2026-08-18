'use client'

import SwipeCarousel from '@/components/shared/SwipeCarousel'

interface Props {
  homeSlot:      React.ReactNode
  enquiriesSlot: React.ReactNode
  creatorsSlot:  React.ReactNode
}

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
export default function BrandCarousel({ homeSlot, enquiriesSlot, creatorsSlot }: Props) {
  return (
    <SwipeCarousel
      pages={[
        { key: 'home',      label: 'Home',      icon: 'dashboard', content: homeSlot },
        { key: 'enquiries', label: 'Enquiries', icon: 'inbox',     content: enquiriesSlot },
        { key: 'creators',  label: 'Creators',  icon: 'search',    content: creatorsSlot },
      ]}
      defaultIndex={0}
      hintStorageKey="wimc_brand_carousel_hint_v1"
      accentColor="var(--venue-accent)"
      mutedColor="var(--venue-text-secondary)"
      bgColor="var(--venue-bg-base)"
      elevatedBgColor="var(--venue-bg-elevated)"
      borderColor="var(--venue-border-default)"
    />
  )
}
