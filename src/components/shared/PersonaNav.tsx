'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, useMotionValue, useTransform, type MotionValue } from 'framer-motion'
import { NAV_HEIGHT } from '@/lib/constants/personaNavPages'

export { NAV_HEIGHT }

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

const GAP = 10        // px gap between (virtual) slides — purely internal to this
                       // file's own resting-position math now (PersonaTabSwitcher
                       // has no real side-by-side slide track to keep in sync with,
                       // unlike the old SwipeCarousel.tsx it replaced)
const NAV_SLOT_W = 92 // px width of each nav circle's slot — tune live

export function slideWidthOf(w: number) { return w }
export function restingXOf(index: number, w: number) { return -index * (slideWidthOf(w) + GAP) }

export interface PersonaNavPage {
  key:   string
  label: string
  icon:  string
  /** When set, renders this image (e.g. the WIMC stamp) instead of the Material Symbol named by `icon`. */
  iconImage?: string
}

interface PersonaNavBarProps {
  pages:           PersonaNavPage[]
  trackX:          MotionValue<number>
  width:           number
  active:          number
  onSelect:        (i: number) => void
  accentColor:     string
  mutedColor:      string
  elevatedBgColor: string
  borderColor:     string
  /** Invert (black → white) any page.iconImage — for dark-themed personas, whose
   *  circle sits on a dark fill that a black-line-art image would be illegible against.
   *  Same invert-filter technique WimcWordmark uses for its own white variant. */
  invertIconImage?: boolean
}

// ── Circular icon+label nav ────────────────────────────────────────────────
// CRED-inspired: the active page reads as an elevated, glowing "hero" circle
// poking above the bar; neighbors are smaller, dimmer circles that stay
// fully visible — icon AND label always — sliding in a second track (this
// component's own motion.div) whose x is a linear remap of the content
// track's real trackX, so the active circle is always dead-center and the
// neighbors sit partly visible at the edges as trackX springs from one
// resting position to the next on tap.
// Tint+ring rather than a solid accentColor fill deliberately: accentColor
// resolves to a different (sometimes per-session-dynamic, e.g. Creator's
// --wimc-accent) color per persona, and tint/ring only ever uses it as a
// foreground/low-alpha value, which stays legible at any lightness.
// Used both live (mounted inside PersonaTabSwitcher, a tap-and-spring trackX) and
// standalone (PersonaNavStandalone below, a trackX that's fixed forever) —
// this component itself doesn't care which, it just reads whatever trackX
// it's given.
export function PersonaNavBar({ pages, trackX, width, active, onSelect, accentColor, mutedColor, elevatedBgColor, borderColor, invertIconImage }: PersonaNavBarProps) {
  const navTrackX = useTransform(
    trackX,
    pages.map((_, i) => restingXOf(i, width)),
    pages.map((_, i) => width / 2 - NAV_SLOT_W / 2 - i * NAV_SLOT_W),
  )

  return (
    <nav
      aria-label="Carousel pages"
      className="absolute bottom-0 left-0 right-0 z-[55]"
      style={{
        height: NAV_HEIGHT,
        background: elevatedBgColor,
        borderTop: `1px solid ${borderColor}`,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        overflow: 'visible',
      }}
    >
      <motion.div style={{ display: 'flex', height: '100%', x: navTrackX, willChange: 'transform' }}>
        {pages.map((p, i) => (
          <CircularNavButton
            key={p.key}
            page={p}
            index={i}
            trackX={trackX}
            width={width}
            active={active}
            onSelect={onSelect}
            accentColor={accentColor}
            mutedColor={mutedColor}
            elevatedBgColor={elevatedBgColor}
            borderColor={borderColor}
            invertIconImage={invertIconImage}
          />
        ))}
      </motion.div>
    </nav>
  )
}

