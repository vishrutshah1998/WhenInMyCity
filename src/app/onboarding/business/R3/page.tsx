'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SK } from '@/lib/onboarding/session-keys'
import { BrandNoticeAd } from '@/components/onboarding/BoardingPassArtifact'

const ACCENT = '#F5A800'
const NAVY   = '#1A2744'
const ABRIL  = "var(--font-abril), 'Abril Fatface', serif"
const MONO   = "var(--font-jetbrains-mono), 'JetBrains Mono', monospace"
const BARLOW = "var(--font-barlow), 'Barlow Condensed', sans-serif"
const DM     = "'DM Sans', sans-serif"

function BrandStepDots({ current }: { current: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>
      {Array.from({ length: 6 }, (_, i) => {
        const done   = i < current - 1
        const active = i === current - 1
        return (
          <div key={i} style={{
            width:      22, height: 8, borderRadius: 4,
            background: done || active ? ACCENT : 'rgba(255,255,255,0.10)',
            boxShadow:  active ? '0 0 10px rgba(245,168,0,0.5)' : 'none',
            transition: 'all 200ms',
          }} />
        )
      })}
      <span style={{ fontFamily: MONO, fontSize: 10, color: `${ACCENT}99`, letterSpacing: '0.10em', marginLeft: 6 }}>
        0{current} / 06
      </span>
    </div>
  )
}

const AESTHETICS = [
  {
    id:      'minimal'   as const,
    label:   'MINIMAL',
    tagline: 'Clean · Airy · Sans-serif',
    sampleBg:   'linear-gradient(135deg, #f8f8f6 0%, #ededea 100%)',
    sampleText: { primary: '#111', secondary: '#777', font: "'DM Sans', sans-serif" },
  },
  {
    id:      'brutalist' as const,
    label:   'BRUTALIST',
    tagline: 'Bold · Raw · High contrast',
    sampleBg:   'linear-gradient(135deg, #0f0f0d 0%, #1c1917 100%)',
    sampleText: { primary: '#ffffff', secondary: '#888', font: "'Outfit', sans-serif" },
  },
  {
    id:      'editorial' as const,
    label:   'EDITORIAL',
    tagline: 'Refined · Magazine · Serif',
    sampleBg:   'linear-gradient(135deg, #1A2744 0%, #0d1a35 100%)',
    sampleText: { primary: '#F0EFF8', secondary: '#9896B0', font: "var(--font-abril), serif" },
  },
  {
    id:      'tech'      as const,
    label:   'TECH',
    tagline: 'Dark · Code-inspired · Mono',
    sampleBg:   'linear-gradient(135deg, #09090E 0%, #141420 100%)',
    sampleText: { primary: ACCENT, secondary: '#5C5A72', font: "var(--font-jetbrains-mono), monospace" },
  },
] as const

type AestheticId = typeof AESTHETICS[number]['id']

