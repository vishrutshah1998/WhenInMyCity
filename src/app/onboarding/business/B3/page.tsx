'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SK } from '@/lib/onboarding/session-keys'

const TEAL   = '#5DD9D0'
const AMBER  = '#F5A800'
const MONO   = "var(--font-jetbrains-mono), 'JetBrains Mono', monospace"
const BARLOW = "var(--font-barlow), 'Barlow Condensed', sans-serif"
const OUTFIT = "'Outfit', sans-serif"
const ABRIL  = "var(--font-abril), 'Abril Fatface', serif"
const DM     = "'DM Sans', sans-serif"

type PathType = 'venue' | 'brand'

const PATHS = [
  {
    id:       'venue'  as PathType,
    accent:   TEAL,
    icon:     'museum',
    label:    'SPACES & VENUES',
    heading:  'VENUE',
    desc:     'Café, rooftop, studio, gallery — creators book your space.',
    cta:      '→ Get a WIMC Venue listing',
    next:     '/onboarding/business/B2',
  },
  {
    id:       'brand' as PathType,
    accent:   AMBER,
    icon:     'corporate_fare',
    label:    'BRANDS & BUSINESSES',
    heading:  'BRAND',
    desc:     'Shop, agency, startup, D2C — reach creators and culture lovers.',
    cta:      '→ Get a WIMC brand page',
    next:     '/onboarding/business/B2',
  },
] as const

