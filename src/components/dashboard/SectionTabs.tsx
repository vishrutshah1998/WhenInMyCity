'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export interface SectionTab {
  label: string
  href: string
  badge?: number
}

interface Props {
  tabs: SectionTab[]
  /** Active tab's underline + badge background. */
  accentColor?: string
  /** Active tab's text/icon color. */
  textColor?: string
  /** Inactive tabs' text color. */
  mutedColor?: string
  /** Row's full-width bottom rule. */
  borderColor?: string
}

/**
 * Sibling-page tab strip for sections that used to live as nested items under
 * one sidebar entry (e.g. Creator Hub / Common Circles). Each tab is a real
 * route, not client-side state, so the pages keep their own data fetching —
 * this is navigation between distinct sections, not a view toggle.
 *
 * Colors default to the (light) WIMC dashboard theme — pass a persona's own
 * tokens (e.g. Explorer's hardcoded dark palette, or --venue-* vars) when
 * embedding this on a page that doesn't use --wimc-* vars.
 */
export default function SectionTabs({
  tabs,
  accentColor = 'var(--wimc-teal)',
  textColor = 'var(--wimc-text-primary)',
  mutedColor = 'var(--wimc-text-muted)',
  borderColor = 'var(--wimc-border-default)',
}: Props) {
  const pathname = usePathname()

  return (
    <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${borderColor}` }}>
      {tabs.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(tab.href + '/')
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              padding: '12px 20px',
              display: 'flex', alignItems: 'center', gap: 8,
              borderBottom: active ? `2px solid ${accentColor}` : '2px solid transparent',
              marginBottom: -1,
              color: active ? textColor : mutedColor,
              fontFamily: 'var(--font-dm-sans)', fontSize: 14,
              fontWeight: active ? 600 : 400,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              transition: 'color 150ms',
            }}
          >
            {tab.label}
            {tab.badge != null && tab.badge > 0 && (
              <span style={{
                background: accentColor, color: '#07070A', fontSize: 10,
                fontWeight: 700, fontFamily: 'var(--font-jetbrains-mono)',
                padding: '1px 6px', borderRadius: 9999,
              }}>
                {tab.badge}
              </span>
            )}
          </Link>
        )
      })}
    </div>
  )
}
