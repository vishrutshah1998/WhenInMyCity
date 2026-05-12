'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { UserTier } from '@/types/database'
import { WimcLogo } from '@/components/WimcLogo'

const TIER_LABELS: Record<UserTier, string> = {
  wanderer: 'Wanderer',
  local:    'Local',
  lantern:  'Lantern',
  beacon:   'Beacon',
}

interface NavItem {
  href: string
  icon: string
  label: string
  badge?: string | number
  soon?: boolean
  exact?: boolean
}

const CORE_NAV: NavItem[] = [
  { href: '/dashboard',        icon: 'dashboard', label: 'Dashboard', exact: true },
  { href: '/dashboard/studio', icon: 'web',       label: 'My Page' },
  { href: '/dashboard/events', icon: 'event',     label: 'Events' },
]

const EARN_ITEM: NavItem     = { href: '/dashboard/earn',     icon: 'sell',                label: 'Earn' }
const BOOKINGS_ITEM: NavItem = { href: '/dashboard/bookings', icon: 'calendar_today',     label: 'Bookings' }
const TICKETS_ITEM: NavItem  = { href: '/dashboard/tickets',  icon: 'confirmation_number', label: 'Tickets' }

const GROWTH_NAV: NavItem[] = [
  { href: '/dashboard/leads',        icon: 'group',            label: 'Leads' },
  { href: '/dashboard/testimonials', icon: 'reviews',          label: 'Testimonials' },
  { href: '/dashboard/analytics',    icon: 'bar_chart',        label: 'Analytics' },
  { href: '/dashboard/payouts',      icon: 'payments',         label: 'Payouts' },
]

const SPACES_NAV: NavItem[] = [
  { href: '/dashboard/venues',    icon: 'apartment',         label: 'Venues' },
  { href: '/dashboard/tier',      icon: 'workspace_premium', label: 'Tier Progress' },
]

const COMMUNITY_ITEM: NavItem = { href: '/dashboard/community', icon: 'diversity_3', label: 'My Circles' }

const ACCOUNT_NAV: NavItem[] = [
  { href: '/dashboard/profile', icon: 'manage_accounts', label: 'Profile Settings' },
]

interface SidebarProps {
  username: string
  displayName: string
  tier: UserTier
  initials: string
  hasAnyEvent: boolean
  hasPublishedEvent: boolean
  hasAnyRsvp: boolean
  eventsHostedCount: number
  unreadHubMessages?: number
}

