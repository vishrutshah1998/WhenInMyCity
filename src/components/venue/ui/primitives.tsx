'use client'

import type { CSSProperties, ReactNode } from 'react'

// ---------------------------------------------------------------------------
// Shared radius scale — matches the wimc-design token scale (sm/md/lg/xl/full)
// that venue components have historically under-used, sitting at 6-12px
// instead. Card/panel surfaces should default to `lg`; small chips/inputs
// to `sm`/`md`; pills stay `full`.
// ---------------------------------------------------------------------------

export const VENUE_RADIUS = {
  sm: 6,
  md: 12,
  lg: 18,
  xl: 24,
  full: 9999,
} as const

// ---------------------------------------------------------------------------
// Card — surface container. `--venue-accent` (teal) is the venue's brand
// identity color per styles/venue-tokens.css; `--venue-amber` is reserved
// for money/revenue figures and the single revenue-committing CTA, not
// general UI chrome. Cards default to a neutral surface border; pass
// `accent` for a highlighted/selected state.
// ---------------------------------------------------------------------------

interface CardProps {
  children: ReactNode
  radius?: keyof typeof VENUE_RADIUS
  padding?: number | string
  accent?: boolean
  style?: CSSProperties
  className?: string
}

export function Card({ children, radius = 'lg', padding = 20, accent = false, style, className }: CardProps) {
  return (
    <div
      className={className}
      style={{
        background: 'var(--venue-bg-surface)',
        border: `1px solid ${accent ? 'var(--venue-accent-border)' : 'var(--venue-border-subtle)'}`,
        borderRadius: VENUE_RADIUS[radius],
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pill — badge/chip. `tone` picks the semantic color; `money` is the only
// tone that should be used for financial figures.
// ---------------------------------------------------------------------------

type PillTone = 'accent' | 'money' | 'success' | 'danger' | 'warning' | 'neutral' | 'outline'

const PILL_TONE_STYLE: Record<PillTone, CSSProperties> = {
  accent:  { background: 'var(--venue-accent-tint)', color: 'var(--venue-accent)' },
  money:   { background: 'var(--venue-amber-tint)', color: 'var(--venue-amber)' },
  success: { background: 'rgba(16,185,129,0.12)', color: 'var(--venue-success)' },
  danger:  { background: 'rgba(239,68,68,0.10)', color: 'var(--venue-danger)' },
  warning: { background: 'rgba(251,146,60,0.12)', color: 'var(--venue-warning)' },
  neutral: { background: 'rgba(255,255,255,0.06)', color: 'var(--venue-text-muted)' },
  outline: { background: 'transparent', color: 'var(--venue-text-secondary)', border: '1px solid var(--venue-border-default)' },
}

interface PillProps {
  children: ReactNode
  tone?: PillTone
  size?: 'sm' | 'md'
  style?: CSSProperties
}

export function Pill({ children, tone = 'neutral', size = 'md', style }: PillProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontWeight: 600,
        fontSize: size === 'sm' ? 10.5 : 11.5,
        padding: size === 'sm' ? '2px 8px' : '4px 12px',
        borderRadius: VENUE_RADIUS.full,
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
        whiteSpace: 'nowrap',
        ...PILL_TONE_STYLE[tone],
        ...style,
      }}
    >
      {children}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Button — `money` variant is the only solid-fill amber button; it should
// only label actions that commit revenue (e.g. Accept Booking). Everything
// else uses `accent` (teal) as the primary interactive color.
// ---------------------------------------------------------------------------

type ButtonVariant = 'accent' | 'money' | 'outline' | 'ghost'

interface ButtonProps {
  children: ReactNode
  variant?: ButtonVariant
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit'
  flex?: number
  fullWidth?: boolean
  style?: CSSProperties
}

export function Button({ children, variant = 'outline', onClick, disabled, type = 'button', flex, fullWidth, style }: ButtonProps) {
  const variantStyle: CSSProperties =
    variant === 'money' ? { background: 'var(--venue-amber)', color: '#000', border: 'none' } :
    variant === 'accent' ? { background: 'var(--venue-accent)', color: '#000', border: 'none' } :
    variant === 'outline' ? { background: 'transparent', color: 'var(--venue-accent)', border: '1px solid var(--venue-accent-border)' } :
    { background: 'transparent', color: 'var(--venue-text-muted)', border: '1px solid var(--venue-border-default)' }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '13px 0',
        borderRadius: VENUE_RADIUS.md,
        fontSize: 14,
        fontWeight: variant === 'money' || variant === 'accent' ? 700 : 600,
        cursor: disabled ? 'default' : 'pointer',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
        transition: 'background 160ms ease, border-color 160ms ease',
        flex,
        width: fullWidth ? '100%' : undefined,
        opacity: disabled ? 0.6 : 1,
        ...variantStyle,
        ...style,
      }}
    >
      {children}
    </button>
  )
}
