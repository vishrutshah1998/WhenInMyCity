import type { CSSProperties } from 'react'

// Soft-UI ("Vintage Postal") shadow/border primitive — shared across the
// Creator, Venue, Brand, and Explorer persona recolors of the avatar upload
// socket, the 3-way toggle, and the tier-progress ring. Formula and per-
// persona values ported directly from the confirmed Design canvas; depth is
// fixed (no runtime adjustment needed in production).

export interface SoftUIConfig {
  dark:     string
  light:    string
  press:    string
  edge:     string
  edgeThin: string
  accent:   string
  /** accent color at ~35% opacity, for focus rings — hex+alpha, matching this codebase's `${color}NN` convention */
  focusRing: string
}

export interface SoftUIShadows {
  inset:    string
  track:    string
  raised:   string
  pressed:  string
  dash:     string
  dashThin: string
  accent:   string
  focusRing: string
  ring: (progress: number) => string
}

const px = (n: number) => `${n}px`

export function softUIShadows({ dark, light, press, edge, edgeThin, accent, focusRing }: SoftUIConfig): SoftUIShadows {
  return {
    inset:    `inset ${px(5)} ${px(5)} ${px(10)} ${dark}, inset -${px(5)} -${px(5)} ${px(10)} ${light}`,
    track:    `inset ${px(3)} ${px(3)} ${px(7)} ${dark}, inset -${px(3)} -${px(3)} ${px(7)} ${light}`,
    raised:   `${px(3)} ${px(3)} ${px(8)} ${dark}, -${px(3)} -${px(3)} ${px(8)} ${light}`,
    pressed:  `inset ${px(3)} ${px(3)} ${px(7)} ${press}`,
    dash:     `1.5px dashed ${edge}`,
    dashThin: `1px dashed ${edgeThin}`,
    accent,
    focusRing,
    ring: (progress: number) => `conic-gradient(${accent} 0% ${progress}%, transparent ${progress}% 100%)`,
  }
}

// base bg #F2EDE3 (--wimc-bg-base), accent #E8705A (--wimc-coral) — globals.css
const CREATOR_CONFIG: SoftUIConfig = {
  dark: 'rgba(32,26,18,0.16)', light: 'rgba(255,255,255,0.85)', press: 'rgba(32,26,18,0.25)',
  edge: 'rgba(32,26,18,0.30)', edgeThin: 'rgba(32,26,18,0.22)', accent: '#E8705A', focusRing: '#E8705A59',
}
// .venue-theme.venue-variant — styles/venue-tokens.css
const VENUE_CONFIG: SoftUIConfig = {
  dark: 'rgba(0,0,0,0.60)', light: 'rgba(93,217,208,0.05)', press: 'rgba(0,0,0,0.30)',
  edge: 'rgba(93,217,208,0.24)', edgeThin: 'rgba(93,217,208,0.20)', accent: '#5DD9D0', focusRing: '#5DD9D059',
}
// .venue-theme.brand-variant — styles/venue-tokens.css
const BRAND_CONFIG: SoftUIConfig = {
  dark: 'rgba(0,0,0,0.60)', light: 'rgba(245,168,0,0.05)', press: 'rgba(0,0,0,0.30)',
  edge: 'rgba(245,168,0,0.28)', edgeThin: 'rgba(245,168,0,0.24)', accent: '#F5A800', focusRing: '#F5A80059',
}
// .venue-theme.explorer-variant — styles/venue-tokens.css (real token; base bg #0A0814, accent #9B8FFF)
const EXPLORER_CONFIG: SoftUIConfig = {
  dark: 'rgba(0,0,0,0.60)', light: 'rgba(155,143,255,0.05)', press: 'rgba(0,0,0,0.30)',
  edge: 'rgba(155,143,255,0.24)', edgeThin: 'rgba(155,143,255,0.20)', accent: '#9B8FFF', focusRing: '#9B8FFF59',
}

export const SOFT_UI = {
  creator:  softUIShadows(CREATOR_CONFIG),
  venue:    softUIShadows(VENUE_CONFIG),
  brand:    softUIShadows(BRAND_CONFIG),
  explorer: softUIShadows(EXPLORER_CONFIG),
} as const

export const SOFT_UI_LABEL_FONT = 'var(--font-dm-serif), serif'

/**
 * Inline CSS custom properties consumed by .soft-ui-socket / .soft-ui-toggle-option
 * (styles/soft-ui.css). Pass `accentOverride`/`focusRingOverride` to swap the accent
 * without changing the shadow geometry — e.g. per-creator-category colors on the
 * legacy shared profile-client.tsx page.
 */
export function softUICssVars(
  shadows: SoftUIShadows,
  overrides?: { accent?: string; focusRing?: string },
): CSSProperties {
  return {
    '--soft-ui-dash':    shadows.dash,
    '--soft-ui-inset':   shadows.inset,
    '--soft-ui-raised':  shadows.raised,
    '--soft-ui-pressed': shadows.pressed,
    '--soft-ui-accent':  overrides?.accent ?? shadows.accent,
    '--soft-ui-focus':   overrides?.focusRing ?? shadows.focusRing,
  } as CSSProperties
}
