'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { WimcWordmark } from '@/components/WimcWordmark'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LAVENDER     = '#9B8FFF'
const SB_BG        = '#1A2744'
const SB_BORDER    = 'rgba(255,255,255,0.07)'
const SB_TEXT      = 'rgba(255,255,255,0.55)'
const SB_MUTED     = 'rgba(255,255,255,0.30)'
const EXPANDED_W   = 220
const COLLAPSED_W  = 60

// ---------------------------------------------------------------------------
// Workspace switcher — mirrors src/components/dashboard/Sidebar.tsx's (Creator)
// and src/components/venue/VenueSidebarClient.tsx's (Venue/Brand) identical
// pattern, so Explorer isn't the one persona stranded without a way back to
// another active workspace.
// ---------------------------------------------------------------------------

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
  if (persona === 'venue') return 'List an Venue'
  return `Become a ${persona.charAt(0).toUpperCase() + persona.slice(1)}`
}

const WORKSPACE_META: Record<string, { icon: string; label: string; color: string; href: string }> = {
  creator:  { icon: 'palette',    label: 'Creator', color: '#E8705A', href: '/dashboard' },
  venue:    { icon: 'storefront', label: 'Venue',   color: '#5DD9D0', href: '/business/venue/dashboard' },
  brand:    { icon: 'campaign',   label: 'Brand',   color: '#F5A800', href: '/business/brand/dashboard' },
}

// ---------------------------------------------------------------------------
// Nav items
// ---------------------------------------------------------------------------

interface NavItem {
  href: string
  icon: string
  label: string
  exact?: boolean
}

const DISCOVER_NAV: NavItem[] = [
  { href: '/explore/dashboard/browse',        icon: 'explore',             label: 'Explore',       exact: false },
  // Circles (getCommunitiesForUser/requestCommunity, '@/app/actions/communities')
  // has no persona/role gate — requireProfile() only — so any Explorer can
  // browse/join/start one, same as a Creator.
  { href: '/circles',                         icon: 'groups',              label: 'Circles',       exact: false },
]

const DISCOVER_NAV_AFTER_SAVED: NavItem[] = [
  { href: '/explore/dashboard/tickets',       icon: 'confirmation_number', label: 'Tickets' },
  { href: '/explore/dashboard/notifications', icon: 'notifications',       label: 'Notifications' },
]

const YOU_NAV: NavItem[] = [
  { href: '/explore/dashboard/studio', icon: 'web', label: 'My Page', exact: true },
  { href: '/explore/dashboard/guide',  icon: 'map', label: 'City Guide' },
]

