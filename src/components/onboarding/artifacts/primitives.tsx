'use client'

// =============================================================================
// WIMC — Reveal artifact shared primitives (postal/ticket visual vocabulary).
// Built fresh, pattern-matched from AhmedabadPostmarkSVG/AhmedabadPostmarkDecal
// in src/app/page.tsx — not ported from the skill-doc StampMark/PerforatedCard
// JSX, which has never been compiled against this codebase.
//
// Composed once here and reused by CreatorPoster / VenuePoster / ExplorerTicket
// / BrandCard rather than duplicated per artifact.
// =============================================================================

import { useEffect, useId, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { barcodeWidths, hashString, mulberry32, VIBRANT_PALETTE } from './utils'

// ── Reveal animation + reduced-motion handling (shared <style> injected once per page) ──

export const ARTIFACT_REVEAL_STYLES = `
@keyframes wimc-artifact-reveal {
  from { opacity: 0; transform: translateY(22px) scale(.97); }
  to   { opacity: 1; transform: none; }
}
.wimc-artifact-reveal {
  animation: wimc-artifact-reveal 0.85s cubic-bezier(.16,1,.3,1) both;
}
@media (prefers-reduced-motion: reduce) {
  .wimc-artifact-reveal { animation: none; opacity: 1; transform: none; }
}
`

export function ArtifactStyles() {
  return <style dangerouslySetInnerHTML={{ __html: ARTIFACT_REVEAL_STYLES }} />
}

// ── ScaledStage — fits a fixed-intrinsic-size artifact into whatever container ──
// width the reveal step actually renders at, via transform: scale() (never reflow).

export function ScaledStage({
  width,
  height,
  maxWidth,
  className,
  children,
}: {
  width: number
  height: number
  maxWidth?: number
  className?: string
  children: React.ReactNode
}) {
  const measureRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const el = measureRef.current
    if (!el) return
    const compute = () => {
      const avail = el.clientWidth
      setScale(avail > 0 ? Math.min(1, avail / width) : 1)
    }
    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(el)
    return () => ro.disconnect()
  }, [width])

  return (
    <div ref={measureRef} className={className} style={{ width: '100%', maxWidth, margin: '0 auto' }}>
      <div style={{ width: width * scale, height: height * scale, position: 'relative' }}>
        <div style={{ width, height, transform: `scale(${scale})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0 }}>
          {children}
        </div>
      </div>
    </div>
  )
}

// ── PostmarkSeal — circular postal stamp. Used at 76×76 (creator poster),
// 108×108 white-ring (explorer ticket), and ring-less at brand-card scale.

export function PostmarkSeal({
  size = 76,
  color,
  label,
  subLabel,
  ringText = 'WHEN IN MY CITY •',
  labelFontSize = 30,
}: {
  size?: number
  color: string
  label: string
  subLabel?: string
  ringText?: string | null
  labelFontSize?: number
}) {
  const arcId = `pm-arc-${useId().replace(/:/g, '')}`
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <path id={arcId} d="M 22,100 A 78,78 0 0,1 178,100" />
      </defs>
      <circle cx="100" cy="100" r="94" stroke={color} strokeWidth="2" strokeDasharray="3 5" fill="none" />
      <circle cx="100" cy="100" r="78" stroke={color} strokeWidth="1.5" fill="none" />
      {ringText && (
        <text fill={color} fontSize="14" fontFamily="var(--font-dm-serif), serif" letterSpacing="2">
          <textPath href={`#${arcId}`} startOffset="50%" textAnchor="middle">{ringText}</textPath>
        </text>
      )}
      <text
        x="100"
        y={subLabel ? 106 : 114}
        fill={color}
        fontSize={labelFontSize}
        fontFamily="var(--font-dm-serif), serif"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {label}
      </text>
      {subLabel && (
        <text x="100" y="130" fill={color} fontSize="10" fontFamily="var(--font-jetbrains-mono), monospace" letterSpacing="1.5" textAnchor="middle" opacity="0.75">
          {subLabel}
        </text>
      )}
    </svg>
  )
}

// ── TornEdge — clip-path for the poster's torn top edge (creator + venue only). ──
// 21 points across, 16px peaks, applied to a container of known pixel `height`.

export function tornEdgeClipPath(containerHeight: number, peak = 16): string {
  const n = 21
  const pts: string[] = []
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 100
    const y = i % 2 === 0 ? 0 : (peak / containerHeight) * 100
    pts.push(`${x.toFixed(3)}% ${y.toFixed(3)}%`)
  }
  pts.push('100% 100%', '0% 100%')
  return `polygon(${pts.join(', ')})`
}

// ── PunchHole — small filled circle "hole," colored to match whatever sits behind it. ──

export function PunchHole({
  size = 16,
  color,
  style,
}: {
  size?: number
  color: string
  style?: React.CSSProperties
}) {
  return (
    <div
      aria-hidden
      style={{ position: 'absolute', width: size, height: size, borderRadius: '50%', background: color, ...style }}
    />
  )
}

// ── PaperTexture — full-bleed low-opacity dot overlay, decorative + non-interactive. ──

