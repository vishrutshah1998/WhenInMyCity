'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { MakerTier } from '@/types/database'

const TIER_LABELS: Record<MakerTier, string> = {
  mohalla: 'Mohalla Tier',
  nukkad:  'Nukkad Tier',
  chowk:   'Chowk Tier',
  maidan:  'Maidan Tier',
}

interface NavItem {
  href: string
  icon: string
  label: string
  badge?: string | number
  soon?: boolean
  exact?: boolean
}

const CREATOR_NAV: NavItem[] = [
  { href: '/dashboard',        icon: 'dashboard',            label: 'Dashboard', exact: true },
  { href: '/dashboard/studio', icon: 'web',                  label: 'My Page' },
  { href: '/dashboard/events', icon: 'event',                label: 'Events' },
  { href: '/dashboard/tickets',icon: 'confirmation_number',  label: 'Tickets' },
  { href: '/dashboard/bookings',icon: 'calendar_today',      label: 'Bookings' },
]

const GROWTH_NAV: NavItem[] = [
  { href: '/dashboard/leads',        icon: 'group',            label: 'Leads' },
  { href: '/dashboard/testimonials', icon: 'reviews',          label: 'Testimonials' },
  { href: '/dashboard/analytics',    icon: 'bar_chart',        label: 'Analytics' },
  { href: '/dashboard/payouts',      icon: 'payments',         label: 'Payouts' },
]

const SPACES_NAV: NavItem[] = [
  { href: '/dashboard/venues', icon: 'apartment', label: 'Venues' },
  { href: '/dashboard/tier',   icon: 'workspace_premium', label: 'Tier Progress' },
]

const ACCOUNT_NAV: NavItem[] = [
  { href: '/dashboard/profile',  icon: 'manage_accounts', label: 'Profile Settings' },
]

interface SidebarProps {
  username: string
  displayName: string
  tier: MakerTier
  initials: string
}

export default function Sidebar({ username, displayName, tier, initials }: SidebarProps) {
  const pathname = usePathname()

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
          <div style={{
            width: 32, height: 32, background: 'var(--wimc-coral)',
            borderRadius: 8, display: 'grid', placeItems: 'center',
          }}>
            <span style={{ fontSize: 16, fontWeight: 900, color: '#fff', fontFamily: 'var(--font-syne)' }}>W</span>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 18 }}>WIMC</div>
            <div style={{
              fontSize: 10, fontWeight: 500, color: 'var(--wimc-coral)',
              letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: 3,
              fontFamily: 'var(--font-jetbrains-mono)',
            }}>
              {TIER_LABELS[tier]}
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <SectionLabel>Creator</SectionLabel>
        {CREATOR_NAV.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item)} />
        ))}

        <SectionLabel>Growth</SectionLabel>
        {GROWTH_NAV.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item)} />
        ))}

        <SectionLabel>Spaces</SectionLabel>
        {SPACES_NAV.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item)} />
        ))}

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
