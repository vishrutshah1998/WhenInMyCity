'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { UserTier } from '@/types/database'

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
  sublabel?: string
}

const CORE_NAV: NavItem[] = [
  { href: '/dashboard',          icon: 'dashboard', label: 'Dashboard', exact: true },
  { href: '/dashboard/studio',   icon: 'web',       label: 'My Page', sublabel: 'Link-in-bio' },
  { href: '/dashboard/events',   icon: 'event',     label: 'Events' },
  { href: '/dashboard/explore',  icon: 'explore',   label: 'Explore' },
]

const EARN_ITEM: NavItem     = { href: '/dashboard/earn',     icon: 'sell',           label: 'Earn' }
const BOOKINGS_ITEM: NavItem = { href: '/dashboard/bookings', icon: 'calendar_today', label: 'Bookings' }

const GROWTH_NAV: NavItem[] = [
  { href: '/dashboard/leads',     icon: 'group',     label: 'Leads' },
  { href: '/dashboard/analytics', icon: 'bar_chart', label: 'Analytics' },
  { href: '/dashboard/payouts',   icon: 'payments',  label: 'Payouts' },
]

const SPACES_NAV: NavItem[] = [
  { href: '/dashboard/venues', icon: 'apartment',  label: 'Addas' },
]

const COMMUNITY_ITEM: NavItem = { href: '/dashboard/community', icon: 'diversity_3', label: 'My Circles' }

const EXPANDED_W = 220
const COLLAPSED_W = 60

const SB_BG     = '#1A2744'
const SB_BORDER = 'rgba(255,255,255,0.07)'
const SB_TEXT   = 'rgba(255,255,255,0.55)'
const SB_MUTED  = 'rgba(255,255,255,0.30)'

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

const ALL_PERSONAS = ['creator', 'explorer', 'venue', 'brand'] as const
type PersonaKey = typeof ALL_PERSONAS[number]

function personaEntryUrl(persona: PersonaKey): string {
  switch (persona) {
    case 'creator':  return '/onboarding?mode=add&persona=creator'
    case 'explorer': return '/onboarding?mode=add&persona=explorer'
    case 'venue':    return '/onboarding?mode=add&persona=venue'
    case 'brand':    return '/onboarding?mode=add&persona=brand'
  }
}

function personaLabel(persona: PersonaKey): string {
  if (persona === 'venue')    return 'List an Adda'
  if (persona === 'explorer') return 'Become an Explorer'
  return `Become a ${persona.charAt(0).toUpperCase() + persona.slice(1)}`
}

const WORKSPACE_META: Record<string, { icon: string; label: string; color: string; href: string }> = {
  creator:  { icon: 'palette',    label: 'Creator',  color: '#E8705A', href: '/dashboard' },
  venue:    { icon: 'storefront', label: 'Adda',     color: '#5DD9D0', href: '/business/venue/dashboard' },
  explorer: { icon: 'explore',    label: 'Explorer', color: '#9B8FFF', href: '/explore/dashboard' },
  brand:    { icon: 'campaign',   label: 'Brand',    color: '#F5A800', href: '/business/brand/dashboard' },
}

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
  pendingHubRequests?: number
  accentColor?: string
  personas?: string[]
}