// A single nav button — split out so its size/lift/glow/color animation can
// call useTransform (a hook) once per page even though the parent renders a
// variable number of pages (Creator's carousel is 3 or 4 depending on
// tier). Derives everything continuously from the SAME trackX-based
// `progress` the content track uses (0 = this page is centered/active, 1 =
// one page away) rather than a discrete active-boolean + CSS transition —
// so the button visibly grows/lifts/glows in and out DURING the drag, not
// just on release, in both swipe directions (progress's domain is symmetric
// by construction).
function CircularNavButton({ page, index, trackX, width, active, onSelect, accentColor, mutedColor, elevatedBgColor, borderColor, invertIconImage }: {
  page: PersonaNavPage
  index: number
  trackX: MotionValue<number>
  width: number
  active: number
  onSelect: (i: number) => void
  accentColor: string
  mutedColor: string
  elevatedBgColor: string
  borderColor: string
  invertIconImage?: boolean
}) {
  const sw     = slideWidthOf(width)
  const center = restingXOf(index, width)
  const span   = sw + GAP
  const progress = useTransform(trackX, [center + span, center, center - span], [1, 0, 1])

  const size          = useTransform(progress, [0, 1], [52, 36])
  const iconFontSize  = useTransform(progress, [0, 1], [24, 18])
  const lift          = useTransform(progress, [0, 1], [-14, 0])
  const glowOpacity   = useTransform(progress, [0, 1], [1, 0])
  const labelOpacity  = useTransform(progress, [0, 1], [1, 0.7])
  const labelLift     = useTransform(progress, [0, 1], [4, 2])
  // Matches this exact asset's existing dimmed-mark convention (EntryPassFace.tsx's
  // opacity: 0.4 stamp watermark) — also equal to the alpha this nav already uses for
  // its own inactive/muted color on Creator and Explorer (rgba(255,255,255,0.40)).
  const imageOpacity  = useTransform(progress, [0, 1], [1, 0.4])
  // accentColor/mutedColor arrive as opaque CSS strings (e.g. "var(--venue-
  // accent)") Framer Motion's range interpolator can't blend — a transformer
  // function instead gives a live, continuously-recomputed swap tied to the
  // same progress driving the geometry above, so color and shape never fall
  // out of sync mid-drag.
  const fg = useTransform(progress, v => (v < 0.5 ? accentColor : mutedColor))
  const fontVariationSettings = useTransform(progress, v =>
    v < 0.5 ? "'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24" : "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24",
  )

  const isActive = index === active

  return (
    <button
      onClick={() => onSelect(index)}
      aria-current={isActive ? 'page' : undefined}
      aria-label={page.label}
      className="flex flex-col items-center justify-center"
      style={{ width: NAV_SLOT_W, flexShrink: 0, background: 'transparent', border: 'none', cursor: 'pointer', minHeight: 44, overflow: 'visible' }}
    >
      {/* Fixed-size slot (always the max/active icon size) the animated icon
          sits inside — decouples the icon's own size animation from the
          flex column's layout height. Without this, the icon's real
          width/height (36↔52, a genuine layout property, not just a visual
          transform) shifted how much vertical space it claims, pushing the
          label below it lower for the active button than for inactive
          ones — while translateY(lift) only moves the icon's paint
          position, not the label's, so the active label alone ended up
          low enough to get clipped by the viewport edge. */}
      <span style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 52, height: 52, flexShrink: 0,
      }}>
        <motion.span
          className="material-symbols-outlined"
          style={{
            position: 'relative',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: size, height: size,
            flexShrink: 0, boxSizing: 'border-box', aspectRatio: '1 / 1',
            borderRadius: '50%',
            fontSize: iconFontSize,
            translateY: lift,
            color: fg,
            background: `color-mix(in srgb, ${mutedColor} 10%, transparent)`,
            border: `1px solid ${borderColor}`,
            fontVariationSettings,
          }}
        >
          {/* Glow layer — only its opacity is interpolated (box-shadow/color-mix
              strings can't be blended directly), same trick the content depth
              effect uses. */}
          <motion.span
            aria-hidden
            style={{
              position: 'absolute', inset: 0, borderRadius: '50%', pointerEvents: 'none',
              opacity: glowOpacity,
              background: `color-mix(in srgb, ${accentColor} 18%, ${elevatedBgColor})`,
              border: `1.5px solid ${accentColor}`,
              boxShadow: `0 0 0 6px color-mix(in srgb, ${accentColor} 14%, transparent), 0 6px 16px color-mix(in srgb, ${accentColor} 40%, transparent)`,
            }}
          />
          {page.iconImage ? (
            <motion.img
              src={page.iconImage}
              alt=""
              style={{
                position: 'relative',
                width: '88%', height: '88%',
                objectFit: 'contain',
                opacity: imageOpacity,
                filter: invertIconImage ? 'invert(1)' : undefined,
              }}
            />
          ) : (
            <span style={{ position: 'relative' }}>{page.icon}</span>
          )}
        </motion.span>
      </span>
      <motion.span style={{
        fontFamily: 'var(--font-jetbrains-mono)',
        fontSize: 9.5, fontWeight: 700, letterSpacing: '0.06em',
        flexShrink: 0,
        color: fg,
        opacity: labelOpacity,
        marginTop: labelLift,
      }}>
        {page.label}
      </motion.span>
    </button>
  )
}

