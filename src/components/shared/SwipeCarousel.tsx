'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useTransform, animate, type MotionValue } from 'framer-motion'
import { NAV_HEIGHT, PersonaNavBar, restingXOf, slideWidthOf } from './PersonaNav'

export { NAV_HEIGHT }

// useLayoutEffect warns when it runs during SSR (it's a no-op there anyway,
// since there's no paint to block) — this is the standard workaround: a
// regular useEffect on the server (never actually runs), the real
// synchronous-before-paint useLayoutEffect on the client.
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

// ── Layout constants ──────────────────────────────────────────────────────────
// No peek — pages are exactly full-width, nothing of a neighbor page visible
// at rest, so each page reads as its own screen rather than one continuous
// horizontal plane. The circular nav (not content bleed) now carries the
// "there's more to swipe to" affordance instead. slideWidthOf/restingXOf are
// shared with PersonaNav.tsx (single source of truth — the nav's own sliding
// track has to stay in exact sync with these, so they must never drift).
const GAP = 10  // px gap between slides — must match PersonaNav.tsx's own GAP

// Damping ratio ~0.91 (was ~0.97, near-critical) — a touch softer so page
// settles read as a glide rather than a snap, without visible overshoot.
const PAGE_SPRING = { type: 'spring', stiffness: 300, damping: 30, mass: 0.9 } as const

export interface SwipeCarouselPage {
  key:     string
  label:   string
  icon:    string
  content: React.ReactNode
  /**
   * When true, this page's own content owns single-finger drag/pan (e.g. a Leaflet
   * map) — the carousel only captures the gesture as a page-turn when it starts in
   * an edge gutter. Every other page accepts a swipe starting anywhere.
   * Defaults to false (full-surface capture).
   */
  gutterOnly?: boolean
  /**
   * When true, this page's slide skips the shared rounded-corner/scroll-clip
   * treatment (edge-to-edge content, e.g. a full-bleed Leaflet map). The
   * page's own content is responsible for reserving space above the
   * circular nav (NAV_HEIGHT) so interactive elements aren't rendered
   * underneath it. Defaults to false (existing rounded-card treatment).
   */
  fullBleed?: boolean
}

interface Props {
  pages:            SwipeCarouselPage[]
  defaultIndex?:    number
  /** localStorage key gating the one-time first-use swipe hint — must be unique per carousel instance. */
  hintStorageKey:   string
  accentColor:      string
  mutedColor:       string
  bgColor:          string
  elevatedBgColor:  string
  borderColor:      string
  /** px from the top the carousel starts below (matches the persona's top bar height). Default 48. */
  topOffset?:       number
}

// A single page's slide — split out from the parent so its depth/parallax
// effect can call useTransform (a hook) once per page even though the parent
// renders a variable number of pages (Explorer/Venue/Brand are 3, Creator is
// 4). Derives scale/opacity directly from the shared trackX motion
// value, so the off-center dim/shrink stays in sync automatically whether
// the user is mid-drag or the page is mid-spring-settle — no extra state.
function CarouselSlide({ page, index, trackX, width, isLast, bgColor }: {
  page:    SwipeCarouselPage
  index:   number
  trackX:  MotionValue<number>
  width:   number
  isLast:  boolean
  bgColor: string
}) {
  const sw     = slideWidthOf(width)
  const center = restingXOf(index, width)
  const span   = sw + GAP
  // Distance from this slide's own centered position, normalized 0 (centered) → 1 (one slide away).
  const progress = useTransform(trackX, [center + span, center, center - span], [1, 0, 1])
  // CRED/Stripe-style depth range — deliberately more pronounced than a
  // barely-perceptible dim, so an off-center page visibly "recedes" and the
  // incoming one grows toward the user. A feel decision, tuned live.
  const scale     = useTransform(progress, [0, 1], [1, 0.90])
  const opacity   = useTransform(progress, [0, 1], [1, 0.82])

  return (
    <motion.div
      style={{
        flexShrink: 0,
        width: sw || '100%',
        height: '100%',
        marginRight: isLast ? 0 : GAP,
        overflowY: page.fullBleed ? 'hidden' : 'auto',
        overflowX: 'hidden',
        borderRadius: page.fullBleed ? 0 : 18,
        background: bgColor,
        scale,
        opacity,
        willChange: 'transform, opacity',
      }}
    >
      {page.content}
    </motion.div>
  )
}