export default function Sidebar({
  username, displayName, tier, initials,
  hasAnyEvent, hasPublishedEvent, hasAnyRsvp,
  eventsHostedCount, unreadHubMessages = 0, pendingHubRequests = 0,
  accentColor = '#E8705A',
  personas = [],
}: SidebarProps) {
  const pathname = usePathname()
  const [isExpanded, setIsExpanded] = useState(false)
  const [workspaceOpen, setWorkspaceOpen] = useState(false)
  const isNewCreator = eventsHostedCount < 3
  const c = !isExpanded

  const SB_ACTIVE    = accentColor
  const SB_ACTIVE_BG = hexToRgba(accentColor, 0.14)

  const hasAdda   = personas.includes('venue') || personas.includes('business')
  const hasBrand  = personas.includes('brand')
  const otherWorkspaces = personas.filter(p => p !== 'creator' && p !== 'explorer')
  const missing = ALL_PERSONAS.filter(p => !personas.includes(p) && p !== 'creator')

  // Restore collapse state from shared key on mount
  useEffect(() => {
    const saved = localStorage.getItem('wimc-sidebar-collapsed')
    if (saved === 'false') setIsExpanded(true)
    else if (saved === null && window.innerWidth >= 768) setIsExpanded(false)
  }, [])

  // Close workspace menu on navigation
  useEffect(() => { setWorkspaceOpen(false) }, [pathname])

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--wimc-sidebar-w',
      isExpanded ? `${EXPANDED_W}px` : `${COLLAPSED_W}px`,
    )
  }, [isExpanded])

  function toggleExpand() {
    setIsExpanded(v => {
      const next = !v
      localStorage.setItem('wimc-sidebar-collapsed', next ? 'false' : 'true')
      return next
    })
  }

  function isActive(item: NavItem) {
    if (item.exact) return pathname === item.href
    return pathname === item.href || pathname.startsWith(item.href + '/')
  }

  return (
    <aside className="dash-sidebar" style={{
      width: isExpanded ? EXPANDED_W : COLLAPSED_W,
      minHeight: '100vh',
      background: SB_BG,
      borderRight: `1px solid ${SB_BORDER}`,
      display: 'flex',
      flexDirection: 'column',
      padding: '16px 0',
      position: 'fixed',
      top: 0, left: 0,
      zIndex: 50,
      transition: 'width 250ms cubic-bezier(.4,0,.2,1)',
      overflow: 'hidden',
    }}>

      {/* ── Header: hamburger + workspace switcher ──────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: c ? 4 : 8,
        padding: c ? '0 0 16px' : '0 12px 16px',
        borderBottom: `1px solid ${SB_BORDER}`,
        justifyContent: 'center',
        flexDirection: c ? 'column' : 'row',
        flexShrink: 0,
      }}>
        {/* Hamburger */}
        <button
          onClick={toggleExpand}
          title={isExpanded ? 'Collapse menu' : 'Expand menu'}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 34, height: 34, borderRadius: 8, border: 'none',
            background: 'transparent', cursor: 'pointer',
            color: SB_TEXT, flexShrink: 0,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
            {isExpanded ? 'menu_open' : 'menu'}
          </span>
        </button>

        {/* Workspace switcher — expanded */}
        {isExpanded && (
          <button
            onClick={() => setWorkspaceOpen(v => !v)}
            style={{
              flex: 1, minWidth: 0,
              display: 'flex', alignItems: 'center', gap: 7,
              background: workspaceOpen ? hexToRgba(accentColor, 0.1) : 'transparent',
              border: `1px solid ${workspaceOpen ? hexToRgba(accentColor, 0.3) : 'transparent'}`,
              borderRadius: 8, padding: '6px 8px',
              cursor: 'pointer',
              transition: 'background 160ms ease, border-color 160ms ease',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: SB_ACTIVE, flexShrink: 0 }}>
              palette
            </span>
            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: SB_ACTIVE,
                letterSpacing: '1.5px', textTransform: 'uppercase',
                fontFamily: 'var(--font-jetbrains-mono)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                Creator
              </div>
              <div style={{ fontSize: 10, color: SB_MUTED, fontFamily: 'var(--font-jetbrains-mono)' }}>
                {TIER_LABELS[tier]}
              </div>
            </div>
            <span className="material-symbols-outlined" style={{
              fontSize: 14, color: SB_MUTED, flexShrink: 0,
              transition: 'transform 200ms ease',
              transform: workspaceOpen ? 'rotate(180deg)' : 'none',
            }}>
              expand_more
            </span>
          </button>
        )}

        {/* Collapsed: workspace icon button */}
        {c && (hasAdda || missing.length > 0) && (
          <button
            onClick={() => { setIsExpanded(true); localStorage.setItem('wimc-sidebar-collapsed', 'false'); setWorkspaceOpen(true) }}
            title="Switch workspace"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 34, height: 34, borderRadius: 8, border: 'none',
              background: 'transparent', cursor: 'pointer',
              color: SB_MUTED, position: 'relative',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>swap_horiz</span>
            {hasAdda && (
              <span style={{
                position: 'absolute', top: 4, right: 4,
                width: 6, height: 6, borderRadius: '50%',
                background: '#5DD9D0',
              }} />
            )}
          </button>
        )}
      </div>

      {/* ── Workspace dropdown (inline, below header) ───────────────────── */}
      {workspaceOpen && isExpanded && (
        <div style={{
          margin: '0 8px',
          background: 'rgba(0,0,0,0.25)',
          border: `1px solid ${SB_BORDER}`,
          borderRadius: 10,
          overflow: 'hidden',
          flexShrink: 0,
        }}>
          {/* Section: active workspaces */}
          {/* Current: Creator */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 12px',
            background: hexToRgba(accentColor, 0.1),
            borderBottom: `1px solid ${SB_BORDER}`,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: SB_ACTIVE, flexShrink: 0 }}>palette</span>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: SB_ACTIVE }}>Creator</span>
            <span className="material-symbols-outlined" style={{ fontSize: 14, color: SB_ACTIVE }}>check</span>
          </div>

          {/* Adda workspace — if user has venue persona */}
          {hasAdda && (
            <Link
              href="/business/venue/dashboard"
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', textDecoration: 'none',
                borderBottom: (personas.includes('explorer') || hasBrand || missing.length > 0) ? `1px solid ${SB_BORDER}` : 'none',
                transition: 'background 150ms ease',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(93,217,208,0.08)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#5DD9D0', flexShrink: 0 }}>storefront</span>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#5DD9D0' }}>Adda</span>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: SB_MUTED }}>arrow_forward</span>
            </Link>
          )}

          {/* Explorer workspace — if user has explorer persona */}
          {personas.includes('explorer') && (
            <Link
              href="/dashboard"
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', textDecoration: 'none',
                borderBottom: (hasBrand || missing.length > 0) ? `1px solid ${SB_BORDER}` : 'none',
                transition: 'background 150ms ease',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(155,143,255,0.08)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#9B8FFF', flexShrink: 0 }}>explore</span>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#9B8FFF' }}>Explorer</span>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: SB_MUTED }}>arrow_forward</span>
            </Link>
          )}

          {/* Brand workspace — if user has brand persona */}
          {hasBrand && (
            <Link
              href="/business/brand/dashboard"
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', textDecoration: 'none',
                borderBottom: missing.length > 0 ? `1px solid ${SB_BORDER}` : 'none',
                transition: 'background 150ms ease',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(245,168,0,0.08)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#F5A800', flexShrink: 0 }}>campaign</span>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#F5A800' }}>Brand</span>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: SB_MUTED }}>arrow_forward</span>
            </Link>
          )}

          {/* Divider + Add workspace section */}
          {missing.length > 0 && (
            <div>
              <div style={{ padding: '6px 12px 4px', fontSize: 9, color: SB_MUTED, fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Add workspace
              </div>
              {missing.map(p => (
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
                  <span className="material-symbols-outlined" style={{ fontSize: 15, color: SB_MUTED, flexShrink: 0 }}>add_circle</span>
                  <span style={{ fontSize: 12, color: SB_MUTED }}>{personaLabel(p as PersonaKey)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto', overflowX: 'hidden' }}>
        {!c && <SectionLabel>Creator</SectionLabel>}

        {CORE_NAV.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item)} collapsed={c} />
        ))}
        <NavLink item={EARN_ITEM} active={isActive(EARN_ITEM)} collapsed={c} />

        {(hasAnyEvent || hasAnyRsvp) && <NavLink item={BOOKINGS_ITEM} active={isActive(BOOKINGS_ITEM)} collapsed={c} />}

        {!c && <SectionLabel>Growth</SectionLabel>}
        {GROWTH_NAV.map((item) => {
          const sublabel = isNewCreator
            ? item.href === '/dashboard/analytics' ? 'Starts after first event'
            : item.href === '/dashboard/payouts'   ? 'Unlocks with first sale'
            : undefined
            : undefined
          return (
            <NavLink key={item.href} item={{ ...item, sublabel }} active={isActive(item)} collapsed={c} />
          )
        })}

        {!c && <SectionLabel>Spaces</SectionLabel>}
        {SPACES_NAV.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item)} collapsed={c} />
        ))}
        <NavLink
          item={{ href: '/dashboard/hub', icon: 'hub', label: 'Creator Hub', badge: tier !== 'wanderer' && (unreadHubMessages + pendingHubRequests) > 0 ? (unreadHubMessages + pendingHubRequests) : undefined }}
          active={isActive({ href: '/dashboard/hub', icon: 'hub', label: 'Creator Hub' })}
          collapsed={c}
          dimmed={tier === 'wanderer'}
        />
        {(tier === 'local' || tier === 'lantern' || tier === 'beacon') && (
          <NavLink item={COMMUNITY_ITEM} active={isActive(COMMUNITY_ITEM)} collapsed={c} />
        )}
        <NavLink
          item={{ href: '/hall-of-lights', icon: 'auto_awesome', label: 'Hall of Lights', sublabel: 'Top creators' }}
          active={isActive({ href: '/hall-of-lights', icon: 'auto_awesome', label: 'Hall of Lights' })}
          collapsed={c}
        />
        {c && (
          <NavLink
            item={{ href: '/dashboard/tier', icon: 'workspace_premium', label: 'Tier Progress' }}
            active={isActive({ href: '/dashboard/tier', icon: 'workspace_premium', label: 'Tier Progress' })}
            collapsed={c}
          />
        )}
      </nav>

      {/* ── User footer → Profile Settings ──────────────────────────────── */}
      <Link
        href="/dashboard/profile/settings"
        title={c ? `${displayName} · Profile Settings` : undefined}
        style={{
          padding: c ? '14px 0' : '12px 14px',
          borderTop: `1px solid ${SB_BORDER}`,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          justifyContent: c ? 'center' : 'flex-start',
          textDecoration: 'none',
          flexShrink: 0,
          transition: 'opacity 180ms ease',
        }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: `linear-gradient(135deg, ${accentColor}, ${accentColor}99)`,
          display: 'grid', placeItems: 'center',
          fontWeight: 700, fontSize: 13, flexShrink: 0,
          color: '#fff',
        }}>
          {initials}
        </div>

        {isExpanded && (
          <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {displayName}
            </div>
            <div style={{ fontSize: 11, color: SB_MUTED, fontFamily: 'var(--font-jetbrains-mono)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              @{username}
            </div>
          </div>
        )}

        {isExpanded && (
          <span className="material-symbols-outlined" style={{ fontSize: 16, color: SB_MUTED, flexShrink: 0 }}>
            settings
          </span>
        )}
      </Link>
    </aside>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase',
      color: SB_MUTED, padding: '12px 8px 6px',
      fontFamily: 'var(--font-jetbrains-mono)',
      whiteSpace: 'nowrap',
    }}>
      {children}
    </div>
  )
}

