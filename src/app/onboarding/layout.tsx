'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { WimcLogo } from '@/components/WimcLogo'
import { motion } from 'framer-motion'

const E = [0.22, 1, 0.36, 1] as const

// ---------------------------------------------------------------------------
// Route → step index mapping (0-based)
// ---------------------------------------------------------------------------

const STEP_ROUTES = [
  '/onboarding/screen-1', // 0  NAME
  '/onboarding/screen-2', // 1  PERSONA
  '/onboarding/screen-3', // 2  CATEGORY
  '/onboarding/screen-4', // 3  CITY
  '/onboarding/screen-5', // 4  VIBE
  '/onboarding/screen-6', // 5  INTERESTS
  '/onboarding/screen-7', // 6  PLATFORMS
  '/onboarding/reveal',   // 7  REVEAL
  '/onboarding/polish',   // 8  POLISH
  '/onboarding/complete', // 9  DONE (not shown in progress bar)
] as const

const STEP_ACCENTS = [
  '#E8705A', '#E8705A', '#E8705A', // screen-1, 2, 3
  '#F5A800', '#F5A800',             // screen-4, 5
  '#5DD9D0', '#5DD9D0',             // screen-6, 7
  '#9B8FFF', '#9B8FFF',             // reveal, polish
  '#4ADE80',                        // complete
] as const

const STEP_LABELS = [
  'NAME', 'PERSONA', 'CATEGORY', 'CITY', 'VIBE',
  'INTERESTS', 'PLATFORMS', 'REVEAL', 'POLISH', 'DONE',
] as const

// Number of steps shown in the progress bar (excludes /complete)
const PROGRESS_STEPS = 9

// ---------------------------------------------------------------------------
// Shared data types
// ---------------------------------------------------------------------------

interface BoardingPassData {
  name: string
  role: string
  cat: string
  city: string
}

const CAT_LABELS: Record<string, string> = {
  music:                  'Music',
  comedy_theatre:         'Comedy',
  art_design:             'Art',
  video_content:          'Video',
  teaching_coaching:      'Education',
  lifestyle_wellness:     'Lifestyle',
  business_brand:         'Business',
  professional_portfolio: 'Portfolio',
  community_impact:       'Community',
  exploring:              'Explorer',
}

const ROLE_LABELS: Record<string, string> = {
  creator:   'Creator',
  business:  'Business',
  exploring: 'Explorer',
}

function readBoardingPassData(): BoardingPassData {
  try {
    const s1   = JSON.parse(sessionStorage.getItem('wimc_s1') || 'null') as
      { displayName?: string; creatorType?: string } | null
    const city = sessionStorage.getItem('wimc_city') ?? ''
    const role = sessionStorage.getItem('wimc_role') ?? ''

    return {
      name: s1?.displayName ?? '',
      role: ROLE_LABELS[role] ?? '',
      cat:  CAT_LABELS[s1?.creatorType ?? ''] ?? '',
      city,
    }
  } catch {
    return { name: '', role: '', cat: '', city: '' }
  }
}

// ---------------------------------------------------------------------------
// Mini boarding pass — mobile only
// ---------------------------------------------------------------------------

