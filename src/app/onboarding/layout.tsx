'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { ONBOARDING, PAPER } from '@/lib/onboarding/design-tokens'
import SplitRightPanel from '@/components/onboarding/SplitRightPanel'
import { WimcWordmark } from '@/components/WimcWordmark'
import { getOnboardingDraft } from '@/app/actions/onboarding-draft'
import { queueLastStepPath, cancelPendingDraftWrites, type OnboardingPersona } from '@/lib/onboarding/draft-sync'
import { SK } from '@/lib/onboarding/session-keys'

// ── Step configuration per path ───────────────────────────────────────────────
// Exported so /onboarding (S1) can show "step N of total" on the resume prompt.
export const STEP_MAP: Record<string, { total: number; current: number }> = {
  '/onboarding/creator/C2': { total: 7, current: 1 },
  '/onboarding/creator/C3': { total: 7, current: 2 },
  '/onboarding/creator/C4': { total: 7, current: 3 },
  '/onboarding/creator/C5': { total: 7, current: 4 },
  '/onboarding/creator/C6': { total: 7, current: 5 },
  '/onboarding/creator/C7': { total: 7, current: 6 },
  '/onboarding/creator/C8': { total: 7, current: 7 },
  '/onboarding/explorer/E2':  { total: 6, current: 1 },
  '/onboarding/explorer/E4':  { total: 6, current: 2 },
  '/onboarding/explorer/E5':  { total: 6, current: 3 },
  '/onboarding/explorer/E5b': { total: 6, current: 4 },
  '/onboarding/explorer/E6':  { total: 6, current: 5 },
  '/onboarding/explorer/E7':  { total: 6, current: 6 },
  // Business paths both have 6 steps: B3(1) B2(2) then V4→V6→V7→V8 or R1→R3→R4→R5
  '/onboarding/business/B3': { total: 6, current: 1 },
  '/onboarding/business/B2': { total: 6, current: 2 },
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

// C8 and E7 call completeOnboarding()/completeExplorerOnboarding() at MOUNT
// (the account already exists by the time either page's own content
// matters) and delete the draft row as part of that — see the long comment
// at this set's one use site below for why they're excluded from
// last-step-path tracking specifically.
const TERMINAL_STEPS = new Set(['/onboarding/creator/C8', '/onboarding/explorer/E7'])

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

// Persona is inferred from the URL prefix — /onboarding itself (persona
// select / resume prompt) has no persona yet and needs no rehydration here;
// its own page handles the cross-persona "which draft is newest" lookup.
function personaForPathname(pathname: string): OnboardingPersona | null {
  if (pathname.startsWith('/onboarding/creator/'))  return 'creator'
  if (pathname.startsWith('/onboarding/business/')) return 'business'
  if (pathname.startsWith('/onboarding/explorer/')) return 'explorer'
  return null
}

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const persona  = personaForPathname(pathname)

  // ── Draft rehydration — runs once per persona per tab-session (guarded by
  // a sessionStorage flag so step-to-step navigation within the flow doesn't
  // refetch). Writes any wimc_ob_* keys the draft has that sessionStorage is
  // currently missing, BEFORE children render, so every step page's existing
  // mount-time guard (check sessionStorage, router.replace backward if a
  // required key is missing) runs unmodified against already-rehydrated
  // state. If nothing was ever entered for this persona, this is a no-op and
  // those guards behave exactly as they do today.
  //
  // checkedPersona (not a plain boolean) matters here: this layout instance
  // does NOT remount on client-side navigation from /onboarding into
  // /onboarding/creator/C5 (same layout segment), so `persona` flips from
  // null to 'creator' within one mounted instance. A plain "have we ever
  // rehydrated" boolean would already be true from the null-persona render
  // and let C5 render immediately, before the fetch below resolves — races
  // exactly the redirect-backward guard it's meant to prevent. Tracking
  // *which* persona was last confirmed keeps the gate correct across that
  // transition.
  const [checkedPersona, setCheckedPersona] = useState<OnboardingPersona | null>(null)
  const rehydrated = persona === null || checkedPersona === persona

  useEffect(() => {
    if (!persona || checkedPersona === persona) return
    const checkedFlag = `wimc_ob_draft_checked_${persona}`
    let cancelled = false
    try {
      if (sessionStorage.getItem(checkedFlag)) { setCheckedPersona(persona); return }
    } catch { setCheckedPersona(persona); return }

    getOnboardingDraft(persona).then(result => {
      if (cancelled) return
      try {
        if (result) {
          sessionStorage.setItem(SK.persona, persona)
          for (const [key, value] of Object.entries(result.draft)) {
            if (typeof value !== 'string') continue
            const skKey = `wimc_ob_${key}`
            if (sessionStorage.getItem(skKey) === null) sessionStorage.setItem(skKey, value)
          }
        }
        sessionStorage.setItem(checkedFlag, '1')
      } catch {}
      setCheckedPersona(persona)
    }).catch(() => { if (!cancelled) setCheckedPersona(persona) })

    return () => { cancelled = true }
  }, [persona, checkedPersona])

  // ── Record the furthest step reached, for the explicit resume prompt at
  // /onboarding. Every routable step (including the redirect stubs V5/R2 —
  // they immediately redirect onward, so this gets overwritten a moment
  // later by the real destination) is a key in STEP_MAP — except C8 and E7,
  // which call completeOnboarding()/completeExplorerOnboarding() at MOUNT
  // (the account already exists by the time either page's own content
  // matters) and delete the draft row as part of that; recording those two
  // as a resume point would be pointless even if it were safe.
  //
  // Landing on C8/E7 also cancels any write still pending from whichever
  // step came before it — not just skips queuing a new one. Without this,
  // the step-before's own debounced queueLastStepPath call (e.g. E6's,
  // queued on E6's mount) is still in flight when the user reaches E7
  // moments later, and fires on its own timer regardless: after
  // completeExplorerOnboarding() has already deleted the draft, silently
  // resurrecting it with E6 as the recorded last_step_path. Confirmed
  // happening in practice, not just theoretically, via a real resume test.
  //
  // Debounced (see queueLastStepPath) — R5/V8, the two completion screens
  // that reach here, cancel any pending call themselves (both this and any
  // pending field patch — see cancelPendingDraftWrites) before submitting,
  // so this doesn't need to guess a timeout long enough to never race.
  useEffect(() => {
    if (!persona) return
    if (!(pathname in STEP_MAP)) return
    if (TERMINAL_STEPS.has(pathname)) { cancelPendingDraftWrites(persona); return }
    queueLastStepPath(persona, pathname)
  }, [pathname, persona])

  // Onboarding's header/footer are position:fixed and must track the real,
  // visible viewport (100dvh) so the CTA is always reachable without a
  // scroll — see the fixed-below-the-fold bug this replaces. But body itself
  // enforces min-height: max(884px, 100dvh) (globals.css) for the rest of the
  // app; on any device shorter than 884px that leaves body taller than our
  // 100dvh box, which the user could otherwise scroll into, exposing body's
  // near-black background below (the bug 25c77e4 fixed by inflating this box
  // to match — which is what broke the CTA). Locking body scroll for the
  // lifetime of the onboarding flow removes that scroll path entirely, so
  // the gap can never be revealed, without needing this box to be any taller
  // than the real viewport. Same pattern as page.tsx's landing-page lock.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // iOS Safari's 100dvh lags the real visual viewport specifically across the
  // on-screen-keyboard dismiss transition (tapping the keyboard's own "hide"
  // control, as opposed to blurring by tapping elsewhere) — the CSS value
  // doesn't reflow back down to the keyboard-closed height, and with body
  // scroll locked (above) there's no scroll-triggered reflow left to correct
  // it, so body's near-black background stays exposed below our box. Track
  // the real height via visualViewport and drive it through a CSS var instead
  // of trusting dvh to update on its own.
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const setVh = () => {
      document.documentElement.style.setProperty('--ob-vh', `${vv.height}px`)
    }
    setVh()
    vv.addEventListener('resize', setVh)
    return () => vv.removeEventListener('resize', setVh)
  }, [])

  // S1 and C2 self-manage their split
  if (FULL_BLEED.has(pathname)) {
    return (
      <div style={{ height: 'var(--ob-vh, 100dvh)', overflow: 'hidden', background: '#1A2744' }}>
        {rehydrated ? children : null}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
        <style>{`.material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }`}</style>
      </div>
    )
  }

  const { total, current } = STEP_MAP[pathname] ?? { total: 0, current: 0 }

  return (
    <div style={{ height: 'var(--ob-vh, 100dvh)', overflow: 'hidden', display: 'flex', background: RIGHT_BG }}>

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
          {rehydrated ? children : null}
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
