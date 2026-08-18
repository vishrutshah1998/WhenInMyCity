'use client'

import SwipeCarousel from '@/components/shared/SwipeCarousel'

interface Props {
  homeSlot:     React.ReactNode
  venueSlot:    React.ReactNode
  businessSlot: React.ReactNode
}

// Thin wrapper around the shared SwipeCarousel base (see
// src/components/shared/SwipeCarousel.tsx, and ExplorerCarousel.tsx /
// CreatorCarousel.tsx, its other consumers). Fixed 3 pages, no tier gating
// (venue_tier is a public trust badge only, not a nav gate) and no
// gutterOnly page — nothing in Venue's page-map is a raw-gesture surface,
// since Venue/Business both link out to their destinations via card lists
// rather than inlining anything drag-heavy (e.g. Calendar) into a slide.
export default function VenueCarousel({ homeSlot, venueSlot, businessSlot }: Props) {
  return (
    <SwipeCarousel
      pages={[
        { key: 'home',     label: 'Home',     icon: 'dashboard',   content: homeSlot },
        { key: 'venue',    label: 'Venue',    icon: 'storefront',  content: venueSlot },
        { key: 'business', label: 'Business', icon: 'bar_chart_4_bars', content: businessSlot },
      ]}
      defaultIndex={0}
      hintStorageKey="wimc_venue_carousel_hint_v1"
      accentColor="var(--venue-accent)"
      mutedColor="var(--venue-text-secondary)"
      bgColor="var(--venue-bg-base)"
      elevatedBgColor="var(--venue-bg-elevated)"
      borderColor="var(--venue-border-default)"
    />
  )
}
