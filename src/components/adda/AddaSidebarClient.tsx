'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

// ---------------------------------------------------------------------------
// Nav data
// ---------------------------------------------------------------------------

interface NavItem {
  href: string
  icon: string
  label: string
  badgeKey?: 'pending' | 'unread'
  primary?: boolean
  exact?: boolean
}

interface NavSection {
  group: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    group: 'Operations',
    items: [
      { href: '/adda/dashboard',    icon: 'calendar_today',   label: 'Calendar',          primary: true, exact: true },
      { href: '/adda/bookings',     icon: 'event_available',  label: 'Bookings',          badgeKey: 'pending' },
      { href: '/adda/inbox',        icon: 'inbox',            label: 'Inbox',             badgeKey: 'unread' },
    ],
  },
  {
    group: 'Performance',
    items: [
      { href: '/adda/analytics',    icon: 'bar_chart_4_bars', label: 'Analytics' },
      { href: '/adda/payouts',      icon: 'payments',         label: 'Payouts' },
    ],
  },
  {
    group: 'Listing',
    items: [
      { href: '/adda/venue',        icon: 'apartment',        label: 'My Venue' },
      { href: '/adda/pricing',      icon: 'price_change',     label: 'Pricing' },
      { href: '/adda/availability', icon: 'tune',             label: 'Availability Rules' },
    ],
  },
  {
    group: 'Account',
    items: [
      { href: '/adda/settings',     icon: 'settings',         label: 'Settings' },
      { href: '/adda/help',         icon: 'help_outline',     label: 'Help' },
    ],
  },
]

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface AddaSidebarClientProps {
  venueName: string
  ownerName: string
  initials: string
  avatarUrl?: string
  pendingCount: number
  unreadCount: number
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{
      fontSize: 10,
      fontWeight: 500,
      letterSpacing: '1.2px',
      textTransform: 'uppercase',
      color: 'var(--adda-text-muted)',
      padding: '14px 10px 5px',
      fontFamily: 'var(--font-jetbrains-mono), monospace',
      whiteSpace: 'nowrap',
    }}>
      {label}
    </div>
  )
}

