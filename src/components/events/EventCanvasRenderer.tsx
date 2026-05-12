'use client'

import { useRef, useEffect, useCallback, useState, type MutableRefObject } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CanvasEventData {
  title:       string
  startsAt:    Date | null
  venueName:   string
  ticketPrice: number       // paise (0 = free)
  creatorTier?: string | null
}

interface Props {
  data:           CanvasEventData
  size?:          number        // canvas pixel resolution (default 800)
  displaySize?:   number        // CSS display width in px (default 280); ignored when fill=true
  fill?:          boolean       // stretch canvas to 100% of parent container
  onAction?:      (blob: Blob) => void
  actionLabel?:   string
  isPending?:     boolean
  canvasRefOut?:  MutableRefObject<HTMLCanvasElement | null>
}

// ---------------------------------------------------------------------------
// Canvas draw helpers
// ---------------------------------------------------------------------------

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = 3,
): string[] {
  if (!text.trim()) return ['Your Event']
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''

  for (let wi = 0; wi < words.length; wi++) {
    const word = words[wi]
    const test = current ? `${current} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current)
      current = word

      if (lines.length >= maxLines - 1) {
        // Last allowed line — concatenate remaining and truncate
        const rest = words.slice(wi).join(' ')
        if (ctx.measureText(rest).width <= maxWidth) {
          lines.push(rest)
        } else {
          let t = rest
          while (ctx.measureText(t + '…').width > maxWidth && t.length > 0) t = t.slice(0, -1)
          lines.push(t + '…')
        }
        return lines
      }
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  return lines
}

function formatCanvasDate(date: Date | null): string {
  if (!date) return ''
  const day     = date.toLocaleDateString('en-IN', { weekday: 'short' }).toUpperCase()
  const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }).toUpperCase()
  const time    = date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase()
  return `${day} · ${dateStr} · ${time}`
}

function formatPrice(paise: number): string {
  if (paise === 0) return 'FREE ENTRY'
  return `₹${(paise / 100).toLocaleString('en-IN')}`
}

async function drawEvent(
  canvas: HTMLCanvasElement,
  data: CanvasEventData,
  S: number,
): Promise<void> {
  const ctx = canvas.getContext('2d')!
  canvas.width  = S
  canvas.height = S

  await document.fonts.ready

  const CORAL = '#E8705A'
  const TEAL  = '#5DD9D0'
  const PAD   = S * 0.09

  // ── Background ─────────────────────────────────────────────────────────────
  ctx.fillStyle = '#07070A'
  ctx.fillRect(0, 0, S, S)

  // ── Noise grain ────────────────────────────────────────────────────────────
  const imgData = ctx.getImageData(0, 0, S, S)
  const px = imgData.data
  for (let i = 0; i < px.length; i += 4) {
    const g = (Math.random() - 0.5) * 14
    px[i]     = Math.max(0, Math.min(255, px[i]     + g))
    px[i + 1] = Math.max(0, Math.min(255, px[i + 1] + g))
    px[i + 2] = Math.max(0, Math.min(255, px[i + 2] + g))
  }
  ctx.putImageData(imgData, 0, 0)

  // ── Coral glow (top-left) ──────────────────────────────────────────────────
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, S * 0.65)
  glow.addColorStop(0, 'rgba(232,112,90,0.13)')
  glow.addColorStop(1, 'rgba(7,7,10,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, S, S)

  // ── Circle decoration (top-right) ─────────────────────────────────────────
  ctx.strokeStyle = 'rgba(255,255,255,0.04)'
  ctx.lineWidth = Math.max(1.5, S * 0.003)
  ctx.beginPath()
  ctx.arc(S * 0.86, S * 0.18, S * 0.28, 0, Math.PI * 2)
  ctx.stroke()

  // ── Top coral stripe ──────────────────────────────────────────────────────
  ctx.fillStyle = CORAL
  ctx.fillRect(0, 0, S, Math.max(4, S * 0.007))

  // ── Left accent bar ───────────────────────────────────────────────────────
  ctx.fillStyle = CORAL
  ctx.fillRect(0, 0, Math.max(3, S * 0.006), S)

  // ── "WHEN IN MY CITY" label ───────────────────────────────────────────────
  ctx.fillStyle = 'rgba(232,112,90,0.72)'
  ctx.font      = `500 ${S * 0.022}px 'DM Sans', sans-serif`
  ctx.fillText('WHEN IN MY CITY', PAD, S * 0.12)

  // ── Thin separator line ───────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(255,255,255,0.07)'
  ctx.fillRect(PAD, S * 0.145, S - PAD * 2, 1)

  // ── Event title ───────────────────────────────────────────────────────────
  const titleFontSize = S * 0.088
  ctx.font            = `800 ${titleFontSize}px 'Outfit', 'DM Sans', sans-serif`
  ctx.fillStyle       = '#FFFFFF'

  const titleLines  = wrapText(ctx, data.title, S - PAD * 2.2, 3)
  const lineHeight  = titleFontSize * 1.17
  let titleY        = S * 0.245

  for (const line of titleLines) {
    ctx.fillText(line, PAD, titleY)
    titleY += lineHeight
  }

  // ── Coral separator with dot ──────────────────────────────────────────────
  const sepY = titleY + S * 0.036
  ctx.fillStyle = CORAL
  ctx.fillRect(PAD, sepY, S * 0.055, Math.max(1.5, S * 0.0022))
  ctx.beginPath()
  ctx.arc(PAD + S * 0.068, sepY + 0.5, Math.max(2.5, S * 0.004), 0, Math.PI * 2)
  ctx.fill()

  let detailY = sepY + S * 0.058

  // ── Date line ─────────────────────────────────────────────────────────────
  const dateStr = formatCanvasDate(data.startsAt)
  if (dateStr) {
    ctx.fillStyle = CORAL
    ctx.font      = `600 ${S * 0.029}px 'DM Sans', sans-serif`
    ctx.fillText(dateStr, PAD, detailY)
    detailY += S * 0.048
  }

  // ── Venue ─────────────────────────────────────────────────────────────────
  if (data.venueName) {
    ctx.fillStyle = 'rgba(255,255,255,0.44)'
    ctx.font      = `400 ${S * 0.025}px 'DM Sans', sans-serif`
    const v = data.venueName.length > 42 ? data.venueName.slice(0, 40) + '…' : data.venueName
    ctx.fillText(v, PAD, detailY)
  }

  // ── Price pill (bottom-left) ───────────────────────────────────────────────
  const priceText  = formatPrice(data.ticketPrice)
  const isPaid     = data.ticketPrice > 0
  const pFontSize  = S * 0.028
  ctx.font         = `700 ${pFontSize}px 'DM Sans', sans-serif`
  const pTW        = ctx.measureText(priceText).width
  const pPadX      = S * 0.026
  const pPadY      = S * 0.016
  const pW         = pTW + pPadX * 2
  const pH         = pFontSize + pPadY * 2
  const pX         = PAD
  const pY         = S - S * 0.108   // baseline

  ctx.fillStyle = isPaid ? 'rgba(232,112,90,0.14)' : 'rgba(93,217,208,0.14)'
  ctx.beginPath()
  ctx.roundRect(pX, pY - pH + pPadY, pW, pH, pH / 2)
  ctx.fill()
  ctx.fillStyle = isPaid ? CORAL : TEAL
  ctx.fillText(priceText, pX + pPadX, pY)

  // ── Tier badge (bottom-right, above watermark) ────────────────────────────
  if (data.creatorTier === 'lantern' || data.creatorTier === 'beacon') {
    const tierColor = data.creatorTier === 'beacon' ? '#a855f7' : '#F5A800'
    const tierLabel = data.creatorTier === 'beacon' ? 'Beacon Creator' : 'Lantern Creator'
    const tFontSize = S * 0.022
    ctx.font        = `600 ${tFontSize}px 'DM Sans', sans-serif`
    const tW        = ctx.measureText(tierLabel).width
    const tPadX     = S * 0.022
    const tPadY     = S * 0.013
    const tH        = tFontSize + tPadY * 2
    const tX        = S - PAD - tW - tPadX * 2
    const tY        = S - S * 0.108

    ctx.fillStyle = `${tierColor}1A`
    ctx.beginPath()
    ctx.roundRect(tX, tY - tH + tPadY, tW + tPadX * 2, tH, tH / 2)
    ctx.fill()
    ctx.fillStyle = tierColor
    ctx.fillText(tierLabel, tX + tPadX, tY)
  }

  // ── "wimc.in" watermark ───────────────────────────────────────────────────
  ctx.fillStyle  = 'rgba(255,255,255,0.17)'
  ctx.font       = `400 ${S * 0.021}px 'DM Sans', sans-serif`
  ctx.textAlign  = 'right'
  ctx.fillText('wimc.in', S - PAD, S - S * 0.038)
  ctx.textAlign  = 'left'
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EventCanvasRenderer({
  data,
  size        = 800,
  displaySize = 280,
  fill        = false,
  onAction,
  actionLabel = 'Use as cover',
  isPending   = false,
  canvasRefOut,
}: Props) {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const [busy, setBusy] = useState(true)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    setBusy(true)
    drawEvent(canvas, data, size)
      .then(() => setBusy(false))
      .catch(console.error)
  }, [data, size])

  useEffect(() => { draw() }, [draw])

  // Expose the canvas element to the parent when requested
  useEffect(() => {
    if (canvasRefOut && canvasRef.current) {
      canvasRefOut.current = canvasRef.current
    }
  })

  function handleAction() {
    const canvas = canvasRef.current
    if (!canvas || !onAction) return
    canvas.toBlob((blob) => { if (blob) onAction(blob) }, 'image/jpeg', 0.92)
  }

  const canvasStyle: React.CSSProperties = fill
    ? { width: '100%', height: '100%', display: 'block' }
    : { width: displaySize, height: displaySize, display: 'block' }

  const wrapStyle: React.CSSProperties = fill
    ? { position: 'absolute', inset: 0, overflow: 'hidden' }
    : { position: 'relative', width: displaySize, height: displaySize, borderRadius: 10, overflow: 'hidden' }

  return (
    <div style={{ display: fill ? 'contents' : 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Canvas preview */}
      <div style={wrapStyle}>
        <canvas
          ref={canvasRef}
          style={canvasStyle}
        />
        {busy && !fill && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'grid', placeItems: 'center',
            background: 'rgba(7,7,10,0.75)',
          }}>
            <svg
              style={{ animation: 'spin 0.8s linear infinite' }}
              width={20} height={20} viewBox="0 0 24 24" fill="none"
            >
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              <circle cx="12" cy="12" r="10" stroke="#E8705A" strokeWidth="2.5" strokeOpacity="0.3"/>
              <path d="M22 12a10 10 0 0 0-10-10" stroke="#E8705A" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
        )}
      </div>

      {/* Action button */}
      {!fill && onAction && (
        <button
          type="button"
          onClick={handleAction}
          disabled={busy || isPending}
          style={{
            width: '100%', padding: '10px 0', borderRadius: 10, border: 'none',
            background: busy || isPending ? 'rgba(232,112,90,0.3)' : '#E8705A',
            color: '#fff', fontWeight: 700, fontSize: 13.5,
            cursor: busy || isPending ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-dm-sans)',
            transition: 'background 150ms',
          }}
        >
          {isPending ? 'Uploading…' : actionLabel}
        </button>
      )}
    </div>
  )
}