function MiniBoardingPass({
  accent,
  stepIndex,
  pathname,
}: {
  accent: string
  stepIndex: number
  pathname: string
}) {
  const [data, setData] = useState<BoardingPassData>({
    name: '', role: '', cat: '', city: '',
  })

  useEffect(() => {
    setData(readBoardingPassData())
  }, [pathname])

  useEffect(() => {
    function onStorage() { setData(readBoardingPassData()) }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const EMPTY = '——'
  const showRow2 = stepIndex >= 1

  return (
    <div
      style={{
        width: '100%',
        position: 'relative',
        background: `${accent}08`,
        borderBottom: `1px solid ${accent}18`,
        overflow: 'hidden',
        flexShrink: 0,
        zIndex: 2,
      }}
    >
      {/* Left accent bar */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: accent, opacity: 0.6 }} />

      {/* Top chrome strip */}
      <div
        style={{
          height: 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px 0 12px',
          borderBottom: `1px solid ${accent}12`,
          background: `linear-gradient(90deg, ${accent}10 0%, transparent 60%)`,
        }}
      >
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 7, fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase', color: `${accent}70` }}>
          WIMC·PASS
        </span>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 7, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: `${accent}50` }}>
          CULTURE PASS
        </span>
      </div>

      {/* Row 1: PASSENGER + ROLE */}
      <div style={{ display: 'flex', padding: '6px 16px 0 12px', alignItems: 'flex-end', gap: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 6.5, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: `${accent}60`, display: 'block', lineHeight: 1, marginBottom: 2 }}>
            PASSENGER
          </span>
          <span
            style={{
              fontFamily: 'var(--font-syne)',
              fontSize: data.name ? 14 : 11,
              fontWeight: 900,
              color: data.name ? '#F0EFF8' : '#3C3A52',
              lineHeight: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'block',
              letterSpacing: data.name ? '-0.01em' : '0',
            }}
          >
            {data.name || EMPTY}
          </span>
        </div>
        <div style={{ flexShrink: 0, textAlign: 'right', paddingLeft: 12, borderLeft: `1px solid ${accent}14`, marginLeft: 12 }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 6.5, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: `${accent}60`, display: 'block', lineHeight: 1, marginBottom: 2 }}>
            ROLE
          </span>
          <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 11, fontWeight: 700, color: data.role ? '#F0EFF8' : '#3C3A52', lineHeight: 1 }}>
            {data.role || EMPTY}
          </span>
        </div>
      </div>

      {/* Row 2: CAT + CITY */}
      {showRow2 && (
        <div style={{ display: 'flex', padding: '5px 16px 7px 12px', gap: 0 }}>
          {[
            { label: 'CAT',  value: data.cat },
            { label: 'CITY', value: data.city },
          ].map((f, i) => (
            <div key={f.label} style={{ flex: 1, paddingLeft: i > 0 ? 10 : 0, borderLeft: i > 0 ? `1px solid ${accent}12` : 'none', marginLeft: i > 0 ? 10 : 0 }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 6.5, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: `${accent}55`, display: 'block', lineHeight: 1, marginBottom: 2 }}>
                {f.label}
              </span>
              <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 10, fontWeight: 700, color: f.value ? '#F0EFF8' : '#3C3A52', lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                {f.value || EMPTY}
              </span>
            </div>
          ))}
        </div>
      )}
      {!showRow2 && <div style={{ height: 7 }} />}

      {/* Perforated bottom */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          height: 4,
          backgroundImage: `radial-gradient(circle, ${accent}55 1px, transparent 1px)`,
          backgroundSize: '6px 4px',
          backgroundRepeat: 'repeat-x',
          backgroundPosition: '0 100%',
        }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Desktop left panel — boarding pass preview
// ---------------------------------------------------------------------------

