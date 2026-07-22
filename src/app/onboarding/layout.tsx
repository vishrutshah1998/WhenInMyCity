'use client'

import { usePathname } from 'next/navigation'
import { ONBOARDING, PAPER } from '@/lib/onboarding/design-tokens'
import SplitRightPanel from '@/components/onboarding/SplitRightPanel'
import { WimcWordmark } from '@/components/WimcWordmark'

// ── Step configuration per path ───────────────────────────────────────────────
const STEP_MAP: Record<string, { total: number; current: number }> = {
  '/onboarding/creator/C2': { total: 7, current: 1 },
  '/onboarding/creator/C3': { total: 7, current: 2 },
  '/onboarding/creator/C4': { total: 7, current: 3 },
  '/onboarding/creator/C5': { total: 6, current: 4 },
  '/onboarding/creator/C6': { total: 6, current: 5 },
  '/onboarding/creator/C8': { total: 6, current: 6 },
  '/onboarding/explorer/E2': { total: 6, current: 1 },
  '/onboarding/explorer/E3': { total: 6, current: 2 },
  '/onboarding/explorer/E4': { total: 6, current: 3 },
  '/onboarding/explorer/E5': { total: 6, current: 4 },
  '/onboarding/explorer/E6': { total: 6, current: 5 },
  '/onboarding/explorer/E7': { total: 6, current: 6 },
  // Business paths both have 6 steps: B2(1) B3(2) then V4→V6→V7→V8 or R1→R3→R4→R5
  '/onboarding/business/B2': { total: 6, current: 1 },
  '/onboarding/business/B3': { total: 6, current: 2 },
  '/onboarding/business/V4': { total: 6, current: 3 },
  '/onboarding/business/V5': { total: 6, current: 4 }, // redirect stub → V6
  '/onboarding/business/V6': { total: 6, current: 4 },
  '/onboarding/business/V7': { total: 6, current: 5 },
  '/onboarding/business/V8': { total: 6, current: 6 },
  '/onboarding/business/R1': { total: 6, current: 3 },
  '/onboarding/business/R2': { total: 6, current: 4 }, // redirect stub → R3
  '/onboarding/business/R3': { total: 6, current: 4 },
  '/onboarding/business/R4': { total: 6, current: 5 },
  '/onboarding/business/R5': { total: 6, current: 6 },
}

// Step-progress chrome is deliberately persona/category-agnostic — a single
// passive tone so it never fights with whatever accent the page content is
// using (e.g. the creator's chosen category colour).
const STEP_ACCENT = '#9896B0'

// ── S1 and C2 own their full-viewport split — layout wraps everything else ───
// Final steps (preview/confirmation pages) are also full-bleed so the left
// nav panel is absent and the page content fills the whole viewport.
const FULL_BLEED = new Set([
  '/onboarding',
  '/onboarding/creator/C2',
  '/onboarding/creator/C8',
  '/onboarding/explorer/E7',
  '/onboarding/business/R5',
])

const LEFT_BG  = '#1A2744'  // dark navy — always
const RIGHT_BG = PAPER.bg

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // S1 and C2 self-manage their split
  if (FULL_BLEED.has(pathname)) {
    return (
      <div style={{ height: '100dvh', overflow: 'hidden', background: '#1A2744' }}>
        {children}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
        <style>{`.material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }`}</style>
      </div>
    )
  }

  const { total, current } = STEP_MAP[pathname] ?? { total: 0, current: 0 }

  return (
    <div style={{ height: '100dvh', overflow: 'hidden', display: 'flex', background: RIGHT_BG }}>

      {/* ── LEFT PANEL — always dark navy ──────────────────────────────────── */}
      {/*
        transform: translateZ(0) creates a containing block for position:fixed
        descendants — headers and footers in child screens are trapped inside
        this panel (not the full viewport), giving them the correct width.
      */}
      <div
        className="ob-layout-left"
        style={{
          width:         '42%',
          minWidth:      340,
          flexShrink:    0,
          display:       'flex',
          flexDirection: 'column',
          background:    LEFT_BG,
          overflow:      'hidden',
          transform:     'translateZ(0)',
          borderRight:   `1px dashed rgba(232,112,90,0.22)`,
          '--ob-panel-bg': LEFT_BG,
        } as React.CSSProperties}
      >
        {/* Fixed header — contained within this panel via transform above */}
        <header style={{
          position:       'fixed',
          top:            0,
          left:           0,
          right:          0,
          zIndex:         50,
          height:         ONBOARDING.layout.headerH,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          padding:        '0 24px',
          background:     LEFT_BG,
          borderBottom:   `1px dashed rgba(232,112,90,0.18)`,
        }}>
          <WimcWordmark color="white" height={26} />

          {total > 0 && (
            <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
              {Array.from({ length: total }, (_, i) => {
                const isCompleted = i < current - 1
                const isCurrent   = i === current - 1
                return (
                  <div
                    key={i}
                    style={{
                      width:        isCurrent ? 18 : 6,
                      height:       6,
                      borderRadius: 3,
                      background:   isCompleted
                        ? 'rgba(255,255,255,0.20)'
                        : isCurrent
                          ? STEP_ACCENT
                          : 'rgba(255,255,255,0.10)',
                      transition:   'all 200ms',
                      flexShrink:   0,
                    }}
                  />
                )
              })}
              <span style={{
                fontFamily:    "var(--font-barlow), 'Barlow Condensed', sans-serif",
                fontSize:      10,
                color:         STEP_ACCENT,
                letterSpacing: '0.10em',
                marginLeft:    4,
              }}>
                {current} / {total}
              </span>
            </div>
          )}
        </header>

        {/* Scrollable content area — children render here */}
        <div style={{ flex: 1, marginTop: ONBOARDING.layout.headerH, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {children}
        </div>
      </div>

      {/* ── RIGHT PANEL — cream with crosshatch ───────────────────────────── */}
      <div
        className="ob-layout-right"
        style={{
          flex:       1,
          background: RIGHT_BG,
          overflow:   'hidden',
          position:   'relative',
        }}
      >
        <SplitRightPanel pathname={pathname} />
      </div>

      {/* Mobile: collapse to single navy column */}
      <style>{`
        @media (max-width: 767px) {
          .ob-layout-right { display: none !important; }
          .ob-layout-left  { width: 100% !important; min-width: 0 !important; }
        }
        @media (min-width: 768px) {
          .ob-biz-card { display: none !important; }
        }
      `}</style>

      {/* Web fonts */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@900&family=DM+Sans:ital,wght@0,400;0,600;1,400&family=Caveat:wght@400;600&display=swap" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
      <style>{`.material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }`}</style>
    </div>
  )
}