export default function R3Page() {
  const router = useRouter()

  const [bName,     setBName]     = useState('')
  const [bCity,     setBCity]     = useState('')
  const [aesthetic, setAesthetic] = useState<AestheticId | ''>('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const name    = sessionStorage.getItem(SK.b_name) ?? ''
    const subpath = sessionStorage.getItem(SK.b_subpath)
    if (!name || subpath !== 'brand') { router.replace('/onboarding/business/B3'); return }
    const city = sessionStorage.getItem(SK.b_city) ?? ''
    if (!city) { router.replace('/onboarding/business/B2'); return }
    setBName(name)
    setBCity(city)
    const saved = sessionStorage.getItem(SK.r_aesthetic) as AestheticId | null
    if (saved) setAesthetic(saved)
  }, [router])

  function selectAesthetic(id: AestheticId) {
    setAesthetic(id)
    try { sessionStorage.setItem(SK.r_aesthetic, id) } catch {}
  }

  function handleNext() {
    if (!aesthetic) return
    router.push('/onboarding/business/R4')
  }

  const canProceed = aesthetic !== ''

  return (
    <>
      <div style={{
        minHeight: '100%', overflowY: 'auto',
        paddingTop: 20, paddingBottom: 96, paddingLeft: 24, paddingRight: 24,
      }}>

        <BrandNoticeAd
          name={bName || undefined}
          city={bCity || undefined}
          accent={ACCENT}
        />

        <BrandStepDots current={4} />

        <p style={{ fontFamily: MONO, fontSize: 9, color: `${ACCENT}99`, letterSpacing: '0.25em', textTransform: 'uppercase', margin: '0 0 10px' }}>
          — BRAND AESTHETIC
        </p>
        <h1 style={{
          fontFamily: ABRIL,
          fontSize:   'clamp(32px, 7vw, 44px)',
          color:      '#F0EFF8',
          lineHeight: 1.05,
          margin:     '0 0 28px',
        }}>
          What's your brand's vibe?
        </h1>

        {/* 2×2 aesthetic grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {AESTHETICS.map(a => {
            const isSel = aesthetic === a.id
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => selectAesthetic(a.id)}
                style={{
                  textAlign:  'left',
                  background: 'rgba(255,255,255,0.03)',
                  border:     `1px solid ${isSel ? `${ACCENT}50` : 'rgba(255,255,255,0.08)'}`,
                  padding:    2,
                  cursor:     'pointer',
                  transition: 'all 150ms',
                  overflow:   'hidden',
                  position:   'relative',
                  ...(isSel ? { outline: `1px solid ${ACCENT}30`, outlineOffset: '-1px' } : {}),
                }}
              >
                {/* Typography preview */}
                <div style={{
                  aspectRatio:    '3/2',
                  background:     a.sampleBg,
                  display:        'flex',
                  flexDirection:  'column',
                  justifyContent: 'center',
                  padding:        '12px 14px',
                  gap:            4,
                  filter:         isSel ? 'none' : 'grayscale(0.4)',
                  transition:     'filter 300ms',
                }}>
                  <span style={{
                    fontFamily:    a.sampleText.font,
                    fontWeight:    700,
                    fontSize:      13,
                    color:         a.sampleText.primary,
                    lineHeight:    1.2,
                    textTransform: 'uppercase',
                  }}>{bName || 'Brand Name'}</span>
                  <span style={{
                    fontFamily: a.sampleText.font,
                    fontSize:   10,
                    color:      a.sampleText.secondary,
                    lineHeight: 1.3,
                  }}>{a.tagline}</span>
                </div>

                {/* Label + selection dot */}
                <div style={{
                  display:        'flex',
                  justifyContent: 'space-between',
                  alignItems:     'center',
                  padding:        '9px 10px 8px',
                }}>
                  <span style={{
                    fontFamily:    BARLOW,
                    fontWeight:    700,
                    fontSize:      13,
                    letterSpacing: '0.10em',
                    textTransform: 'uppercase',
                    color:         isSel ? ACCENT : 'rgba(255,255,255,0.65)',
                    transition:    'color 150ms',
                  }}>{a.label}</span>
                  <div style={{
                    width:      8,
                    height:     8,
                    borderRadius: '50%',
                    border:     `1px solid ${isSel ? ACCENT : 'rgba(255,255,255,0.25)'}`,
                    background: isSel ? ACCENT : 'transparent',
                    boxShadow:  isSel ? `0 0 8px ${ACCENT}CC` : 'none',
                    transition: 'all 150ms',
                    flexShrink: 0,
                  }} />
                </div>
              </button>
            )
          })}
        </div>

      </div>

      <footer style={{
        position:   'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, height: 72,
        display:    'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px',
        background: `linear-gradient(to top, ${NAVY} 60%, transparent 100%)`,
      }}>
        <button type="button" onClick={() => router.push('/onboarding/business/R1')}
          style={{ background: 'none', border: 'none', fontFamily: DM, fontSize: 15, color: 'rgba(255,255,255,0.25)', cursor: 'pointer', padding: 0 }}>
          ← Back
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontFamily: BARLOW, fontWeight: 600, fontSize: 10, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.10em', textTransform: 'uppercase' }}>
              NODE_ID: R003-BRAND
            </span>
            <span style={{ fontFamily: MONO, fontSize: 10, color: canProceed ? ACCENT : 'rgba(255,255,255,0.20)', letterSpacing: '0.10em', textTransform: 'uppercase' }}>
              STATUS: {canProceed ? 'AESTHETIC_SET' : 'AWAITING_VIBE'}
            </span>
          </div>
          <button type="button" onClick={handleNext} disabled={!canProceed}
            style={{
              background:    canProceed ? ACCENT : 'rgba(255,255,255,0.08)',
              color:         canProceed ? NAVY : 'rgba(255,255,255,0.22)',
              fontFamily:    ABRIL, fontSize: 15, textTransform: 'uppercase',
              padding:       '12px 28px', border: 'none',
              boxShadow:     canProceed ? '8px 8px 0px 0px rgba(0,0,0,0.9)' : 'none',
              cursor:        canProceed ? 'pointer' : 'not-allowed',
              transition:    'all 150ms',
            }}>
            NEXT STEP →
          </button>
        </div>
      </footer>
    </>
  )
}
