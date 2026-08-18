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

// perfY: perf-line y-position as % of element height (e.g. 94.7).
// Returns the clip-path for the CURRENT (outgoing) ticket, removing the
// already-torn left portion of the stub while keeping the main body intact.
export function buildHorizTearClip(tearProgress: number, perfY: number): string {
  if (tearProgress <= 0.001) return 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)'

  if (tearProgress >= 0.999) {
    // Fully torn — clip away entire stub, leave only main body with jagged bottom
    const pts = [...HORIZ_JAGS].reverse().map(([x, dy]) => {
      const py = Math.max(0, Math.min(100, perfY + dy * 100))
      return `${(x * 100).toFixed(2)}% ${py.toFixed(2)}%`
    }).join(', ')
    return `polygon(0% 0%, 100% 0%, 100% ${perfY.toFixed(2)}%, ${pts}, 0% ${perfY.toFixed(2)}%)`
  }

  const tearX = tearProgress * 100

  // Jag points for the already-torn edge, traversed right → left (tearX → 0)
  const jagPts = HORIZ_JAGS
    .filter(([x]) => x <= tearProgress)
    .slice()
    .reverse()
    .map(([x, dy]) => {
      const py = Math.max(0, Math.min(100, perfY + dy * 100))
      return `${(x * 100).toFixed(2)}% ${py.toFixed(2)}%`
    })
    .join(', ')

  // Visible region: full main body + right stub still attached (tearX → 100%)
  return `polygon(0% 0%, 100% 0%, 100% 100%, ${tearX.toFixed(2)}% 100%, ${tearX.toFixed(2)}% ${perfY.toFixed(2)}%, ${jagPts}, 0% ${perfY.toFixed(2)}%)`
}

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
