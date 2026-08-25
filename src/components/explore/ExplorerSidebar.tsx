'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { WimcWordmark } from '@/components/WimcWordmark'
import TabbedNavGroup from '@/components/nav/TabbedNavGroup'

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

const NAV_GROUP_THEME = {
  activeColor: LAVENDER,
  activeBg:    'rgba(155,143,255,0.14)',
  textColor:   'rgba(255,255,255,0.55)',
  mutedColor:  'rgba(255,255,255,0.30)',
  fontFamily:  'var(--font-jetbrains-mono)',
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ExplorerSidebarProps {
  displayName: string
  username: string
  initials: string
  avatarUrl?: string | null
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ExplorerSidebar({
  displayName,
  username,
  initials,
  avatarUrl,
}: ExplorerSidebarProps) {
  const pathname = usePathname()
  const [isExpanded, setIsExpanded] = useState(false)
  const pendingCollapseRef = useRef(false)
  const c = !isExpanded

  const activeBg = `rgba(155,143,255,0.14)`

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
        gap: 10,
        padding: c ? '0 0 20px' : '0 14px 20px',
        borderBottom: `1px solid ${SB_BORDER}`,
        justifyContent: c ? 'center' : 'flex-start',
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

        {isExpanded && (
          <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', minWidth: 0 }}>
            <WimcWordmark color="white" height={22} />
          </div>
        )}
      </div>

      {/* ── Explorer label ──────────────────────────────────────────────── */}
      {isExpanded && (
        <div style={{
          padding: '10px 14px 6px',
          fontSize: 9, fontWeight: 700,
          color: LAVENDER,
          letterSpacing: '2px',
          textTransform: 'uppercase',
          fontFamily: 'var(--font-jetbrains-mono)',
        }}>
          Explorer
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
        <TabbedNavGroup
          icon="bookmark"
          label="Saved"
          collapsed={c}
          theme={NAV_GROUP_THEME}
          tabs={[
            { label: 'Events', href: '/explore/dashboard/saved' },
            { label: 'People', href: '/explore/dashboard/following' },
            { label: 'Places', href: '/explore/dashboard/spots' },
          ]}
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
