'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { SK } from '@/lib/onboarding/session-keys'
import { WimcWordmark } from '@/components/WimcWordmark'
import { PAPER } from '@/lib/onboarding/design-tokens'

const LEFT_BG  = '#1A2744'
const RIGHT_BG = PAPER.bg
const CORAL    = '#E8705A'

const PERSONAS = [
  {
    id:        'creator'  as const,
    num:       '01',
    emoji:     '🎨',
    label:     'CREATOR',
    subtitle:  'Artists, musicians, & digital architects.',
    accent:    CORAL,
    next:      '/onboarding/creator/C2',
    watermark: 'CREATOR',
    icons: [
      { e: '🎸', x: 14, y: 22, r: -15 }, { e: '🎤', x: 54, y: 8,  r: 8  },
      { e: '📸', x: 76, y: 52, r: -5  }, { e: '🎨', x: 32, y: 62, r: 12 },
      { e: '✏️', x: 86, y: 24, r: -20 }, { e: '🎭', x: 50, y: 72, r: 5  },
      { e: '🎹', x: 8,  y: 42, r: 8   }, { e: '🖌️', x: 44, y: 36, r: -7 },
      { e: '🎼', x: 68, y: 78, r: 14  }, { e: '🎬', x: 90, y: 68, r: -10 },
      { e: '🎻', x: 22, y: 82, r: -4  }, { e: '📷', x: 58, y: 48, r: 18  },
    ],
  },
  {
    id:        'business' as const,
    num:       '02',
    emoji:     '🏢',
    label:     'ADDA / VENUE',
    subtitle:  'Cafés, rooftops, studios & creative spaces.',
    accent:    '#5DD9D0',
    next:      '/onboarding/business/B3',
    watermark: 'BUSINESS',
    icons: [
      { e: '☕', x: 20, y: 28, r: 10  }, { e: '🏠', x: 62, y: 14, r: -8  },
      { e: '🎪', x: 80, y: 56, r: 5   }, { e: '💡', x: 36, y: 66, r: -12 },
      { e: '🌿', x: 70, y: 34, r: 15  }, { e: '🎯', x: 14, y: 60, r: -5  },
      { e: '🏷️', x: 46, y: 20, r: -9  }, { e: '📊', x: 88, y: 36, r: 6   },
      { e: '🤝', x: 28, y: 78, r: 11  }, { e: '🏪', x: 54, y: 82, r: -14 },
      { e: '📦', x: 8,  y: 18, r: 7   }, { e: '🎗️', x: 74, y: 72, r: -8  },
    ],
  },
  {
    id:        'explorer' as const,
    num:       '03',
    emoji:     '📍',
    label:     'EXPLORER',
    subtitle:  'Discover live events, music, art & culture near you.',
    accent:    '#9B8FFF',
    next:      '/onboarding/explorer/E2',
    watermark: 'EXPLORER',
    icons: [
      { e: '🗺️', x: 24, y: 20, r: -10 }, { e: '✨', x: 64, y: 14, r: 12  },
      { e: '🧭', x: 80, y: 52, r: -8  }, { e: '🌟', x: 40, y: 66, r: 5   },
      { e: '🚀', x: 14, y: 56, r: 15  }, { e: '👀', x: 60, y: 38, r: -5  },
      { e: '🎟️', x: 44, y: 26, r: 9   }, { e: '🌆', x: 84, y: 74, r: -12 },
      { e: '🎉', x: 10, y: 78, r: 6   }, { e: '📍', x: 54, y: 58, r: -18 },
      { e: '🎭', x: 30, y: 44, r: 14  }, { e: '🌃', x: 72, y: 30, r: -3  },
    ],
  },
] as const

