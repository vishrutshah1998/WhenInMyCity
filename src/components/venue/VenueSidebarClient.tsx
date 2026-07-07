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
  soon?: boolean
}

interface NavSection {
  group: string
  items: NavItem[]
}

const NAV_SECTIONS_VENUE: NavSection[] = [
  {
    group: 'Operations',
    items: [
      { href: '/business/venue/dashboard',     icon: 'dashboard',       label: 'Dashboard',  primary: true, exact: true },
      { href: '/business/venue/creators',      icon: 'person_search',   label: 'Proposals',  badgeKey: 'pending' },
      { href: '/business/venue/bookings',      icon: 'event_available', label: 'Bookings' },
      { href: '/business/venue/calendar',      icon: 'calendar_today',  label: 'Calendar' },
      { href: '/business/venue/notifications', icon: 'inbox',           label: 'Inbox',      badgeKey: 'unread' },
    ],
  },
  {
    group: 'Performance',
    items: [
      { href: '/business/venue/analytics', icon: 'bar_chart_4_bars', label: 'Analytics' },
      { href: '/business/venue/payouts',   icon: 'payments',         label: 'Payouts' },
    ],
  },
  {
    group: 'My Space',
    items: [
      { href: '/business/venue/venue',        icon: 'apartment',       label: 'My Venue' },
      { href: '/business/venue/studio',       icon: 'web',             label: 'My Page' },
      { href: '/business/venue/pricing',      icon: 'price_change',    label: 'Pricing' },
      { href: '/business/venue/availability', icon: 'tune',            label: 'Availability Rules' },
    ],
  },
  {
    group: 'Discover',
    items: [
      { href: '/map-of-legends', icon: 'location_city', label: 'Map of Legends' },
    ],
  },
]

const NAV_SECTIONS_BRAND: NavSection[] = [
  {
    group: 'Operations',
    items: [
      { href: '/business/brand/dashboard',  icon: 'dashboard',       label: 'Dashboard', primary: true, exact: true },
      { href: '/business/brand/campaigns', icon: 'campaign',        label: 'Campaigns', soon: true },
      { href: '/business/brand/enquiries', icon: 'inbox',           label: 'Enquiries', badgeKey: 'unread' },
    ],
  },
  {
    group: 'Discover',
    items: [
      { href: '/business/brand/creators', icon: 'person_search', label: 'Browse Creators' },
    ],
  },
  {
    group: 'Performance',
    items: [
      { href: '/business/brand/analytics', icon: 'bar_chart_4_bars', label: 'Analytics', soon: true },
    ],
  },
  {
    group: 'My Brand',
    items: [
      { href: '/business/brand/studio', icon: 'web', label: 'My Page' },
    ],
  },
]

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface VenueSidebarClientProps {
  businessName: string
  ownerName: string
  initials: string
  avatarUrl?: string
  pendingCount: number
  unreadCount: number
  hasCreatorProfile?: boolean
  businessType?: 'venue' | 'brand'
  personas?: string[]
}

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------

const VENUE_AMBER   = 'var(--venue-amber, #F5A800)'
const VENUE_MUTED   = 'var(--venue-text-muted)'
const VENUE_BORDER  = 'var(--venue-border-subtle)'
const VENUE_HOVER   = 'var(--venue-bg-hover)'

// ── Workspace / persona helpers (mirrors dashboard Sidebar.tsx) ──────────────

const ALL_PERSONAS = ['creator', 'explorer', 'venue', 'brand'] as const
type PersonaKey = typeof ALL_PERSONAS[number]

const WORKSPACE_META: Record<string, { icon: string; label: string; color: string; href: string }> = {
  creator:  { icon: 'palette',    label: 'Creator',  color: '#E8705A', href: '/dashboard' },
  venue:    { icon: 'storefront', label: 'Venue',    color: '#5DD9D0', href: '/business/venue/dashboard' },
  explorer: { icon: 'explore',    label: 'Explorer', color: '#9B8FFF', href: '/explore/dashboard' },
  brand:    { icon: 'campaign',   label: 'Brand',    color: '#F5A800', href: '/business/brand/dashboard' },
}

function personaEntryUrl(persona: PersonaKey): string {
  switch (persona) {
    case 'creator':  return '/onboarding?mode=add&persona=creator'
    case 'explorer': return '/onboarding?mode=add&persona=explorer'
    case 'venue':    return '/onboarding?mode=add&persona=venue'
    case 'brand':    return '/onboarding?mode=add&persona=brand'
  }
}

