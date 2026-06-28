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
  templateId?:    string
  size?:          number
  displaySize?:   number
  fill?:          boolean
  onAction?:      (blob: Blob) => void
  actionLabel?:   string
  isPending?:     boolean
  canvasRefOut?:  MutableRefObject<HTMLCanvasElement | null>
}

export const POSTER_TEMPLATES = [
  { id: 'default',   name: 'Dark'      },
  { id: 'zone',      name: 'Vivid'     },
  { id: 'editorial', name: 'Editorial' },
  { id: 'bold',      name: 'Navy'      },
]

// ---------------------------------------------------------------------------
// Shared helpers
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

function addNoise(ctx: CanvasRenderingContext2D, S: number, intensity = 14) {
  const imgData = ctx.getImageData(0, 0, S, S)
  const px = imgData.data
  for (let i = 0; i < px.length; i += 4) {
    const g = (Math.random() - 0.5) * intensity
    px[i]     = Math.max(0, Math.min(255, px[i]     + g))
    px[i + 1] = Math.max(0, Math.min(255, px[i + 1] + g))
    px[i + 2] = Math.max(0, Math.min(255, px[i + 2] + g))
  }
  ctx.putImageData(imgData, 0, 0)
}

// ---------------------------------------------------------------------------
// Template: Default — dark minimal with coral
// ---------------------------------------------------------------------------

async function drawEventDefault(canvas: HTMLCanvasElement, data: CanvasEventData, S: number) {
  const ctx = canvas.getContext('2d')!
  canvas.width = canvas.height = S
  await document.fonts.ready

  const CORAL = '#E8705A'
  const TEAL  = '#5DD9D0'
  const PAD   = S * 0.09

  ctx.fillStyle = '#07070A'
  ctx.fillRect(0, 0, S, S)
  addNoise(ctx, S, 14)

  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, S * 0.65)
  glow.addColorStop(0, 'rgba(232,112,90,0.13)')
  glow.addColorStop(1, 'rgba(7,7,10,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, S, S)

  ctx.strokeStyle = 'rgba(255,255,255,0.04)'
  ctx.lineWidth = Math.max(1.5, S * 0.003)
  ctx.beginPath()
  ctx.arc(S * 0.86, S * 0.18, S * 0.28, 0, Math.PI * 2)
  ctx.stroke()

  ctx.fillStyle = CORAL
  ctx.fillRect(0, 0, S, Math.max(4, S * 0.007))
  ctx.fillRect(0, 0, Math.max(3, S * 0.006), S)

  ctx.fillStyle = 'rgba(232,112,90,0.72)'
  ctx.font      = `500 ${S * 0.022}px 'DM Sans', sans-serif`
  ctx.fillText('WHEN IN MY CITY', PAD, S * 0.12)

  ctx.fillStyle = 'rgba(255,255,255,0.07)'
  ctx.fillRect(PAD, S * 0.145, S - PAD * 2, 1)

  const titleFontSize = S * 0.088
  ctx.font      = `800 ${titleFontSize}px 'Outfit', 'DM Sans', sans-serif`
  ctx.fillStyle = '#FFFFFF'
  const titleLines = wrapText(ctx, data.title, S - PAD * 2.2, 3)
  const lineHeight = titleFontSize * 1.17
  let titleY = S * 0.245
  for (const line of titleLines) { ctx.fillText(line, PAD, titleY); titleY += lineHeight }

  const sepY = titleY + S * 0.036
  ctx.fillStyle = CORAL
  ctx.fillRect(PAD, sepY, S * 0.055, Math.max(1.5, S * 0.0022))
  ctx.beginPath()
  ctx.arc(PAD + S * 0.068, sepY + 0.5, Math.max(2.5, S * 0.004), 0, Math.PI * 2)
  ctx.fill()

  let detailY = sepY + S * 0.058
  const dateStr = formatCanvasDate(data.startsAt)
  if (dateStr) {
    ctx.fillStyle = CORAL
    ctx.font      = `600 ${S * 0.029}px 'DM Sans', sans-serif`
    ctx.fillText(dateStr, PAD, detailY)
    detailY += S * 0.048
  }
  if (data.venueName) {
    ctx.fillStyle = 'rgba(255,255,255,0.44)'
    ctx.font      = `400 ${S * 0.025}px 'DM Sans', sans-serif`
    const v = data.venueName.length > 42 ? data.venueName.slice(0, 40) + '…' : data.venueName
    ctx.fillText(v, PAD, detailY)
  }

  const priceText = formatPrice(data.ticketPrice)
  const isPaid    = data.ticketPrice > 0
  const pFontSize = S * 0.028
  ctx.font = `700 ${pFontSize}px 'DM Sans', sans-serif`
  const pTW = ctx.measureText(priceText).width
  const pPadX = S * 0.026, pPadY = S * 0.016
  const pW = pTW + pPadX * 2, pH = pFontSize + pPadY * 2
  const pX = PAD, pY = S - S * 0.108
  ctx.fillStyle = isPaid ? 'rgba(232,112,90,0.14)' : 'rgba(93,217,208,0.14)'
  ctx.beginPath(); ctx.roundRect(pX, pY - pH + pPadY, pW, pH, pH / 2); ctx.fill()
  ctx.fillStyle = isPaid ? CORAL : TEAL
  ctx.fillText(priceText, pX + pPadX, pY)

  if (data.creatorTier === 'lantern' || data.creatorTier === 'beacon') {
    const tierColor = data.creatorTier === 'beacon' ? '#a855f7' : '#F5A800'
    const tierLabel = data.creatorTier === 'beacon' ? 'Beacon Creator' : 'Lantern Creator'
    const tFontSize = S * 0.022
    ctx.font = `600 ${tFontSize}px 'DM Sans', sans-serif`
    const tW = ctx.measureText(tierLabel).width
    const tPadX = S * 0.022, tPadY = S * 0.013
    const tH = tFontSize + tPadY * 2
    const tX = S - PAD - tW - tPadX * 2, tY = S - S * 0.108
    ctx.fillStyle = `${tierColor}1A`
    ctx.beginPath(); ctx.roundRect(tX, tY - tH + tPadY, tW + tPadX * 2, tH, tH / 2); ctx.fill()
    ctx.fillStyle = tierColor
    ctx.fillText(tierLabel, tX + tPadX, tY)
  }

  ctx.fillStyle = 'rgba(255,255,255,0.17)'
  ctx.font      = `400 ${S * 0.021}px 'DM Sans', sans-serif`
  ctx.textAlign = 'right'
  ctx.fillText('wimc.in', S - PAD, S - S * 0.038)
  ctx.textAlign = 'left'
}