function S1Inner() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const [selected,  setSelected]  = useState<string | null>(null)
  const [hovered,   setHovered]   = useState<string | null>(null)
  const [advancing, setAdvancing] = useState(false)
  const [cityNode,  setCityNode]  = useState('NODE_IN_01')

  useEffect(() => {
    try {
      const city = sessionStorage.getItem('wimc_ob_c_city')
              || sessionStorage.getItem('wimc_ob_b_city')
              || sessionStorage.getItem('wimc_ob_e_city')
      if (city) {
        setCityNode(`NODE_${city.toUpperCase().replace(/\s+/g, '_').slice(0, 8)}_01`)
      }
    } catch {}
  }, [])

  // Deep-link: ?persona=creator/venue/explorer/brand
  // Fresh onboarding (?persona only): skip S1 entirely.
  // Add-persona (?mode=add&persona): pre-select and auto-advance so the user
  // briefly sees which persona was chosen before moving on.
  useEffect(() => {
    const p     = searchParams.get('persona')
    const isAdd = searchParams.get('mode') === 'add'
    if (!p) return

    const PERSONA_MAP: Record<string, { skValue: string; selectedId: string; freshNext: string; addNext: string }> = {
      creator:  { skValue: 'creator',  selectedId: 'creator',  freshNext: '/onboarding/creator/C2',       addNext: '/onboarding/creator/C2?mode=add' },
      explorer: { skValue: 'explorer', selectedId: 'explorer', freshNext: '/onboarding/explorer/E2',      addNext: '/onboarding/explorer/E2?mode=add' },
      venue:    { skValue: 'business', selectedId: 'business', freshNext: '/onboarding/business/B3',      addNext: '/onboarding/business/B2?mode=add&type=venue' },
      brand:    { skValue: 'business', selectedId: 'business', freshNext: '/onboarding/business/B3',      addNext: '/onboarding/business/B2?mode=add&type=brand' },
    }

    const entry = PERSONA_MAP[p]
    if (!entry) return

    try { sessionStorage.setItem(SK.persona, entry.skValue) } catch {}

    if (isAdd) {
      // Show S1 with the persona pre-selected, then navigate.
      // router.replace so the back button from the next step skips this page.
      setSelected(entry.selectedId as typeof PERSONAS[number]['id'])
      setAdvancing(true)
      setTimeout(() => router.replace(entry.addNext), 600)
    } else {
      router.replace(entry.freshNext)
    }
  }, [searchParams, router])

  function handleSelect(id: typeof PERSONAS[number]['id']) {
    if (advancing) return
    const p = PERSONAS.find(x => x.id === id)
    if (!p) return
    setSelected(id)
    setAdvancing(true)
    try { sessionStorage.setItem(SK.persona, p.id) } catch {}
    setTimeout(() => router.push(p.next), 220)
  }

  async function handleContinue() {
    if (!selected || advancing) return
    const p = PERSONAS.find(x => x.id === selected)
    if (!p) return
    setAdvancing(true)
    try { sessionStorage.setItem(SK.persona, p.id) } catch {}
    router.push(p.next)
  }

  const activeId = hovered || selected

  return (
    <div style={{ height: '100dvh', display: 'flex', overflow: 'hidden' }}>

      {/* ── LEFT PANEL ─────────────────────────────── */}
      <div className="ob-s1-left" style={{
        width: '38%', minWidth: 300,
        background: LEFT_BG,
        display: 'flex', flexDirection: 'column',
        borderRight: `1px dashed rgba(232,112,90,0.35)`,
        flexShrink: 0,
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 28px',
          borderBottom: `1px dashed rgba(232,112,90,0.25)`,
          flexShrink: 0,
        }}>
          <WimcWordmark color="white" height={26} />
          <span style={{ fontFamily: 'var(--font-jetbrains-mono), monospace', fontSize: 9, color: 'rgba(232,112,90,0.45)', letterSpacing: '0.10em' }}>
            0001-921-X&nbsp;&nbsp;|&nbsp;&nbsp;ID-8829-00
          </span>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '28px 28px 0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <p style={{ fontFamily: 'var(--font-jetbrains-mono), monospace', fontSize: 8, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(232,112,90,0.50)', margin: '0 0 18px' }}>
            WHEN IN MY CITY
          </p>
          <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 'clamp(34px, 3vw, 52px)', fontWeight: 900, color: '#F0EFF8', lineHeight: 1.05, letterSpacing: '-0.02em', margin: '0 0 28px' }}>
            Who are<br />you?
          </h1>

          {/* Identity cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {PERSONAS.map((p) => {
              const sel = selected === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelect(p.id)}
                  onMouseEnter={() => setHovered(p.id)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    background:  sel ? `${p.accent}32` : `${p.accent}0A`,
                    border:      `1px solid ${sel ? p.accent : `${p.accent}40`}`,
                    borderLeft:  `3px solid ${sel ? p.accent : `${p.accent}80`}`,
                    padding:     '13px 15px',
                    textAlign:   'left',
                    cursor:      'pointer',
                    transition:  'all 140ms ease',
                    display:     'flex',
                    alignItems:  'center',
                    gap:         10,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-jetbrains-mono), monospace', fontSize: 7.5, letterSpacing: '0.22em', color: sel ? p.accent : `${p.accent}99`, textTransform: 'uppercase', marginBottom: 5 }}>
                      IDENTITY {p.num}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                      <span style={{ fontSize: 14 }}>{p.emoji}</span>
                      <span style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontWeight: 700, fontSize: 13, color: sel ? p.accent : '#F0EFF8', letterSpacing: '0.06em' }}>
                        {p.label}
                      </span>
                    </div>
                    <p style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.36)', margin: 0, lineHeight: 1.4 }}>
                      {p.subtitle}
                    </p>
                  </div>
                  {sel && <span style={{ color: p.accent, fontSize: 13, flexShrink: 0 }}>✓</span>}
                </button>
              )
            })}
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          borderTop: `1px dashed rgba(232,112,90,0.22)`,
          padding: '12px 20px',
          display: 'flex', alignItems: 'center', gap: 10,
          flexShrink: 0,
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 15, color: 'rgba(255,255,255,0.28)' }}>person</span>
          <Link href="/signin" style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 10, color: 'rgba(255,255,255,0.32)', textDecoration: 'underline', textDecorationStyle: 'dashed', textUnderlineOffset: 3, whiteSpace: 'nowrap' }}>
            Already have a page? Sign in
          </Link>
          <div style={{ flex: 1 }} />
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{ fontFamily: 'var(--font-jetbrains-mono), monospace', fontSize: 6.5, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.18)', textTransform: 'uppercase' }}>NETWORK STATUS</div>
            <div style={{ fontFamily: 'var(--font-jetbrains-mono), monospace', fontSize: 6.5, color: 'rgba(93,217,208,0.50)', letterSpacing: '0.06em' }}>SYST_ONLINE // {cityNode}</div>
          </div>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            onClick={handleContinue}
            disabled={!selected || advancing}
            style={{
              background:  selected && !advancing ? CORAL : 'rgba(232,112,90,0.18)',
              color:       selected && !advancing ? '#ffffff' : 'rgba(232,112,90,0.35)',
              fontFamily:  'var(--font-dm-sans), sans-serif',
              fontWeight:  700, fontSize: 11,
              letterSpacing: '0.10em',
              padding:     '10px 18px',
              border:      'none',
              cursor:      selected && !advancing ? 'pointer' : 'not-allowed',
              transition:  'all 140ms',
              flexShrink:  0,
            }}
          >
            {advancing ? '...' : 'CONTINUE'}
          </button>
        </div>
      </div>

      {/* ── RIGHT PANEL ────────────────────────────── */}
      <div className="ob-s1-right" style={{
        flex: 1,
        background: RIGHT_BG,
        backgroundImage: PAPER.texture,
        position: 'relative', overflow: 'hidden',
      }}>
        {PERSONAS.map((p, i) => {
          const isActive = activeId === p.id
          return (
            <div
              key={p.id}
              onMouseEnter={() => setHovered(p.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => handleSelect(p.id)}
              style={{
                position: 'absolute', left: 0, right: 0,
                height:   '33.334%',
                top:      `${i * 33.334}%`,
                display:  'flex', alignItems: 'center', justifyContent: 'center',
                cursor:   'pointer', overflow: 'hidden',
                borderBottom: i < 2 ? '1px solid rgba(26,39,68,0.07)' : 'none',
                transition: 'background 180ms',
                background: isActive ? `${p.accent}38` : 'transparent',
              }}
            >
              {/* Emoji layer — own absolute container so z-index is unambiguous */}
              <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                {p.icons.map((ic, idx) => (
                  <span key={idx} style={{
                    position:  'absolute',
                    left:      `${ic.x}%`,
                    top:       `${ic.y}%`,
                    fontSize:  17,
                    opacity:   isActive ? 0.50 : 0.22,
                    transform: `rotate(${ic.r}deg)`,
                    transition:'opacity 180ms',
                    userSelect:'none',
                  }}>
                    {ic.e}
                  </span>
                ))}
              </div>

              {/* Watermark word — sits above emoji layer */}
              <span style={{
                fontFamily:    'var(--font-syne), Outfit, sans-serif',
                fontWeight:    900,
                fontSize:      'clamp(72px, 8.5vw, 130px)',
                color:         p.accent,
                opacity:       isActive ? 1.0 : 0.32,
                letterSpacing: '-0.03em',
                userSelect:    'none',
                pointerEvents: 'none',
                transition:    'opacity 180ms',
                whiteSpace:    'nowrap',
                position:      'relative',
                zIndex:        1,
              }}>
                {p.watermark}
              </span>
            </div>
          )
        })}

        {/* Footer tag */}
        <div style={{
          position: 'absolute', bottom: 14, left: 0, right: 0,
          textAlign: 'center',
          fontFamily: 'var(--font-jetbrains-mono), monospace',
          fontSize: 8, letterSpacing: '0.20em',
          color: 'rgba(26,39,68,0.22)', textTransform: 'uppercase',
          pointerEvents: 'none', userSelect: 'none',
        }}>
          WIMC // PHYSICAL_UTILITY_V3.0
        </div>
      </div>

      {/* Mobile: hide right panel */}
      <style>{`
        @media (max-width: 767px) {
          .ob-s1-right { display: none !important; }
          .ob-s1-left  { width: 100% !important; min-width: 0 !important; }
        }
      `}</style>
    </div>
  )
}

export default function OnboardingS1Page() {
  return (
    <Suspense>
      <S1Inner />
    </Suspense>
  )
}
