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
      {/* ── Location-pin icon ──────────────────────────────────────────────
          Shape: C-shaped ring (circle with right side open) tapering to
          a downward point — standard map-pin silhouette.
          viewBox 50 68 | circle center (22, 24) | outer r=20 | inner r=12
          Opening at ±45° from the right horizontal.
      ─────────────────────────────────────────────────────────────────── */}
      <svg
        viewBox="0 0 50 68"
        fill={color}
        aria-hidden="true"
        style={{ height: s.iconH, width: 'auto', flexShrink: 0 }}
      >
        {/*
          M 36 10   — outer upper-right edge of opening
          A 20 20 0 1 0 36 38  — outer arc, counter-clockwise large (goes left→bottom→right)
          L 22 62   — pin tip
          L 31 32   — inner lower-right edge of opening
          A 12 12 0 1 0 31 16  — inner arc, counter-clockwise large (back up through left)
          Z         — closes across the opening face of the C
        */}
        <path d="M36 10 A20 20 0 1 0 36 38 L22 62 L31 32 A12 12 0 1 0 31 16 Z" />
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
