'use client'

import PersonaTabSwitcher from '@/components/shared/PersonaTabSwitcher'

interface Props {
  accentColor:   string
  homeSlot:      React.ReactNode
  businessSlot:  React.ReactNode
  communitySlot: React.ReactNode
  /** Which page lands active on mount — e.g. from a `?panel=` link on a sub-route. Defaults to Home. */
  defaultIndex?: number
}

// Nav-pages metadata (key/label/icon, no content) for the persistent
// PersonaNavGate on sub-routes lives in src/lib/constants/personaNavPages.ts
// (getCreatorNavPages) — NOT here. This file is 'use client', and every
// export from a 'use client' module becomes a client-only reference, which
// the Server Component layout can't import (this bit a real runtime error:
// "Attempted to call getCreatorNavPages() from the server but
// getCreatorNavPages is on the client" — fixed by moving it out). Keep the
// metadata's key/label/icon in sync with the `pages` array below by hand.

// Thin wrapper around the shared PersonaTabSwitcher base (see
// src/components/shared/PersonaTabSwitcher.tsx and ExplorerCarousel.tsx,
// its other consumer). Always exactly 3 tabs for every tier — Community used
// to be gated out below Local (Community and Progress shared a single 3rd
// slot, swapped by isHubEnabled, so below-Local creators never saw Community
// at all), but the "Communities" tab inside the Community page has no tier
// gate anywhere else in the system, so the whole page shouldn't be
// tier-gated either. Community's own "Creator Hub" sub-tab keeps its
// existing Local+ gate internally (CreatorCommunitySlot.tsx renders
// HubLocked for that one tab). Progress is no longer a tab here — it's a
// card inside Business (CreatorBusinessSlot.tsx's "Recognition" group)
// linking to /dashboard/progress, reachable regardless of tier same as
// before.
export default function CreatorCarousel({ accentColor, homeSlot, businessSlot, communitySlot, defaultIndex = 1 }: Props) {
  return (
    <PersonaTabSwitcher
      pages={[
        { key: 'business',  label: 'Business',  icon: 'storefront',  content: businessSlot },
        { key: 'home',      label: 'Home',      icon: 'dashboard',   content: homeSlot },
        { key: 'community', label: 'Community', icon: 'diversity_3', content: communitySlot },
      ]}
      defaultIndex={defaultIndex}
      accentColor={accentColor}
      mutedColor="var(--wimc-text-secondary)"
      bgColor="var(--wimc-bg-base)"
      elevatedBgColor="var(--wimc-bg-elevated)"
      borderColor="var(--wimc-border-default)"
    />
  )
}