interface PersonaNavStandaloneProps {
  pages:           PersonaNavPage[]
  /** Which page key to rest on — resolved by PersonaNavGate from the current
   *  pathname (e.g. a Business sub-route rests on 'business', not Home). */
  activeKey:       string
  indexHref:       string
  accentColor:     string
  mutedColor:      string
  elevatedBgColor: string
  borderColor:     string
  invertIconImage?: boolean
}

// For sub-routes with no live carousel mounted — measures its own width
// (mirrors PersonaTabSwitcher's own width-measurement effect), creates a trackX
// that's fixed at activeKey's resting position and never animated (no drag
// handlers, nothing ever calls .set() or animate() on it again), and wires
// tapping a circle to a real navigation instead of a local page-turn.
// Feeding PersonaNavBar this static trackX naturally produces "resting on
// activeKey" for free — its useTransform chains just hold their one computed
// output when the source value never changes, no special-casing needed.
export function PersonaNavStandalone({ pages, activeKey, indexHref, accentColor, mutedColor, elevatedBgColor, borderColor, invertIconImage }: PersonaNavStandaloneProps) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  useIsomorphicLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => setWidth(el.clientWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const activeIndex = Math.max(0, pages.findIndex(p => p.key === activeKey))
  const trackX = useMotionValue(restingXOf(activeIndex, width))
  useIsomorphicLayoutEffect(() => {
    if (width === 0) return
    trackX.set(restingXOf(activeIndex, width))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, activeIndex])

  return (
    // Plain `position:fixed; bottom:0`, no explicit height/dvh — reverted
    // from an earlier 100dvh-based attempt. That was chasing the wrong
    // cause: the original clipped-label bug was actually content
    // overflowing an undersized NAV_HEIGHT (now fixed directly, see
    // personaNavPages.ts), not a viewport-measurement problem. 100dvh
    // introduced a NEW bug instead — iOS Safari doesn't always recompute it
    // promptly as the toolbar expands/collapses, so it can under-estimate
    // the true visible height depending on scroll state, leaving a gap
    // between the nav and the real screen bottom. Plain fixed;bottom:0 is
    // the standard, well-supported pattern for a small fixed bottom bar and
    // tracks the current visual viewport reliably on modern iOS Safari.
    <div
      ref={containerRef}
      // persona-tab-switcher: shared hook (also used by PersonaTabSwitcher's
      // own fixed panels) that globals.css keys off of to drop body's 884px
      // min-height floor back to the real viewport — this standalone nav is
      // the same "fixed, viewport-anchored, doesn't need the floor" case on
      // every sub-route below the dashboard index.
      className="persona-tab-switcher fixed lg:hidden left-0 right-0 lg:left-[var(--wimc-sidebar-w)] z-20"
      style={{ bottom: 0, overflow: 'visible' }}
    >
      <PersonaNavBar
        pages={pages}
        trackX={trackX}
        width={width}
        active={activeIndex}
        onSelect={(i) => router.push(`${indexHref}?panel=${pages[i].key}`)}
        accentColor={accentColor}
        mutedColor={mutedColor}
        elevatedBgColor={elevatedBgColor}
        borderColor={borderColor}
        invertIconImage={invertIconImage}
      />
    </div>
  )
}