export default function B3Page() {
  const router = useRouter()
  const [selected,  setSelected]  = useState<PathType | null>(null)
  const [advancing, setAdvancing] = useState(false)
  const [hovered,   setHovered]   = useState<PathType | null>(null)

  async function handleSelect(type: PathType, next: string) {
    if (advancing) return
    setSelected(type)
    setAdvancing(true)
    try { sessionStorage.setItem(SK.b_subpath, type) } catch {}
    await new Promise<void>(r => setTimeout(r, 600))
    router.push(next)
  }

  function handleContinue() {
    if (!selected || advancing) return
    setAdvancing(true)
    try { sessionStorage.setItem(SK.b_subpath, selected) } catch {}
    router.push('/onboarding/business/B2')
  }

  return (
    <>
      <div style={{ minHeight: '100%', overflowY: 'auto', paddingTop: 20, paddingBottom: 96, paddingLeft: 24, paddingRight: 24 }}>

        <p style={{
          fontFamily:    BARLOW, fontWeight: 600, fontSize: 10,
          letterSpacing: '0.3em', textTransform: 'uppercase',
          color:         `${TEAL}99`, margin: '0 0 10px',
        }}>
          — ONE MORE THING
        </p>

        <h1 style={{
          fontFamily: ABRIL,
          fontSize:   'clamp(28px, 7vw, 44px)',
          color:      '#F0EFF8',
          lineHeight: 1.05,
          margin:     '0 0 8px',
        }}>
          Are you listing a space, or a brand?
        </h1>
        <p style={{ fontFamily: DM, fontSize: 13, color: '#9896B0', margin: '0 0 28px' }}>
          Your category shapes how creators and explorers discover you.
        </p>

        {/* Decision tiles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {PATHS.map(p => {
            const isSel   = selected === p.id
            const isOther = selected !== null && !isSel
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelect(p.id, p.next)}
                onMouseEnter={() => {
                  if (advancing) return
                  setHovered(p.id)
                  window.dispatchEvent(new CustomEvent('b3-left-hover', { detail: p.id }))
                }}
                onMouseLeave={() => {
                  setHovered(null)
                  window.dispatchEvent(new CustomEvent('b3-left-hover', { detail: null }))
                }}
                disabled={advancing && !isSel}
                style={{
                  display:        'flex',
                  flexDirection:  'column',
                  justifyContent: 'space-between',
                  width:          '100%',
                  minHeight:      128,
                  textAlign:      'left',
                  background:     isSel
                    ? `${p.accent}12`
                    : hovered === p.id
                      ? `${p.accent}08`
                      : '#09090E',
                  border:         `2px solid ${isSel ? p.accent : hovered === p.id ? p.accent + 'AA' : p.accent + '50'}`,
                  boxShadow:      isSel ? 'none' : '4px 4px 0px 0px rgba(0,0,0,1)',
                  transform:      isSel ? 'translate(4px, 4px)' : 'translate(0, 0)',
                  opacity:        isOther ? 0.30 : 1,
                  cursor:         advancing ? 'default' : 'pointer',
                  overflow:       'hidden',
                  position:       'relative',
                  padding:        0,
                  transition:     'all 180ms ease',
                }}
              >
                {/* Skewed accent strip — right side */}
                <div style={{
                  position:      'absolute',
                  right:         0, top: 0,
                  width:         128, height: '100%',
                  background:    `${p.accent}09`,
                  transform:     'skewX(-20deg) translateX(64px)',
                  pointerEvents: 'none',
                }} />

                {/* Main content */}
                <div style={{ padding: '14px 16px 8px', position: 'relative', zIndex: 1, flex: 1 }}>
                  <span style={{
                    fontFamily:    BARLOW, fontWeight: 700, fontSize: 10,
                    color:         `${p.accent}AA`, letterSpacing: '0.20em',
                    textTransform: 'uppercase', display: 'block', marginBottom: 6,
                  }}>
                    {p.label}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 26, color: p.accent }}>
                      {p.icon}
                    </span>
                    <span style={{
                      fontFamily:    OUTFIT, fontWeight: 900, fontSize: 22,
                      color:         '#F0EFF8', textTransform: 'uppercase', letterSpacing: '-0.02em',
                    }}>
                      {p.heading}
                    </span>
                  </div>
                  <p style={{ fontFamily: DM, fontSize: 12, color: 'rgba(240,239,248,0.55)', margin: 0, maxWidth: '82%', lineHeight: 1.4 }}>
                    {p.desc}
                  </p>
                </div>

                {/* Footer strip */}
                <div style={{
                  padding:    '6px 16px',
                  background: 'rgba(0,0,0,0.35)',
                  borderTop:  `1px solid ${p.accent}30`,
                  position:   'relative', zIndex: 1, flexShrink: 0,
                }}>
                  <span style={{
                    fontFamily:    MONO, fontSize: 9, color: `${p.accent}AA`,
                    letterSpacing: '0.12em', textTransform: 'uppercase',
                  }}>
                    {p.cta}
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        <p style={{ fontFamily: DM, fontSize: 13, color: 'rgba(255,255,255,0.30)', fontStyle: 'italic', margin: '20px 0 0' }}>
          Not sure? Pick the closest — you can add the other from your dashboard later.
        </p>

      </div>

      <footer style={{
        position:   'fixed', bottom: 0, left: 0, right: 0, height: 72, zIndex: 50,
        display:    'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px',
        background: 'linear-gradient(to top, var(--ob-panel-bg, #1A2744) 60%, transparent 100%)',
      }}>
        <button
          type="button"
          onClick={() => router.push('/onboarding')}
          style={{ background: 'none', border: 'none', fontFamily: DM, fontSize: 15, color: 'rgba(255,255,255,0.25)', cursor: 'pointer', padding: 0 }}
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={handleContinue}
          disabled={!selected || advancing}
          style={{
            background:    selected ? PATHS.find(p => p.id === selected)!.accent : 'rgba(255,255,255,0.08)',
            color:         selected ? '#1A2744' : 'rgba(255,255,255,0.22)',
            fontFamily:    BARLOW,
            fontWeight:    700,
            fontSize:      15,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding:       '12px 32px',
            border:        'none',
            boxShadow:     selected ? '8px 8px 0px 0px #000000' : 'none',
            cursor:        selected && !advancing ? 'pointer' : 'not-allowed',
            transition:    'all 150ms',
          }}
        >
          Continue →
        </button>
      </footer>
    </>
  )
}
