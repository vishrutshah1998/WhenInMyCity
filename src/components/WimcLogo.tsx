/**
 * WimcLogo — Official "When in MY city" brand lockup
 *
 * Renders the location-pin icon alongside the two-line wordmark.
 * Set color="white" for dark backgrounds, color="black" for light.
 *
 * Sizes:
 *   xs  — nav / compact
 *   sm  — sub-nav / sidebar
 *   md  — default
 *   lg  — hero / large lockup
 */

interface WimcLogoProps {
  color?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
  /** Show only the pin icon, without the text wordmark */
  iconOnly?: boolean
}

const SIZES = {
  xs: { iconH: 28, bold: 14, script: 13, gap: 8,  lineH: 1.05 },
  sm: { iconH: 36, bold: 18, script: 16, gap: 10, lineH: 1.05 },
  md: { iconH: 48, bold: 24, script: 21, gap: 12, lineH: 1.05 },
  lg: { iconH: 68, bold: 34, script: 30, gap: 16, lineH: 1.05 },
}

export function WimcLogo({
  color = 'currentColor',
  size = 'md',
  className = '',
  iconOnly = false,
}: WimcLogoProps) {
  const s = SIZES[size]

  return (
    <div
      className={`inline-flex items-center select-none ${className}`}
      style={{ gap: s.gap }}
    >
      {/* ── Location-pin icon ── */}
      <svg
        viewBox="0 0 50 68"
        aria-hidden="true"
        style={{ height: s.iconH, width: 'auto', flexShrink: 0 }}
      >
        {/*
          C-ring: thick stroked arc open on the right side.
          Center (22,22), radius 16, opening ±45° from right horizontal.
          Top opening  → (33, 11)
          Bottom opening → (33, 33)
          Stroke width 10 → outer ring r=21, inner ring r=11 — hole always visible.
        */}
        <path
          d="M 33 11 A 16 16 0 1 0 33 33"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="butt"
          fill="none"
        />
        {/* Pin tail — triangle that tucks under the ring bottom */}
        <path
          d="M 16 41 L 22 62 L 28 41 Z"
          fill={color}
        />
      </svg>

      {/* ── Wordmark ─────────────────────────────────────────────────────── */}
      {!iconOnly && (
        <div style={{ lineHeight: s.lineH }}>
          {/* Line 1: WHEN in */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
            <span
              style={{
                fontFamily: 'var(--font-jakarta)',
                fontWeight: 800,
                fontSize: s.bold,
                color,
                letterSpacing: '-0.03em',
                textTransform: 'uppercase',
              }}
            >
              WHEN
            </span>
            <span
              style={{
                fontFamily: 'var(--font-dancing)',
                fontSize: s.script,
                color,
                fontWeight: 600,
              }}
            >
              in
            </span>
          </div>
          {/* Line 2: MY city */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
            <span
              style={{
                fontFamily: 'var(--font-jakarta)',
                fontWeight: 800,
                fontSize: s.bold,
                color,
                letterSpacing: '-0.03em',
                textTransform: 'uppercase',
              }}
            >
              MY
            </span>
            <span
              style={{
                fontFamily: 'var(--font-dancing)',
                fontSize: s.script,
                color,
                fontWeight: 600,
              }}
            >
              city
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
