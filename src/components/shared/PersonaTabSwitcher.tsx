'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, animate, motion, useMotionValue } from 'framer-motion'
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
  // Which physical direction the most recent tap moved — 1 (tapped a tab to
  // the right) or -1 (tapped a tab to the left). Read by AnimatePresence's
  // `custom` prop below, which is how framer-motion re-targets an
  // already-exiting panel's exit animation to the LATEST tap rather than the
  // tap that originally triggered its removal.
  const [direction, setDirection] = useState(1)

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
    setDirection(idx > pageIndex ? 1 : -1)
    setPageIndex(idx)
    animate(trackX, restingXOf(idx, width), PAGE_SPRING)
  }, [pageIndex, width, trackX, pages.length])

  const active = pages[pageIndex]

  // Functions (not fixed objects) so AnimatePresence can re-evaluate the
  // EXIT target using whatever `direction`/`custom` is current at the moment
  // a panel is removed — not the direction that was in scope when that panel
  // first mounted. `pointerEvents: 'none'` on exit is a non-interpolated
  // value; framer-motion applies it immediately when the exit starts, so a
  // rapid tap can't land on content that's mid-slide-out.
  const slideVariants = {
    enter:  (dir: number) => ({ x: dir * width }),
    center: { x: 0 },
    exit:   (dir: number) => ({ x: -dir * width, pointerEvents: 'none' as const }),
  }

  return (
    <div
      className="fixed lg:hidden left-0 right-0 md:left-[var(--wimc-sidebar-w)] z-20"
      style={{
        // top+bottom (no computed height) — same fix already validated on
        // PersonaNavStandalone (see PersonaNav.tsx): a calc(100dvh - topOffset)
        // height was leaving a gap between the nav and the real screen edge
        // on iOS Safari, where 100dvh doesn't always recompute promptly as
        // the dynamic toolbar animates. Anchoring both edges directly lets
        // the container track the real visual viewport instead.
        top: topOffset,
        bottom: 0,
        overflow: 'hidden',
        background: bgColor,
      }}
      ref={containerRef}
    >
      {/* Switching tabs swaps which key is mounted — AnimatePresence keeps
          the outgoing panel around only long enough to spring off-screen,
          then React tears it down completely (not hidden indefinitely, the
          way the old always-mounted SwipeCarousel kept every tab alive). */}
      <AnimatePresence custom={direction} initial={false}>
        <motion.div
          key={active.key}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={PAGE_SPRING}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            overflowY: active.fullBleed ? 'hidden' : 'auto',
            overflowX: 'hidden',
            borderRadius: active.fullBleed ? 0 : 18,
            background: bgColor,
          }}
        >
          {active.content}
        </motion.div>
      </AnimatePresence>

      <PersonaNavBar
        pages={pages} active={pageIndex} onSelect={selectPage}
        trackX={trackX} width={width}
        accentColor={accentColor} mutedColor={mutedColor}
        elevatedBgColor={elevatedBgColor} borderColor={borderColor}
      />
    </div>
  )
}
