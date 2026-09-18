'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import VenueCarousel from './VenueCarousel'
import { VENUE_NAV_PAGES } from '@/lib/constants/personaNavPages'
import { useVenueCarouselProps } from './VenueCarouselContext'

// Layout-level sibling of .dash-content (rendered from business/venue/
// layout.tsx at the same level as PersonaNavGate) — NOT rendered inline in
// dashboard/page.tsx, and NOT portaled. .dash-content's mount-in animation
// has a transform in its keyframes, and a transform on any ancestor
// establishes a new containing block for `position: fixed` descendants,
// trapping VenueCarousel's tab bar away from the real viewport if it's
// nested inside .dash-content. See the matching comment on PersonaNavGate
// in layout.tsx, which hit and fixed the identical bug for every OTHER
// /business/venue route — and mirrors CreatorCarouselSlot.tsx, which fixed
// this same bug for Creator's home carousel. page.tsx still owns the
// Supabase fetch and publishes its computed props here via
// VenueCarouselContext (VenueCarouselPublisher) instead of rendering the
// carousel itself.
function VenueCarouselSlotInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const carouselProps = useVenueCarouselProps()

  // Only the index route owns a live carousel — every other
  // /business/venue/* route renders PersonaNavGate instead (see its own
  // no-op check for this route). carouselProps is null until page.tsx's
  // fetch resolves and its VenueCarouselPublisher mounts (and after
  // navigating away, once its cleanup clears it).
  const panel = searchParams.get('panel')
  const panelIndex = panel ? VENUE_NAV_PAGES.findIndex(p => p.key === panel) : -1
  const homeIndex = VENUE_NAV_PAGES.findIndex(p => p.key === 'home')

  // VenueCarouselSlotInner itself never unmounts (layout.tsx always renders
  // VenueCarouselSlot, regardless of route) — only this component's early
  // return below toggles visibility. That means VenueCarousel's internal
  // PersonaTabSwitcher, whose active-tab state is seeded once from
  // `defaultIndex` via useState, would otherwise keep whatever tab was last
  // active in memory across a navigate-away-and-back, instead of resetting
  // to Home (or an explicit ?panel= target) on arrival. Bumping `mountKey`
  // on the transition INTO /business/venue/dashboard forces a fresh mount,
  // which reseeds pageIndex from the freshly computed defaultIndex below.
  // Keyed off the pathname transition (not every render while already on
  // the index route) so it doesn't fight the user tapping tabs.
  const prevPathnameRef = useRef(pathname)
  const [mountKey, setMountKey] = useState(0)
  useEffect(() => {
    if (prevPathnameRef.current !== '/business/venue/dashboard' && pathname === '/business/venue/dashboard') {
      setMountKey(k => k + 1)
    }
    prevPathnameRef.current = pathname
  }, [pathname])

  if (pathname !== '/business/venue/dashboard' || !carouselProps) return null

  return (
    <div className="lg:hidden">
      <VenueCarousel key={mountKey} {...carouselProps} defaultIndex={panelIndex !== -1 ? panelIndex : homeIndex} />
    </div>
  )
}

// useSearchParams() requires a Suspense boundary in Next.js 15 — same
// reasoning as CreatorCarouselSlot.tsx. fallback is null (not the
// carousel), so it never touches carouselProps/mounts any of its slots'
// own data-fetching effects.
export default function VenueCarouselSlot() {
  return (
    <Suspense fallback={null}>
      <VenueCarouselSlotInner />
    </Suspense>
  )
}