export default function Sidebar({ username, displayName, tier, initials, hasAnyEvent, hasPublishedEvent, hasAnyRsvp, eventsHostedCount, unreadHubMessages = 0 }: SidebarProps) {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)
  const isNewCreator = eventsHostedCount < 3

  function isActive(item: NavItem) {
    if (item.exact) return pathname === item.href
    return pathname === item.href || pathname.startsWith(item.href + '/')
  }

  return (
    <aside style={{
      width: 'var(--wimc-sidebar-w)',
      minHeight: '100vh',
      background: 'var(--wimc-bg-raised)',
      borderRight: '1px solid var(--wimc-border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 0',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 50,
    }}>
      {/* Brand */}
      <div style={{ padding: '0 20px 28px', borderBottom: '1px solid var(--wimc-border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <WimcLogo size="sm" color="white" />
          <div style={{
            fontSize: 10, fontWeight: 500, color: 'var(--wimc-coral)',
            letterSpacing: '1.5px', textTransform: 'uppercase',
            fontFamily: 'var(--font-jetbrains-mono)',
          }}>
            {TIER_LABELS[tier]}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <SectionLabel>Creator</SectionLabel>
        {CORE_NAV.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item)} />
        ))}
        <NavLink item={EARN_ITEM} active={isActive(EARN_ITEM)} />

        {isNewCreator ? (
          /* Progressive disclosure: new creators see "More tools" collapsible */
          <>
            {/* More tools toggle */}
            <button
              onClick={() => setMoreOpen((o) => !o)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 10px', borderRadius: 6, cursor: 'pointer',
                fontSize: 13.5, fontWeight: 500, background: 'transparent', border: 'none',
                color: 'var(--wimc-text-secondary)', width: '100%', textAlign: 'left',
                fontFamily: 'var(--font-dm-sans)',
                transition: 'background 220ms ease, color 220ms ease',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                {moreOpen ? 'expand_less' : 'expand_more'}
              </span>
              More tools
            </button>

            {moreOpen && (
              <>
                {hasAnyEvent && <NavLink item={BOOKINGS_ITEM} active={isActive(BOOKINGS_ITEM)} />}
                {hasAnyRsvp  && <NavLink item={TICKETS_ITEM}  active={isActive(TICKETS_ITEM)} />}
                {hasPublishedEvent && (
                  <>
                    {GROWTH_NAV.map((item) => (
                      <NavLink key={item.href} item={item} active={isActive(item)} />
                    ))}
                    {(tier === 'lantern' || tier === 'beacon') && (
                      <NavLink
                        item={{ href: '/hub', icon: 'hub', label: 'Creator Hub', badge: unreadHubMessages > 0 ? unreadHubMessages : undefined }}
                        active={isActive({ href: '/hub', icon: 'hub', label: 'Creator Hub' })}
                      />
                    )}
                    {SPACES_NAV.map((item) => (
                      <NavLink key={item.href} item={item} active={isActive(item)} />
                    ))}
                    {(tier === 'local' || tier === 'lantern' || tier === 'beacon') && (
                      <NavLink item={COMMUNITY_ITEM} active={isActive(COMMUNITY_ITEM)} />
                    )}
                  </>
                )}
              </>
            )}
          </>
        ) : (
          /* Established creators: full nav */
          <>
            {hasAnyEvent && <NavLink item={BOOKINGS_ITEM} active={isActive(BOOKINGS_ITEM)} />}
            {hasAnyRsvp  && <NavLink item={TICKETS_ITEM}  active={isActive(TICKETS_ITEM)} />}

            {hasPublishedEvent && (
              <>
                <SectionLabel>Growth</SectionLabel>
                {GROWTH_NAV.map((item) => (
                  <NavLink key={item.href} item={item} active={isActive(item)} />
                ))}
                {(tier === 'lantern' || tier === 'beacon') && (
                  <NavLink
                    item={{ href: '/hub', icon: 'hub', label: 'Creator Hub', badge: unreadHubMessages > 0 ? unreadHubMessages : undefined }}
                    active={isActive({ href: '/hub', icon: 'hub', label: 'Creator Hub' })}
                  />
                )}

                <SectionLabel>Spaces</SectionLabel>
                {SPACES_NAV.map((item) => (
                  <NavLink key={item.href} item={item} active={isActive(item)} />
                ))}
                {(tier === 'local' || tier === 'lantern' || tier === 'beacon') && (
                  <NavLink item={COMMUNITY_ITEM} active={isActive(COMMUNITY_ITEM)} />
                )}
              </>
            )}
          </>
        )}

        <SectionLabel>Account</SectionLabel>
        {ACCOUNT_NAV.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item)} />
        ))}
      </nav>

      {/* User footer */}
      <div style={{ padding: '16px 12px 0', borderTop: '1px solid var(--wimc-border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 6 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--wimc-coral), var(--wimc-amber))',
            display: 'grid', placeItems: 'center',
            fontWeight: 700, fontSize: 13, flexShrink: 0,
          }}>
            {initials}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{displayName}</div>
            <div style={{ fontSize: 11, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)' }}>
              @{username}
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase',
      color: 'var(--wimc-text-muted)', padding: '12px 8px 6px',
      fontFamily: 'var(--font-jetbrains-mono)',
    }}>
      {children}
    </div>
  )
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const baseStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '9px 10px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13.5,
    fontWeight: 500,
    textDecoration: 'none',
    transition: 'background 220ms ease, color 220ms ease',
    color: active ? 'var(--wimc-coral-light)' : 'var(--wimc-text-secondary)',
    background: active ? 'var(--wimc-coral-dim)' : 'transparent',
  }

  return (
    <Link href={item.href} style={baseStyle}>
      <span
        className="material-symbols-outlined"
        style={{
          fontSize: 20,
          fontVariationSettings: active ? "'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24" : "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24",
        }}
      >
        {item.icon}
      </span>
      {item.label}
      {item.soon && (
        <span style={{
          marginLeft: 'auto', background: 'var(--wimc-bg-overlay)',
          color: 'var(--wimc-text-muted)', fontSize: 10,
          fontFamily: 'var(--font-jetbrains-mono)',
          padding: '1px 6px', borderRadius: 9999, fontWeight: 600,
        }}>
          Soon
        </span>
      )}
      {item.badge != null && !item.soon && (
        <span style={{
          marginLeft: 'auto', background: 'var(--wimc-coral)',
          color: '#fff', fontSize: 10,
          fontFamily: 'var(--font-jetbrains-mono)',
          padding: '1px 6px', borderRadius: 9999, fontWeight: 600,
        }}>
          {item.badge}
        </span>
      )}
    </Link>
  )
}
