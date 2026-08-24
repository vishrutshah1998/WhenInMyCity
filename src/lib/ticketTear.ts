// Shared "ticket tear" primitives — the jagged perforated-tear clip-path geometry and
// house easing curve used by both the desktop (src/app/page.tsx) and mobile
// (src/components/landing/mobile/) ticket-stack landing experiences. Extracted so the two
// don't drift: this is finicky geometry math, not something to copy-paste and re-tune twice.

export const E = [0.22, 1, 0.36, 1] as const

// ── Horizontal tear-edge geometry ────────────────────────────────────────
// Tear propagates LEFT → RIGHT along the bottom perforated edge.
// Each entry: [x (0-1), y-offset from the perf line as a fraction of total ticket height].
// Irregular spacing + amplitude mimics real paper-fibre breaks.
export const HORIZ_JAGS: ReadonlyArray<[number, number]> = [
  [0.00,  0.000],
  [0.02, +0.012], [0.05, -0.017], [0.08, +0.020],
  [0.11, -0.010], [0.14, +0.016], [0.17, -0.022],
  [0.20, +0.013], [0.23, -0.018], [0.26, +0.023],
  [0.29, -0.009], [0.32, +0.019], [0.35, -0.014],
  [0.38, +0.021], [0.41, -0.018], [0.44, +0.011],
  [0.47, -0.023], [0.50, +0.017], [0.53, -0.012],
  [0.56, +0.020], [0.59, -0.016], [0.62, +0.014],
  [0.65, -0.021], [0.68, +0.018], [0.71, -0.011],
  [0.74, +0.022], [0.77, -0.015], [0.80, +0.018],
  [0.83, -0.020], [0.86, +0.013], [0.89, -0.019],
  [0.92, +0.017], [0.95, -0.010], [0.98, +0.014],
  [1.00,  0.000],
]

// ── Torn-edge strip (for section dividers, e.g. mission/growth page breaks) ────
// Reuses the same irregular jag rhythm as HORIZ_JAGS above — rescaled from
// "fraction of ticket height" to an arbitrary pixel amplitude — so a thin divider
// strip tears with the same hand-torn character as the ticket-stack cards instead
// of a second, separately-tuned jag pattern.
const HORIZ_JAGS_PEAK = Math.max(...HORIZ_JAGS.map(([, dy]) => Math.abs(dy)))

// Builds an SVG path `d` string for one torn edge across a `widthUnits`-wide strip,
// as an open polyline (M ... L ... L ...) at baseYUnits +/- ampUnits.
export function buildTearEdgePath(widthUnits: number, baseYUnits: number, ampUnits: number): string {
  const pts = HORIZ_JAGS.map(([x, dy]) => {
    const px = x * widthUnits
    const py = baseYUnits + (dy / HORIZ_JAGS_PEAK) * ampUnits
    return `${px.toFixed(2)},${py.toFixed(2)}`
  })
  return `M ${pts.map((p, i) => (i === 0 ? p : `L ${p}`)).join(' ')}`
}

// ── Punched-perforation tear clip-path ──────────────────────────────────
// Replaces the old jagged-polygon tear edge with real circular perforation
// notches, using `clip-path: path(...)` + SVG arc commands so the notches are
// true semicircles. Operates in PIXEL units (W, H, perfY all px) — callers
// must track their ticket element's real rendered size, not a percentage.
export function buildPerfTearClip(
  tearProgress: number,
  W: number,
  H: number,
  perfY: number,
  holeSpacing = 26,
  holeRadius = 4.5,
): string {
  if (W <= 0 || H <= 0) return 'none'
  if (tearProgress <= 0.001) return 'none'

  const holes: number[] = []
  for (let x = holeSpacing / 2; x < W; x += holeSpacing) holes.push(x)
  const r = holeRadius

  let d: string
  if (tearProgress >= 0.999) {
    const pts = holes.slice().reverse()
    d = `M 0 0 L ${W} 0 L ${W} ${H} L ${W} ${perfY} `
    for (const cx of pts) d += `L ${cx + r} ${perfY} A ${r} ${r} 0 0 1 ${cx - r} ${perfY} `
    d += `L 0 ${perfY} Z`
  } else {
    const tearX = tearProgress * W
    const pts = holes.filter((x) => x <= tearX).reverse()
    d = `M 0 0 L ${W} 0 L ${W} ${H} L ${tearX} ${H} L ${tearX} ${perfY} `
    for (const cx of pts) d += `L ${cx + r} ${perfY} A ${r} ${r} 0 0 1 ${cx - r} ${perfY} `
    d += `L 0 ${perfY} Z`
  }
  return `path('${d}')`
}

// ── Snap-completion motion: overshoot + randomized decaying wobble ──────
// Shared by desktop (src/app/page.tsx) and mobile (MobileLandingStack.tsx) so
// the two commit animations never drift apart. FORWARD (the outgoing ticket
// flying off after its stub tears) always starts from an at-rest identity
// pose — the tension phase only peels the clip-path, it never translates the
// ticket — so a fixed keyframe sequence is safe to port directly.
export type FlyAwayKeyframes = {
  keyframes: {
    y: string[]; x: string[]; rotateX: number[]; rotate: number[]; scale: number[]; opacity: number[]
  }
  transition: { duration: number; times: number[]; ease: readonly [number, number, number, number] }
}

export function buildFlyAwayKeyframes(): FlyAwayKeyframes {
  const wobble = Number((Math.random() * 6 - 3).toFixed(2))
  return {
    keyframes: {
      y:       ['0%', '-6%', '-124%', '-116%'],
      x:       ['0%', '1%',  '7%',    '6%'],
      rotateX: [0,     6,     27,      22],
      rotate:  [0,     wobble, -3.4,   -2],
      scale:   [1,     0.99,  0.9,     0.92],
      opacity: [1,     0.96,  0.62,    0.58],
    },
    transition: { duration: 0.56, times: [0, 0.14, 0.68, 1], ease: [0.18, 0, 0.32, 1] },
  }
}

// BACKWARD (the previous ticket settling into place) is the mirror case, but
// its starting pose is NOT fixed — the tension phase (see backTearP in both
// state machines) proportionally drags it from hidden to fully-settled as the
// user drags, so by the time threshold commits it, it's usually already at
// (or very near) rest, and a fixed keyframe array would jump it back to a
// hidden pose before replaying. Because every backward visual (y/x/rotateX/
// rotate/scale/opacity) is a single useTransform of ONE driver value
// (backTearP on desktop, previewP on mobile — see each state machine), the
// overshoot is produced by imperatively animating that ONE driver value
// itself past 1 and back — every derived transform overshoots proportionally
// for free. This also sidesteps a real Framer Motion gotcha: a component's
// `animate` prop silently fails to drive a transform key that's already
// style-bound to an externally-owned motion value, which a naive per-key
// `animate` keyframe/spring approach hit in practice (confirmed by polling
// getComputedStyle mid-commit — the value froze instead of animating).
// Callers must add `{ clamp: false }` to each `useTransform(driver, [0,1],
// [...])` so the extrapolation past 1 is actually visible.
export type OvershootAnim = {
  duration: number
  times: [number, number, number]
  ease: readonly [number, number, number, number]
  overshoot: number
}

export function buildOvershootAnim(): OvershootAnim {
  return { duration: 0.46, times: [0, 0.62, 1], ease: E, overshoot: 1.05 + Math.random() * 0.05 }
}
