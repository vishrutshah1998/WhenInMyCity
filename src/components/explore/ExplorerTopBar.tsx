'use client'

import Link from 'next/link'
import { WimcWordmark } from '@/components/WimcWordmark'
import LocationPill from '@/components/ui/LocationPill'

const LAVENDER = '#9B8FFF'
const INK      = '#1A2744'

interface ExplorerTopBarProps {
  city: string
  /** Omit for a fixed-identity city (renders a static, non-interactive label) — e.g. Creator/Venue/Brand's home city, as opposed to Explorer's session-scoped browsing city. */
  onCitySelect?: (city: string) => void
  /** Authenticated state renders the avatar; omit (or pass null) for the guest state. */
  avatar?: {
    href:        string
    avatarUrl:   string | null
    initials:    string
    displayName: string
  } | null
  /** Guest state only — where the "Sign in" prompt points. */
  signInHref?: string
  zIndex?: number
  /** Where the logo links to. Defaults to Explorer's own landing route. */
  logoHref?: string
  /** Accent used for the sign-in link, avatar-fallback gradient, and location pill. */
  accentColor?: string
  /** Optional right-of-pill slot, e.g. a persona's NotificationBell. */
  notificationBell?: React.ReactNode
  /**
   * 'light' (default) is the original cream/ink palette — Explorer and Creator both live on
   * `--wimc-bg-base` (light). 'dark' is for personas whose dashboard is dark-themed (Venue/Brand,
   * `venue-theme` / `--venue-bg-base`) — swaps background, border, wordmark, and the static city
   * pill to legible-on-dark colors. Only affects those cosmetic tokens; layout is identical.
   */
  variant?: 'light' | 'dark'
}

const BAR_H = 48

export default function ExplorerTopBar({ city, onCitySelect, avatar = null, signInHref = '/signin', zIndex = 30, logoHref = '/explore', accentColor = LAVENDER, notificationBell = null, variant = 'light' }: ExplorerTopBarProps) {
  const isDark = variant === 'dark'
  const barBg        = isDark ? 'rgba(6,13,17,0.92)' : 'rgba(242,237,227,0.95)'
  const barBorder    = isDark ? 'var(--venue-border-subtle, rgba(255,255,255,0.08))' : 'rgba(26,39,68,0.10)'
  const logoColor    = isDark ? '#fff' : INK
  const pillTextColor   = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(26,17,8,0.55)'
  const pillBorderColor = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(26,17,8,0.15)'

  return (
    <div
      style={{
        position: 'sticky', top: 0, zIndex,
        height: BAR_H,
        background: barBg, backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${barBorder}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 14px 0 20px',
        gap: 12,
      }}
    >
      {/* ── Left cluster: logo + avatar / sign-in ─────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <Link href={logoHref} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <WimcWordmark color={logoColor} height={22} />
        </Link>

        {avatar ? (
          <Link
            href={avatar.href}
            aria-label={`${avatar.displayName} · Profile`}
            style={{
              width: 30, height: 30, borderRadius: '50%',
              background: avatar.avatarUrl ? 'transparent' : `linear-gradient(135deg, ${accentColor}, color-mix(in srgb, ${accentColor} 50%, transparent))`,
              display: 'grid', placeItems: 'center',
              fontWeight: 700, fontSize: 12, color: '#fff',
              overflow: 'hidden', flexShrink: 0,
            }}
          >
            {avatar.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar.avatarUrl} alt={avatar.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              avatar.initials
            )}
          </Link>
        ) : (
          <Link
            href={signInHref}
            style={{
              fontFamily: 'var(--font-jetbrains-mono), monospace',
              fontSize: 10, fontWeight: 700,
              color: accentColor,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Sign in
          </Link>
        )}
      </div>

      {/* ── Right: location pill (or static city label) + optional bell ────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        {onCitySelect ? (
          <LocationPill
            activeCity={city}
            onSelect={onCitySelect}
            accentColor={accentColor}
            mutedText={pillTextColor}
            borderColor={pillBorderColor}
          />
        ) : (
          <div
            title={city}
            style={{
              padding: '5px 11px',
              borderRadius: 9999,
              border: `1px solid ${pillBorderColor}`,
              fontFamily: 'var(--font-jetbrains-mono), monospace',
              fontSize: 10, fontWeight: 700,
              letterSpacing: '0.08em',
              color: pillTextColor,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              maxWidth: 120,
            }}
          >
            {city.slice(0, 3).toUpperCase()}
          </div>
        )}
        {notificationBell}
      </div>
    </div>
  )
}