function NavLink({ item, active, collapsed, dimmed = false }: { item: NavItem; active: boolean; collapsed: boolean; dimmed?: boolean }) {
  const activeColor = 'var(--wimc-accent)'
  const activeBg    = 'color-mix(in srgb, var(--wimc-accent) 14%, transparent)'

  const style: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: collapsed ? 'center' : 'flex-start',
    gap: collapsed ? 0 : 10,
    padding: collapsed ? '9px 0' : '9px 10px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13.5,
    fontWeight: 500,
    textDecoration: 'none',
    transition: 'background 220ms ease, color 220ms ease',
    color: active ? activeColor : SB_TEXT,
    background: active ? activeBg : 'transparent',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    position: 'relative',
    opacity: dimmed ? 0.4 : 1,
  }

  return (
    <Link href={item.href} style={style} title={collapsed ? item.label : undefined}>
      <span
        className="material-symbols-outlined"
        style={{
          fontSize: 20, flexShrink: 0,
          fontVariationSettings: active
            ? "'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24"
            : "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24",
        }}
      >
        {item.icon}
      </span>

      {collapsed && item.badge != null && !item.soon && (
        <span style={{
          position: 'absolute', top: 6, right: 8,
          width: 6, height: 6, borderRadius: '50%',
          background: activeColor,
        }} />
      )}

      {!collapsed && (
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block' }}>{item.label}</span>
          {item.sublabel && (
            <span style={{
              display: 'block', fontSize: 11,
              color: 'rgba(255,255,255,0.30)',
              fontFamily: 'var(--font-dm-sans)',
              fontWeight: 400, marginTop: 1,
              whiteSpace: 'normal', lineHeight: 1.3,
            }}>
              {item.sublabel}
            </span>
          )}
        </span>
      )}

      {!collapsed && item.soon && (
        <span style={{
          marginLeft: 'auto', background: 'rgba(255,255,255,0.08)',
          color: SB_MUTED, fontSize: 10,
          fontFamily: 'var(--font-jetbrains-mono)',
          padding: '1px 6px', borderRadius: 9999, fontWeight: 600,
        }}>
          Soon
        </span>
      )}
      {!collapsed && item.badge != null && !item.soon && (
        <span style={{
          marginLeft: 'auto', background: activeColor,
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
