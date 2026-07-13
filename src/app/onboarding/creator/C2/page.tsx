'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SK } from '@/lib/onboarding/session-keys'
import { generateUsernameFromName } from '@/app/actions/onboarding'
import { useExistingProfileData } from '@/hooks/useExistingProfileData'
import { prefillCreatorKeys } from '@/lib/onboarding/prefill'
import { PAPER } from '@/lib/onboarding/design-tokens'

const LEFT_BG  = '#1A2744'
const RIGHT_BG = PAPER.bg
const CORAL    = '#E8705A'
const TOTAL    = 8

// ── C2 Right Panel: boarding pass card stack with mouse parallax ──────────────
function C2RightPanel({
  displayName,
  slugDisplay,
  creatorCity,
  canProceed,
  ctaLoading,
  onCta,
}: {
  displayName: string
  slugDisplay: string
  creatorCity: string
  canProceed: boolean
  ctaLoading: boolean
  onCta: () => void
}) {
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width  - 0.5) * 16
    const y = ((e.clientY - rect.top)  / rect.height - 0.5) * 10
    setOffset({ x, y })
  }

  return (
    <div
      className="ob-c2-right"
      style={{
        flex: 1,
        background: RIGHT_BG,
        position: 'relative', overflow: 'hidden',
        backgroundImage: 'linear-gradient(rgba(26,39,68,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(26,39,68,0.05) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setOffset({ x: 0, y: 0 })}
    >
      {/* Watermark */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none', userSelect: 'none', overflow: 'hidden',
      }}>
        <span style={{
          fontFamily: 'var(--font-syne), Outfit, sans-serif',
          fontWeight: 900, fontSize: 360, opacity: 0.04,
          color: '#1A2744', lineHeight: 1,
        }}>
          01
        </span>
      </div>

      {/* Card stack with mouse parallax */}
      <div style={{
        position: 'relative',
        transform: `translate(${offset.x}px, ${offset.y}px)`,
        transition: 'transform 0.2s ease-out',
      }}>
        {/* Shadow card behind */}
        <div style={{
          position: 'absolute', top: 6, left: 6,
          width: 380, height: 200,
          background: 'rgba(26,39,68,0.10)',
        }} />

        {/* Main boarding pass card */}
        <div style={{
          position: 'relative',
          width: 380,
          background: '#FAF7F0',
          borderLeft: `4px solid ${CORAL}`,
          boxShadow: '8px 8px 0px 0px #000000',
          display: 'flex',
          overflow: 'hidden',
        }}>
          {/* Left content */}
          <div style={{ flex: 1, padding: '20px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{
                fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
                fontSize: 9, color: '#1A2744', opacity: 0.50,
                textTransform: 'uppercase', letterSpacing: '0.20em',
              }}>
                SERIAL #WIMC-C-01
              </span>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#1A2744', opacity: 0.40 }}>
                qr_code_2
              </span>
            </div>

            {/* Name */}
            <div style={{ marginTop: 16 }}>
              <p style={{
                fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
                fontSize: 9, color: '#1A2744', opacity: 0.45,
                textTransform: 'uppercase', letterSpacing: '0.16em', margin: '0 0 4px',
              }}>
                NAME / IDENTITY
              </p>
              <p style={{
                fontFamily: "var(--font-barlow), 'Barlow Condensed', sans-serif",
                fontWeight: 700, fontSize: 32,
                color: CORAL, textTransform: 'uppercase',
                lineHeight: 1, margin: 0, letterSpacing: '0.02em',
                minHeight: 36,
              }}>
                {displayName.toUpperCase() || '———'}
              </p>
            </div>

            {/* Grid fields */}
            <div style={{
              marginTop: 16,
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16,
              paddingTop: 14,
              borderTop: '1px dashed rgba(26,39,68,0.18)',
            }}>
              {[
                { label: 'ROLE',       value: 'CREATOR' },
                { label: 'CLASS / VIBE', value: null    },
              ].map(f => (
                <div key={f.label}>
                  <p style={{
                    fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
                    fontSize: 8, color: '#1A2744', opacity: 0.38,
                    textTransform: 'uppercase', letterSpacing: '0.16em', margin: '0 0 3px',
                  }}>
                    {f.label}
                  </p>
                  <p style={{
                    fontFamily: "var(--font-barlow), 'Barlow Condensed', sans-serif",
                    fontWeight: 700, fontSize: 16,
                    color: f.value ? '#1A2744' : 'rgba(26,39,68,0.28)',
                    textTransform: 'uppercase', margin: 0,
                  }}>
                    {f.value || '———'}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Punch holes */}
          <div style={{
            position: 'absolute', top: '50%', left: -7,
            transform: 'translateY(-50%)',
            width: 14, height: 14, borderRadius: '50%', background: RIGHT_BG,
          }} />
          <div style={{
            position: 'absolute', top: '50%', right: -7,
            transform: 'translateY(-50%)',
            width: 14, height: 14, borderRadius: '50%', background: RIGHT_BG,
          }} />

          {/* Stub */}
          <div style={{
            width: 80,
            borderLeft: '2px dashed rgba(26,39,68,0.18)',
            padding: '12px 10px',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div style={{
              fontFamily: "var(--font-barlow), 'Barlow Condensed', sans-serif",
              fontSize: 9, fontWeight: 700,
              color: 'rgba(26,39,68,0.28)',
              textTransform: 'uppercase', letterSpacing: '0.28em',
              writingMode: 'vertical-rl',
            }}>
              GATE C01 // ONBOARDING
            </div>
            {/* Mini barcode */}
            <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 28 }}>
              {[1,2,1,3,1,2,1,1,3,1,2,1].map((w, i) => (
                <div key={i} style={{
                  width: w, height: `${50 + i * 4}%`,
                  background: 'rgba(26,39,68,0.55)',
                }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* URL hint */}
      <div style={{
        position: 'absolute', bottom: 56, left: '50%', transform: 'translateX(-50%)',
        fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
        fontSize: 11, color: '#1A2744', opacity: 0.35, whiteSpace: 'nowrap',
      }}>
        wheninmycity.com/{creatorCity ? `${creatorCity.toLowerCase()}/` : ''}{slugDisplay}
      </div>

      {/* CTA button — bottom right */}
      <div style={{
        position: 'absolute', bottom: 28, right: 36,
        zIndex: 10,
      }}>
        <button
          type="button"
          onClick={onCta}
          disabled={!canProceed || ctaLoading}
          style={{
            background:   canProceed && !ctaLoading ? CORAL : 'rgba(232,112,90,0.25)',
            color:        canProceed && !ctaLoading ? '#ffffff' : 'rgba(232,112,90,0.45)',
            fontFamily:   'var(--font-barlow), sans-serif',
            fontWeight:   700, fontSize: 16,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            padding:      '13px 28px',
            border:       'none',
            boxShadow:    canProceed && !ctaLoading ? '4px 4px 0px #1A2744' : 'none',
            cursor:       canProceed && !ctaLoading ? 'pointer' : 'not-allowed',
            display:      'flex', alignItems: 'center', gap: 8,
            transition:   'all 140ms',
          }}
        >
          {ctaLoading ? 'Building…' : 'CONTINUE'}
          {!ctaLoading && <span>→</span>}
        </button>
      </div>

      {/* C2 watermark */}
      <div style={{
        position: 'absolute', bottom: -20, right: 20,
        fontFamily: 'var(--font-syne), Outfit, sans-serif',
        fontWeight: 900, fontSize: 'clamp(56px, 8vw, 120px)',
        color: 'rgba(26,39,68,0.06)',
        letterSpacing: '-0.04em', lineHeight: 1,
        userSelect: 'none', pointerEvents: 'none',
      }}>
        C2
      </div>
    </div>
  )
}

function C2Content() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const isAddMode    = searchParams.get('mode') === 'add'
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [displayName,  setDisplayName]  = useState('')
  const [slug,         setSlug]         = useState('')
  const [creatorCity,  setCreatorCity]  = useState('')
  const [ctaLoading,   setCtaLoading]   = useState(false)

  const { data: existingData } = useExistingProfileData()

  // Pre-fill from existing profile in add-mode
  useEffect(() => {
    if (isAddMode && existingData) {
      prefillCreatorKeys(existingData)
      if (existingData.name && !displayName) setDisplayName(existingData.name)
    }
  }, [isAddMode, existingData]) // eslint-disable-line react-hooks/exhaustive-deps

  // Guard: must arrive via S1, or via add-mode (already authenticated)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!isAddMode && sessionStorage.getItem(SK.persona) !== 'creator') { router.replace('/onboarding'); return }
    if (isAddMode) {
      sessionStorage.setItem('wimc_ob_mode', 'add')
      sessionStorage.setItem(SK.persona, 'creator')
    }
    const saved = sessionStorage.getItem(SK.c_name)
    if (saved) {
      setDisplayName(saved)
      setSlug(sessionStorage.getItem(SK.c_username) || '')
    }
    const savedCity = sessionStorage.getItem(SK.c_city)
    if (savedCity) setCreatorCity(savedCity)
  }, [router, isAddMode])

  const updateSlug = useCallback((name: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!name.trim()) { setSlug(''); return }
    debounceRef.current = setTimeout(async () => {
      const u = await generateUsernameFromName(name)
      setSlug(u)
    }, 800)
  }, [])

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setDisplayName(v)
    updateSlug(v)
  }

  async function handleContinue() {
    if (!canProceed || ctaLoading) return
    setCtaLoading(true)
    const username = slug || await generateUsernameFromName(displayName)
    try {
      sessionStorage.setItem(SK.c_name,     displayName)
      sessionStorage.setItem(SK.c_username, username)
    } catch {}
    router.push('/onboarding/creator/C3')
  }

  const canProceed  = displayName.trim().length >= 2
  const slugDisplay = slug || (displayName.trim() ? '…' : 'yourname')

  return (
    <div style={{ height: '100dvh', display: 'flex', overflow: 'hidden' }}>

      {/* ── LEFT PANEL ───────────────────────────────── */}
      <div className="ob-c2-left" style={{
        width: '40%', minWidth: 300,
        background: LEFT_BG,
        display: 'flex', flexDirection: 'column',
        borderRight: `1px dashed rgba(232,112,90,0.32)`,
        flexShrink: 0,
        overflow: 'hidden',
      }}>

        {/* ── Boarding pass stub ─── */}
        <div style={{
          margin: '20px 24px 0',
          background: 'rgba(9,9,14,0.60)',
          border: `1px solid rgba(232,112,90,0.20)`,
          borderLeft: `3px solid ${CORAL}`,
          flexShrink: 0,
          overflow: 'hidden',
        }}>
          {/* Stub header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 12px',
            borderBottom: '1px solid rgba(232,112,90,0.12)',
            background: 'rgba(232,112,90,0.06)',
          }}>
            <span style={{ fontFamily: 'var(--font-jetbrains-mono), monospace', fontSize: 8, fontWeight: 700, letterSpacing: '0.22em', color: 'rgba(232,112,90,0.70)', textTransform: 'uppercase' }}>
              SERIAL #WIMC-C-01
            </span>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'rgba(232,112,90,0.45)' }}>qr_code</span>
          </div>

          {/* Stub fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid rgba(232,112,90,0.08)' }}>
            {[
              { label: 'NAME', value: displayName || null, accent: true },
              { label: 'CITY', value: null,         accent: false },
              { label: 'ROLE', value: null,         accent: false },
              { label: 'VIBE', value: null,         accent: false },
            ].map((f, i) => (
              <div key={f.label} style={{
                padding: '7px 10px',
                borderRight: i % 2 === 0 ? '1px solid rgba(232,112,90,0.08)' : 'none',
                borderBottom: i < 2 ? '1px solid rgba(232,112,90,0.06)' : 'none',
              }}>
                <div style={{ fontFamily: 'var(--font-jetbrains-mono), monospace', fontSize: 6.5, letterSpacing: '0.22em', color: 'rgba(232,112,90,0.45)', textTransform: 'uppercase', marginBottom: 3 }}>
                  {f.label}
                </div>
                {f.value ? (
                  <div style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 11, fontWeight: 700, color: CORAL, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f.value}
                  </div>
                ) : (
                  <div style={{ fontFamily: 'var(--font-jetbrains-mono), monospace', fontSize: 10, color: 'rgba(255,255,255,0.18)' }}>——</div>
                )}
              </div>
            ))}
          </div>

          {/* Barcode strip */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '6px 10px', gap: 8 }}>
            <div style={{ display: 'flex', gap: 2, height: 16, alignItems: 'center', opacity: 0.35 }}>
              {[3,1,5,1,2,1,4,1,3,1,2,1,5,1,3].map((w, i) => (
                <div key={i} style={{ width: w, height: '100%', background: '#F0EFF8' }} />
              ))}
            </div>
            <span style={{ fontFamily: 'var(--font-jetbrains-mono), monospace', fontSize: 6, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.20)', textTransform: 'uppercase', marginLeft: 'auto' }}>
              STATE C01 // ONBOARDING
            </span>
          </div>
        </div>

        {/* ── Progress dots ─── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '16px 24px 0', flexShrink: 0 }}>
          {Array.from({ length: TOTAL }, (_, i) => (
            <div key={i} style={{
              width: i === 0 ? 18 : 6, height: 6, borderRadius: 3,
              background: i === 0 ? CORAL : 'rgba(255,255,255,0.15)',
              transition: 'all 200ms',
              flexShrink: 0,
            }} />
          ))}
          <span style={{ fontFamily: 'var(--font-jetbrains-mono), monospace', fontSize: 9, color: 'rgba(232,112,90,0.55)', marginLeft: 6, letterSpacing: '0.1em' }}>
            1 / {TOTAL}
          </span>
        </div>

        {/* ── Form content ─── */}
        <div style={{ flex: 1, padding: '20px 24px 0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <p style={{ fontFamily: 'var(--font-jetbrains-mono), monospace', fontSize: 8, letterSpacing: '0.24em', color: 'rgba(232,112,90,0.55)', textTransform: 'uppercase', margin: '0 0 14px' }}>
            — WHAT SHOULD WE CALL YOU?
          </p>
          <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 'clamp(28px, 2.6vw, 44px)', fontWeight: 900, color: '#F0EFF8', lineHeight: 1.05, letterSpacing: '-0.02em', margin: '0 0 24px' }}>
            Your name.<br />Your stage.
          </h1>

          {/* Input field */}
          <div style={{
            border: `1px solid rgba(232,112,90,0.25)`,
            borderLeft: `3px solid ${CORAL}`,
            background: 'rgba(9,9,14,0.50)',
            marginBottom: 12,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '6px 12px',
              borderBottom: '1px solid rgba(232,112,90,0.10)',
              background: 'rgba(232,112,90,0.05)',
            }}>
              <span style={{ fontFamily: 'var(--font-jetbrains-mono), monospace', fontSize: 7.5, letterSpacing: '0.18em', color: 'rgba(232,112,90,0.55)', textTransform: 'uppercase' }}>
                YOUR NAME
              </span>
              <span style={{ fontFamily: 'var(--font-jetbrains-mono), monospace', fontSize: 7.5, color: 'rgba(232,112,90,0.35)', letterSpacing: '0.06em' }}>
                wheninmycity.com/{creatorCity ? `${creatorCity.toLowerCase()}/` : ''}{slugDisplay}
              </span>
            </div>
            <input
              type="text"
              value={displayName}
              onChange={handleNameChange}
              onKeyDown={e => { if (e.key === 'Enter') handleContinue() }}
              placeholder="Your name or stage name"
              autoComplete="off"
              autoFocus
              style={{
                width:       '100%',
                background:  'transparent',
                border:      'none',
                outline:     'none',
                fontFamily:  'var(--font-playfair), "Playfair Display", serif',
                fontWeight:  700,
                fontSize:    'clamp(18px, 1.8vw, 26px)',
                color:       '#F0EFF8',
                caretColor:  CORAL,
                padding:     '12px 12px',
                letterSpacing: '-0.01em',
              }}
            />
          </div>
          <p style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0 }}>
            Your name as you want to appear on your page.
          </p>
        </div>

        {/* ── Footer ─── */}
        <div style={{
          borderTop: `1px dashed rgba(232,112,90,0.20)`,
          padding: '12px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <button type="button" onClick={() => router.push('/onboarding')}
            style={{ background: 'none', border: 'none', fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.28)', cursor: 'pointer', padding: 0 }}>
            ← Back
          </button>
          {/* Mobile-only CTA — right panel is hidden on mobile so Continue lives here */}
          <button
            type="button"
            className="ob-c2-left-cta"
            onClick={handleContinue}
            disabled={!canProceed || ctaLoading}
            style={{
              background:    canProceed && !ctaLoading ? CORAL : 'rgba(232,112,90,0.18)',
              color:         canProceed && !ctaLoading ? '#ffffff' : 'rgba(232,112,90,0.35)',
              fontFamily:    'var(--font-dm-sans), sans-serif',
              fontWeight:    700, fontSize: 13,
              letterSpacing: '0.08em',
              padding:       '9px 20px',
              border:        'none',
              boxShadow:     canProceed && !ctaLoading ? '3px 3px 0px #000000' : 'none',
              cursor:        canProceed && !ctaLoading ? 'pointer' : 'not-allowed',
              transition:    'all 140ms',
            }}
          >
            {ctaLoading ? 'Building…' : 'Continue →'}
          </button>
        </div>
      </div>

      {/* ── RIGHT PANEL ──────────────────────────────── */}
      <C2RightPanel
        displayName={displayName}
        slugDisplay={slugDisplay}
        creatorCity={creatorCity}
        canProceed={canProceed}
        ctaLoading={ctaLoading}
        onCta={handleContinue}
      />

      {/* Mobile: collapse to single column */}
      <style>{`
        @media (max-width: 767px) {
          .ob-c2-right { display: none !important; }
          .ob-c2-left  { width: 100% !important; min-width: 0 !important; }
        }
        @media (min-width: 768px) {
          .ob-c2-left-cta { display: none !important; }
        }
        .ob-c2-left input::placeholder { color: rgba(255,255,255,0.20); }
      `}</style>
    </div>
  )
}

export default function C2Page() {
  return (
    <Suspense>
      <C2Content />
    </Suspense>
  )
}
