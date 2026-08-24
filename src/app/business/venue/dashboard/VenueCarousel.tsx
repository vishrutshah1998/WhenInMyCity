'use client'

import SwipeCarousel from '@/components/shared/SwipeCarousel'

interface Props {
  homeSlot:     React.ReactNode
  venueSlot:    React.ReactNode
  businessSlot: React.ReactNode
  /** Which page lands active on mount — e.g. from a `?panel=` link on a sub-route. Defaults to Home. */
  defaultIndex?: number
}

// Nav-pages metadata (key/label/icon, no content) for the persistent
// PersonaNavGate on sub-routes lives in src/lib/constants/personaNavPages.ts
// (VENUE_NAV_PAGES) — NOT here. This file is 'use client', and every export
// from a 'use client' module becomes a client-only reference, which the
// Server Component layout/page can't import — keep the metadata's
// key/label/icon in sync with the `pages` array below by hand.

// Thin wrapper around the shared SwipeCarousel base (see
// src/components/shared/SwipeCarousel.tsx, and ExplorerCarousel.tsx /
// CreatorCarousel.tsx, its other consumers). Fixed 3 pages, no tier gating
// (venue_tier is a public trust badge only, not a nav gate) and no
// gutterOnly page — nothing in Venue's page-map is a raw-gesture surface,
// since Venue/Business both link out to their destinations via card lists
// rather than inlining anything drag-heavy (e.g. Calendar) into a slide.
export default function VenueCarousel({ homeSlot, venueSlot, businessSlot, defaultIndex = 1 }: Props) {
  return (
    <SwipeCarousel
      pages={[
        { key: 'venue',    label: 'Venue',    icon: 'storefront',  content: venueSlot },
        { key: 'home',     label: 'Home',     icon: 'dashboard',   content: homeSlot },
        { key: 'business', label: 'Business', icon: 'bar_chart_4_bars', content: businessSlot },
      ]}
      defaultIndex={defaultIndex}
      hintStorageKey="wimc_venue_carousel_hint_v1"
      accentColor="var(--venue-accent)"
      mutedColor="var(--venue-text-secondary)"
      bgColor="var(--venue-bg-base)"
      elevatedBgColor="var(--venue-bg-elevated)"
      borderColor="var(--venue-border-default)"
    />
  )
}
