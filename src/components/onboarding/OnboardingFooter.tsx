'use client'

import type { CSSProperties, ReactNode } from 'react'

const DM_SANS = "'DM Sans', sans-serif"

interface SecondaryAction {
  label: string
  onClick: () => void
  disabled?: boolean
}

interface OnboardingFooterProps {
  onBack: () => void
  backLabel?: string
  cta: ReactNode
  onContinue: () => void
  ctaDisabled?: boolean
  /**
   * Drives the gated bg/color/shadow swap in 'gated' mode. Defaults to ctaDisabled.
   * Pass separately when a step has two independent disabled reasons with different
   * visual treatment — e.g. "no selection yet" (gray out) vs "saving" (keep accent
   * color, just dim via ctaOpacity) — so the gray-out reflects only the former.
   */
  ctaGateDisabled?: boolean
  /** Enabled-state CTA background. Required — differs per persona/step (and is sometimes dynamic, e.g. a selected category's color). */
  ctaAccent: string
  ctaTextColor?: string
  ctaDisabledBg?: string
  ctaDisabledColor?: string
  ctaDisabledCursor?: string
  ctaFontFamily?: string
  ctaFontWeight?: CSSProperties['fontWeight']
  ctaLetterSpacing?: CSSProperties['letterSpacing']
  ctaTextTransform?: CSSProperties['textTransform']
  ctaPadding?: string
  ctaShadow?: string
  /**
   * 'gated' (default): CTA visually swaps to ctaDisabledBg/ctaDisabledColor and drops
   * its shadow while ctaDisabled (a selection-gated step, e.g. "pick one to continue").
   * 'loadingOnly': CTA always renders in its enabled colors/shadow; ctaDisabled only
   * dims it via ctaDisabledOpacity (an optional step gated solely by an in-flight save,
   * not by a selection).
   */
  ctaMode?: 'gated' | 'loadingOnly'
  ctaDisabledOpacity?: number
  /** Overrides the computed opacity outright (e.g. dimming during a save independently of the gated swap). */
  ctaOpacity?: number
  ctaIcon?: string
  ctaIconPosition?: 'before' | 'after'
  /** Renders as a plain text button between Back and the CTA (e.g. "Skip for now"). */
  secondaryAction?: SecondaryAction
  /** Renders next to the CTA, inside the same right-side group (e.g. a NODE_ID/STATUS block). */
  sideInfo?: ReactNode
  background?: string
}

export function OnboardingFooter({
  onBack,
  backLabel = '← Back',
  cta,
  onContinue,
  ctaDisabled = false,
  ctaGateDisabled,
  ctaAccent,
  ctaTextColor = '#1A2744',
  ctaDisabledBg = 'rgba(255,255,255,0.08)',
  ctaDisabledColor = 'rgba(255,255,255,0.22)',
  ctaDisabledCursor,
  ctaFontFamily = "var(--font-barlow), 'Barlow Condensed', sans-serif",
  ctaFontWeight = 700,
  ctaLetterSpacing = '0.08em',
  ctaTextTransform = 'uppercase',
  ctaPadding = '12px 32px',
  ctaShadow = '8px 8px 0px 0px #000000',
  ctaMode = 'gated',
  ctaDisabledOpacity = 0.7,
  ctaOpacity,
  ctaIcon,
  ctaIconPosition = 'before',
  secondaryAction,
  sideInfo,
  background = 'linear-gradient(to top, var(--ob-panel-bg, #1A2744) 60%, transparent 100%)',
}: OnboardingFooterProps) {
  const gated = ctaMode === 'gated'
  const gateDisabled = ctaGateDisabled ?? ctaDisabled
  const resolvedDisabledCursor = ctaDisabledCursor ?? (gated ? 'not-allowed' : 'wait')
  const resolvedOpacity = ctaOpacity ?? (gated ? 1 : (ctaDisabled ? ctaDisabledOpacity : 1))

  const ctaStyle: CSSProperties = {
    display: ctaIcon ? 'flex' : undefined,
    alignItems: ctaIcon ? 'center' : undefined,
    gap: ctaIcon ? 6 : undefined,
    background: gated ? (gateDisabled ? ctaDisabledBg : ctaAccent) : ctaAccent,
    color: gated ? (gateDisabled ? ctaDisabledColor : ctaTextColor) : ctaTextColor,
    fontFamily: ctaFontFamily,
    fontWeight: ctaFontWeight,
    fontSize: 15,
    letterSpacing: ctaLetterSpacing,
    textTransform: ctaTextTransform,
    padding: ctaPadding,
    border: 'none',
    boxShadow: gated ? (gateDisabled ? 'none' : ctaShadow) : ctaShadow,
    cursor: ctaDisabled ? resolvedDisabledCursor : 'pointer',
    opacity: resolvedOpacity,
    transition: 'all 150ms',
  }

  const ctaButton = (
    <button type="button" onClick={onContinue} disabled={ctaDisabled} style={ctaStyle}>
      {ctaIcon && ctaIconPosition === 'before' && (
        <span className="material-symbols-outlined" style={{ fontSize: 16, lineHeight: 1 }}>{ctaIcon}</span>
      )}
      {cta}
      {ctaIcon && ctaIconPosition === 'after' && (
        <span className="material-symbols-outlined" style={{ fontSize: 16, lineHeight: 1 }}>{ctaIcon}</span>
      )}
    </button>
  )

  const rightSide = secondaryAction || sideInfo
    ? (
      <div style={{ display: 'flex', alignItems: 'center', gap: sideInfo ? 16 : 12 }}>
        {sideInfo}
        {secondaryAction && (
          <button
            type="button"
            onClick={secondaryAction.onClick}
            disabled={secondaryAction.disabled}
            style={{
              background: 'none', border: 'none', fontFamily: DM_SANS, fontSize: 14,
              color: 'rgba(255,255,255,0.25)', cursor: 'pointer', padding: 0,
              textDecoration: 'underline', textDecorationStyle: 'dashed', textUnderlineOffset: 3,
            }}
          >
            {secondaryAction.label}
          </button>
        )}
        {ctaButton}
      </div>
    )
    : ctaButton

  return (
    <footer style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, height: 72, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      paddingLeft: 24, paddingRight: 24, paddingTop: 0,
      // Reserves space below the buttons for the home-indicator/gesture-bar
      // on devices with one — see PersonaNav.tsx's identical fix for the
      // same class of bug on the dashboard nav.
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      background,
    }}>
      <button
        type="button"
        onClick={onBack}
        style={{ background: 'none', border: 'none', fontFamily: DM_SANS, fontSize: 15, color: 'rgba(255,255,255,0.25)', cursor: 'pointer', padding: 0 }}
      >
        {backLabel}
      </button>
      {rightSide}
    </footer>
  )
}
