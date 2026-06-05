'use client'

import { usePathname } from 'next/navigation'
import { ONBOARDING, getHeaderBg } from '@/lib/onboarding/design-tokens'
import SplitRightPanel from '@/components/onboarding/SplitRightPanel'

// ── Step configuration per path ───────────────────────────────────────────────
const STEP_MAP: Record<string, { total: number; current: number }> = {
  '/onboarding/creator/C2': { total: 8, current: 1 },
  '/onboarding/creator/C3': { total: 8, current: 2 },
  '/onboarding/creator/C4': { total: 8, current: 3 },
  '/onboarding/creator/C5': { total: 8, current: 4 },
  '/onboarding/creator/C6': { total: 8, current: 5 },
  '/onboarding/creator/C7': { total: 8, current: 6 },
  '/onboarding/creator/C8': { total: 8, current: 7 },
  '/onboarding/creator/C9': { total: 8, current: 8 },
  '/onboarding/explorer/E2': { total: 6, current: 1 },
  '/onboarding/explorer/E3': { total: 6, current: 2 },
  '/onboarding/explorer/E4': { total: 6, current: 3 },
  '/onboarding/explorer/E5': { total: 6, current: 4 },
  '/onboarding/explorer/E6': { total: 6, current: 5 },
  '/onboarding/explorer/E7': { total: 6, current: 6 },
  '/onboarding/business/B2': { total: 8, current: 1 },
  '/onboarding/business/B3': { total: 8, current: 2 },
  '/onboarding/business/V4': { total: 8, current: 3 },
  '/onboarding/business/V5': { total: 8, current: 4 },
  '/onboarding/business/V6': { total: 8, current: 5 },
  '/onboarding/business/V7': { total: 8, current: 6 },
  '/onboarding/business/V8': { total: 8, current: 7 },
  '/onboarding/business/R4': { total: 5, current: 3 },
  '/onboarding/business/R5': { total: 5, current: 4 },
}

// C5b is a sub-step, inherit C5's position
const STEP_ALIAS: Record<string, string> = {
  '/onboarding/creator/C5b': '/onboarding/creator/C5',
}

function pathAccent(pathname: string): string {
  if (pathname.startsWith('/onboarding/creator'))          return '#E8705A'
  if (pathname.startsWith('/onboarding/explorer'))         return '#9B8FFF'
  if (pathname.startsWith('/onboarding/business/V'))       return '#5DD9D0'
  if (pathname.startsWith('/onboarding/business/R'))       return '#F5A800'
  if (pathname.startsWith('/onboarding/business'))         return '#5DD9D0'
  return '#E8705A'
}

// ── S1 and C2 own their full-viewport split — layout wraps everything else ───
const FULL_BLEED = new Set(['/onboarding', '/onboarding/creator/C2'])

const LEFT_BG  = '#1A2744'  // deep navy
const RIGHT_BG = '#F5ECD7'  // warm cream

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // S1 and C2 self-manage their split
  if (FULL_BLEED.has(pathname)) {
    return (
      <div style={{ height: '100dvh', overflow: 'hidden' }}>
        {children}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
        <style>{`.material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }`}</style>
      </div>
    )
  }

  const resolvedPath = STEP_ALIAS[pathname] ?? pathname
  const { total, current } = STEP_MAP[resolvedPath] ?? { total: 0, current: 0 }
  const accent    = pathAccent(pathname)
  const headerBg  = getHeaderBg(pathname)

  return (
    <div style={{ height: '100dvh', overflow: 'hidden', display: 'flex', background: RIGHT_BG }}>

      {/* ── LEFT PANEL — navy ──────────────────────────────────────────────── */}
      {/*
        transform: translateZ(0) creates a containing block for position:fixed
        descendants — headers and footers in child screens are trapped inside
        this panel (not the full viewport), giving them the correct width.
      */}
      <div
        className="ob-layout-left"
        style={{
          width:     '42%',
          minWidth:  340,
          flexShrink: 0,
          display:   'flex',
          flexDirection: 'column',
          background: LEFT_BG,
          overflow:  'hidden',
          transform: 'translateZ(0)',
          borderRight: `1px dashed rgba(232,112,90,0.22)`,
        }}
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
          background:     headerBg,
          borderBottom:   `1px dashed rgba(232,112,90,0.18)`,
          transition:     'background 300ms ease',
        }}>
          <span style={{
            fontFamily:    "'Outfit', sans-serif",
            fontWeight:    900,
            fontSize:      20,
            color:         '#F0EFF8',
            letterSpacing: '-0.01em',
            userSelect:    'none',
          }}>
            WIMC
          </span>

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
                        ? accent
                        : isCurrent
                          ? '#F0EFF8'
                          : 'rgba(255,255,255,0.18)',
                      transition:   'all 200ms',
                      flexShrink:   0,
                    }}
                  />
                )
              })}
              <span style={{ fontFamily: 'monospace', fontSize: 8, color: `${accent}88`, letterSpacing: '0.10em', marginLeft: 4 }}>
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

      {/* ── RIGHT PANEL — cream ────────────────────────────────────────────── */}
      <div
        className="ob-layout-right"
        style={{
          flex:              1,
          background:        RIGHT_BG,
          backgroundImage:   'linear-gradient(rgba(26,39,68,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(26,39,68,0.045) 1px, transparent 1px)',
          backgroundSize:    '28px 28px',
          overflow:          'hidden',
          position:          'relative',
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
      `}</style>

      {/* Web fonts */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@900&family=DM+Sans:ital,wght@0,400;0,600;1,400&display=swap" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
      <style>{`.material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }`}</style>
    </div>
  )
}
