'use client'

import SwipeCarousel from '@/components/shared/SwipeCarousel'

interface Props {
  mapSlot:         React.ReactNode
  homeSlot:        React.ReactNode
  communitiesSlot: React.ReactNode
}

// Thin wrapper around the shared SwipeCarousel base (extracted alongside
// Creator's own swipe carousel — see src/components/shared/SwipeCarousel.tsx
// for the drag/hint/nested-scroll mechanics, all unchanged from this file's
// original hand-rolled implementation). Map is the one gutter-only page here
// (Leaflet needs untouched single-finger pan) — every other consumer of
// SwipeCarousel defaults to full-surface capture.
export default function ExplorerCarousel({ mapSlot, homeSlot, communitiesSlot }: Props) {
  return (
    <SwipeCarousel
      pages={[
        { key: 'map',         label: 'Map',         icon: 'map',    content: mapSlot,         gutterOnly: true },
        { key: 'home',        label: 'Home',        icon: 'home',   content: homeSlot },
        { key: 'communities', label: 'Communities', icon: 'groups', content: communitiesSlot },
      ]}
      defaultIndex={1}
      hintStorageKey="wimc_explorer_carousel_hint_v1"
      accentColor="var(--venue-accent)"
      mutedColor="var(--venue-text-secondary)"
      bgColor="var(--venue-bg-base)"
      elevatedBgColor="var(--venue-bg-elevated)"
      borderColor="var(--venue-border-default)"
    />
  )
}
