import type { CSSProperties } from 'react'

// Shared loading-state placeholder for KPI-style stat cards — shape matches
// the flat-bordered, accent-topped card family already used for Creator's
// dashboard "Overview" grid and Venue's KpiCard (and, by extension,
// Explorer's/Brand's equivalents), NOT PaperCard's hard-offset-shadow
// variant of the same family. Deliberately static shell (real border/
// background/radius, so the card's silhouette is already correct) with only
// the internal content bars pulsing — reads as "the real card, still
// filling in" rather than a generic spinner, and avoids introducing a new
// (neomorphic/soft-UI) visual style. Animation is Tailwind's existing
// `animate-pulse` (already used across this codebase — PostComposer,
// profile-client, create-event-form, etc.) rather than a new shimmer-
// gradient keyframe, so this stays visually consistent with every other
// loading placeholder already shipped.

interface SkeletonCardProps {
  /** Card corner radius. Creator's square-cornered "Overview" cards use 0 (the default); Venue/Explorer/Brand's rounder cards pass 16–18. */
  radius?:      number
  borderColor?: string
  background?:  string
  /** Top accent border color, matching each persona's real card (e.g. var(--venue-accent)). Omit for no accent border. */
  accentColor?: string
  /** Color of the pulsing placeholder bars — should read clearly against `background` without matching real text/value color (so it never looks like stuck/broken content). */
  fillColor?:   string
  /** Shows a square icon-block placeholder (Creator's cards have one; Venue's don't). */
  showIcon?:    boolean
  height?:      number | string
  className?:   string
  style?:       CSSProperties
}

export default function SkeletonCard({
  radius = 0,
  borderColor = 'rgba(0,0,0,0.1)',
  background = 'transparent',
  accentColor,
  fillColor = 'rgba(127,127,127,0.18)',
  showIcon = false,
  height,
  className = '',
  style,
}: SkeletonCardProps) {
  return (
    <div
      aria-hidden
      className={className}
      style={{
        background,
        border: `1px solid ${borderColor}`,
        borderTop: accentColor ? `3px solid ${accentColor}` : undefined,
        borderRadius: radius,
        padding: '20px 20px 18px',
        height,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: 14,
        overflow: 'hidden',
        ...style,
      }}
    >
      <div className="animate-pulse" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Label row: short label bar + short tag/delta bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ width: '45%', height: 9, borderRadius: 3, background: fillColor }} />
          <div style={{ width: 24, height: 9, borderRadius: 3, background: fillColor }} />
        </div>

        {/* Value row: optional icon block + big value bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {showIcon && (
            <div style={{ width: 40, height: 40, borderRadius: 8, background: fillColor, flexShrink: 0 }} />
          )}
          <div style={{ width: '58%', height: 26, borderRadius: 5, background: fillColor }} />
        </div>

        {/* Subtext bar */}
        <div style={{ width: '38%', height: 8, borderRadius: 3, background: fillColor }} />
      </div>
    </div>
  )
}