// Hand-rolled Framer Motion swipe carousel — N fixed pages, no wraparound.
// Drag physics follow MobileLandingStack.tsx's pattern: raw pointer deltas
// tracked 1:1 during the gesture (no spring lag while dragging), a threshold
// decides commit-vs-snap-back on release, and the settle is spring-animated.
// Deliberately NOT Embla or any other carousel lib — see CLAUDE.md note.
//
// Extracted from ExplorerCarousel.tsx (shipped, Explorer-only originally) so
// Creator's carousel can reuse identical drag/hint/nested-scroll mechanics
// without duplicating them. The one page-specific piece — Explorer's Map
// page needing untouched single-finger pan for Leaflet — is expressed via
// the per-page `gutterOnly` flag rather than being hardcoded to page index 0.
export default function SwipeCarousel({
  pages, defaultIndex = 0, hintStorageKey,
  accentColor, mutedColor, bgColor, elevatedBgColor, borderColor,
  topOffset = 48,
}: Props) {
  const lastIndex = pages.length - 1

  const containerRef = useRef<HTMLDivElement>(null)
  // Always starts at 0 on both server and client — reading window.innerWidth
  // in the initializer would make the server (no window) and the client's
  // first render disagree, which is exactly the hydration mismatch this used
  // to produce. The real width is measured in the isomorphic layout effect
  // below, synchronously before the browser paints, so there's no visible
  // flash between the 0-width and real-width states either.
  const [width, setWidth] = useState(0)
  const [pageIndex, setPageIndex] = useState(defaultIndex)

  const trackX = useMotionValue(restingXOf(defaultIndex, width))

  const touchStartXRef      = useRef(0)
  const touchStartYRef      = useRef(0)
  const touchStartTrackXRef = useRef(0)
  const axisLockRef         = useRef<'x' | 'y' | null>(null)
  const capturedRef         = useRef(false)
  const startPageIndexRef   = useRef(defaultIndex)

  const slideWidth = slideWidthOf
  const restingX   = restingXOf

  // ── Measure available width ───────────────────────────────────────────────
  // Isomorphic layout effect: runs synchronously before the browser paints
  // (on the client only — no-op during SSR), so the real width replaces the
  // 0-width initial render before the user ever sees it, rather than in a
  // regular effect after paint which would show one frame at width=0.
  useIsomorphicLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => setWidth(el.clientWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Keep the track pinned to the current page's resting position whenever the
  // viewport is resized (orientation change, browser chrome show/hide) — also
  // isomorphic so it resolves in the same pre-paint pass as the width measurement
  // above, instead of trackX (a non-React-state motion value) lagging one frame
  // behind the now-corrected slide widths.
  useIsomorphicLayoutEffect(() => {
    if (width === 0) return
    trackX.set(restingX(pageIndex, width))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width])

  const goToPage = useCallback((idx: number) => {
    if (idx === pageIndex || idx < 0 || idx > lastIndex || width === 0) return
    setPageIndex(idx)
    animate(trackX, restingX(idx, width), PAGE_SPRING)
  }, [pageIndex, width, trackX, restingX, lastIndex])

  // ── One-time first-use swipe hint ─────────────────────────────────────────
  useEffect(() => {
    if (width === 0) return
    if (typeof window === 'undefined') return
    if (localStorage.getItem(hintStorageKey)) return
    let cancelled = false
    const timer = setTimeout(async () => {
      if (cancelled) return
      const rest = restingX(defaultIndex, width)
      await animate(trackX, rest + 46, { duration: 0.32, ease: [0.34, 1.2, 0.4, 1] }).finished
      if (cancelled) return
      await animate(trackX, rest, { duration: 0.34, ease: [0.34, 1.2, 0.4, 1] }).finished
      if (cancelled) return
      await animate(trackX, rest - 46, { duration: 0.32, ease: [0.34, 1.2, 0.4, 1] }).finished
      if (cancelled) return
      await animate(trackX, rest, { duration: 0.34, ease: [0.34, 1.2, 0.4, 1] }).finished
      localStorage.setItem(hintStorageKey, '1')
    }, 900)
    return () => { cancelled = true; clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width])

  // ── Inner horizontal-scroll handoff ───────────────────────────────────────
  // Mirrors MobileLandingStack's findScrollableAncestor/deltaConsumedByInnerScroll
  // (there: vertical, for card body text; here: horizontal, for rows like the
  // Map page's place-card strip or Home's Featured Creators row) — an inner
  // overflow-x row gets first claim on a horizontal drag; only once it's at its
  // own scroll edge does the drag count toward paging the carousel.
  function findScrollableAncestorX(target: EventTarget | null): HTMLElement | null {
    let el = target instanceof HTMLElement ? target : null
    const root = containerRef.current
    while (el && el !== root) {
      if (el.scrollWidth > el.clientWidth) {
        const overflowX = getComputedStyle(el).overflowX
        if (overflowX === 'auto' || overflowX === 'scroll') return el
      }
      el = el.parentElement
    }
    return null
  }
  function deltaConsumedByInnerScrollX(target: EventTarget | null, dx: number): boolean {
    const el = findScrollableAncestorX(target)
    if (!el) return false
    if (dx < 0) return el.scrollLeft + el.clientWidth < el.scrollWidth - 1
    if (dx > 0) return el.scrollLeft > 1
    return false
  }

  // ── Touch handling ─────────────────────────────────────────────────────────
  const GUTTER_PX             = 28
  const AXIS_LOCK_THRESHOLD   = 8
  const COMMIT_THRESHOLD_RATIO = 0.22

  function handleTouchStart(e: React.TouchEvent) {
    const t = e.touches[0]
    touchStartXRef.current      = t.clientX
    touchStartYRef.current      = t.clientY
    touchStartTrackXRef.current = trackX.get()
    axisLockRef.current         = null
    startPageIndexRef.current   = pageIndex

    // Gutter-only pages (e.g. Explorer's Leaflet map) have zero touch
    // restrictions of their own, so single-finger pan anywhere on that page
    // must reach it untouched. Only a touch starting within the edge gutters
    // may drive carousel paging while such a page is active; every other
    // page accepts a swipe starting anywhere.
    const w = containerRef.current?.clientWidth ?? width
    const inGutter = t.clientX < GUTTER_PX || t.clientX > w - GUTTER_PX
    capturedRef.current = !pages[pageIndex]?.gutterOnly || inGutter
  }

  // Native TouchEvent, not React.TouchEvent — this handler is attached via a
  // manual addEventListener below, not the onTouchMove JSX prop (see why below).
  function handleTouchMove(e: TouchEvent) {
    if (!capturedRef.current) return
    const t = e.touches[0]
    const dx = t.clientX - touchStartXRef.current
    const dy = t.clientY - touchStartYRef.current

    if (axisLockRef.current === null) {
      if (Math.abs(dx) < AXIS_LOCK_THRESHOLD && Math.abs(dy) < AXIS_LOCK_THRESHOLD) return
      if (Math.abs(dy) > Math.abs(dx)) {
        axisLockRef.current = 'y'
        capturedRef.current = false
        return
      }
      if (deltaConsumedByInnerScrollX(e.target, dx)) {
        capturedRef.current = false
        return
      }
      axisLockRef.current = 'x'
    }

    if (axisLockRef.current !== 'x') return
    e.preventDefault()
    const w = containerRef.current?.clientWidth ?? width
    let next = touchStartTrackXRef.current + dx
    const maxX = restingX(0, w)         // rightmost — first page
    const minX = restingX(lastIndex, w) // leftmost — last page
    if (next > maxX) next = maxX + (next - maxX) * 0.35
    if (next < minX) next = minX + (next - minX) * 0.35
    trackX.set(next)
  }

  // React attaches onTouchStart/onTouchMove as passive listeners (matching
  // browser defaults for scroll performance), so e.preventDefault() inside a
  // JSX onTouchMove silently fails — confirmed via console warnings ("Unable
  // to preventDefault inside passive event listener invocation") on every
  // drag. touchstart/touchend never call preventDefault (only touchmove does,
  // to block native scroll while paging), so they're unaffected and stay as
  // ordinary JSX props below — only touchmove needs a real, non-passive
  // listener, attached manually here instead of via onTouchMove.
  //
  // The ref indirection keeps the effect's own dependency array empty (attach
  // once) while still always calling the latest render's closure — handler
  // itself reads width/pages/etc. fresh each render same as before.
  const handleTouchMoveRef = useRef(handleTouchMove)
  handleTouchMoveRef.current = handleTouchMove
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const listener = (e: TouchEvent) => handleTouchMoveRef.current(e)
    el.addEventListener('touchmove', listener, { passive: false })
    return () => el.removeEventListener('touchmove', listener)
  }, [])

  function handleTouchEnd() {
    if (axisLockRef.current !== 'x') {
      capturedRef.current = false
      axisLockRef.current = null
      return
    }
    const w     = containerRef.current?.clientWidth ?? width
    const start = startPageIndexRef.current
    const delta = trackX.get() - restingX(start, w)
    const thresh = Math.min(90, slideWidth(w) * COMMIT_THRESHOLD_RATIO)

    let next = start
    if (delta < -thresh && start < lastIndex) next = start + 1
    else if (delta > thresh && start > 0) next = start - 1

    if (next === start) {
      animate(trackX, restingX(start, w), PAGE_SPRING)
    } else {
      goToPage(next)
    }
    capturedRef.current = false
    axisLockRef.current = null
  }

  return (
    <div
      className="fixed lg:hidden left-0 right-0 md:left-[var(--wimc-sidebar-w)] z-20"
      style={{
        top: topOffset,
        // Space required around the `-` — calc(100dvh-48px) (no space) is
        // invalid CSS and gets silently dropped, leaving height unset and
        // the container sized by content instead of the viewport (confirmed
        // via computed-style inspection: the dot bar rendered hundreds of
        // px below the visible viewport on every persona). Was deliberately
        // kept byte-identical to ExplorerCarousel's original shipped string
        // during extraction; now fixed with hard evidence it was broken.
        height: `calc(100dvh - ${topOffset}px)`,
        overflow: 'hidden',
        touchAction: 'pan-y',
        background: bgColor,
      }}
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <motion.div style={{ display: 'flex', height: '100%', x: trackX, willChange: 'transform' }}>
        {pages.map((page, i) => (
          <CarouselSlide
            key={page.key}
            page={page}
            index={i}
            trackX={trackX}
            width={width}
            isLast={i === lastIndex}
            bgColor={bgColor}
          />
        ))}
      </motion.div>

      <PersonaNavBar
        pages={pages} active={pageIndex} onSelect={goToPage}
        trackX={trackX} width={width}
        accentColor={accentColor} mutedColor={mutedColor}
        elevatedBgColor={elevatedBgColor} borderColor={borderColor}
      />
    </div>
  )
}