function NavLink({
  item,
  active,
  badge,
  collapsed,
}: {
  item: NavItem
  active: boolean
  badge: number | null
  collapsed: boolean
}) {
  const [hovered, setHovered] = useState(false)

  const showHoverBg = hovered && !active

  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: collapsed ? '10px 0' : '9px 10px 9px 14px',
        borderRadius: 6,
        justifyContent: collapsed ? 'center' : undefined,
        cursor: 'pointer',
        textDecoration: 'none',
        transition: 'background 160ms ease',
        background: active
          ? 'var(--adda-amber-tint)'
          : showHoverBg
            ? 'var(--adda-bg-hover)'
            : 'transparent',
        marginBottom: 1,
      }}
    >
      {/* Left accent bar — full item height, amber, rounded-r-sm */}
      {active && !collapsed && (
        <span style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          background: 'var(--adda-amber)',
          borderRadius: '0 3px 3px 0',
        }} />
      )}

      {/* Icon */}
      <span
        className="material-symbols-outlined"
        style={{
          fontSize: 20,
          flexShrink: 0,
          color: active
            ? 'var(--adda-amber)'
            : item.primary
              ? 'var(--adda-text-secondary)'
              : 'var(--adda-text-muted)',
          fontVariationSettings: active
            ? "'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24"
            : "'FILL' 0,'wght' 300,'GRAD' 0,'opsz' 24",
          transition: 'color 160ms ease',
        }}
      >
        {item.icon}
      </span>

      {/* Badge dot (icon-only mode) */}
      {collapsed && badge !== null && (
        <span style={{
          position: 'absolute',
          top: 7,
          right: 8,
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: 'var(--adda-amber)',
          border: '1.5px solid var(--adda-bg-surface)',
        }} />
      )}

      {/* Label + count badge (expanded mode) */}
      {!collapsed && (
        <>
          <span style={{
            fontSize: 13.5,
            fontWeight: item.primary ? 600 : 500,
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            color: active
              ? 'var(--adda-text-primary)'
              : item.primary
                ? 'var(--adda-text-secondary)'
                : 'var(--adda-text-secondary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            flex: 1,
            transition: 'color 160ms ease',
          }}>
            {item.label}
          </span>

          {badge !== null && (
            <span
              className="font-adda-nums"
              style={{
                background: 'var(--adda-amber)',
                color: '#000',
                fontSize: 10,
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: 9999,
                flexShrink: 0,
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
                lineHeight: '16px',
              }}
            >
              {badge}
            </span>
          )}
        </>
      )}
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AddaSidebarClient({
  venueName,
  ownerName,
  initials,
  avatarUrl,
  pendingCount,
  unreadCount,
}: AddaSidebarClientProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [avatarHovered, setAvatarHovered] = useState(false)

  // Hydration-safe: read localStorage after mount
  useEffect(() => {
    if (localStorage.getItem('adda-sidebar-collapsed') === 'true') {
      setCollapsed(true)
    }
  }, [])

  function toggleCollapse() {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem('adda-sidebar-collapsed', String(next))
      return next
    })
  }

  function isActive(item: NavItem) {
    if (item.exact) return pathname === item.href
    return pathname === item.href || pathname.startsWith(item.href + '/')
  }

  function getBadge(key?: 'pending' | 'unread'): number | null {
    if (!key) return null
    const count = key === 'pending' ? pendingCount : unreadCount
    return count > 0 ? count : null
  }

  const sidebarWidth = collapsed ? 64 : 240

  return (
    <aside style={{
      width: sidebarWidth,
      minHeight: '100vh',
      background: 'var(--adda-bg-surface)',
      borderRight: '1px solid var(--adda-border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 0 0',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 50,
      transition: 'width 220ms cubic-bezier(0.4, 0, 0.2, 1)',
      overflow: 'hidden',
    }}>

      {/* ── Brand ─────────────────────────────────────────────────────────────── */}
      <div style={{
        padding: collapsed ? '0 16px 20px' : '0 20px 20px',
        borderBottom: '1px solid var(--adda-border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        overflow: 'hidden',
        minWidth: 0,
      }}>
        {/* Hexagon — CSS clip-path, amber fill, "A" centered */}
        <div style={{
          width: 32,
          height: 32,
          background: 'var(--adda-amber)',
          clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
        }}>
          <span style={{
            fontSize: 14,
            fontWeight: 700,
            color: '#000',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            lineHeight: 1,
          }}>
            A
          </span>
        </div>

        {/* Brand text — hidden when collapsed */}
        {!collapsed && (
          <div style={{ overflow: 'hidden', minWidth: 0 }}>
            <div style={{
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              fontWeight: 600,
              fontSize: 16,
              color: 'var(--adda-text-primary)',
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap',
              lineHeight: 1.2,
            }}>
              Adda
            </div>
            {/* Active listing indicator + venue name */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              marginTop: 3,
            }}>
              <div style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--adda-success)',
                flexShrink: 0,
              }} />
              <span style={{
                fontSize: 11,
                color: 'var(--adda-text-muted)',
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {venueName}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Nav ───────────────────────────────────────────────────────────────── */}
      <nav style={{
        flex: 1,
        padding: collapsed ? '8px 8px' : '8px 10px',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        overflowX: 'hidden',
      }}>
        {NAV_SECTIONS.map((section, si) => (
          <div key={section.group}>
            {/* Section divider in collapsed mode */}
            {collapsed && si > 0 && (
              <div style={{
                height: 1,
                background: 'var(--adda-border-subtle)',
                margin: '6px 8px',
              }} />
            )}

            {/* Section label — expanded only */}
            {!collapsed && <SectionLabel label={section.group} />}

            {section.items.map(item => (
              <NavLink
                key={item.href}
                item={item}
                active={isActive(item)}
                badge={getBadge(item.badgeKey)}
                collapsed={collapsed}
              />
            ))}
          </div>
        ))}
      </nav>

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      <div style={{
        borderTop: '1px solid var(--adda-border-subtle)',
        padding: collapsed ? '12px 8px 0' : '10px 10px 0',
      }}>

        {/* Notification bell — inline in footer row when expanded, standalone when collapsed */}
        {collapsed ? (
          <button
            title="Notifications"
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              padding: '8px 0',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--adda-text-muted)',
              borderRadius: 6,
              marginBottom: 4,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
              notifications
            </span>
          </button>
        ) : null}

        {/* User row: avatar + name/venue + bell (expanded) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: collapsed ? '8px 0' : '8px 10px',
          justifyContent: collapsed ? 'center' : undefined,
          borderRadius: 6,
        }}>
          {/* Avatar */}
          <div
            onMouseEnter={() => setAvatarHovered(true)}
            onMouseLeave={() => setAvatarHovered(false)}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'var(--adda-bg-overlay)',
              border: avatarHovered ? '2px solid var(--adda-amber)' : '2px solid transparent',
              transition: 'border-color 160ms ease',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 700,
              fontSize: 12,
              color: 'var(--adda-text-primary)',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              flexShrink: 0,
              overflow: 'hidden',
              cursor: 'pointer',
            }}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={ownerName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              initials
            )}
          </div>

          {/* Name + venue — hidden when collapsed */}
          {!collapsed && (
            <>
              <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  color: 'var(--adda-text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  lineHeight: 1.3,
                }}>
                  {ownerName}
                </div>
                <div style={{
                  fontSize: 11,
                  color: 'var(--adda-text-muted)',
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {venueName}
                </div>
              </div>

              {/* Notification bell */}
              <button
                title="Notifications"
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--adda-text-muted)',
                  flexShrink: 0,
                  transition: 'color 160ms ease, background 160ms ease',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--adda-text-secondary)'
                  ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--adda-bg-hover)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--adda-text-muted)'
                  ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  notifications
                </span>
              </button>
            </>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={toggleCollapse}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '10px 0',
            marginTop: 6,
            background: 'transparent',
            border: 'none',
            borderTop: '1px solid var(--adda-border-subtle)',
            cursor: 'pointer',
            color: 'var(--adda-text-muted)',
            transition: 'color 160ms ease',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--adda-text-secondary)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--adda-text-muted)' }}
        >
          <span style={{
            fontSize: 14,
            display: 'inline-block',
            // ⌃ rotated: -90deg points left (collapse); 90deg points right (expand)
            transform: collapsed ? 'rotate(90deg)' : 'rotate(-90deg)',
            transition: 'transform 220ms cubic-bezier(0.4, 0, 0.2, 1)',
            lineHeight: 1,
          }}>
            ⌃
          </span>
          {!collapsed && (
            <span style={{
              fontSize: 11,
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              letterSpacing: '0.3px',
            }}>
              Collapse
            </span>
          )}
        </button>
      </div>
    </aside>
  )
}