// ---------------------------------------------------------------------------
// Template: Zone (Vivid) — saffron festival poster, dark footer
// ---------------------------------------------------------------------------

async function drawEventZone(canvas: HTMLCanvasElement, data: CanvasEventData, S: number) {
  const ctx = canvas.getContext('2d')!
  canvas.width = canvas.height = S
  await document.fonts.ready

  const SAFFRON = '#E07800'
  const AMBER   = '#FFB340'
  const CREAM   = '#FFF8ED'
  const DARK    = '#1A0800'
  const PAD     = S * 0.09

  // Vivid saffron background
  ctx.fillStyle = SAFFRON
  ctx.fillRect(0, 0, S, S)

  // Decorative circles (semi-transparent white)
  ctx.globalAlpha = 0.13
  ctx.fillStyle = '#FFFFFF'
  ctx.beginPath(); ctx.arc(S * 0.88, S * 0.12, S * 0.44, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(S * 0.06, S * 0.88, S * 0.34, 0, Math.PI * 2); ctx.fill()
  ctx.globalAlpha = 0.06
  ctx.beginPath(); ctx.arc(S * 0.5, S * 0.52, S * 0.56, 0, Math.PI * 2); ctx.fill()
  ctx.globalAlpha = 1

  // Cream header bar
  ctx.fillStyle = CREAM
  ctx.fillRect(0, 0, S, S * 0.115)
  ctx.fillStyle = 'rgba(26,8,0,0.48)'
  ctx.font      = `500 ${S * 0.022}px 'DM Sans', sans-serif`
  ctx.fillText('WHEN IN MY CITY', PAD, S * 0.082)
  // Saffron dot in header
  ctx.fillStyle = SAFFRON
  ctx.beginPath(); ctx.arc(S - PAD, S * 0.058, S * 0.022, 0, Math.PI * 2); ctx.fill()

  // Dark divider below header
  ctx.fillStyle = DARK
  ctx.fillRect(0, S * 0.115, S, Math.max(4, S * 0.006))

  // Title — white, large
  const titleFontSize = S * 0.091
  ctx.font      = `800 ${titleFontSize}px 'Outfit', 'DM Sans', sans-serif`
  ctx.fillStyle = '#FFFFFF'
  const titleLines = wrapText(ctx, data.title, S - PAD * 2.2, 3)
  const lineHeight = titleFontSize * 1.12
  let titleY = S * 0.285
  for (const line of titleLines) { ctx.fillText(line, PAD, titleY); titleY += lineHeight }

  // Separator
  const sepY = titleY + S * 0.028
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.fillRect(PAD, sepY, S * 0.055, Math.max(1.5, S * 0.0022))
  ctx.beginPath(); ctx.arc(PAD + S * 0.068, sepY + 0.5, Math.max(2.5, S * 0.004), 0, Math.PI * 2); ctx.fill()

  // Dark footer strip (~bottom 28%)
  const footerY = S * 0.72
  ctx.fillStyle = DARK
  ctx.fillRect(0, footerY, S, S - footerY)

  let detailY = footerY + S * 0.056
  const dateStr = formatCanvasDate(data.startsAt)
  if (dateStr) {
    ctx.fillStyle = AMBER
    ctx.font      = `600 ${S * 0.028}px 'DM Sans', sans-serif`
    ctx.fillText(dateStr, PAD, detailY)
    detailY += S * 0.046
  }
  if (data.venueName) {
    ctx.fillStyle = 'rgba(255,255,255,0.42)'
    ctx.font      = `400 ${S * 0.024}px 'DM Sans', sans-serif`
    const v = data.venueName.length > 42 ? data.venueName.slice(0, 40) + '…' : data.venueName
    ctx.fillText(v, PAD, detailY)
  }

  const priceText = formatPrice(data.ticketPrice)
  const pFontSize = S * 0.026
  ctx.font = `700 ${pFontSize}px 'DM Sans', sans-serif`
  const pTW = ctx.measureText(priceText).width
  const pPadX = S * 0.024, pPadY = S * 0.013
  const pW = pTW + pPadX * 2, pH = pFontSize + pPadY * 2
  const pX = PAD, pY = S - S * 0.048
  ctx.fillStyle = 'rgba(224,120,0,0.30)'
  ctx.beginPath(); ctx.roundRect(pX, pY - pH + pPadY, pW, pH, pH / 2); ctx.fill()
  ctx.fillStyle = AMBER
  ctx.fillText(priceText, pX + pPadX, pY)

  ctx.fillStyle = 'rgba(255,255,255,0.15)'
  ctx.font      = `400 ${S * 0.021}px 'DM Sans', sans-serif`
  ctx.textAlign = 'right'
  ctx.fillText('wimc.in', S - PAD, S - S * 0.018)
  ctx.textAlign = 'left'
}

// ---------------------------------------------------------------------------
// Template: Editorial — clean light, magazine-style
// ---------------------------------------------------------------------------

async function drawEventEditorial(canvas: HTMLCanvasElement, data: CanvasEventData, S: number) {
  const ctx = canvas.getContext('2d')!
  canvas.width = canvas.height = S
  await document.fonts.ready

  const BLACK = '#0A0A0A'
  const CORAL = '#E8705A'
  const PAD   = S * 0.09

  // Cream background
  ctx.fillStyle = '#F5F0E8'
  ctx.fillRect(0, 0, S, S)

  // Top black header
  ctx.fillStyle = BLACK
  ctx.fillRect(0, 0, S, S * 0.135)

  ctx.fillStyle = 'rgba(255,255,255,0.88)'
  ctx.font      = `500 ${S * 0.022}px 'DM Sans', sans-serif`
  ctx.fillText('WHEN IN MY CITY', PAD, S * 0.088)

  // Coral dot accent in header
  ctx.fillStyle = CORAL
  ctx.beginPath()
  ctx.arc(S - PAD, S * 0.067, S * 0.022, 0, Math.PI * 2)
  ctx.fill()

  // Coral stripe below header
  ctx.fillStyle = CORAL
  ctx.fillRect(0, S * 0.135, S, Math.max(3, S * 0.005))

  const titleFontSize = S * 0.082
  ctx.font      = `700 ${titleFontSize}px 'Outfit', 'DM Sans', sans-serif`
  ctx.fillStyle = BLACK
  const titleLines = wrapText(ctx, data.title, S - PAD * 2.2, 3)
  const lineHeight = titleFontSize * 1.15
  let titleY = S * 0.295
  for (const line of titleLines) { ctx.fillText(line, PAD, titleY); titleY += lineHeight }

  const sepY = titleY + S * 0.03
  ctx.fillStyle = 'rgba(0,0,0,0.15)'
  ctx.fillRect(PAD, sepY, S - PAD * 2, 1)

  let detailY = sepY + S * 0.055
  const dateStr = formatCanvasDate(data.startsAt)
  if (dateStr) {
    ctx.fillStyle = CORAL
    ctx.font      = `600 ${S * 0.027}px 'DM Sans', sans-serif`
    ctx.fillText(dateStr, PAD, detailY)
    detailY += S * 0.046
  }
  if (data.venueName) {
    ctx.fillStyle = 'rgba(10,10,10,0.5)'
    ctx.font      = `400 ${S * 0.024}px 'DM Sans', sans-serif`
    const v = data.venueName.length > 42 ? data.venueName.slice(0, 40) + '…' : data.venueName
    ctx.fillText(v, PAD, detailY)
  }

  // Bottom black footer bar
  ctx.fillStyle = BLACK
  ctx.fillRect(0, S - S * 0.1, S, S * 0.1)

  const priceText = formatPrice(data.ticketPrice)
  const pFontSize = S * 0.028
  ctx.font = `700 ${pFontSize}px 'DM Sans', sans-serif`
  const pTW = ctx.measureText(priceText).width
  const pPadX = S * 0.026, pPadY = S * 0.013
  const pW = pTW + pPadX * 2, pH = pFontSize + pPadY * 2
  const pX = PAD, pY = S - S * 0.033
  ctx.fillStyle = CORAL
  ctx.beginPath(); ctx.roundRect(pX, pY - pH + pPadY * 0.6, pW, pH, pH / 2); ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.fillText(priceText, pX + pPadX, pY)

  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.font      = `400 ${S * 0.021}px 'DM Sans', sans-serif`
  ctx.textAlign = 'right'
  ctx.fillText('wimc.in', S - PAD, S - S * 0.016)
  ctx.textAlign = 'left'
}

// ---------------------------------------------------------------------------
// Template: Bold (Navy) — deep midnight navy with gold, premium feel
// ---------------------------------------------------------------------------

async function drawEventBold(canvas: HTMLCanvasElement, data: CanvasEventData, S: number) {
  const ctx = canvas.getContext('2d')!
  canvas.width = canvas.height = S
  await document.fonts.ready

  const NAVY = '#080F28'
  const GOLD = '#F5C800'
  const PAD  = S * 0.09

  // Deep navy background
  ctx.fillStyle = NAVY
  ctx.fillRect(0, 0, S, S)
  addNoise(ctx, S, 8)

  // Subtle gold glow top-right
  const glow = ctx.createRadialGradient(S, 0, 0, S, 0, S * 0.65)
  glow.addColorStop(0, 'rgba(245,200,0,0.11)')
  glow.addColorStop(1, 'rgba(8,15,40,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, S, S)

  // Faint dot-grid texture
  ctx.fillStyle = 'rgba(245,200,0,0.04)'
  const dot = S / 16
  for (let x = dot; x < S; x += dot * 2) {
    for (let y = dot; y < S; y += dot * 2) {
      ctx.beginPath(); ctx.arc(x, y, 1, 0, Math.PI * 2); ctx.fill()
    }
  }

  // Gold top bar
  ctx.fillStyle = GOLD
  ctx.fillRect(0, 0, S, Math.max(4, S * 0.007))

  // WIMC label
  ctx.fillStyle = `${GOLD}99`
  ctx.font      = `500 ${S * 0.022}px 'DM Sans', sans-serif`
  ctx.fillText('WHEN IN MY CITY', PAD, S * 0.11)

  // Thin gold rule
  ctx.fillStyle = `${GOLD}22`
  ctx.fillRect(PAD, S * 0.132, S - PAD * 2, 1)

  // Title — gold
  const titleFontSize = S * 0.092
  ctx.font      = `800 ${titleFontSize}px 'Outfit', 'DM Sans', sans-serif`
  ctx.fillStyle = GOLD
  const titleLines = wrapText(ctx, data.title, S - PAD * 2.2, 3)
  const lineHeight = titleFontSize * 1.12
  let titleY = S * 0.255
  for (const line of titleLines) { ctx.fillText(line, PAD, titleY); titleY += lineHeight }

  // Separator — gold
  const sepY = titleY + S * 0.036
  ctx.fillStyle = GOLD
  ctx.fillRect(PAD, sepY, S * 0.055, Math.max(1.5, S * 0.0022))
  ctx.beginPath(); ctx.arc(PAD + S * 0.068, sepY + 0.5, Math.max(2.5, S * 0.004), 0, Math.PI * 2); ctx.fill()

  let detailY = sepY + S * 0.058
  const dateStr = formatCanvasDate(data.startsAt)
  if (dateStr) {
    ctx.fillStyle = '#FFFFFF'
    ctx.font      = `600 ${S * 0.029}px 'DM Sans', sans-serif`
    ctx.fillText(dateStr, PAD, detailY)
    detailY += S * 0.048
  }
  if (data.venueName) {
    ctx.fillStyle = 'rgba(255,255,255,0.42)'
    ctx.font      = `400 ${S * 0.025}px 'DM Sans', sans-serif`
    const v = data.venueName.length > 42 ? data.venueName.slice(0, 40) + '…' : data.venueName
    ctx.fillText(v, PAD, detailY)
  }

  // Gold accent bottom bar
  ctx.fillStyle = `${GOLD}14`
  ctx.fillRect(0, S * 0.868, S, S * 0.132)
  ctx.strokeStyle = `${GOLD}33`
  ctx.lineWidth = Math.max(1, S * 0.002)
  ctx.beginPath(); ctx.moveTo(0, S * 0.868); ctx.lineTo(S, S * 0.868); ctx.stroke()

  // Price
  const priceText = formatPrice(data.ticketPrice)
  const pFontSize = S * 0.028
  ctx.font = `700 ${pFontSize}px 'DM Sans', sans-serif`
  const pTW = ctx.measureText(priceText).width
  const pPadX = S * 0.026, pPadY = S * 0.016
  const pW = pTW + pPadX * 2, pH = pFontSize + pPadY * 2
  const pX = PAD, pY = S - S * 0.107
  ctx.fillStyle = `${GOLD}20`
  ctx.beginPath(); ctx.roundRect(pX, pY - pH + pPadY, pW, pH, pH / 2); ctx.fill()
  ctx.fillStyle = GOLD
  ctx.fillText(priceText, pX + pPadX, pY)

  ctx.fillStyle = 'rgba(255,255,255,0.18)'
  ctx.font      = `400 ${S * 0.021}px 'DM Sans', sans-serif`
  ctx.textAlign = 'right'
  ctx.fillText('wimc.in', S - PAD, S - S * 0.038)
  ctx.textAlign = 'left'
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

function drawEvent(
  canvas: HTMLCanvasElement,
  data: CanvasEventData,
  S: number,
  templateId = 'default',
): Promise<void> {
  switch (templateId) {
    case 'zone':      return drawEventZone(canvas, data, S)
    case 'editorial': return drawEventEditorial(canvas, data, S)
    case 'bold':      return drawEventBold(canvas, data, S)
    default:          return drawEventDefault(canvas, data, S)
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EventCanvasRenderer({
  data,
  templateId  = 'default',
  size        = 800,
  displaySize = 280,
  fill        = false,
  onAction,
  actionLabel = 'Use as cover',
  isPending   = false,
  canvasRefOut,
}: Props) {
  const canvasRef       = useRef<HTMLCanvasElement>(null)
  const [busy, setBusy] = useState(true)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    setBusy(true)
    drawEvent(canvas, data, size, templateId)
      .then(() => setBusy(false))
      .catch(console.error)
  }, [data, size, templateId])

  useEffect(() => { draw() }, [draw])

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
      <div style={wrapStyle}>
        <canvas ref={canvasRef} style={canvasStyle} />
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
