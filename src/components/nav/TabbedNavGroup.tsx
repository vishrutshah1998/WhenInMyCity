'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export interface TabbedNavGroupTab {
  label: string
  href: string
  badge?: number
}

export interface TabbedNavGroupTheme {
  activeColor: string
  activeBg: string
  textColor: string
  mutedColor: string
  fontFamily?: string
}

interface Props {
  icon: string
  label: string
  tabs: TabbedNavGroupTab[]
  collapsed: boolean
  theme: TabbedNavGroupTheme
  /** When true, the whole group renders nothing — used for hard-gated groups (e.g. below a tier threshold). */
  hidden?: boolean
}

/**
 * A nav item that bundles a few related pages under one sidebar slot.
 * No expand/collapse interaction — every tab always renders when the group
 * itself is visible, in both the collapsed icon rail and the expanded list.
 */
export default function TabbedNavGroup({ icon, label, tabs, collapsed, theme, hidden = false }: Props) {
  const pathname = usePathname()

  if (hidden) return null

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <div>
      {!collapsed && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '9px 10px 2px',
        }}>
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 15, flexShrink: 0, color: theme.mutedColor }}
          >
            {icon}
          </span>
          <span style={{
            fontSize: 10, letterSpacing: '0.8px', textTransform: 'uppercase',
            color: theme.mutedColor, fontFamily: theme.fontFamily,
            whiteSpace: 'nowrap',
          }}>
            {label}
          </span>
        </div>
      )}

      {tabs.map(tab => {
        const active = isActive(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            title={collapsed ? tab.label : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: collapsed ? 0 : 10,
              padding: collapsed ? '9px 0' : '7px 10px 7px 22px',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              textDecoration: 'none',
              transition: 'background 220ms ease, color 220ms ease',
              color: active ? theme.activeColor : theme.textColor,
              background: active ? theme.activeBg : 'transparent',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: collapsed ? 20 : 16, flexShrink: 0,
                fontVariationSettings: active
                  ? "'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24"
                  : "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24",
              }}
            >
              {collapsed ? icon : 'subdirectory_arrow_right'}
            </span>

            {collapsed && tab.badge != null && (
              <span style={{
                position: 'absolute', top: 6, right: 8,
                width: 6, height: 6, borderRadius: '50%',
                background: theme.activeColor,
              }} />
            )}

            {!collapsed && (
              <>
                <span style={{ flex: 1, minWidth: 0 }}>{tab.label}</span>
                {tab.badge != null && (
                  <span style={{
                    marginLeft: 'auto', background: theme.activeColor,
                    color: '#fff', fontSize: 10,
                    fontFamily: theme.fontFamily,
                    padding: '1px 6px', borderRadius: 9999, fontWeight: 600,
                  }}>
                    {tab.badge}
                  </span>
                )}
              </>
            )}
          </Link>
        )
      })}
    </div>
  )
}
