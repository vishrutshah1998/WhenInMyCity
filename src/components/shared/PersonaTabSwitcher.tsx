'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { animate, useMotionValue } from 'framer-motion'
import { NAV_HEIGHT, PersonaNavBar, restingXOf, type PersonaNavPage } from './PersonaNav'

export { NAV_HEIGHT }

// Isomorphic layout effect — no-op during SSR (there's no paint to block
// there anyway), the real synchronous-before-paint effect on the client.
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

// Damping ratio ~0.91 — unchanged from SwipeCarousel's own PAGE_SPRING, kept
// identical so a tap-triggered settle still reads the same way that a
// swipe-release settle used to.
const PAGE_SPRING = { type: 'spring', stiffness: 300, damping: 30, mass: 0.9 } as const

export interface PersonaTabPage extends PersonaNavPage {
  content: React.ReactNode
  /**
   * When true, this tab's content skips the shared rounded-corner/scroll-clip
   * treatment (edge-to-edge content, e.g. a full-bleed Leaflet map). The
   * content is responsible for reserving space above the nav (NAV_HEIGHT) so
   * interactive elements aren't rendered underneath it. Defaults to false.
   */
  fullBleed?: boolean
}

interface Props {
  pages:           PersonaTabPage[]
  defaultIndex?:   number
  accentColor:     string
  mutedColor:      string
  bgColor:         string
  elevatedBgColor: string
  borderColor:     string
  /** px from the top the switcher starts below (matches the persona's top bar height). Default 48. */
  topOffset?:      number
}

// Tap-driven replacement for SwipeCarousel.tsx — no drag, no swipe gesture,
// no partial-peek. Exactly one tab's content is ever mounted: switching tabs
// unmounts the outgoing content and mounts the incoming content fresh (keyed
// on page.key), rather than keeping every tab alive off-screen the way the
// old flex-track carousel did. That's a deliberate tradeoff — a tab's scroll
// position is NOT preserved across a switch away and back — traded for a
// hard guarantee of zero state/visual bleed between tabs (no lingering
// timers, observers, or scroll position from an inactive tab).
//
// Reuses PersonaNavBar/CircularNavButton from PersonaNav.tsx completely
// unchanged — they already derive every visual (size/lift/glow/color) purely
// from whatever trackX they're given, with no awareness of whether that
// trackX is being live-dragged or (as here) sprung directly from one resting
// position to another on tap. PersonaNavStandalone (the sub-route nav) has
// proven this same reuse already; no drag-specific code needed disentangling.
export default function PersonaTabSwitcher({
  pages, defaultIndex = 0,
  accentColor, mutedColor, bgColor, elevatedBgColor, borderColor,
  topOffset = 48,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  // Starts at 0 on both server and client to avoid a hydration mismatch —
  // same reasoning as SwipeCarousel's identical width state.
  const [width, setWidth] = useState(0)
  const [pageIndex, setPageIndex] = useState(defaultIndex)

  const trackX = useMotionValue(restingXOf(defaultIndex, width))

  useIsomorphicLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => setWidth(el.clientWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Keep the nav's own track pinned to the active page's resting position on
  // resize — mirrors SwipeCarousel's identical effect.
  useIsomorphicLayoutEffect(() => {
    if (width === 0) return
    trackX.set(restingXOf(pageIndex, width))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width])

  const selectPage = useCallback((idx: number) => {
    if (idx === pageIndex || idx < 0 || idx >= pages.length || width === 0) return
    setPageIndex(idx)
    animate(trackX, restingXOf(idx, width), PAGE_SPRING)
  }, [pageIndex, width, trackX, pages.length])

  const active = pages[pageIndex]

  return (
    <div
      className="fixed lg:hidden left-0 right-0 md:left-[var(--wimc-sidebar-w)] z-20"
      style={{
        top: topOffset,
        height: `calc(100dvh - ${topOffset}px)`,
        overflow: 'hidden',
        background: bgColor,
      }}
      ref={containerRef}
    >
      {/* Exactly one tab's content is ever in the tree — switching tabs
          swaps which key is mounted, so React tears the outgoing one down
          completely rather than hiding it. */}
      <div
        key={active.key}
        style={{
          width: '100%',
          height: '100%',
          overflowY: active.fullBleed ? 'hidden' : 'auto',
          overflowX: 'hidden',
          borderRadius: active.fullBleed ? 0 : 18,
          background: bgColor,
        }}
      >
        {active.content}
      </div>

      <PersonaNavBar
        pages={pages} active={pageIndex} onSelect={selectPage}
        trackX={trackX} width={width}
        accentColor={accentColor} mutedColor={mutedColor}
        elevatedBgColor={elevatedBgColor} borderColor={borderColor}
      />
    </div>
  )
}