export function PaperTexture({ variant = 'dark' }: { variant?: 'dark' | 'light' }) {
  const dot = variant === 'dark' ? 'rgba(32,26,18,0.08)' : 'rgba(255,255,255,0.10)'
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        backgroundImage: `radial-gradient(circle, ${dot} 1px, transparent 1px)`,
        backgroundSize: '3px 3px',
        opacity: 0.7,
      }}
    />
  )
}

// ── PerforatedDivider — dashed tear-off line, horizontal or vertical. ──

export function PerforatedDivider({
  orientation = 'horizontal',
  color = 'rgba(32,26,18,0.22)',
  thickness = 2,
  style,
}: {
  orientation?: 'horizontal' | 'vertical'
  color?: string
  thickness?: number
  style?: React.CSSProperties
}) {
  const isHorizontal = orientation === 'horizontal'
  return (
    <div
      aria-hidden
      style={{
        ...(isHorizontal
          ? { width: '100%', height: 0, borderTop: `${thickness}px dashed ${color}` }
          : { height: '100%', width: 0, borderLeft: `${thickness}px dashed ${color}` }),
        ...style,
      }}
    />
  )
}

// ── SparkGlyph — 4-pointed sparkle accent. ──

export function SparkGlyph({
  size = 22,
  color = '#201A12',
  style,
}: {
  size?: number
  color?: string
  style?: React.CSSProperties
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden style={style}>
      <path d="M12 0 L14.5 9.5 L24 12 L14.5 14.5 L12 24 L9.5 14.5 L0 12 L9.5 9.5 Z" fill={color} />
    </svg>
  )
}

// ── WavyUnderline — squiggle accent under headline names. ──

export function WavyUnderline({
  variant = 'creator',
  color = '#201A12',
  height = 16,
}: {
  variant?: 'creator' | 'venue'
  color?: string
  height?: number
}) {
  const isVenue = variant === 'venue'
  const width = isVenue ? 160 : 140
  const d = isVenue
    ? 'M2,10 Q20,2 38,10 T74,10 T110,10 T146,10 T160,10'
    : 'M2,10 Q17,2 32,10 T62,10 T92,10 T122,10 T140,10'
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} 16`} fill="none" aria-hidden>
      <path d={d} stroke={color} strokeWidth="4" strokeLinecap="round" fill="none" />
    </svg>
  )
}

// ── DecorativeBarcode — purely decorative bars; widths derived deterministically ──
// from the user's own id/handle so different users' tickets don't look identical.

export function DecorativeBarcode({
  seed,
  count = 25,
  height = 40,
  gap = 2,
}: {
  seed: string
  count?: number
  height?: number
  gap?: number
}) {
  const widths = barcodeWidths(seed, count)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap, height }} aria-hidden>
      {widths.map((w, i) => (
        <div key={i} style={{ width: w, height: '100%', background: VIBRANT_PALETTE[i % VIBRANT_PALETTE.length], flexShrink: 0 }} />
      ))}
    </div>
  )
}

// ── DecorativeQR — real, scannable QR when `real` + `value` are given (brand card,
// encoding the brand's own profile URL); otherwise a deterministic decorative 7×7
// grid seeded per-user (explorer ticket has nothing meaningful to encode). ──

export function DecorativeQR({
  value,
  seed,
  size = 40,
  color = '#6B4EFF',
  real = false,
}: {
  value?: string
  seed?: string
  size?: number
  color?: string
  real?: boolean
}) {
  const cells: React.ReactNode[] = []

  if (real && value) {
    const qr = QRCode.create(value, { errorCorrectionLevel: 'M' })
    const n = qr.modules.size
    const cell = size / n
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (qr.modules.get(r, c)) {
          cells.push(<rect key={`${r}-${c}`} x={c * cell} y={r * cell} width={cell} height={cell} fill={color} />)
        }
      }
    }
  } else {
    const rand = mulberry32(hashString(seed || 'wimc'))
    const n = 7
    const cell = size / n
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (rand() > 0.5) {
          cells.push(<rect key={`${r}-${c}`} x={c * cell} y={r * cell} width={cell} height={cell} fill={color} />)
        }
      }
    }
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      {cells}
    </svg>
  )
}

// ── Photo/avatar slot — graceful initials/silhouette placeholder when no photo exists yet. ──

export function CroppedPhotoSlot({
  photoUrl,
  fallbackInitials,
  width,
  height,
  borderRadius,
  borderColor,
  borderWidth = 3,
  bg = '#EFE7D8',
  fg = '#8A8070',
}: {
  photoUrl?: string | null
  fallbackInitials: string
  width: number
  height: number
  borderRadius: string
  borderColor: string
  borderWidth?: number
  bg?: string
  fg?: string
}) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        border: `${borderWidth}px solid ${borderColor}`,
        overflow: 'hidden',
        flexShrink: 0,
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="" width={width} height={height} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
      ) : (
        <span style={{ fontFamily: 'var(--font-dm-serif), serif', fontSize: Math.round(Math.min(width, height) * 0.34), color: fg }}>
          {fallbackInitials}
        </span>
      )}
    </div>
  )
}