const SAVED_ITEM: NavItem = { href: '/explore/dashboard/saved', icon: 'bookmark', label: 'Saved' }

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ExplorerSidebarProps {
  displayName: string
  username: string
  initials: string
  avatarUrl?: string | null
  /** Other active personas (plus legacy-fallback entries already resolved by the
   *  caller, mirroring dashboard/layout.tsx's sidebarPersonas) — drives the
   *  workspace switcher below. Defaults to none (switcher just won't offer any). */
  personas?: string[]
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ExplorerSidebar({
  displayName,
  username,
  initials,
  avatarUrl,
  personas = [],
}: ExplorerSidebarProps) {
  const pathname = usePathname()
  const [isExpanded, setIsExpanded] = useState(false)
  const [workspaceOpen, setWorkspaceOpen] = useState(false)
  const pendingCollapseRef = useRef(false)
  const c = !isExpanded

  const activeBg = `rgba(155,143,255,0.14)`

  const hasVenue = personas.includes('venue') || personas.includes('business')
  const hasBrand = personas.includes('brand')
  const missing  = ALL_PERSONAS.filter(p => !personas.includes(p) && p !== 'explorer')

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--wimc-sidebar-w',
      isExpanded ? `${EXPANDED_W}px` : `${COLLAPSED_W}px`,
    )
  }, [isExpanded])

  // Flush a collapse that was armed by a nav-link click once the router has
  // actually committed the new route (pathname changes together with the new
  // page's content being ready — not optimistically at click time).
  useEffect(() => {
    if (pendingCollapseRef.current) {
      pendingCollapseRef.current = false
      closeSidebar()
    }
  }, [pathname])

  // Close workspace menu on navigation
  useEffect(() => { setWorkspaceOpen(false) }, [pathname])

  function isActive(item: NavItem) {
    if (item.exact) return pathname === item.href
    return pathname === item.href || pathname.startsWith(item.href + '/')
  }

  function toggleExpand() {
    pendingCollapseRef.current = false
    setIsExpanded(v => !v)
  }

  // Selecting any link in the sidebar navigates AND slides the panel back
  // into the icon-only rail, so it doesn't stay pinned open over the page.
  function closeSidebar() {
    setIsExpanded(false)
  }

  // Workspace-switcher links jump to a different persona's layout, which
  // unmounts this sidebar entirely — collapse immediately so the next
  // sidebar mounts already collapsed (no route to defer to).
  function handleWorkspaceClick(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest('a')) closeSidebar()
  }

  // Nav links stay within this same layout, so defer the collapse until the
  // router actually commits the new route (see the pathname effect above)
  // instead of collapsing before the new page has loaded.
  function handleNavClick(e: React.MouseEvent) {
    const anchor = (e.target as HTMLElement).closest('a')
    if (!anchor) return
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    if (!isExpanded) return
    if (anchor.getAttribute('href') === pathname) { closeSidebar(); return }
    pendingCollapseRef.current = true
  }

  return (
    <aside style={{
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

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: c ? 4 : 10,
        padding: c ? '0 0 20px' : '0 14px 20px',
        borderBottom: `1px solid ${SB_BORDER}`,
        justifyContent: c ? 'center' : 'flex-start',
        flexDirection: c ? 'column' : 'row',
        flexShrink: 0,
      }}>
        <button
          onClick={toggleExpand}
          title={isExpanded ? 'Collapse menu' : 'Expand menu'}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 36, height: 36, borderRadius: 8, border: 'none',
            background: 'transparent', cursor: 'pointer',
            color: SB_TEXT, flexShrink: 0, transition: 'color 180ms ease',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
            {isExpanded ? 'menu_open' : 'menu'}
          </span>
        </button>

        {/* Collapsed: workspace icon button — matches Sidebar.tsx (Creator) /
            VenueSidebarClient.tsx's identical collapsed affordance. */}
        {c && (hasVenue || hasBrand || missing.length > 0) && (
          <button
            onClick={() => { setIsExpanded(true); setWorkspaceOpen(true) }}
            title="Switch workspace"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 34, height: 34, borderRadius: 8, border: 'none',
              background: 'transparent', cursor: 'pointer',
              color: SB_MUTED, position: 'relative',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>swap_horiz</span>
            {(hasVenue || hasBrand) && (
              <span style={{
                position: 'absolute', top: 4, right: 4,
                width: 6, height: 6, borderRadius: '50%',
                background: hasVenue ? '#5DD9D0' : '#F5A800',
              }} />
            )}
          </button>
        )}

        {isExpanded && (
          <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', minWidth: 0 }}>
            <WimcWordmark color="white" height={22} />
          </div>
        )}
      </div>

      {/* ── Explorer label / workspace switcher ─────────────────────────── */}
      {isExpanded && (
        <button
          onClick={() => setWorkspaceOpen(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            width: '100%',
            padding: '10px 14px 6px',
            background: 'transparent', border: 'none', cursor: 'pointer',
          }}
        >
          <span style={{
            flex: 1, textAlign: 'left',
            fontSize: 9, fontWeight: 700,
            color: LAVENDER,
            letterSpacing: '2px',
            textTransform: 'uppercase',
            fontFamily: 'var(--font-jetbrains-mono)',
          }}>
            Explorer
          </span>
          <span className="material-symbols-outlined" style={{
            fontSize: 14, color: SB_MUTED,
            transition: 'transform 200ms ease',
            transform: workspaceOpen ? 'rotate(180deg)' : 'none',
          }}>
            expand_more
          </span>
        </button>
      )}

      {/* ── Workspace dropdown (inline, below label) ────────────────────── */}
      {workspaceOpen && isExpanded && (
        <div onClick={handleWorkspaceClick} style={{
          margin: '0 8px 8px',
          background: 'rgba(0,0,0,0.25)',
          border: `1px solid ${SB_BORDER}`,
          borderRadius: 10,
          overflow: 'hidden',
          flexShrink: 0,
        }}>
          {/* Current: Explorer */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 12px',
            background: 'rgba(155,143,255,0.1)',
            borderBottom: `1px solid ${SB_BORDER}`,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: LAVENDER, flexShrink: 0 }}>explore</span>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: LAVENDER }}>Explorer</span>
            <span className="material-symbols-outlined" style={{ fontSize: 14, color: LAVENDER }}>check</span>
          </div>

          {/* Other active workspaces */}
          {ALL_PERSONAS.filter(p => p !== 'explorer').map(p => {
            const isActive = p === 'venue' ? hasVenue : p === 'brand' ? hasBrand : personas.includes(p)
            if (!isActive) return null
            const meta = WORKSPACE_META[p]
            return (
              <Link
                key={p}
                href={meta.href}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', textDecoration: 'none',
                  borderBottom: `1px solid ${SB_BORDER}`,
                  transition: 'background 150ms ease',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: meta.color, flexShrink: 0 }}>{meta.icon}</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: meta.color }}>{meta.label}</span>
                <span className="material-symbols-outlined" style={{ fontSize: 14, color: SB_MUTED }}>arrow_forward</span>
              </Link>
            )
          })}

          {/* Divider + Add workspace section */}
          {missing.length > 0 && (
            <div>
              <div style={{ padding: '6px 12px 4px', fontSize: 9, color: SB_MUTED, fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Add workspace
              </div>
              {missing.map(p => (
                <Link
                  key={p}
                  href={personaEntryUrl(p)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '7px 12px', textDecoration: 'none',
                    transition: 'background 150ms ease',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 15, color: SB_MUTED, flexShrink: 0 }}>add_circle</span>
                  <span style={{ fontSize: 12, color: SB_MUTED }}>{personaLabel(p)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav onClick={handleNavClick} style={{
        flex: 1,
        padding: '8px 8px',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        overflowY: 'auto',
        overflowX: 'hidden',
      }}>
        {!c && <SectionLabel>Discover</SectionLabel>}
        {DISCOVER_NAV.map((item) => (
          <NavItemLink key={item.href} item={item} active={isActive(item)} collapsed={c} activeBg={activeBg} />
        ))}
        <NavItemLink
          item={SAVED_ITEM}
          active={
            pathname.startsWith('/explore/dashboard/saved') ||
            pathname.startsWith('/explore/dashboard/following') ||
            pathname.startsWith('/explore/dashboard/spots')
          }
          collapsed={c}
          activeBg={activeBg}
        />
        {DISCOVER_NAV_AFTER_SAVED.map((item) => (
          <NavItemLink key={item.href} item={item} active={isActive(item)} collapsed={c} activeBg={activeBg} />
        ))}

        {!c && <SectionLabel>You</SectionLabel>}
        {YOU_NAV.map((item) => (
          <NavItemLink key={item.href} item={item} active={isActive(item)} collapsed={c} activeBg={activeBg} />
        ))}
      </nav>

      {/* ── User footer ─────────────────────────────────────────────────── */}
      <Link
        href="/explore/dashboard/settings"
        title={c ? `${displayName} · Settings` : undefined}
        onClick={handleNavClick}
        style={{
          padding: c ? '14px 0' : '12px 14px',
          borderTop: `1px solid ${SB_BORDER}`,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          justifyContent: c ? 'center' : 'flex-start',
          textDecoration: 'none',
          flexShrink: 0,
        }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: avatarUrl ? 'transparent' : `linear-gradient(135deg, ${LAVENDER}, rgba(155,143,255,0.5))`,
          display: 'grid', placeItems: 'center',
          fontWeight: 700, fontSize: 13, flexShrink: 0,
          color: '#fff', overflow: 'hidden',
        }}>
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            initials
          )}
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
      flexShrink: 0,
    }}>
      {children}
    </div>
  )
}

function NavItemLink({ item, active, collapsed, activeBg }: { item: NavItem; active: boolean; collapsed: boolean; activeBg: string }) {
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: collapsed ? 0 : 10,
        padding: collapsed ? '9px 0' : '9px 10px',
        borderRadius: 6,
        fontSize: 13.5,
        fontWeight: 500,
        textDecoration: 'none',
        transition: 'background 220ms ease, color 220ms ease',
        color: active ? LAVENDER : SB_TEXT,
        background: active ? activeBg : 'transparent',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
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
      {!collapsed && (
        <span style={{ flex: 1, minWidth: 0 }}>{item.label}</span>
      )}
    </Link>
  )
}