function DesktopLeftPanel({
  accent,
  stepIndex,
  pathname,
}: {
  accent: string
  stepIndex: number
  pathname: string
}) {
  const [data, setData] = useState<BoardingPassData>({ name: '', role: '', cat: '', city: '' })

  useEffect(() => {
    setData(readBoardingPassData())
  }, [pathname])

  useEffect(() => {
    function onStorage() { setData(readBoardingPassData()) }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const EMPTY = '——'
  const flightNo   = `WM-${String(Math.max(stepIndex + 1, 1)).padStart(3, '0')}`
  const stepLabel  = stepIndex >= 0 ? STEP_LABELS[stepIndex] : 'BOARDING'

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 36px',
        gap: 24,
        overflow: 'hidden',
      }}
    >
      {/* Header label */}
      <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 20, height: 2, background: accent }} />
        <span
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.3em',
            color: `${accent}80`,
            textTransform: 'uppercase',
          }}
        >
          WHEN IN MY CITY
        </span>
      </div>

      {/* Large boarding pass card */}
      <motion.div
        key={accent}
        initial={{ opacity: 0.7, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: E }}
        style={{
          width: '100%',
          maxWidth: 380,
          background: '#09090E',
          border: `1px solid ${accent}22`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Left accent bar */}
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: accent, opacity: 0.65 }} />

        {/* Header strip */}
        <div
          style={{
            height: 30,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px 0 16px',
            background: `linear-gradient(90deg, ${accent}14 0%, transparent 60%)`,
            borderBottom: `1px solid ${accent}18`,
          }}
        >
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, fontWeight: 700, letterSpacing: '0.28em', color: `${accent}80`, textTransform: 'uppercase' }}>
            WHEN IN MY CITY
          </span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', color: `${accent}55`, textTransform: 'uppercase' }}>
            CULTURE PASS
          </span>
        </div>

        {/* Passenger */}
        <div style={{ padding: '20px 20px 0 20px' }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, fontWeight: 700, letterSpacing: '0.22em', color: `${accent}55`, display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
            PASSENGER
          </span>
          <span
            style={{
              fontFamily: 'var(--font-syne)',
              fontSize: data.name ? 30 : 22,
              fontWeight: 900,
              color: data.name ? '#F0EFF8' : '#2A2840',
              lineHeight: 1,
              display: 'block',
              letterSpacing: '-0.01em',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              transition: 'font-size 0.3s ease, color 0.3s ease',
            }}
          >
            {data.name ? data.name.toUpperCase() : 'YOUR NAME'}
          </span>
        </div>

        {/* Fields grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            borderTop: `1px solid ${accent}12`,
            margin: '16px 20px 0',
            paddingTop: 14,
            paddingBottom: 16,
            gap: 12,
          }}
        >
          {[
            { label: 'DESTINATION', value: data.city ? data.city.toUpperCase() : EMPTY, active: !!data.city },
            { label: 'ROLE',        value: data.role ? data.role.toUpperCase() : EMPTY, active: !!data.role },
            { label: 'CLASS',       value: data.cat  ? data.cat.toUpperCase()  : EMPTY, active: !!data.cat  },
            { label: 'FLIGHT',      value: flightNo,                                    active: true        },
          ].map((f, i) => (
            <div
              key={f.label}
              style={{
                paddingLeft: i % 2 === 1 ? 12 : 0,
                borderLeft:  i % 2 === 1 ? `1px solid ${accent}12` : 'none',
              }}
            >
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 7, fontWeight: 700, letterSpacing: '0.22em', color: `${accent}55`, display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>
                {f.label}
              </span>
              <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 13, fontWeight: 700, color: f.active ? '#F0EFF8' : '#2A2840', lineHeight: 1, transition: 'color 0.3s ease' }}>
                {f.value}
              </span>
            </div>
          ))}
        </div>

        {/* Perforated tear line */}
        <div style={{ position: 'relative', height: 16, margin: '0 0 0' }}>
          <div style={{ position: 'absolute', left: 20, right: 20, top: 8, borderTop: `1px dashed ${accent}30` }} />
          <div style={{ position: 'absolute', left: 4,  top: 0, width: 16, height: 16, borderRadius: '50%', background: '#010109', border: `1px solid ${accent}12` }} />
          <div style={{ position: 'absolute', right: 4, top: 0, width: 16, height: 16, borderRadius: '50%', background: '#010109', border: `1px solid ${accent}12` }} />
        </div>

        {/* Stub: pass ID + barcode */}
        <div style={{ padding: '10px 20px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 7, fontWeight: 700, letterSpacing: '0.22em', color: `${accent}55`, display: 'block', marginBottom: 3, textTransform: 'uppercase' }}>
              PASS ID
            </span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, color: `${accent}80` }}>
              {flightNo}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1.5, opacity: 0.28 }}>
            {[3, 1, 2, 1, 3, 2, 1, 2, 1, 3, 2, 1, 3, 1].map((w, i) => (
              <div key={i} style={{ width: w * 1.5, height: 26, background: accent, flexShrink: 0 }} />
            ))}
          </div>
        </div>
      </motion.div>

      {/* Step label */}
      <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 16, height: 2, background: accent, opacity: 0.5 }} />
        <span
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.2em',
            color: `${accent}55`,
            textTransform: 'uppercase',
          }}
        >
          {stepIndex >= 0 ? `STEP ${stepIndex + 1} · ${stepLabel}` : 'CULTURE PASS · INDIA'}
        </span>
      </div>

      {/* City marquee + footer */}
      <div style={{ marginTop: 'auto', width: '100%', paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.2em',
            color: 'rgba(255,255,255,0.1)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          INDORE · JAIPUR · BHOPAL · KOCHI · CHANDIGARH · MYSURU · PUNE · SURAT · VADODARA · NAGPUR
        </div>
        <div
          style={{
            marginTop: 8,
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 8,
            fontWeight: 700,
            letterSpacing: '0.25em',
            color: 'rgba(255,255,255,0.07)',
          }}
        >
          WHEN IN MY CITY · CULTURE PASS · INDIA · 2025
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const stepIndex  = STEP_ROUTES.findIndex((r) => pathname.startsWith(r))
  const isComplete = pathname.includes('/complete')
  const isWelcome  = pathname === '/onboarding'
  const showProgress     = !isComplete && !isWelcome && stepIndex >= 0
  const showBoardingPass = stepIndex >= 0 && !isComplete
  const accent     = stepIndex >= 0 ? STEP_ACCENTS[stepIndex] : '#E8705A'

  return (
    <div
      className="font-body flex flex-col"
      style={{
        height: '100dvh',
        overflow: 'hidden',
        position: 'relative',
        background: '#07070A',
        color: '#F0EFF8',
      }}
    >
      {/* Noise grain */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none select-none"
        style={{
          zIndex: 0,
          opacity: 0.028,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: '200px 200px',
        }}
      />

      {/* Ambient blob */}
      <div aria-hidden className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div
          style={{
            position: 'absolute',
            top: '-15%', right: '-5%',
            width: 500, height: 500,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${accent}12 0%, transparent 65%)`,
            transition: 'background 0.6s ease',
          }}
        />
      </div>

      {/* Nav */}
      <motion.nav
        className="relative flex items-center justify-between shrink-0"
        style={{
          padding: '12px 20px',
          zIndex: 50,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(7,7,10,0.85)',
          backdropFilter: 'blur(14px)',
          height: 56,
        }}
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: E }}
      >
        <Link href="/"><WimcLogo color="white" size="sm" /></Link>

        {/* 9-step progress dots */}
        {showProgress && (
          <div className="flex items-center gap-1.5">
            {Array.from({ length: PROGRESS_STEPS }).map((_, i) => {
              const done    = i < stepIndex
              const current = i === stepIndex
              const a       = STEP_ACCENTS[i]
              return (
                <motion.div
                  key={i}
                  style={{
                    width: current ? 22 : 8,
                    height: 8,
                    borderRadius: 4,
                    background: done ? a : current ? a : 'rgba(255,255,255,0.12)',
                    opacity: done ? 0.55 : current ? 1 : 0.3,
                    transition: 'all 0.4s cubic-bezier(0.22,1,0.36,1)',
                  }}
                />
              )
            })}
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: `${accent}88`,
                marginLeft: 6,
              }}
            >
              {stepIndex + 1} / {PROGRESS_STEPS}
            </span>
          </div>
        )}

        <div style={{ width: 60 }} />
      </motion.nav>

      {/* Content area: single column on mobile/tablet, split on desktop */}
      <div
        className={`flex-1 flex ${!isComplete ? 'lg:grid lg:grid-cols-[45%_55%]' : ''}`}
        style={{ minHeight: 0, position: 'relative', zIndex: 1 }}
      >
        {/* Desktop left panel — hidden below lg, not rendered for /complete */}
        {!isComplete && (
          <div
            className="hidden lg:flex flex-col"
            style={{
              overflow: 'hidden',
              borderRight: '1px solid rgba(255,255,255,0.05)',
              background: '#07070A',
            }}
          >
            <DesktopLeftPanel
              accent={accent}
              stepIndex={stepIndex}
              pathname={pathname}
            />
          </div>
        )}

        {/* Right panel — ticket stage */}
        <div
          className="flex-1 flex p-3 md:p-7 lg:p-4"
          style={{ background: '#010109' }}
        >
          {/* Ticket body */}
          <div
            style={{
              position: 'relative',
              flex: 1,
              borderRadius: 18,
              overflow: 'hidden',
              boxShadow: '0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.07)',
              background: '#09090E',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Stamp watermark */}
            <div
              aria-hidden
              style={{
                position: 'absolute',
                bottom: 20, right: 20,
                width: 240, height: 240,
                backgroundImage: "url('/logo.png')",
                backgroundSize: '494% auto',
                backgroundPosition: '49.96% 50.02%',
                backgroundRepeat: 'no-repeat',
                filter: 'invert(1)',
                opacity: 0.055,
                transform: 'rotate(-8deg)',
                pointerEvents: 'none',
                userSelect: 'none',
                zIndex: 1,
              }}
            />

            {/* Accent border glow */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                border: `1px solid ${accent}22`,
                borderRadius: 'inherit',
                zIndex: 20,
                pointerEvents: 'none',
                transition: 'border-color 0.5s ease',
              }}
            />

            {/* Top header strip */}
            <div
              style={{
                position: 'absolute',
                top: 0, left: 0, right: 0,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 24px',
                background: `linear-gradient(90deg, ${accent}10 0%, transparent 60%)`,
                borderBottom: `1px solid ${accent}16`,
                zIndex: 18,
                pointerEvents: 'none',
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: 7,
                  fontWeight: 700,
                  letterSpacing: '0.28em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.2)',
                }}
              >
                WHEN IN MY CITY
              </span>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: 7,
                  fontWeight: 600,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: `${accent}60`,
                }}
              >
                ONBOARDING PASS
              </span>
            </div>

            {/* Left accent bar */}
            <div
              style={{
                position: 'absolute',
                top: 32, left: 0, bottom: 0,
                width: 3,
                background: accent,
                opacity: 0.5,
                zIndex: 18,
                pointerEvents: 'none',
                transition: 'background 0.5s ease',
              }}
            />

            {/* Content column — below the 32px header strip */}
            <div
              style={{
                paddingTop: 32,
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {/* Mini boarding pass — screen-1 through polish, mobile only */}
              {showBoardingPass && (
                <div className="lg:hidden">
                  <MiniBoardingPass
                    accent={accent}
                    stepIndex={stepIndex}
                    pathname={pathname}
                  />
                </div>
              )}

              {/* Scrollable screen content */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop CTA footer positioning */}
      <style>{`
        @media (min-width: 1024px) {
          .ob-cta-footer { left: 45%; }
        }
      `}</style>

      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
      />
      <style>{`.material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }`}</style>
    </div>
  )
}
