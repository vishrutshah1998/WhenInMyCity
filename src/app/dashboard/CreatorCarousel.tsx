'use client'

import SwipeCarousel from '@/components/shared/SwipeCarousel'

interface Props {
  /** Gates the Community page out of the sequence entirely below Local+ tier — same isLocalPlus(tier) check desktop Sidebar uses. */
  isHubEnabled:  boolean
  accentColor:   string
  homeSlot:      React.ReactNode
  businessSlot:  React.ReactNode
  communitySlot: React.ReactNode
  progressSlot:  React.ReactNode
}

// Thin wrapper around the shared SwipeCarousel base (see
// src/components/shared/SwipeCarousel.tsx and ExplorerCarousel.tsx, its
// other consumer). Below Local+ tier the Community page is omitted from the
// pages array entirely (3 pages instead of 4) rather than rendered as a
// locked 4th page — isHubEnabled is computed once per server render
// (dashboard/layout.tsx's isHubEnabled/hasAnyEvent/hasAnyRsvp pattern), so
// this can't change out from under a user mid-swipe.
export default function CreatorCarousel({ isHubEnabled, accentColor, homeSlot, businessSlot, communitySlot, progressSlot }: Props) {
  return (
    <SwipeCarousel
      pages={[
        { key: 'home',     label: 'Home',     icon: 'dashboard',          content: homeSlot },
        { key: 'business', label: 'Business',  icon: 'storefront',        content: businessSlot },
        ...(isHubEnabled
          ? [{ key: 'community', label: 'Community', icon: 'diversity_3', content: communitySlot }]
          : []),
        { key: 'progress', label: 'Progress', icon: 'workspace_premium', content: progressSlot },
      ]}
      defaultIndex={0}
      hintStorageKey="wimc_creator_carousel_hint_v1"
      accentColor={accentColor}
      mutedColor="var(--wimc-text-secondary)"
      bgColor="var(--wimc-bg-base)"
      elevatedBgColor="var(--wimc-bg-elevated)"
      borderColor="var(--wimc-border-default)"
    />
  )
}
