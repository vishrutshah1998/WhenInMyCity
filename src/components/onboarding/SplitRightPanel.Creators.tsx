'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { getCategoryColour, PAPER } from '@/lib/onboarding/design-tokens'
import { CREATOR_CATEGORIES } from '@/lib/constants/categories'
import { INTEREST_TAGS, INTEREST_CATEGORY_COLORS, type InterestCategory } from '@/lib/constants/interests'
import ProfilePreview from '@/app/onboarding/creator/_components/ProfilePreview'
import { BARCODE, getCityCoords, type Snap } from './SplitRightPanel.shared'

// ── Category name sizing — scales down so the longest word still fits on one
// line within the card's ~340px content width (380px card − 20px padding × 2).
// Shorter labels (e.g. "Music") keep the full 80px treatment; long ones
// (e.g. "Art & Photography") shrink so nothing gets clipped by the card edge.
function fitCategoryFontSize(label: string): number {
  const longestWord = label
    .split(/\s+/)
    .reduce((max, word) => Math.max(max, word.length), 1)
  const size = 340 / (longestWord * 0.75)
  return Math.max(30, Math.min(80, Math.round(size)))
}

// ── C3FlipCard — mounts fresh per catId so each selection gets its own flip ───
// Phase 'back': card is face-down (back visible). 60ms after mount → 'flipping'
// (ob-card-flip-reveal keyframe plays). On animationEnd → 'idle' (mouse tilt live).
function C3FlipCard({
  snap,
  catId,
  tilt,
}: {
  snap: Snap
  catId: string
  tilt: { x: number; y: number }
}) {
  const [phase, setPhase] = useState<'back' | 'flipping' | 'idle'>('back')

  const catConfig = CREATOR_CATEGORIES.find(c => c.id === catId)
  const category  = catConfig?.label || catId
  const accent    = getCategoryColour(catId)

  useEffect(() => {
    const t = setTimeout(() => setPhase('flipping'), 60)
    return () => clearTimeout(t)
  }, [])

  const cardStyle: React.CSSProperties =
    phase === 'back' ? {
      width: 380, minHeight: 520, flexShrink: 0,
      transformStyle: 'preserve-3d',
      transform: 'perspective(1200px) rotateY(-180deg) rotateZ(-2deg)',
    } : phase === 'flipping' ? {
      width: 380, minHeight: 520, flexShrink: 0,
      transformStyle: 'preserve-3d',
      animation: 'ob-card-flip-reveal 0.78s cubic-bezier(0.22, 1, 0.36, 1) forwards',
    } : {
      width: 380, minHeight: 520, flexShrink: 0,
      transformStyle: 'preserve-3d',
      transform: `perspective(1200px) rotateY(0deg) rotateX(${tilt.x}deg) rotateZ(-2deg)`,
      transition: 'transform 0.1s ease-out',
    }

  return (
    <div style={{ position: 'relative', zIndex: 10 }}>
      <div style={cardStyle} onAnimationEnd={() => setPhase('idle')}>

        {/* ── FRONT face — the ticket ── */}
        <div style={{
          position: 'absolute', inset: 0,
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden' as unknown as 'hidden',
          background: '#FFFFFF',
          borderLeft: `4px solid ${accent}`,
          boxShadow: '0 24px 48px rgba(26,39,68,0.15)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Header row */}
          <div style={{ padding: '20px 20px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", fontSize: 9, color: '#1A2744', opacity: 0.6, letterSpacing: '0.10em' }}>
              JB_MN_SRL_88029-X
            </span>
            <span style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", fontSize: 9, color: '#1A2744', opacity: 0.6, letterSpacing: '0.10em', textTransform: 'uppercase' }}>
              ADMIT_ONE
            </span>
          </div>

          {/* Category badge */}
          <div style={{ padding: '4px 20px 0' }}>
            <span style={{
              display: 'inline-block', background: accent, padding: '3px 10px',
              fontFamily: "var(--font-barlow), 'Barlow Condensed', sans-serif",
              fontWeight: 700, fontSize: 11, color: '#FFFFFF', letterSpacing: '0.18em', textTransform: 'uppercase',
            }}>
              CATEGORY // {category.toUpperCase()}
            </span>
          </div>

          {/* Category name large */}
          <div style={{ padding: '8px 20px 0', overflow: 'hidden' }}>
            <span style={{
              fontFamily: "var(--font-syne), 'Outfit', sans-serif",
              fontWeight: 900, fontSize: fitCategoryFontSize(category), color: accent, lineHeight: 1,
              textTransform: 'uppercase', letterSpacing: '-0.02em',
              display: 'block', wordBreak: 'normal', overflowWrap: 'break-word',
            }}>
              {category.toUpperCase()}
            </span>
          </div>

          {/* Fields */}
          <div style={{ padding: '0 20px', marginTop: 'auto', marginBottom: 8 }}>
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", fontSize: 10, color: '#1A2744', opacity: 0.6, letterSpacing: '0.14em', textTransform: 'uppercase', margin: '0 0 4px' }}>
                HOLDER_NAME
              </p>
              <p style={{ fontFamily: "var(--font-syne), 'Outfit', sans-serif", fontWeight: 900, fontSize: 36, color: '#1A2744', lineHeight: 1, textTransform: 'uppercase', margin: 0, letterSpacing: '-0.01em' }}>
                {snap.c_name || '———'}
              </p>
            </div>
            <div>
              <p style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", fontSize: 10, color: '#1A2744', opacity: 0.6, letterSpacing: '0.14em', textTransform: 'uppercase', margin: '0 0 4px' }}>
                CLEARANCE_ROLE
              </p>
              <p style={{ fontFamily: "var(--font-syne), 'Outfit', sans-serif", fontWeight: 900, fontSize: 24, color: '#1A2744', lineHeight: 1, textTransform: 'uppercase', margin: 0 }}>
                CREATOR
              </p>
            </div>
          </div>

          {/* VALIDATED stamp — rubber-stamp bounce after card lands */}
          <div style={{ position: 'absolute', right: 20, top: '45%', transform: 'translateY(-50%) rotate(-12deg)', pointerEvents: 'none' }}>
            <div
              className="rubber-stamp-animate"
              style={{ '--stamp-rotate': '0deg', '--stamp-opacity': '1', width: 112, height: 112, borderRadius: '50%', border: '4px dashed rgba(26,39,68,0.18)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 8 } as React.CSSProperties}
            >
              <span style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", fontSize: 10, color: 'rgba(26,39,68,0.28)', lineHeight: 1.2, textTransform: 'uppercase' }}>VALIDATED</span>
              <span style={{ fontFamily: "var(--font-barlow), 'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, color: 'rgba(26,39,68,0.28)', lineHeight: 1.2, padding: '3px 0' }}>GATE 03</span>
              <span style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", fontSize: 9, color: 'rgba(26,39,68,0.28)', lineHeight: 1.2, textTransform: 'uppercase' }}>MUMBAI_01</span>
            </div>
          </div>

          {/* Perforation line */}
          <div style={{ marginTop: 16, height: 1, borderTop: '2px dashed rgba(26,39,68,0.15)', position: 'relative' }}>
            <div style={{ position: 'absolute', left: -8, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, borderRadius: '50%', background: PAPER.bg }} />
            <div style={{ position: 'absolute', right: -8, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, borderRadius: '50%', background: PAPER.bg }} />
          </div>

          {/* Barcode area */}
          <div style={{ padding: '12px 20px 16px' }}>
            <div style={{ height: 44, width: '100%', background: 'rgba(26,39,68,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ display: 'flex', gap: 2, height: 28, alignItems: 'stretch', opacity: 0.55 }}>
                {BARCODE.map((w, i) => (
                  <div key={i} style={{ width: w * 2, background: '#1A2744' }} />
                ))}
              </div>
            </div>
            <p style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", fontSize: 9, color: '#1A2744', opacity: 0.35, textAlign: 'center', margin: '6px 0 0', letterSpacing: '0.10em' }}>
              PHYSICAL_UTILITY_V1.1
            </p>
          </div>
        </div>

        {/* ── BACK face — playing-card back ── */}
        <div style={{
          position: 'absolute', inset: 0,
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden' as unknown as 'hidden',
          transform: 'rotateY(180deg)',
          background: '#1A2744',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          {/* Diamond crosshatch */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `
              repeating-linear-gradient(45deg,  rgba(255,255,255,0.045) 0px, rgba(255,255,255,0.045) 1px, transparent 1px, transparent 14px),
              repeating-linear-gradient(-45deg, rgba(255,255,255,0.045) 0px, rgba(255,255,255,0.045) 1px, transparent 1px, transparent 14px)
            `,
          }} />
          {/* Frame */}
          <div style={{ position: 'absolute', inset: 12, border: '2px solid rgba(255,255,255,0.10)' }} />
          <div style={{ position: 'absolute', inset: 20, border: '1px solid rgba(255,255,255,0.06)' }} />
          {/* Centre emblem */}
          <div style={{ position: 'relative', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, border: '2px solid rgba(255,255,255,0.12)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 28, color: 'rgba(255,255,255,0.22)' }}>flight_takeoff</span>
            </div>
            <div style={{ fontFamily: "var(--font-barlow), 'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 22, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.35em', textTransform: 'uppercase' }}>
              WIMC
            </div>
            <div style={{ fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace", fontSize: 7, color: 'rgba(255,255,255,0.10)', letterSpacing: '0.20em', textTransform: 'uppercase', marginTop: 6 }}>
              WHEN IN MY CITY
            </div>
          </div>
          {/* Corner pips */}
          {(['tl','tr','bl','br'] as const).map(corner => (
            <div key={corner} style={{
              position: 'absolute',
              top:    corner.startsWith('t') ? 28 : undefined,
              bottom: corner.startsWith('b') ? 28 : undefined,
              left:   corner.endsWith('l')   ? 28 : undefined,
              right:  corner.endsWith('r')   ? 28 : undefined,
              fontFamily: "var(--font-barlow), 'Barlow Condensed', sans-serif",
              fontWeight: 700, fontSize: 9, color: 'rgba(255,255,255,0.12)',
              letterSpacing: '0.12em',
              transform: corner.startsWith('b') ? 'rotate(180deg)' : undefined,
            }}>C3</div>
          ))}
        </div>

      </div>
    </div>
  )
}

// ── C3 — Right panel shell ────────────────────────────────────────────────────
export function C3RightPanel({ snap }: { snap: Snap }) {
  const router = useRouter()
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const panelRef = useRef<HTMLDivElement>(null)

  const catId     = snap.c_category
  const catConfig = CREATOR_CATEGORIES.find(c => c.id === catId)
  const category  = catConfig?.label || catId
  const accent    = getCategoryColour(catId)
  const hasCategory = !!catId

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = panelRef.current?.getBoundingClientRect()
    if (!rect) return
    const x =  ((e.clientY - rect.top)  / rect.height - 0.5) * 6
    const y = -((e.clientX - rect.left) / rect.width  - 0.5) * 6
    setTilt({ x, y })
  }

  return (
    <div
      ref={panelRef}
      style={{
        width: '100%', height: '100%',
        position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '80px 48px 100px',
        overflow: 'hidden',
        cursor: 'default',
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
    >
      {/* Watermark — category name */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none', userSelect: 'none', overflow: 'hidden',
      }}>
        <span style={{
          fontFamily: "var(--font-syne), 'Outfit', sans-serif",
          fontWeight: 900, fontSize: 320, opacity: 0.04,
          color: '#1A2744', lineHeight: 1, textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}>
          {category.toUpperCase().slice(0, 4)}
        </span>
      </div>

      {/* Flip card — key remounts on each selection so every choice gets a fresh flip */}
      <C3FlipCard
        key={catId || 'none'}
        snap={snap}
        catId={catId}
        tilt={tilt}
      />

      {/* CTA button — bottom centre of right panel */}
      <div style={{
        position: 'absolute', bottom: 40,
        left: '50%', transform: 'translateX(-50%)',
        zIndex: 20,
      }}>
        <button
          onClick={() => router.push('/onboarding/creator/C4')}
          disabled={!hasCategory}
          style={{
            fontFamily: "var(--font-barlow), 'Barlow Condensed', sans-serif",
            fontWeight: 700, fontSize: 20,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            padding: '14px 40px',
            width: 280,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: hasCategory ? accent : 'rgba(232,112,90,0.30)',
            color: '#1A2744',
            border: 'none',
            boxShadow: hasCategory ? '4px 4px 0px #1A2744' : 'none',
            cursor: hasCategory ? 'pointer' : 'not-allowed',
            opacity: hasCategory ? 1 : 0.5,
            transition: 'all 150ms',
          }}
        >
          CONTINUE
          <span className="material-symbols-outlined" style={{ fontWeight: 700, fontSize: 22 }}>
            arrow_forward
          </span>
        </button>
      </div>

      {/* Serial footer */}
      <div style={{
        position: 'absolute', bottom: 14, right: 16,
        fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
        fontSize: 10, color: '#1A2744', opacity: 0.25,
      }}>
        C003-921-X
      </div>
    </div>
  )
}

// ── C4 city theme system ──────────────────────────────────────────────────────
interface C4Theme {
  panelBg:    string
  artGrad:    string
  artPattern: string
  ink:        string
  accent:     string
  stampBg:    string
  stampLabel: string   // newline-separated lines
  tagline:    string
  landmark:   string
  badge:      string
  cardRotate: string
}

// Blend a hex colour toward white/black — used to derive a postcard gradient
// from the creator's single category accent, so C4's artwork colour always
// matches the accent set in C3 instead of switching per city.
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function mix(hex: string, target: [number, number, number], amount: number): string {
  const [r, g, b] = hexToRgb(hex)
  const rgb = [r, g, b].map((c, i) => Math.round(c + (target[i] - c) * amount))
  return '#' + rgb.map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('')
}
const lighten = (hex: string, amount: number) => mix(hex, [255, 255, 255], amount)
const darken  = (hex: string, amount: number) => mix(hex, [0, 0, 0], amount)

function getC4Theme(city: string): C4Theme {
  const T: Record<string, C4Theme> = {
    'Jaipur': {
      panelBg: '#F0DDD6', ink: '#3D1A0A', accent: '#C4553A',
      artGrad: 'linear-gradient(155deg,#E89878 0%,#C4553A 55%,#7A1E0A 100%)',
      artPattern: 'repeating-linear-gradient(60deg,rgba(255,255,255,.06) 0,rgba(255,255,255,.06) 1px,transparent 1px,transparent 22px),repeating-linear-gradient(-60deg,rgba(255,255,255,.06) 0,rgba(255,255,255,.06) 1px,transparent 1px,transparent 22px)',
      stampBg: '#FFF0E8', stampLabel: 'PINK CITY\nRAJASTHAN',
      tagline: 'CITY OF PALACES', landmark: 'AMER',
      badge: 'PINK SANDSTONE GLORY', cardRotate: 'rotate(2deg)',
    },
    'Chandigarh': {
      panelBg: '#DCE9E4', ink: '#0A2420', accent: '#2D9B8A',
      artGrad: 'linear-gradient(155deg,#86C8B8 0%,#2D9B8A 55%,#0D5448 100%)',
      artPattern: 'repeating-linear-gradient(0deg,rgba(255,255,255,.08) 0,rgba(255,255,255,.08) 1px,transparent 1px,transparent 24px),repeating-linear-gradient(90deg,rgba(255,255,255,.08) 0,rgba(255,255,255,.08) 1px,transparent 1px,transparent 24px)',
      stampBg: '#E8F8F4', stampLabel: "CITY BEAUTIFUL\nCHANDIGARH",
      tagline: "LE CORBUSIER'S GRID", landmark: 'CHD',
      badge: 'PLANNED PERFECTION', cardRotate: 'rotate(-1.5deg)',
    },
    'Indore': {
      panelBg: '#FFF0DC', ink: '#2A1400', accent: '#F5A800',
      artGrad: 'linear-gradient(155deg,#FFD08A 0%,#F5A800 55%,#B07000 100%)',
      artPattern: 'radial-gradient(circle at 20% 80%,rgba(255,255,255,.10) 0%,transparent 50%),radial-gradient(circle at 80% 20%,rgba(255,255,255,.07) 0%,transparent 40%)',
      stampBg: '#FFFAE8', stampLabel: 'FOOD CAPITAL\nMADHYA PRADESH',
      tagline: 'CHAAT & JAZZ CAPITAL', landmark: 'INDORI',
      badge: 'STREET FOOD CAPITAL', cardRotate: 'rotate(1deg)',
    },
    'Bhopal': {
      panelBg: '#D8EDE4', ink: '#0A2018', accent: '#1A9B6C',
      artGrad: 'linear-gradient(155deg,#6EC8A8 0%,#1A9B6C 55%,#0A5038 100%)',
      artPattern: 'radial-gradient(ellipse at 50% 80%,rgba(255,255,255,.12) 0%,transparent 60%)',
      stampBg: '#E4F8F0', stampLabel: 'CITY OF LAKES\nMADHYA PRADESH',
      tagline: 'TWIN LAKES & NAWABS', landmark: 'BHOPAL',
      badge: 'LAKES OF LEGEND', cardRotate: 'rotate(-2deg)',
    },
    'Kochi': {
      panelBg: '#D4EEF0', ink: '#082830', accent: '#1A98A4',
      artGrad: 'linear-gradient(155deg,#78C8D0 0%,#1A98A4 55%,#084850 100%)',
      artPattern: 'repeating-linear-gradient(135deg,rgba(255,255,255,.06) 0,rgba(255,255,255,.06) 1px,transparent 1px,transparent 18px)',
      stampBg: '#E4F8FA', stampLabel: 'ARABIAN SEA\nKERALA',
      tagline: 'QUEEN OF THE SEAS', landmark: 'COCHIN',
      badge: 'BACKWATERS & SPICE', cardRotate: 'rotate(1.5deg)',
    },
    'Ahmedabad': {
      panelBg: '#FFF0D8', ink: '#2A1800', accent: '#E08A00',
      artGrad: 'linear-gradient(155deg,#FFD090 0%,#E08A00 55%,#904800 100%)',
      artPattern: 'repeating-linear-gradient(0deg,rgba(255,255,255,.07) 0,rgba(255,255,255,.07) 1px,transparent 1px,transparent 20px),repeating-linear-gradient(90deg,rgba(255,255,255,.04) 0,rgba(255,255,255,.04) 1px,transparent 1px,transparent 20px)',
      stampBg: '#FFF8E8', stampLabel: 'MANCHESTER\nGUJARAT',
      tagline: 'STEPWELLS & TEXTILES', landmark: 'AMDAVAD',
      badge: 'VIBRANT GUJARAT', cardRotate: 'rotate(-1deg)',
    },
    'Mumbai': {
      panelBg: '#181822', ink: '#F0EFF8', accent: '#F5A800',
      artGrad: 'linear-gradient(155deg,#2A2A3C 0%,#141428 55%,#060614 100%)',
      artPattern: 'radial-gradient(circle at 30% 60%,rgba(245,168,0,.09) 0%,transparent 50%),radial-gradient(circle at 70% 30%,rgba(93,217,208,.06) 0%,transparent 40%)',
      stampBg: '#1E1E30', stampLabel: 'MAXIMUM CITY\nMAHARASHTRA',
      tagline: 'THE CITY OF DREAMS', landmark: 'BOMBAY',
      badge: 'MAXIMUM MAXIMUM', cardRotate: 'rotate(2deg)',
    },
    'Varanasi': {
      panelBg: '#160800', ink: '#F5C842', accent: '#E87200',
      artGrad: 'linear-gradient(155deg,#7A1800 0%,#C04000 40%,#E47000 75%,#F5A800 100%)',
      artPattern: 'repeating-linear-gradient(0deg,rgba(255,200,0,.07) 0,rgba(255,200,0,.07) 1px,transparent 1px,transparent 16px)',
      stampBg: '#1A0C00', stampLabel: 'KASHI\nUTTAR PRADESH',
      tagline: 'CITY OF MOKSHA', landmark: 'KASHI',
      badge: 'GHATS OF THE GANGA', cardRotate: 'rotate(-1.5deg)',
    },
    'Udaipur': {
      panelBg: '#D8E8F2', ink: '#082030', accent: '#4888B0',
      artGrad: 'linear-gradient(155deg,#A0C8E0 0%,#4888B0 55%,#18486C 100%)',
      artPattern: 'repeating-linear-gradient(180deg,rgba(255,255,255,.06) 0,rgba(255,255,255,.06) 1px,transparent 1px,transparent 24px)',
      stampBg: '#E0F0F8', stampLabel: 'LAKE CITY\nRAJASTHAN',
      tagline: 'CITY OF LAKES & LOVE', landmark: 'MEWAR',
      badge: 'LAKE PALACE VIBES', cardRotate: 'rotate(2.5deg)',
    },
    'Jodhpur': {
      panelBg: '#D0E0F0', ink: '#081830', accent: '#2A6898',
      artGrad: 'linear-gradient(155deg,#88B0D0 0%,#2A6898 55%,#0A2858 100%)',
      artPattern: 'radial-gradient(circle at 40% 30%,rgba(255,255,255,.10) 0%,transparent 40%),radial-gradient(circle at 70% 70%,rgba(255,255,255,.07) 0%,transparent 30%)',
      stampBg: '#D8E8F8', stampLabel: 'BLUE CITY\nRAJASTHAN',
      tagline: 'MEHRANGARH FORTRESS', landmark: 'MARWAR',
      badge: 'BLUE CITY OF STONE', cardRotate: 'rotate(-2deg)',
    },
    'Mysuru': {
      panelBg: '#EAE0F8', ink: '#1E083C', accent: '#7840B8',
      artGrad: 'linear-gradient(155deg,#C8A0E0 0%,#7840B8 55%,#380870 100%)',
      artPattern: 'repeating-linear-gradient(30deg,rgba(255,255,255,.06) 0,rgba(255,255,255,.06) 1px,transparent 1px,transparent 20px)',
      stampBg: '#EEE0F8', stampLabel: 'CITY OF PALACES\nKARNATAKA',
      tagline: 'DASARA & SANDALWOOD', landmark: 'MYSORE',
      badge: 'ROYAL DASARA', cardRotate: 'rotate(1.5deg)',
    },
    'Panaji': {
      panelBg: '#D4F0EC', ink: '#083028', accent: '#18A898',
      artGrad: 'linear-gradient(155deg,#68D0C4 0%,#18A898 55%,#086860 100%)',
      artPattern: 'radial-gradient(ellipse 120% 60% at 50% 100%,rgba(255,255,255,.12) 0%,transparent 70%)',
      stampBg: '#D8F8F4', stampLabel: 'PEARL OF GOA\nGOA',
      tagline: 'SUN, SEA & SPICE', landmark: 'GOA',
      badge: 'BEACHES & FENI', cardRotate: 'rotate(-1deg)',
    },
    'Shimla': {
      panelBg: '#E4EEF8', ink: '#0A1830', accent: '#4A78B8',
      artGrad: 'linear-gradient(155deg,#C4D8F0 0%,#7898C8 50%,#285080 100%)',
      artPattern: 'radial-gradient(circle at 50% 0%,rgba(255,255,255,.15) 0%,transparent 60%)',
      stampBg: '#E8F0F8', stampLabel: 'QUEEN OF HILLS\nHIMACHAL PRADESH',
      tagline: 'THE COLONIAL HILL STATION', landmark: 'SIMLA',
      badge: 'QUEEN OF HILLS', cardRotate: 'rotate(2deg)',
    },
    'Srinagar': {
      panelBg: '#D4EDE8', ink: '#082820', accent: '#289880',
      artGrad: 'linear-gradient(155deg,#88D0C0 0%,#289880 50%,#0A4830 100%)',
      artPattern: 'repeating-linear-gradient(135deg,rgba(255,255,255,.06) 0,rgba(255,255,255,.06) 1px,transparent 1px,transparent 22px)',
      stampBg: '#D8F0E8', stampLabel: 'PARADISE\nJAMMU & KASHMIR',
      tagline: 'DAL LAKE REFLECTIONS', landmark: 'KASHMIR',
      badge: 'CHINAR LEAVES FALL', cardRotate: 'rotate(-2.5deg)',
    },
    'Shillong': {
      panelBg: '#D4EDD4', ink: '#0A2010', accent: '#2A8040',
      artGrad: 'linear-gradient(155deg,#78C078 0%,#2A8040 55%,#0A4020 100%)',
      artPattern: 'radial-gradient(ellipse at 50% 0%,rgba(255,255,255,.10) 0%,transparent 50%)',
      stampBg: '#D8F0D8', stampLabel: 'SCOTLAND OF EAST\nMEGHALAYA',
      tagline: 'MONSOON & ROCK MUSIC', landmark: 'MEGHA',
      badge: 'RAIN CAPITAL', cardRotate: 'rotate(1.5deg)',
    },
    'Amritsar': {
      panelBg: '#FFF8D4', ink: '#2A1800', accent: '#D4A800',
      artGrad: 'linear-gradient(155deg,#FFE07A 0%,#D4A800 55%,#886800 100%)',
      artPattern: 'radial-gradient(circle at 50% 50%,rgba(255,255,255,.12) 0%,transparent 65%)',
      stampBg: '#FFF8E4', stampLabel: 'GOLDEN TEMPLE\nPUNJAB',
      tagline: 'WAHEGURU DI NAGRI', landmark: 'DARBAR',
      badge: 'GOLDEN GATEWAY', cardRotate: 'rotate(-1.5deg)',
    },
    'Lucknow': {
      panelBg: '#FFF4E4', ink: '#2A1800', accent: '#C89000',
      artGrad: 'linear-gradient(155deg,#F0D898 0%,#C89000 55%,#785800 100%)',
      artPattern: 'repeating-linear-gradient(45deg,rgba(255,255,255,.05) 0,rgba(255,255,255,.05) 2px,transparent 2px,transparent 22px)',
      stampBg: '#FFF8E8', stampLabel: 'CITY OF NAWABS\nUTTAR PRADESH',
      tagline: 'TEHZEEB & KEBABS', landmark: 'AWADH',
      badge: 'NAWABI ADAAB', cardRotate: 'rotate(2deg)',
    },
    'Nashik': {
      panelBg: '#F0E4F8', ink: '#200830', accent: '#8848A8',
      artGrad: 'linear-gradient(155deg,#C898D8 0%,#8848A8 55%,#480868 100%)',
      artPattern: 'radial-gradient(circle at 20% 30%,rgba(255,255,255,.10) 0%,transparent 40%),radial-gradient(circle at 80% 70%,rgba(255,255,255,.07) 0%,transparent 30%)',
      stampBg: '#F0E4F8', stampLabel: 'WINE CAPITAL\nMAHARASHTRA',
      tagline: 'GRAPES & GODAVARI', landmark: 'NASHIK',
      badge: 'KUMBH & VINEYARDS', cardRotate: 'rotate(-1deg)',
    },
    'Nagpur': {
      panelBg: '#FFF0DC', ink: '#2A0800', accent: '#E07000',
      artGrad: 'linear-gradient(155deg,#FFB850 0%,#E07000 55%,#903000 100%)',
      artPattern: 'radial-gradient(circle at 60% 40%,rgba(255,255,255,.10) 0%,transparent 50%)',
      stampBg: '#FFF4E0', stampLabel: 'ORANGE CITY\nMAHARASHTRA',
      tagline: 'ZERO MILE CITY', landmark: 'NAGPUR',
      badge: 'ORANGES & ZERO MILE', cardRotate: 'rotate(1.5deg)',
    },
    'Guwahati': {
      panelBg: '#D8EDD8', ink: '#0A2008', accent: '#288028',
      artGrad: 'linear-gradient(155deg,#80C080 0%,#288028 50%,#0A4010 100%)',
      artPattern: 'radial-gradient(ellipse 120% 60% at 50% 100%,rgba(255,255,255,.10) 0%,transparent 60%)',
      stampBg: '#D8F0D8', stampLabel: 'BRAHMAPUTRA\nASSAM',
      tagline: 'GATEWAY TO NORTHEAST', landmark: 'KAMAKHYA',
      badge: 'BRAHMAPUTRA RISING', cardRotate: 'rotate(-1.5deg)',
    },
    'Coimbatore': {
      panelBg: '#E4EEF8', ink: '#0A1030', accent: '#3858A8',
      artGrad: 'linear-gradient(155deg,#90A8D8 0%,#3858A8 55%,#0A2068 100%)',
      artPattern: 'repeating-linear-gradient(0deg,rgba(255,255,255,.06) 0,rgba(255,255,255,.06) 1px,transparent 1px,transparent 24px),repeating-linear-gradient(90deg,rgba(255,255,255,.06) 0,rgba(255,255,255,.06) 1px,transparent 1px,transparent 24px)',
      stampBg: '#E4EEF8', stampLabel: 'LOOMS CITY\nTAMIL NADU',
      tagline: 'MANCHESTER OF SOUTH', landmark: 'KOVAI',
      badge: 'COIMBATORE CALLING', cardRotate: 'rotate(2deg)',
    },
    'Madurai': {
      panelBg: '#FFF4D8', ink: '#2A1000', accent: '#D89000',
      artGrad: 'linear-gradient(155deg,#F8D070 0%,#D89000 50%,#885000 100%)',
      artPattern: 'repeating-linear-gradient(60deg,rgba(255,255,255,.06) 0,rgba(255,255,255,.06) 1px,transparent 1px,transparent 18px)',
      stampBg: '#FFF8E0', stampLabel: 'MEENAKSHI CITY\nTAMIL NADU',
      tagline: 'JASMINE & GOPURAM', landmark: 'MEENAKSHI',
      badge: 'TEMPLE CITY SOUTH', cardRotate: 'rotate(-2deg)',
    },
    'Dehradun': {
      panelBg: '#E0EDD8', ink: '#102010', accent: '#4A9040',
      artGrad: 'linear-gradient(155deg,#A0C890 0%,#4A9040 50%,#1A5018 100%)',
      artPattern: 'radial-gradient(ellipse at 50% 0%,rgba(255,255,255,.10) 0%,transparent 55%)',
      stampBg: '#E4F0D8', stampLabel: 'DUN VALLEY\nUTTARAKHAND',
      tagline: 'GATEWAY TO GARHWAL', landmark: 'DUN',
      badge: 'VALLEY OF DOONS', cardRotate: 'rotate(1deg)',
    },
    'Delhi': {
      panelBg: '#EAD8D8', ink: '#200808', accent: '#A02020',
      artGrad: 'linear-gradient(155deg,#C89090 0%,#A02020 55%,#580808 100%)',
      artPattern: 'repeating-linear-gradient(45deg,rgba(255,255,255,.05) 0,rgba(255,255,255,.05) 2px,transparent 2px,transparent 28px),repeating-linear-gradient(-45deg,rgba(255,255,255,.05) 0,rgba(255,255,255,.05) 2px,transparent 2px,transparent 28px)',
      stampBg: '#F0D8D8', stampLabel: 'HEART OF BHARAT\nDELHI NCT',
      tagline: 'THE IMPERIAL CITY', landmark: 'DILLI',
      badge: 'LUTYENS & LANEWAYS', cardRotate: 'rotate(-1deg)',
    },
    'Visakhapatnam': {
      panelBg: '#D4E8F0', ink: '#082030', accent: '#1878A8',
      artGrad: 'linear-gradient(155deg,#78B8D8 0%,#1878A8 55%,#083858 100%)',
      artPattern: 'repeating-linear-gradient(180deg,rgba(255,255,255,.06) 0,rgba(255,255,255,.06) 1px,transparent 1px,transparent 20px)',
      stampBg: '#D8EEF8', stampLabel: 'CITY OF DESTINY\nANDHRA PRADESH',
      tagline: 'VIZAG: BLUE & STEEL', landmark: 'VIZAG',
      badge: 'BEACHES & STEEL', cardRotate: 'rotate(2deg)',
    },
    'Pune': {
      panelBg: '#E8F0E0', ink: '#102008', accent: '#508830',
      artGrad: 'linear-gradient(155deg,#A8D080 0%,#508830 55%,#1A4808 100%)',
      artPattern: 'radial-gradient(circle at 30% 70%,rgba(255,255,255,.08) 0%,transparent 40%)',
      stampBg: '#E4F0D8', stampLabel: 'OXFORD OF EAST\nMAHARASHTRA',
      tagline: 'CULTURE & CAMPUS', landmark: 'PUNE',
      badge: 'PUNE PRIDE', cardRotate: 'rotate(-2deg)',
    },
    'Surat': {
      panelBg: '#F0F8E8', ink: '#102008', accent: '#58A030',
      artGrad: 'linear-gradient(155deg,#B0D888 0%,#58A030 55%,#1A5808 100%)',
      artPattern: 'radial-gradient(circle at 70% 30%,rgba(255,255,255,.10) 0%,transparent 40%)',
      stampBg: '#E8F8E0', stampLabel: 'DIAMOND CITY\nGUJARAT',
      tagline: 'DIAMONDS & TEXTILES', landmark: 'SURAT',
      badge: 'SILK & DIAMONDS', cardRotate: 'rotate(1.5deg)',
    },
    'Patna': {
      panelBg: '#F0E8D8', ink: '#200C00', accent: '#B08040',
      artGrad: 'linear-gradient(155deg,#D8C098 0%,#B08040 55%,#704000 100%)',
      artPattern: 'radial-gradient(ellipse at 50% 100%,rgba(255,255,255,.08) 0%,transparent 55%)',
      stampBg: '#F0E8D8', stampLabel: 'PATALIPUTRA\nBIHAR',
      tagline: 'ANCIENT CAPITAL', landmark: 'PATNA',
      badge: 'GANGA & GANDHIJI', cardRotate: 'rotate(-1deg)',
    },
    'Gandhinagar': {
      panelBg: '#DFF5EB', ink: '#0A3020', accent: '#2DB87A',
      artGrad: 'linear-gradient(155deg,#88E0B8 0%,#2DB87A 55%,#0A6840 100%)',
      artPattern: 'radial-gradient(ellipse 120% 60% at 50% 100%,rgba(255,255,255,.10) 0%,transparent 60%)',
      stampBg: '#E4F8F0', stampLabel: 'GREEN CAPITAL\nGUJARAT',
      tagline: "INDIA'S GREENEST CITY", landmark: 'AKSHARDHAM',
      badge: '54 TREES PER PERSON', cardRotate: 'rotate(-1.5deg)',
    },
    'Bengaluru': {
      panelBg: '#E0EDD8', ink: '#0A2010', accent: '#4A9A3A',
      artGrad: 'linear-gradient(155deg,#98D080 0%,#4A9A3A 55%,#1A5010 100%)',
      artPattern: 'radial-gradient(circle at 30% 70%,rgba(255,255,255,.08) 0%,transparent 40%)',
      stampBg: '#E4F0D8', stampLabel: 'GARDEN CITY\nKARNATAKA',
      tagline: 'SILICON VALLEY OF INDIA', landmark: 'BENGALURU',
      badge: 'TECH & GARDENS', cardRotate: 'rotate(1.5deg)',
    },
    'Hyderabad': {
      panelBg: '#F5E8D0', ink: '#280C00', accent: '#C87820',
      artGrad: 'linear-gradient(155deg,#EEC080 0%,#C87820 55%,#783800 100%)',
      artPattern: 'repeating-linear-gradient(60deg,rgba(255,255,255,.05) 0,rgba(255,255,255,.05) 1px,transparent 1px,transparent 20px)',
      stampBg: '#F8ECD8', stampLabel: 'CITY OF NIZAMS\nTELANGANA',
      tagline: 'BIRYANI & CHARMINAR', landmark: 'HYDERABAD',
      badge: 'PEARL CITY', cardRotate: 'rotate(2deg)',
    },
    'Chennai': {
      panelBg: '#D8EAF5', ink: '#081830', accent: '#1868A8',
      artGrad: 'linear-gradient(155deg,#78B0D8 0%,#1868A8 55%,#083060 100%)',
      artPattern: 'repeating-linear-gradient(0deg,rgba(255,255,255,.06) 0,rgba(255,255,255,.06) 1px,transparent 1px,transparent 22px)',
      stampBg: '#D8EEF8', stampLabel: 'GATEWAY OF SOUTH\nTAMIL NADU',
      tagline: 'CLASSICAL COAST OF INDIA', landmark: 'MADRAS',
      badge: 'CARNATIC & MARINA', cardRotate: 'rotate(-1.5deg)',
    },
    'Kolkata': {
      panelBg: '#F8EAD8', ink: '#280800', accent: '#D06020',
      artGrad: 'linear-gradient(155deg,#E8A870 0%,#D06020 55%,#882010 100%)',
      artPattern: 'radial-gradient(circle at 30% 60%,rgba(255,255,255,.08) 0%,transparent 45%)',
      stampBg: '#F8E8D8', stampLabel: 'CITY OF JOY\nWEST BENGAL',
      tagline: 'TAGORE & TRAMS', landmark: 'CALCUTTA',
      badge: 'MAACH & MISHTI', cardRotate: 'rotate(1deg)',
    },
  }

  return T[city] ?? {
    panelBg: PAPER.bg, ink: '#1A2744', accent: '#F5A800',
    artGrad: `linear-gradient(160deg,${PAPER.bg} 0%,#E8D5B0 100%)`,
    artPattern: '',
    stampBg: '#FAF7F0',
    stampLabel: city ? `${city.slice(0, 12).toUpperCase()}\nINDIA` : 'INDIA\nPOSTAGE',
    tagline: 'REPRESENTING THE STREETS',
    landmark: city ? city.slice(0, 6).toUpperCase() : 'INDIA',
    badge: 'WHEN IN MY CITY', cardRotate: 'rotate(1.5deg)',
  }
}

// ── C4 city landmark SVG illustrations ───────────────────────────────────────
function CityLandmark({ city }: { city: string }) {
  const w = (o: number) => `rgba(255,255,255,${o})`
  const props = {
    viewBox: '0 0 420 240' as const,
    width: '100%', height: '100%',
    style: { position: 'absolute' as const, inset: 0 },
    preserveAspectRatio: 'xMidYMax meet' as const,
  }
  const ground = <rect x="0" y="218" width="420" height="22" fill={w(0.08)}/>

  switch (city) {
    case 'Gandhinagar': return (
      <svg {...props}>
        {ground}
        <rect x="60" y="210" width="300" height="8" rx="1" fill={w(0.12)}/>
        <rect x="80" y="202" width="260" height="10" rx="2" fill={w(0.16)}/>
        <rect x="105" y="192" width="210" height="12" rx="2" fill={w(0.12)}/>
        {[0,40,80,120,160,200,240,280,320].map(a => (
          <ellipse key={a} cx="210" cy="192" rx="14" ry="48" fill={w(0.08)} transform={`rotate(${a} 210 192)`}/>
        ))}
        <path d="M200,192 L192,148 L188,100 L192,62 L210,28 L228,62 L232,100 L228,148 L220,192Z" fill={w(0.26)}/>
        {[148,118,95,72].map(y => (
          <rect key={y} x={204-(192-y)*0.28} y={y} width={(192-y)*0.56} height="4" rx="1" fill={w(0.16)}/>
        ))}
        <ellipse cx="210" cy="30" rx="11" ry="8" fill={w(0.34)}/>
        <circle cx="210" cy="22" r="5" fill={w(0.42)}/>
        <path d="M154,192 L150,164 L148,136 L153,116 L162,104 L171,116 L174,136 L172,164 L166,192Z" fill={w(0.18)}/>
        <circle cx="162" cy="103" r="7" fill={w(0.26)}/><circle cx="162" cy="96" r="3" fill={w(0.34)}/>
        <path d="M266,192 L270,164 L272,136 L267,116 L258,104 L249,116 L246,136 L248,164 L254,192Z" fill={w(0.18)}/>
        <circle cx="258" cy="103" r="7" fill={w(0.26)}/><circle cx="258" cy="96" r="3" fill={w(0.34)}/>
        <path d="M125,192 Q210,158 295,192Z" fill={w(0.06)}/>
      </svg>
    )

    case 'Jaipur': return (
      <svg {...props}>
        {ground}
        <rect x="55" y="186" width="310" height="32" fill={w(0.18)}/>
        {[75,110,145,180,215,250,285,320].map(x => (
          <path key={x} d={`M${x},186 Q${x+16},175 ${x+32},186`} stroke={w(0.26)} strokeWidth="1.5" fill="none"/>
        ))}
        <rect x="80" y="156" width="260" height="32" fill={w(0.16)}/>
        {[95,130,165,200,235,270,305].map(x => (
          <path key={x} d={`M${x},156 Q${x+14},146 ${x+28},156`} stroke={w(0.22)} strokeWidth="1.5" fill="none"/>
        ))}
        <rect x="110" y="128" width="200" height="30" fill={w(0.14)}/>
        {[124,159,194,229,264].map(x => (
          <path key={x} d={`M${x},128 Q${x+14},118 ${x+28},128`} stroke={w(0.20)} strokeWidth="1.5" fill="none"/>
        ))}
        <rect x="140" y="102" width="140" height="28" fill={w(0.16)}/>
        {[153,184,215,246].map(x => (
          <path key={x} d={`M${x},102 Q${x+13},93 ${x+26},102`} stroke={w(0.22)} strokeWidth="1.5" fill="none"/>
        ))}
        <rect x="168" y="78" width="84" height="26" fill={w(0.18)}/>
        {[175,204].map(x => (
          <path key={x} d={`M${x},78 Q${x+12},69 ${x+24},78`} stroke={w(0.24)} strokeWidth="1.5" fill="none"/>
        ))}
        <path d="M168,78 Q210,48 252,78Z" fill={w(0.22)}/>
        <circle cx="189" cy="54" r="7" fill={w(0.28)}/><circle cx="210" cy="46" r="9" fill={w(0.32)}/><circle cx="231" cy="54" r="7" fill={w(0.28)}/>
      </svg>
    )

    case 'Mumbai': return (
      <svg {...props}>
        <rect x="0" y="205" width="420" height="35" fill={w(0.12)}/>
        <path d="M0,208 Q70,198 140,208 Q210,218 280,208 Q350,198 420,208 L420,222 L0,222Z" fill={w(0.07)}/>
        <path d="M158,205 L158,130 Q158,68 210,68 Q262,68 262,130 L262,205 L248,205 L248,133 Q248,84 210,84 Q172,84 172,133 L172,205Z" fill={w(0.22)}/>
        <path d="M195,70 Q210,50 225,70Z" fill={w(0.28)}/>
        <circle cx="210" cy="50" r="10" fill={w(0.32)}/>
        <rect x="108" y="136" width="46" height="69" fill={w(0.16)}/>
        <path d="M108,136 L131,106 L154,136Z" fill={w(0.20)}/>
        <circle cx="131" cy="106" r="9" fill={w(0.26)}/>
        <rect x="266" y="136" width="46" height="69" fill={w(0.16)}/>
        <path d="M266,136 L289,106 L312,136Z" fill={w(0.20)}/>
        <circle cx="289" cy="106" r="9" fill={w(0.26)}/>
        {[115,128,141,154,278,291,304].map(x => (
          <rect key={x} x={x} y="132" width="7" height="10" fill={w(0.14)}/>
        ))}
        <rect x="90" y="203" width="240" height="6" fill={w(0.18)}/>
      </svg>
    )

    case 'Delhi': return (
      <svg {...props}>
        {ground}
        <path d="M170,218 L170,140 Q170,80 210,80 Q250,80 250,140 L250,218 L238,218 L238,143 Q238,95 210,95 Q182,95 182,143 L182,218Z" fill={w(0.22)}/>
        <ellipse cx="210" cy="82" rx="18" ry="10" fill={w(0.28)}/>
        <rect x="205" y="60" width="10" height="24" fill={w(0.22)}/>
        <path d="M210,58 Q204,44 210,36 Q216,44 210,58Z" fill={w(0.45)}/>
        <rect x="148" y="216" width="124" height="7" rx="1" fill={w(0.20)}/>
        <rect x="128" y="221" width="164" height="5" rx="1" fill={w(0.16)}/>
        <rect x="82" y="188" width="74" height="32" fill={w(0.10)}/>
        <rect x="264" y="188" width="74" height="32" fill={w(0.10)}/>
        <rect x="178" y="156" width="64" height="18" fill={w(0.09)}/>
        <ellipse cx="210" cy="225" rx="175" ry="7" fill={w(0.06)}/>
      </svg>
    )

    case 'Bhopal': return (
      <svg {...props}>
        {ground}
        <rect x="60" y="210" width="300" height="8" fill={w(0.18)}/>
        <rect x="100" y="166" width="220" height="46" fill={w(0.16)}/>
        <ellipse cx="210" cy="166" rx="46" ry="50" fill={w(0.20)}/>
        <ellipse cx="210" cy="122" rx="28" ry="34" fill={w(0.24)}/>
        <circle cx="210" cy="92" r="12" fill={w(0.28)}/>
        <rect x="206" y="75" width="8" height="20" fill={w(0.30)}/><circle cx="210" cy="73" r="5" fill={w(0.37)}/>
        <rect x="68" y="118" width="24" height="94" fill={w(0.18)}/>
        <ellipse cx="80" cy="116" rx="15" ry="17" fill={w(0.22)}/>
        <ellipse cx="80" cy="101" rx="10" ry="12" fill={w(0.26)}/>
        <circle cx="80" cy="90" r="5" fill={w(0.30)}/><rect x="77" y="82" width="6" height="12" fill={w(0.28)}/><circle cx="80" cy="80" r="3" fill={w(0.36)}/>
        <rect x="328" y="118" width="24" height="94" fill={w(0.18)}/>
        <ellipse cx="340" cy="116" rx="15" ry="17" fill={w(0.22)}/>
        <ellipse cx="340" cy="101" rx="10" ry="12" fill={w(0.26)}/>
        <circle cx="340" cy="90" r="5" fill={w(0.30)}/><rect x="337" y="82" width="6" height="12" fill={w(0.28)}/><circle cx="340" cy="80" r="3" fill={w(0.36)}/>
        <ellipse cx="145" cy="166" rx="24" ry="27" fill={w(0.14)}/>
        <ellipse cx="275" cy="166" rx="24" ry="27" fill={w(0.14)}/>
        {[115,148,181,214,247].map(x => (
          <path key={x} d={`M${x},197 Q${x+12},184 ${x+24},197 L${x+24},210 L${x},210Z`} fill={w(0.10)}/>
        ))}
        <ellipse cx="210" cy="226" rx="155" ry="8" fill={w(0.08)}/>
      </svg>
    )

    case 'Ahmedabad': return (
      <svg {...props}>
        {ground}
        <path d="M210,30 L272,62 L300,120 L272,178 L210,210 L148,178 L120,120 L148,62Z" fill={w(0.06)} stroke={w(0.14)} strokeWidth="1.5"/>
        <path d="M210,56 L258,80 L278,120 L258,160 L210,184 L162,160 L142,120 L162,80Z" fill={w(0.08)} stroke={w(0.13)} strokeWidth="1.5"/>
        <path d="M210,80 L246,98 L258,120 L246,142 L210,160 L174,142 L162,120 L174,98Z" fill={w(0.11)} stroke={w(0.12)} strokeWidth="1.5"/>
        <path d="M210,100 L235,112 L242,130 L235,148 L210,160 L185,148 L178,130 L185,112Z" fill={w(0.16)} stroke={w(0.12)} strokeWidth="1"/>
        <path d="M210,118 L226,127 L228,138 L220,148 L210,150 L200,148 L192,138 L194,127Z" fill={w(0.22)} stroke={w(0.14)} strokeWidth="1"/>
        <circle cx="210" cy="132" r="16" fill={w(0.30)} stroke={w(0.22)} strokeWidth="2"/>
        <circle cx="210" cy="132" r="8" fill={w(0.38)}/>
        {[0,45,90,135,180,225,270,315].map(deg => {
          const r = 88, x = 210 + r * Math.cos((deg * Math.PI) / 180), y = 118 + r * Math.sin((deg * Math.PI) / 180) * 0.52
          return <circle key={deg} cx={x} cy={y} r="4" fill={w(0.20)}/>
        })}
      </svg>
    )

    case 'Kochi': return (
      <svg {...props}>
        <rect x="0" y="202" width="420" height="38" fill={w(0.12)}/>
        <path d="M0,205 Q60,197 120,205 Q180,212 240,205 Q300,197 360,205 Q390,212 420,205 L420,220 L0,220Z" fill={w(0.08)}/>
        <rect x="128" y="198" width="164" height="7" fill={w(0.20)}/>
        <line x1="210" y1="82" x2="210" y2="198" stroke={w(0.24)} strokeWidth="5"/>
        <line x1="136" y1="102" x2="292" y2="132" stroke={w(0.20)} strokeWidth="4"/>
        <line x1="210" y1="100" x2="148" y2="80" stroke={w(0.16)} strokeWidth="3"/>
        <path d="M136,102 L95,172 L178,178 L255,172 L292,132Z" fill={w(0.10)} stroke={w(0.15)} strokeWidth="1"/>
        {[148,174,200,226,252,278].map(x => (
          <line key={x} x1={x} y1={102+(x-136)*0.18} x2={x-18} y2="173" stroke={w(0.09)} strokeWidth="0.8"/>
        ))}
        {[120,145,170,198,225].map(y => (
          <line key={y} x1="108" y1={y} x2="290" y2={y+15} stroke={w(0.09)} strokeWidth="0.8"/>
        ))}
        <circle cx="143" cy="83" r="8" fill={w(0.24)}/><circle cx="153" cy="79" r="6" fill={w(0.20)}/>
        <line x1="322" y1="112" x2="322" y2="202" stroke={w(0.14)} strokeWidth="3"/>
        <line x1="280" y1="128" x2="362" y2="148" stroke={w(0.12)} strokeWidth="2.5"/>
        <path d="M280,128 L264,188 L308,192 L358,188 L362,148Z" fill={w(0.07)} stroke={w(0.10)} strokeWidth="0.8"/>
      </svg>
    )

    case 'Indore': return (
      <svg {...props}>
        {ground}
        <rect x="58" y="205" width="304" height="13" fill={w(0.18)}/>
        <rect x="80" y="150" width="260" height="57" fill={w(0.16)}/>
        <rect x="166" y="62" width="88" height="92" fill={w(0.22)}/>
        {[80,100,118,132,146].map(y => (
          <rect key={y} x="163" y={y} width="94" height="4" fill={w(0.14)}/>
        ))}
        <path d="M166,62 Q210,32 254,62Z" fill={w(0.26)}/>
        <circle cx="187" cy="40" r="9" fill={w(0.28)}/><circle cx="210" cy="30" r="11" fill={w(0.32)}/><circle cx="233" cy="40" r="9" fill={w(0.28)}/>
        {[88,125,162,250,285].map(x => (
          <path key={x} d={`M${x},150 Q${x+16},136 ${x+32},150`} stroke={w(0.20)} strokeWidth="1.5" fill="none"/>
        ))}
        <rect x="68" y="170" width="24" height="48" fill={w(0.14)}/><path d="M68,170 L80,152 L92,170Z" fill={w(0.18)}/>
        <rect x="328" y="170" width="24" height="48" fill={w(0.14)}/><path d="M328,170 L340,152 L352,170Z" fill={w(0.18)}/>
        {[108,192,278].map(x => (
          <rect key={x} x={x} y="168" width="32" height="8" rx="1" fill={w(0.12)}/>
        ))}
      </svg>
    )

    case 'Varanasi': return (
      <svg {...props}>
        <rect x="0" y="208" width="420" height="32" fill={w(0.14)}/>
        <path d="M0,210 Q52,202 105,210 Q157,218 210,210 Q262,202 315,210 Q367,218 420,210 L420,224 L0,224Z" fill={w(0.08)}/>
        {[0,1,2,3,4,5,6,7].map(i => (
          <rect key={i} x={42+i*5} y={207-i*11} width={336-i*10} height={11} fill={w(0.09+i*0.014)} rx="1"/>
        ))}
        <path d="M186,96 L174,175 L196,175Z" fill={w(0.22)}/><path d="M210,76 L196,175 L224,175Z" fill={w(0.28)}/><path d="M234,96 L224,175 L244,175Z" fill={w(0.22)}/>
        <circle cx="210" cy="73" r="10" fill={w(0.32)}/>
        <path d="M144,108 L136,175 L152,175Z" fill={w(0.18)}/><circle cx="144" cy="106" r="7" fill={w(0.24)}/>
        <path d="M276,108 L268,175 L284,175Z" fill={w(0.18)}/><circle cx="276" cy="106" r="7" fill={w(0.24)}/>
        <path d="M312,120 L306,175 L318,175Z" fill={w(0.14)}/><circle cx="312" cy="118" r="5" fill={w(0.20)}/>
        <path d="M110,130 L104,175 L116,175Z" fill={w(0.14)}/>
        {[72,106,138,170,202,242,274,308,340].map(x => (
          <circle key={x} cx={x} cy={207-Math.floor(x*0.01)*2} r="2.5" fill={w(0.36)}/>
        ))}
        <path d="M68,214 Q88,209 108,214 L106,220 L70,220Z" fill={w(0.20)}/>
        <path d="M300,216 Q318,212 338,216 L336,222 L302,222Z" fill={w(0.18)}/>
      </svg>
    )

    case 'Amritsar': return (
      <svg {...props}>
        <ellipse cx="210" cy="216" rx="182" ry="16" fill={w(0.12)}/>
        <path d="M158,216 Q210,226 262,216 L262,230 Q210,222 158,230Z" fill={w(0.08)}/>
        <rect x="196" y="180" width="28" height="36" fill={w(0.16)}/>
        <rect x="163" y="170" width="94" height="14" rx="2" fill={w(0.20)}/>
        <rect x="170" y="132" width="80" height="42" fill={w(0.22)}/>
        <rect x="180" y="110" width="60" height="26" fill={w(0.24)}/>
        <ellipse cx="210" cy="110" rx="30" ry="28" fill={w(0.28)}/>
        <ellipse cx="210" cy="86" rx="20" ry="20" fill={w(0.32)}/>
        <circle cx="210" cy="70" r="10" fill={w(0.38)}/>
        <rect x="207" y="52" width="6" height="22" fill={w(0.44)}/><circle cx="210" cy="50" r="5" fill={w(0.52)}/>
        {([[163,130],[258,130],[163,170],[258,170]]).map(([x,y],i) => (
          <g key={i}>
            <rect x={x-8} y={y} width="16" height={36} fill={w(0.16)}/>
            <ellipse cx={x} cy={y} rx="10" ry="10" fill={w(0.22)}/>
            <circle cx={x} cy={y-8} r="4" fill={w(0.28)}/>
          </g>
        ))}
        <rect x="48" y="194" width="324" height="10" fill={w(0.08)}/>
        <path d="M196,170 Q210,158 224,170Z" fill={w(0.26)}/>
      </svg>
    )

    case 'Lucknow': return (
      <svg {...props}>
        {ground}
        <path d="M145,218 L145,120 Q145,56 210,56 Q275,56 275,120 L275,218 L259,218 L259,123 Q259,73 210,73 Q161,73 161,123 L161,218Z" fill={w(0.22)}/>
        <path d="M193,58 Q210,36 227,58Z" fill={w(0.30)}/>
        <circle cx="210" cy="38" r="12" fill={w(0.32)}/><circle cx="210" cy="28" r="7" fill={w(0.38)}/>
        <rect x="207" y="18" width="6" height="14" fill={w(0.42)}/><circle cx="210" cy="16" r="4" fill={w(0.48)}/>
        {[3,4,5,6].map(i => (
          <ellipse key={i} cx="210" cy={60+i*25} rx={24+i*9} ry="7" fill={w(0.05)}/>
        ))}
        <rect x="95" y="157" width="40" height="61" fill={w(0.14)}/>
        <path d="M95,157 Q115,138 135,157Z" fill={w(0.18)}/><circle cx="115" cy="138" r="9" fill={w(0.22)}/>
        <rect x="285" y="157" width="40" height="61" fill={w(0.14)}/>
        <path d="M285,157 Q305,138 325,157Z" fill={w(0.18)}/><circle cx="305" cy="138" r="9" fill={w(0.22)}/>
        <rect x="42" y="186" width="55" height="32" fill={w(0.10)}/>
        <rect x="323" y="186" width="55" height="32" fill={w(0.10)}/>
      </svg>
    )

    case 'Chandigarh': return (
      <svg {...props}>
        {ground}
        <rect x="206" y="135" width="8" height="83" fill={w(0.20)}/>
        <path d="M210,132 L183,108 L180,86 L189,80 L198,92 L198,68 L193,46 L203,42 L210,56 L210,42 L206,28 L215,26 L219,42 L219,56 L224,44 L230,40 L236,45 L232,62 L227,72 L236,68 L240,60 L246,65 L242,80 L229,96 L238,106 L210,132Z" fill={w(0.28)}/>
        <rect x="38" y="196" width="82" height="22" fill={w(0.12)}/><rect x="48" y="185" width="62" height="13" fill={w(0.10)}/>
        <rect x="300" y="192" width="82" height="26" fill={w(0.12)}/><rect x="310" y="179" width="62" height="15" fill={w(0.10)}/>
        {[0,1,2,3].map(i => (
          <line key={`h${i}`} x1="38" y1={215-i*12} x2="382" y2={215-i*12} stroke={w(0.05)} strokeWidth="0.8"/>
        ))}
        {[0,1,2,3,4,5,6].map(i => (
          <line key={`v${i}`} x1={52+i*50} y1="172" x2={52+i*50} y2="218" stroke={w(0.05)} strokeWidth="0.8"/>
        ))}
        {[0,60,120,180,240,300].map(a => (
          <ellipse key={a} cx="60" cy="60" rx="11" ry="24" fill={w(0.07)} transform={`rotate(${a} 60 60)`}/>
        ))}
        <circle cx="60" cy="60" r="7" fill={w(0.16)}/>
      </svg>
    )

    case 'Mysuru': return (
      <svg {...props}>
        {ground}
        <rect x="52" y="170" width="316" height="48" fill={w(0.16)}/>
        <ellipse cx="210" cy="170" rx="44" ry="46" fill={w(0.22)}/>
        <ellipse cx="210" cy="128" rx="27" ry="32" fill={w(0.26)}/>
        <circle cx="210" cy="100" r="13" fill={w(0.30)}/><rect x="206" y="84" width="8" height="20" fill={w(0.34)}/><circle cx="210" cy="82" r="5" fill={w(0.40)}/>
        {[75,345,120,300].map((x,i) => (
          <g key={i}>
            <rect x={x-13} y={[155,155,162,162][i]} width="26" height={218-[155,155,162,162][i]} fill={w(0.16)}/>
            <ellipse cx={x} cy={[155,155,162,162][i]} rx="18" ry="16" fill={w(0.20)}/>
            <ellipse cx={x} cy={[155,155,162,162][i]-13} rx="11" ry="13" fill={w(0.24)}/>
            <circle cx={x} cy={[155,155,162,162][i]-25} r="6" fill={w(0.28)}/>
          </g>
        ))}
        {[68,98,128,158,188,218,248,278,308,338].map(x => (
          <path key={x} d={`M${x},170 Q${x+15},154 ${x+30},170`} stroke={w(0.18)} strokeWidth="1.5" fill="none"/>
        ))}
        {[68,90,112,134,156,178,200,222,244,266,288,310,332,354].map(x => (
          <circle key={x} cx={x} cy="218" r="2" fill={w(0.26)}/>
        ))}
      </svg>
    )

    case 'Jodhpur': return (
      <svg {...props}>
        {ground}
        <path d="M105,218 L105,155 Q105,140 120,140 L170,135 Q195,128 210,120 Q225,128 250,135 L300,140 Q315,140 315,155 L315,218Z" fill={w(0.14)}/>
        <rect x="105" y="120" width="210" height="38" fill={w(0.16)}/>
        {[120,148,176,204,232,260,288].map(x => (
          <path key={x} d={`M${x},120 Q${x+14},110 ${x+28},120`} stroke={w(0.22)} strokeWidth="1.5" fill="none"/>
        ))}
        <rect x="130" y="88" width="160" height="35" fill={w(0.18)}/>
        {[145,175,205,235,265].map(x => (
          <path key={x} d={`M${x},88 Q${x+14},78 ${x+28},88`} stroke={w(0.24)} strokeWidth="1.5" fill="none"/>
        ))}
        <rect x="155" y="60" width="110" height="30" fill={w(0.22)}/>
        <path d="M155,60 Q210,30 265,60Z" fill={w(0.26)}/>
        <circle cx="185" cy="40" r="8" fill={w(0.28)}/><circle cx="210" cy="28" r="11" fill={w(0.32)}/><circle cx="235" cy="40" r="8" fill={w(0.28)}/>
        {[120,165,255,300].map(x => (
          <rect key={x} x={x} y="155" width="12" height="65" fill={w(0.14)}/>
        ))}
        <path d="M50,218 Q80,200 105,218Z" fill={w(0.10)}/>
        <path d="M315,218 Q340,200 370,218Z" fill={w(0.10)}/>
        <ellipse cx="210" cy="225" rx="200" ry="7" fill={w(0.07)}/>
      </svg>
    )

    case 'Srinagar': return (
      <svg {...props}>
        <rect x="0" y="200" width="420" height="40" fill={w(0.14)}/>
        <path d="M0,202 Q60,195 120,202 Q180,210 240,202 Q300,195 360,202 Q390,210 420,202 L420,218 L0,218Z" fill={w(0.09)}/>
        <path d="M55,202 L75,165 Q80,155 95,155 L115,165 L125,202Z" fill={w(0.20)}/>
        <path d="M65,160 L75,140 Q80,135 95,140 L105,160Z" fill={w(0.26)}/><circle cx="88" cy="138" r="6" fill={w(0.32)}/>
        <path d="M295,202 L315,165 Q320,155 335,155 L355,165 L365,202Z" fill={w(0.20)}/>
        <path d="M305,160 L315,140 Q320,135 335,140 L345,160Z" fill={w(0.26)}/><circle cx="328" cy="138" r="6" fill={w(0.32)}/>
        {[100,160,210,260,320].map(x => (
          <path key={x} d={`M${x-15},202 L${x-5},190 Q${x},185 ${x+5},190 L${x+15},202Z`} fill={w(0.14)}/>
        ))}
        <path d="M145,202 L158,165 Q162,152 178,152 L195,165 L200,202Z" fill={w(0.18)}/>
        <ellipse cx="172" cy="150" rx="20" ry="14" fill={w(0.16)}/><ellipse cx="172" cy="138" rx="13" ry="10" fill={w(0.22)}/>
        <path d="M220,202 L233,165 Q237,152 253,152 L270,165 L275,202Z" fill={w(0.18)}/>
        <ellipse cx="247" cy="150" rx="20" ry="14" fill={w(0.16)}/><ellipse cx="247" cy="138" rx="13" ry="10" fill={w(0.22)}/>
        <path d="M40,208 Q65,198 90,204 L88,214 L42,214Z" fill={w(0.22)}/>
        <path d="M330,210 Q355,200 380,206 L378,216 L332,216Z" fill={w(0.20)}/>
        <path d="M165,210 Q195,200 225,204 L223,214 L167,214Z" fill={w(0.18)}/>
      </svg>
    )

    case 'Shimla': return (
      <svg {...props}>
        {ground}
        <path d="M60,218 Q100,170 140,160 Q170,155 200,165 Q210,168 220,165 Q250,155 280,160 Q320,170 360,218Z" fill={w(0.10)}/>
        <rect x="148" y="130" width="124" height="88" fill={w(0.16)}/>
        <path d="M148,130 L210,88 L272,130Z" fill={w(0.20)}/>
        <rect x="165" y="88" width="90" height="44" fill={w(0.14)}/>
        <path d="M165,88 L210,55 L255,88Z" fill={w(0.22)}/>
        <rect x="196" y="55" width="28" height="36" fill={w(0.18)}/>
        <path d="M196,55 L210,35 L224,55Z" fill={w(0.24)}/>
        <rect x="205" y="28" width="10" height="12" fill={w(0.30)}/>
        <circle cx="210" cy="27" r="6" fill={w(0.36)}/>
        {[155,175,225,245].map(x => (
          <rect key={x} x={x} y="148" width="14" height="70" fill={w(0.10)}/>
        ))}
        {[160,180,218,236].map(x => (
          <path key={x} d={`M${x},148 Q${x+7},138 ${x+14},148`} stroke={w(0.16)} strokeWidth="1" fill="none"/>
        ))}
        {[108,128,292,312].map(x => (
          <g key={x}>
            <rect x={x} y="175" width="34" height="43" fill={w(0.12)}/>
            <path d={`M${x},175 L${x+17},160 L${x+34},175Z`} fill={w(0.16)}/>
          </g>
        ))}
        <path d="M20,215 Q80,195 140,210" stroke={w(0.30)} strokeWidth="2" fill="none"/>
        <path d="M280,210 Q340,195 400,215" stroke={w(0.30)} strokeWidth="2" fill="none"/>
        {[35,60,85,110,135,285,310,335,360,385].map(x => (
          <path key={x} d={`M${x},220 Q${x+10},208 ${x+20},218`} stroke={w(0.20)} strokeWidth="2.5" fill="none"/>
        ))}
      </svg>
    )

    default: return (
      <svg {...props}>
        {ground}
        <rect x="170" y="147" width="80" height="71" fill={w(0.14)}/>
        <ellipse cx="210" cy="147" rx="42" ry="44" fill={w(0.18)}/>
        <ellipse cx="210" cy="108" rx="26" ry="30" fill={w(0.22)}/>
        <circle cx="210" cy="82" r="12" fill={w(0.26)}/><rect x="206" y="66" width="8" height="18" fill={w(0.30)}/><circle cx="210" cy="64" r="5" fill={w(0.36)}/>
        <rect x="92" y="140" width="22" height="78" fill={w(0.14)}/>
        <ellipse cx="103" cy="138" rx="14" ry="16" fill={w(0.18)}/><ellipse cx="103" cy="124" rx="9" ry="11" fill={w(0.22)}/><circle cx="103" cy="114" r="5" fill={w(0.26)}/>
        <rect x="306" y="140" width="22" height="78" fill={w(0.14)}/>
        <ellipse cx="317" cy="138" rx="14" ry="16" fill={w(0.18)}/><ellipse cx="317" cy="124" rx="9" ry="11" fill={w(0.22)}/><circle cx="317" cy="114" r="5" fill={w(0.26)}/>
        <rect x="130" y="172" width="46" height="46" fill={w(0.10)}/>
        <path d="M130,172 Q153,156 176,172Z" fill={w(0.14)}/>
        <rect x="244" y="172" width="46" height="46" fill={w(0.10)}/>
        <path d="M244,172 Q267,156 290,172Z" fill={w(0.14)}/>
      </svg>
    )
  }
}

// ── C4 — City Postcard ────────────────────────────────────────────────────────
export function C4RightPanel({ snap }: { snap: Snap }) {
  const city   = snap.c_city
  const cityT  = getC4Theme(city)
  const mono  = "var(--font-jetbrains-mono),'JetBrains Mono',monospace"
  const barlow = "var(--font-barlow),'Barlow Condensed',sans-serif"
  const outfit = "var(--font-syne),'Outfit',sans-serif"

  // Colour always comes from the creator's chosen category (set in C3) so the
  // accent stays consistent through the rest of the flow — only the postcard's
  // content (tagline, landmark, stamp text, texture, tilt) stays city-specific.
  const accent = getCategoryColour(snap.c_category)
  const t: C4Theme = {
    ...cityT,
    ink:     '#1A2744',
    accent,
    artGrad: `linear-gradient(155deg, ${lighten(accent, 0.35)} 0%, ${accent} 55%, ${darken(accent, 0.35)} 100%)`,
    stampBg: lighten(accent, 0.88),
  }

  // Panel backdrop is always the shared cream — only the postcard face itself
  // carries the palette, so it always renders in its light-mode form.
  const isDark = false

  const artBg = t.artPattern
    ? `${t.artPattern}, ${t.artGrad}`
    : t.artGrad

  return (
    <div style={{
      width: '100%', height: '100%',
      position: 'relative',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 48px 40px 40px',
      overflow: 'hidden',
    }}>

      {/* Keyframes for card reveal animation */}
      <style>{`
        @keyframes c4CardReveal {
          from { opacity: 0; transform: ${t.cardRotate} scale(0.88) translateY(24px); filter: blur(3px); }
          to   { opacity: 1; transform: ${t.cardRotate}; filter: blur(0px); }
        }
      `}</style>

      {/* Postcard — key on city triggers remount → replays animation */}
      <div key={city || 'default'} style={{
        position: 'relative', width: 420, flexShrink: 0,
        background: isDark ? 'rgba(255,255,255,0.07)' : '#FFFFFF',
        boxShadow: isDark
          ? '0 24px 60px rgba(0,0,0,0.70), 0 0 0 1px rgba(255,255,255,0.07)'
          : '0 24px 48px rgba(26,39,68,0.14)',
        transform: t.cardRotate,
        overflow: 'hidden',
        animation: 'c4CardReveal 0.55s cubic-bezier(0.16, 1, 0.3, 1) both',
      }}>

        {/* Accent stripe */}
        <div style={{ height: 4, background: t.accent }} />

        {/* Artwork area */}
        <div style={{
          width: '100%', height: 240,
          backgroundImage: artBg,
          position: 'relative', overflow: 'hidden',
        }}>
          {/* City landmark SVG illustration */}
          <CityLandmark city={city} />

          {/* Bottom tagline */}
          <div style={{ position: 'absolute', bottom: 14, left: 16 }}>
            <span style={{
              fontFamily: mono, fontSize: 8,
              color: 'rgba(255,255,255,0.52)', letterSpacing: '0.30em',
              textTransform: 'uppercase',
            }}>
              {t.tagline}
            </span>
          </div>

          {/* Postal stamp */}
          <div style={{
            position: 'absolute', top: 14, right: 14,
            transform: 'rotate(-6deg)', zIndex: 10,
          }}>
            <div style={{
              width: 88, height: 88,
              background: t.stampBg,
              borderRadius: '50%',
              border: `3px solid ${t.accent}`,
              boxShadow: `0 0 0 3px rgba(0,0,0,0.12), 0 0 0 6px ${t.accent}35`,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              textAlign: 'center', padding: 8,
            }}>
              {t.stampLabel.split('\n').map((line, i) => (
                <span key={i} style={{
                  fontFamily: mono,
                  fontSize: i === 0 ? 8 : 7,
                  fontWeight: i === 0 ? 700 : 400,
                  color: isDark ? t.accent : t.ink,
                  lineHeight: 1.4, textTransform: 'uppercase',
                  letterSpacing: '0.06em', display: 'block',
                }}>
                  {line}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(26,39,68,0.08)' }} />

        {/* Footer */}
        <div style={{
          padding: '14px 16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
          background: isDark ? 'rgba(255,255,255,0.03)' : 'transparent',
        }}>
          <div>
            <p style={{
              fontFamily: mono, fontSize: 9, margin: '0 0 4px',
              color: isDark ? 'rgba(255,255,255,0.35)' : `${t.ink}80`,
              textTransform: 'uppercase', letterSpacing: '0.14em',
            }}>
              COORDINATES
            </p>
            <p style={{
              fontFamily: barlow, fontWeight: 600, fontSize: 14, margin: 0,
              letterSpacing: '0.06em',
              color: city ? t.accent : (isDark ? 'rgba(255,255,255,0.20)' : `${t.ink}40`),
            }}>
              {city ? getCityCoords(city) : 'SELECT A CITY'}
            </p>
          </div>
          <div style={{
            fontFamily: barlow, fontWeight: 700, fontSize: 10,
            color: t.accent, letterSpacing: '0.22em', textTransform: 'uppercase',
            borderTop: `2px solid ${t.accent}`, paddingTop: 3,
          }}>
            WIMC
          </div>
        </div>
      </div>

      {/* Vertical badge strip */}
      <div style={{
        position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
        background: `${t.accent}CC`,
        padding: '28px 10px',
        borderLeft: '1px solid rgba(0,0,0,0.10)',
        writingMode: 'vertical-rl' as const,
        color: isDark ? '#F0EFF8' : '#1A2744',
        zIndex: 20,
      }}>
        <span style={{
          fontFamily: barlow, fontWeight: 700, fontSize: 12,
          letterSpacing: '0.22em', textTransform: 'uppercase',
        }}>
          {t.badge}
        </span>
      </div>

      {/* Screen watermark */}
      <div style={{
        position: 'absolute', bottom: -40, right: -20,
        pointerEvents: 'none', userSelect: 'none',
        fontFamily: outfit, fontWeight: 900, fontSize: 220,
        opacity: 0.04, lineHeight: 1,
        color: isDark ? '#FFFFFF' : '#1A2744',
      }}>
        C4
      </div>
    </div>
  )
}

// ── C5 — Floating Bubbles on Dark ────────────────────────────────────────────
export function C5RightPanel({ snap }: { snap: Snap }) {
  const catId     = snap.c_category
  const catConfig = CREATOR_CATEGORIES.find(c => c.id === catId)
  const accent    = getCategoryColour(catId)
  const selected  = snap.c_subtypes
  const rawSubTypes = catConfig?.subTypes ?? []

  // POSITIONS below is sized largest-first, so ordering subtypes by real pick
  // frequency (snap.c_subtype_rank, written by C5's popularity fetch) makes
  // the most-picked subtype land in the biggest slot. Falls back to
  // definition order if the ranking hasn't loaded/written yet.
  const rank = snap.c_subtype_rank
  const allSubTypes = rank.length > 0
    ? [...rawSubTypes].sort((a, b) => rank.indexOf(a.id) - rank.indexOf(b.id))
    : rawSubTypes

  // Split at " & " and take first part; if still > 16 chars take first 2 words
  function bubbleLabel(label: string): string {
    const core = label.split(' & ')[0]
    if (core.length <= 16) return core.toUpperCase()
    return core.split(' ').slice(0, 2).join(' ').toUpperCase()
  }

  // One fixed slot per subType (up to 8)
  const POSITIONS: Array<{ size: number; delay: string; emojiPx: number; top?: string; bottom?: string; left?: string; right?: string }> = [
    { size: 270, top:    '8%',  left:  '12%', delay: '0s',   emojiPx: 68 },
    { size: 210, bottom: '8%',  right: '8%',  delay: '1.0s', emojiPx: 52 },
    { size: 185, top:    '44%', right: '18%', delay: '0.5s', emojiPx: 46 },
    { size: 165, bottom: '24%', left:  '4%',  delay: '1.5s', emojiPx: 40 },
    { size: 148, top:    '20%', right: '4%',  delay: '2.0s', emojiPx: 36 },
    { size: 155, bottom: '4%',  left:  '35%', delay: '0.7s', emojiPx: 38 },
    { size: 130, top:    '62%', right: '36%', delay: '1.2s', emojiPx: 32 },
    { size: 125, top:    '4%',  right: '34%', delay: '2.5s', emojiPx: 30 },
  ]

  return (
    <div style={{
      width: '100%', height: '100%',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* One slot per subType: lit bubble when selected, ghost ring when not */}
      {allSubTypes.map((sub, i) => {
        const cfg = POSITIONS[i]
        if (!cfg) return null
        const isSel = selected.includes(sub.id)
        const { size, delay, emojiPx, ...posStyle } = cfg
        const fontSize = Math.max(10, Math.round(size / 17))

        if (isSel) {
          return (
            <div key={sub.id} style={{
              position: 'absolute',
              width: size, height: size,
              ...posStyle,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${accent}40, ${accent}20)`,
              border: `2px solid ${accent}90`,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(12px)',
              animation: `float ${5 + i * 0.7}s ease-in-out infinite`,
              animationDelay: delay,
              boxShadow: `0 0 ${Math.round(size * 0.25)}px ${accent}25`,
            }}>
              <span style={{ fontSize: emojiPx, lineHeight: 1 }}>{sub.emoji}</span>
              <p style={{
                fontFamily: "var(--font-syne), 'Outfit', sans-serif",
                fontWeight: 900,
                fontSize,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                color: '#1A2744', margin: '6px 0 0',
                textAlign: 'center',
                padding: `0 ${Math.round(size * 0.1)}px`,
                lineHeight: 1.2,
                maxWidth: size * 0.78,
              }}>
                {bubbleLabel(sub.label)}
              </p>
            </div>
          )
        }

        return (
          <div key={sub.id} style={{
            position: 'absolute',
            width: Math.round(size * 0.55), height: Math.round(size * 0.55),
            ...posStyle,
            borderRadius: '50%',
            border: '1px solid rgba(26,39,68,0.10)',
            opacity: 0.6,
          }} />
        )
      })}

      {/* Background typography */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        pointerEvents: 'none', userSelect: 'none', overflow: 'hidden', padding: '0 48px',
      }}>
        <div style={{
          fontFamily: "var(--font-syne), 'Outfit', sans-serif",
          fontWeight: 900, lineHeight: 0.8,
          fontSize: 180, opacity: 0.04, color: '#1A2744', marginLeft: -80,
        }}>VIBE</div>
        <div style={{
          fontFamily: "var(--font-syne), 'Outfit', sans-serif",
          fontWeight: 900, lineHeight: 0.8,
          fontSize: 180, opacity: 0.06, color: accent, marginLeft: 160,
        }}>CHECK</div>
      </div>

      {/* Vertical side label */}
      <div style={{
        position: 'absolute', right: 48, top: '50%', transform: 'translateY(-50%)',
        fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
        fontSize: 12, letterSpacing: '0.4em', textTransform: 'uppercase',
        writingMode: 'vertical-rl' as const, color: `${accent}66`,
      }}>
        YOUR CREATIVE LANE
      </div>
    </div>
  )
}

// ── C6 — Floating Platform Bubbles (platform selection) ──────────────────────
export function C6RightPanel({ snap }: { snap: Snap }) {
  const accent   = getCategoryColour(snap.c_category)
  const selected = snap.c_platforms

  // icon filenames match /public/platform-icons/{file}.svg
  const PLATFORM_META: Record<string, { gradient: string; glow: string; icon: string }> = {
    instagram:  { gradient: 'linear-gradient(135deg,#E1306C,#833AB4)', glow: 'rgba(225,48,108,0.55)', icon: 'instagram'  },
    youtube:    { gradient: 'linear-gradient(135deg,#FF0000,#CC0000)', glow: 'rgba(255,0,0,0.4)',     icon: 'youtube'    },
    whatsapp:   { gradient: 'linear-gradient(135deg,#25D366,#128C7E)', glow: 'rgba(37,211,102,0.45)', icon: 'whatsapp'   },
    spotify:    { gradient: 'linear-gradient(135deg,#1DB954,#148040)', glow: 'rgba(29,185,84,0.45)',  icon: 'spotify'    },
    soundcloud: { gradient: 'linear-gradient(135deg,#FF3300,#FF7700)', glow: 'rgba(255,51,0,0.55)',   icon: 'soundcloud' },
    twitter:    { gradient: 'linear-gradient(135deg,#222222,#444444)', glow: 'rgba(255,255,255,0.15)',icon: 'x'          },
    linkedin:   { gradient: 'linear-gradient(135deg,#0A66C2,#004B93)', glow: 'rgba(10,102,194,0.5)',  icon: 'linkedin'   },
    website:    { gradient: 'linear-gradient(135deg,#5DD9D0,#3ab5ac)', glow: 'rgba(93,217,208,0.5)',  icon: 'website'    },
    telegram:   { gradient: 'linear-gradient(135deg,#0088CC,#006699)', glow: 'rgba(0,136,204,0.5)',   icon: 'telegram'   },
    substack:   { gradient: 'linear-gradient(135deg,#FF6719,#CC4400)', glow: 'rgba(255,103,25,0.5)',  icon: 'substack'   },
    behance:    { gradient: 'linear-gradient(135deg,#1769FF,#0040CC)', glow: 'rgba(23,105,255,0.5)',  icon: 'behance'    },
    github:     { gradient: 'linear-gradient(135deg,#333333,#1a1a1a)', glow: 'rgba(200,200,200,0.2)', icon: 'github'     },
  }

  // Bubbles are arranged on a ring centered in the panel — radius grows and
  // size shrinks slightly as more platforms are selected, so the cluster
  // always reads as centered rather than pinned to a fixed top-left grid.
  function getBubbleLayout(count: number): Array<{ left: number; top: number; size: number; delay: string }> {
    if (count === 0) return []
    if (count === 1) return [{ left: 50, top: 50, size: 150, delay: '0s' }]

    const radius = Math.min(34, 16 + count * 2)
    const size   = Math.max(64, 118 - count * 6)
    return Array.from({ length: count }, (_, i) => {
      const angle = (2 * Math.PI * i) / count - Math.PI / 2
      return {
        left:  50 + radius * Math.cos(angle),
        top:   50 + radius * Math.sin(angle),
        size,
        delay: `${((i * 0.35) % 2.4).toFixed(2)}s`,
      }
    })
  }

  const POSITIONS = getBubbleLayout(selected.length)

  return (
    <div style={{
      width: '100%', height: '100%',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Central hub — the ring the platform cluster orbits */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
        width: '22%', aspectRatio: '1', minWidth: 90, maxWidth: 160,
        borderRadius: '50%', border: `1px dashed ${accent}30`,
        pointerEvents: 'none',
      }} />

      {/* Floating selected platform bubbles — all of them, centered as a cluster.
          Positioning (translate -50%/-50%) lives on the outer wrapper and the
          float animation (which sets its own transform) lives on the inner
          div, since animated transform keyframes fully replace an inline
          transform rather than composing with it. */}
      {selected.map((platform, i) => {
        const meta = PLATFORM_META[platform] ?? PLATFORM_META.website
        const pos  = POSITIONS[i]
        if (!pos) return null
        const { size, delay, left, top } = pos
        return (
          <div key={platform} style={{
            position: 'absolute', width: size, height: size,
            left: `${left}%`, top: `${top}%`,
            transform: 'translate(-50%, -50%)',
          }}>
            <div style={{
              width: '100%', height: '100%',
              borderRadius: '50%',
              background: meta.gradient,
              boxShadow: `0 0 60px -8px ${meta.glow}`,
              border: '1px solid rgba(26,39,68,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'float 4s ease-in-out infinite',
              animationDelay: delay,
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/platform-icons/${meta.icon}.svg`}
                width={Math.round(size * 0.42)}
                height={Math.round(size * 0.42)}
                alt={platform}
                style={{ objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
              />
            </div>
          </div>
        )
      })}

      {/* Watermark */}
      <div style={{
        position: 'absolute', bottom: -60, right: -20,
        fontFamily: "var(--font-syne), 'Outfit', sans-serif",
        fontWeight: 900, lineHeight: 1,
        userSelect: 'none', pointerEvents: 'none',
        fontSize: 400, opacity: 0.03, color: accent,
      }}>
        06
      </div>

      {/* Status bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, width: '100%',
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 8,
        borderTop: '1px solid rgba(26,39,68,0.10)',
      }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: accent, flexShrink: 0 }} />
        <span style={{
          fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
          fontSize: 10, color: 'rgba(26,39,68,0.55)',
        }}>
          PLATFORMS_SELECTED: {selected.length}
        </span>
      </div>
    </div>
  )
}

// ── C7 — Floating Interest Bubbles, orbiting a central marker ─────────────────
// Deterministic per-tag PRNG so a given tag's size/placement roll is stable
// across re-renders — only newly (de)selected tags visibly move.
function c7Hash(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return h
}
function c7Rand(seed: number): () => number {
  let s = seed | 0
  return () => {
    s = (s + 0x6D2B79F5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface C7Bubble { id: string; x: number; y: number; size: number }

// Places one bubble per selected tag around the central marker, inside an
// ellipse that fills the panel. Angle is drawn uniformly over the full circle
// (so coverage is never biased to one side) and radius is biased outward from
// a "keep-clear" zone around the centre so bubbles read as orbiting the marker
// rather than scattered at random. Still rejection-samples for overlap, with
// bubbles shrinking as the count grows and a grid fallback if space runs out.
function layoutC7Bubbles(ids: string[], width: number, height: number, ringR: number): C7Bubble[] {
  if (!width || !height || ids.length === 0) return []
  const count    = ids.length
  const baseSize = Math.max(40, Math.min(110, 560 / Math.sqrt(count + 3)))
  const pad      = 14
  const cx = width / 2, cy = height / 2
  const rx = Math.max(1, width / 2 - pad)
  const ry = Math.max(1, height / 2 - pad)
  const placed: C7Bubble[] = []

  ids.forEach(id => {
    const rand    = c7Rand(c7Hash(id))
    const size    = Math.round(baseSize * (0.78 + rand() * 0.5))
    const minFrac = Math.min(0.92, (ringR + size / 2 + 16) / Math.max(rx, ry))
    let   spot: { x: number; y: number } | null = null

    for (let attempt = 0; attempt < 30 && !spot; attempt++) {
      const angle = rand() * Math.PI * 2
      const frac  = minFrac + rand() * (1 - minFrac)
      const rawX  = cx + Math.cos(angle) * rx * frac
      const rawY  = cy + Math.sin(angle) * ry * frac
      const x     = Math.min(width  - size / 2 - pad, Math.max(size / 2 + pad, rawX))
      const y     = Math.min(height - size / 2 - pad, Math.max(size / 2 + pad, rawY))
      const collides = placed.some(p => {
        const dx = p.x - x, dy = p.y - y
        const minDist = (p.size + size) / 2 + 8
        return dx * dx + dy * dy < minDist * minDist
      })
      if (!collides) spot = { x, y }
    }
    if (!spot) {
      // Ran out of room — fall back to the least-crowded coarse grid cell so
      // the bubble still lands somewhere sane instead of stacking exactly.
      const cols = Math.max(1, Math.floor(width / (baseSize * 0.7)))
      const idx  = placed.length
      spot = {
        x: Math.min(width  - size / 2 - pad, pad + size / 2 + (idx % cols) * (baseSize * 0.7)),
        y: Math.min(height - size / 2 - pad, pad + size / 2 + Math.floor(idx / cols) * (baseSize * 0.7)),
      }
    }
    placed.push({ id, x: spot.x, y: spot.y, size })
  })

  return placed
}

export function C7RightPanel({ snap }: { snap: Snap }) {
  const selected = snap.c_interests
  const accent   = getCategoryColour(snap.c_category)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => setDims({ w: el.clientWidth, h: el.clientHeight })
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const ringR = Math.min(dims.w, dims.h) * 0.17
  const bubbles = useMemo(
    () => layoutC7Bubbles(selected, dims.w, dims.h, ringR),
    [selected, dims.w, dims.h, ringR],
  )

  return (
    <div ref={containerRef} style={{
      width: '100%', height: '100%',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Central marker — anchors the orbiting bubbles and carries the
          creator's overall category accent (bubbles carry their own
          per-interest-category accent, see below). */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
        width: ringR * 2, height: ringR * 2,
        borderRadius: '50%', border: `1px solid ${accent}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        <div style={{
          position: 'absolute', inset: 10, borderRadius: '50%',
          border: `1.5px dashed ${accent}40`,
        }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
            fontWeight: 700, fontSize: 11, letterSpacing: '0.35em',
            color: accent, marginBottom: 6,
          }}>
            SCENE
          </div>
          <div style={{
            fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
            fontSize: 9, letterSpacing: '0.1em', color: 'rgba(26,39,68,0.45)',
          }}>
            {selected.length} SYNCED
          </div>
        </div>
      </div>

      {/* Floating bubbles for every selected scene tag — one non-overlapping,
          category-coloured slot per tag, orbiting the central marker above
          (see layoutC7Bubbles). */}
      {bubbles.map(b => {
        const tag = INTEREST_TAGS.find(t => t.id === b.id)
        if (!tag) return null
        const color = INTEREST_CATEGORY_COLORS[tag.category as InterestCategory] ?? accent
        return (
          <div key={b.id} style={{
            position: 'absolute',
            width: b.size, height: b.size,
            left: b.x - b.size / 2, top: b.y - b.size / 2,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${color}45, ${color}20)`,
            boxShadow: `0 0 40px -12px ${color}80`,
            border: `2px solid ${color}90`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(10px)',
            animation: 'float 4s ease-in-out infinite',
            animationDelay: `${(c7Hash(b.id) % 20) / 10}s`,
          }}>
            <span style={{ fontSize: b.size * 0.34, lineHeight: 1 }}>{tag.emoji}</span>
          </div>
        )
      })}

      {/* Watermark */}
      <div style={{
        position: 'absolute',
        fontFamily: "var(--font-syne), 'Outfit', sans-serif",
        fontWeight: 900, lineHeight: 1,
        userSelect: 'none', pointerEvents: 'none',
        fontSize: 500, opacity: 0.05, color: accent,
      }}>
        07
      </div>

      {/* Status bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, width: '100%',
        padding: '12px 16px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderTop: '1px solid rgba(26,39,68,0.10)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: accent }} />
          <span style={{
            fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
            fontSize: 10, opacity: 0.6,
            color: 'rgba(26,39,68,0.60)',
          }}>
            MAPPING YOUR SCENE...
          </span>
        </div>
        <span style={{
          fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
          fontSize: 10, opacity: 0.4,
          color: 'rgba(26,39,68,0.45)',
        }}>
          {selected.length} SELECTED
        </span>
      </div>
    </div>
  )
}

// ── C8 — Phone frame with live ProfilePreview ─────────────────────────────────
export function C8RightPanel({ snap }: { snap: Snap }) {
  const tp = snap.c_theme_preview
  const previewPrimary = tp?.primary ?? '#E8705A'
  const previewBg      = tp?.bg      ?? '#1A2744'
  const previewSurface = tp?.surface ?? '#FAF7F0'
  const previewText    = tp?.text    ?? '#F0EFF8'
  const previewLight   = tp?.light   ?? false

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 12,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Watermark */}
      <div style={{
        position: 'absolute', bottom: -60, right: -30,
        fontFamily: "var(--font-syne), 'Outfit', sans-serif",
        fontWeight: 900, lineHeight: 1,
        userSelect: 'none', pointerEvents: 'none',
        fontSize: 480, color: 'rgba(26,39,68,0.06)',
        letterSpacing: '-0.04em',
      }}>
        08
      </div>

      {/* Phone shell */}
      <div style={{
        width: 310, height: 590,
        borderRadius: 44,
        background: '#18171A',
        padding: 12,
        boxShadow: '0 40px 100px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,255,255,0.07)',
        position: 'relative', zIndex: 1, flexShrink: 0,
      }}>
        {/* Dynamic island pill */}
        <div style={{
          position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
          width: 86, height: 9, borderRadius: 5, background: '#000', zIndex: 10,
        }} />
        {/* Screen */}
        <div style={{
          width: '100%', height: '100%',
          borderRadius: 34, overflow: 'hidden',
        }}>
          <ProfilePreview
            displayName={snap.c_name}
            username={snap.c_username}
            city={snap.c_city}
            category={snap.c_category}
            subTypes={snap.c_subtypes}
            bio={snap.c_bio || undefined}
            socialLinks={snap.c_social_handles}
            previewPrimary={previewPrimary}
            previewBg={previewBg}
            previewSurface={previewSurface}
            previewText={previewText}
            previewLight={previewLight}
          />
        </div>
      </div>

      {/* LIVE badge */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: '#E8705A', borderRadius: 999, padding: '4px 14px',
        position: 'relative', zIndex: 1,
      }}>
        <style>{`@keyframes c8rp-pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }`}</style>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', animation: 'c8rp-pulse 2s ease-in-out infinite' }} />
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 700, color: '#fff', letterSpacing: '0.12em' }}>LIVE</span>
      </div>

      {/* URL label */}
      {snap.c_username && (
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'rgba(26,39,68,0.40)', position: 'relative', zIndex: 1 }}>
          wheninmycity.com/{snap.c_username}
        </span>
      )}
    </div>
  )
}
