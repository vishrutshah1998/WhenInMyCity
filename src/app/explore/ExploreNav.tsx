'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/explore',          label: 'Discover',  icon: 'explore',              exact: true },
  { href: '/explore/saved',    label: 'Saved',     icon: 'bookmark',             exact: false },
  { href: '/explore/feed',     label: 'Following', icon: 'people',               exact: false },
  { href: '/explore/tickets',  label: 'Tickets',   icon: 'confirmation_number',  exact: false },
]

export default function ExploreNav() {
  const pathname = usePathname()

  return (
    <nav style={{ display: 'flex', gap: 0 }}>
      {TABS.map((tab) => {
        const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 16px',
              fontSize: 13.5,
              fontWeight: active ? 600 : 500,
              color: active ? 'var(--wimc-coral)' : 'var(--wimc-text-secondary)',
              textDecoration: 'none',
              borderBottom: active ? '2px solid var(--wimc-coral)' : '2px solid transparent',
              transition: 'color 200ms, border-color 200ms',
            }}
            prefetch
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: 18,
                fontVariationSettings: active
                  ? "'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24"
                  : "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24",
              }}
            >
              {tab.icon}
            </span>
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