function personaLabel(persona: PersonaKey): string {
  if (persona === 'venue')    return 'List a Venue'
  if (persona === 'explorer') return 'Become an Explorer'
  return `Become a ${persona.charAt(0).toUpperCase() + persona.slice(1)}`
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 500, letterSpacing: '1.2px', textTransform: 'uppercase',
      color: VENUE_MUTED, padding: '14px 10px 5px',
      fontFamily: 'var(--font-jetbrains-mono), monospace', whiteSpace: 'nowrap',
    }}>
      {label}
    </div>
  )
}

function NavLink({ item, active, badge, collapsed }: { item: NavItem; active: boolean; badge: number | null; collapsed: boolean }) {
  const [hovered, setHovered] = useState(false)

  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative', display: 'flex', alignItems: 'center', gap: 10,
        padding: collapsed ? '10px 0' : '9px 10px 9px 14px',
        borderRadius: 6, justifyContent: collapsed ? 'center' : undefined,
        cursor: 'pointer', textDecoration: 'none',
        transition: 'background 160ms ease',
        background: active ? 'var(--venue-amber-tint)' : hovered && !active ? VENUE_HOVER : 'transparent',
        marginBottom: 1,
      }}
    >
      {active && !collapsed && (
        <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: VENUE_AMBER, borderRadius: '0 3px 3px 0' }} />
      )}
      <span
        className="material-symbols-outlined"
        style={{
          fontSize: 20, flexShrink: 0,
          color: active ? VENUE_AMBER : VENUE_MUTED,
          fontVariationSettings: active ? "'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24" : "'FILL' 0,'wght' 300,'GRAD' 0,'opsz' 24",
          transition: 'color 160ms ease',
        }}
      >
        {item.icon}
      </span>

      {collapsed && badge !== null && (
        <span style={{ position: 'absolute', top: 7, right: 8, width: 7, height: 7, borderRadius: '50%', background: VENUE_AMBER, border: '1.5px solid var(--venue-bg-surface)' }} />
      )}

      {!collapsed && (
        <>
          <span style={{
            fontSize: 13.5, fontWeight: item.primary ? 600 : 500,
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            color: active ? 'var(--venue-text-primary)' : 'var(--venue-text-secondary)',
            flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            transition: 'color 160ms ease',
          }}>
            {item.label}
          </span>
          {badge !== null && (
            <span style={{ background: VENUE_AMBER, color: '#000', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 9999, flexShrink: 0, fontFamily: 'var(--font-inter), system-ui, sans-serif', lineHeight: '16px' }}>
              {badge}
            </span>
          )}
          {item.soon && (
            <span style={{ fontSize: 9, border: '1px solid currentColor', padding: '1px 5px', color: VENUE_MUTED, fontFamily: 'var(--font-jetbrains-mono), monospace' }}>
              SOON
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

export default function VenueSidebarClient({
  businessName, ownerName, initials, avatarUrl,
  pendingCount, unreadCount,
  hasCreatorProfile = false,
  businessType = 'venue',
  personas = [],
}: VenueSidebarClientProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(true)
  const [workspaceOpen, setWorkspaceOpen] = useState(false)

  const NAV_SECTIONS = businessType === 'brand' ? NAV_SECTIONS_BRAND : NAV_SECTIONS_VENUE

  const currentPersona: PersonaKey = businessType === 'brand' ? 'brand' : 'venue'
  const hasVenueActive    = personas.includes('venue') || personas.includes('business')
  const hasExplorerActive = personas.includes('explorer')
  // "Add workspace" = personas the user doesn't have yet (excluding current workspace)
  const missingPersonas = ALL_PERSONAS.filter(p => {
    if (p === currentPersona) return false
    if (p === 'creator')  return !hasCreatorProfile
    if (p === 'venue')    return !hasVenueActive
    if (p === 'explorer') return !hasExplorerActive
    if (p === 'brand')    return !personas.includes('brand')
    return false
  })

  useEffect(() => {
    const saved = localStorage.getItem('wimc-sidebar-collapsed')
    if (saved !== null) {
      setCollapsed(saved === 'true')
    }
    // Default (null + desktop): keep collapsed = true, matching CSS --venue-sidebar-w: 64px
  }, [])

  useEffect(() => { setWorkspaceOpen(false) }, [pathname])

  function toggleCollapse() {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem('wimc-sidebar-collapsed', String(next))
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

  useEffect(() => {
    document.documentElement.style.setProperty('--venue-sidebar-w', `${sidebarWidth}px`)
  }, [sidebarWidth])

  return (
    <aside className="dash-sidebar" style={{
      width: sidebarWidth, minHeight: '100vh',
      background: 'var(--venue-bg-surface)', borderRight: `1px solid ${VENUE_BORDER}`,
      display: 'flex', flexDirection: 'column', padding: '20px 0 0',
      position: 'fixed', top: 0, left: 0, zIndex: 50,
      transition: 'width 220ms cubic-bezier(0.4, 0, 0.2, 1)', overflow: 'hidden',
    }}>

      {/* ── Header: hamburger + workspace switcher ────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        gap: collapsed ? 4 : 8,
        padding: collapsed ? '0 0 16px' : '0 12px 16px',
        borderBottom: `1px solid ${VENUE_BORDER}`,
        justifyContent: 'center',
        flexDirection: collapsed ? 'column' : 'row',
        flexShrink: 0,
      }}>
        {/* Hamburger — always visible at top */}
        <button
          onClick={toggleCollapse}
          title={collapsed ? 'Expand menu' : 'Collapse menu'}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 34, height: 34, borderRadius: 8, border: 'none',
            background: 'transparent', cursor: 'pointer',
            color: 'rgba(255,255,255,0.55)', flexShrink: 0,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
            {collapsed ? 'menu' : 'menu_open'}
          </span>
        </button>

        {/* Workspace button — expanded only */}
        {!collapsed && (
          <button
            onClick={() => setWorkspaceOpen(v => !v)}
            style={{
              flex: 1, minWidth: 0,
              display: 'flex', alignItems: 'center', gap: 7,
              background: workspaceOpen ? 'rgba(245,168,0,0.10)' : 'transparent',
              border: `1px solid ${workspaceOpen ? 'rgba(245,168,0,0.30)' : 'transparent'}`,
              borderRadius: 8, padding: '6px 8px',
              cursor: 'pointer',
              transition: 'background 160ms ease, border-color 160ms ease',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: VENUE_AMBER, flexShrink: 0 }}>
              {businessType === 'brand' ? 'campaign' : 'storefront'}
            </span>
            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: VENUE_AMBER,
                letterSpacing: '1.5px', textTransform: 'uppercase',
                fontFamily: 'var(--font-jetbrains-mono), monospace',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {businessType === 'brand' ? 'Brand' : 'Venue'}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.30)', fontFamily: 'var(--font-jetbrains-mono), monospace' }}>
                {businessName}
              </div>
            </div>
            <span className="material-symbols-outlined" style={{
              fontSize: 14, color: 'rgba(255,255,255,0.30)', flexShrink: 0,
              transition: 'transform 200ms ease',
              transform: workspaceOpen ? 'rotate(180deg)' : 'none',
            }}>
              expand_more
            </span>
          </button>
        )}

        {/* Collapsed: workspace switch shortcut */}
        {collapsed && personas.length > 0 && (
          <button
            onClick={() => { setCollapsed(false); localStorage.setItem('wimc-sidebar-collapsed', 'false'); setWorkspaceOpen(true) }}
            title="Switch workspace"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 34, height: 34, borderRadius: 8, border: 'none',
              background: 'transparent', cursor: 'pointer',
              color: 'rgba(255,255,255,0.30)', position: 'relative',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>swap_horiz</span>
          </button>
        )}
      </div>

      {/* ── Workspace dropdown ─────────────────────────────────────────────── */}
      {workspaceOpen && !collapsed && (
        <div style={{
          margin: '0 8px',
          background: 'rgba(0,0,0,0.2)',
          border: `1px solid ${VENUE_BORDER}`,
          borderRadius: 10, overflow: 'hidden', flexShrink: 0,
        }}>
          {/* Current workspace — active with checkmark */}
          {(() => {
            const meta = WORKSPACE_META[currentPersona]
            return (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px',
                background: `rgba(${currentPersona === 'brand' ? '245,168,0' : '93,217,208'},0.08)`,
                borderBottom: `1px solid ${VENUE_BORDER}`,
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: meta.color, flexShrink: 0 }}>{meta.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: meta.color }}>{meta.label}</div>
                  <div style={{ fontSize: 10, color: VENUE_MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{businessName}</div>
                </div>
                <span className="material-symbols-outlined" style={{ fontSize: 14, color: meta.color }}>check</span>
              </div>
            )
          })()}

          {/* Other active workspaces */}
          {ALL_PERSONAS.filter(p => p !== currentPersona).map(p => {
            const isActive =
              p === 'creator'  ? hasCreatorProfile :
              p === 'venue'    ? hasVenueActive :
              p === 'explorer' ? hasExplorerActive :
              p === 'brand'    ? personas.includes('brand') : false
            if (!isActive) return null
            const meta = WORKSPACE_META[p]
            return (
              <Link
                key={p}
                href={meta.href}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', textDecoration: 'none',
                  borderBottom: `1px solid ${VENUE_BORDER}`,
                  transition: 'background 150ms ease',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = `rgba(255,255,255,0.04)`}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: meta.color, flexShrink: 0 }}>{meta.icon}</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: meta.color }}>{meta.label}</span>
                <span className="material-symbols-outlined" style={{ fontSize: 14, color: VENUE_MUTED }}>arrow_forward</span>
              </Link>
            )
          })}

          {/* Add workspace — missing personas */}
          {missingPersonas.length > 0 && (
            <div>
              <div style={{ padding: '6px 12px 4px', fontSize: 9, color: VENUE_MUTED, fontFamily: 'var(--font-jetbrains-mono), monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Add workspace
              </div>
              {missingPersonas.map(p => (
                <Link
                  key={p}
                  href={personaEntryUrl(p as PersonaKey)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '7px 12px', textDecoration: 'none',
                    transition: 'background 150ms ease',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 15, color: VENUE_MUTED, flexShrink: 0 }}>add_circle</span>
                  <span style={{ fontSize: 12, color: VENUE_MUTED }}>{personaLabel(p as PersonaKey)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Nav ───────────────────────────────────────────────────────────────── */}
      <nav style={{ flex: 1, padding: collapsed ? '8px 8px' : '8px 10px', display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden' }}>
        {NAV_SECTIONS.map((section, si) => (
          <div key={section.group}>
            {collapsed && si > 0 && <div style={{ height: 1, background: VENUE_BORDER, margin: '6px 8px' }} />}
            {!collapsed && <SectionLabel label={section.group} />}

            {section.items.map(item => (
              item.soon ? (
                <div
                  key={item.href}
                  title={collapsed ? item.label : undefined}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: collapsed ? '10px 0' : '9px 10px 9px 14px',
                    borderRadius: 6, justifyContent: collapsed ? 'center' : undefined,
                    opacity: 0.35, cursor: 'not-allowed', marginBottom: 1,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20, flexShrink: 0, color: VENUE_MUTED }}>{item.icon}</span>
                  {!collapsed && (
                    <>
                      <span style={{ fontSize: 13.5, fontWeight: 500, fontFamily: 'var(--font-inter), system-ui, sans-serif', color: 'var(--venue-text-secondary)', flex: 1, whiteSpace: 'nowrap' }}>{item.label}</span>
                      <span style={{ fontSize: 9, border: '1px solid currentColor', padding: '1px 5px', color: VENUE_MUTED, fontFamily: 'var(--font-jetbrains-mono), monospace' }}>SOON</span>
                    </>
                  )}
                </div>
              ) : (
                <NavLink key={item.href} item={item} active={isActive(item)} badge={getBadge(item.badgeKey)} collapsed={collapsed} />
              )
            ))}
          </div>
        ))}
      </nav>

      {/* ── Footer: owner info + collapse toggle ──────────────────────────────── */}
      <div style={{ borderTop: `1px solid ${VENUE_BORDER}`, padding: collapsed ? '12px 8px 0' : '10px 10px 0' }}>
        <Link
          href={businessType === 'brand' ? '/business/brand/profile' : '/business/venue/profile'}
          title={collapsed ? `${ownerName} · Profile` : undefined}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: collapsed ? '8px 0' : '8px 10px',
            justifyContent: collapsed ? 'center' : undefined,
            borderRadius: 6, textDecoration: 'none',
            transition: 'background 160ms ease',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = VENUE_HOVER }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--venue-bg-overlay)', border: '2px solid transparent',
            display: 'grid', placeItems: 'center',
            fontWeight: 700, fontSize: 12, color: 'var(--venue-text-primary)',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            flexShrink: 0, overflow: 'hidden',
          }}>
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={ownerName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : initials}
          </div>

          {!collapsed && (
            <>
              <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-inter), system-ui, sans-serif', color: 'var(--venue-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>{ownerName}</div>
                <div style={{ fontSize: 11, color: VENUE_MUTED, fontFamily: 'var(--font-inter), system-ui, sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{businessName}</div>
              </div>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: VENUE_MUTED, flexShrink: 0 }}>settings</span>
            </>
          )}
        </Link>

      </div>
    </aside>
  )
}
