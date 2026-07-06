'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// City IDs with an active City (Government Edition). Add new clusters here.
const CITY_EDITION_IDS = new Set(['ahmedabad', 'gandhinagar'])

const BASE_TABS = [
  { href: '/explore',         label: 'Discover',  icon: 'explore', exact: true  },
  { href: '/explore/feed',    label: 'Following', icon: 'people',  exact: false },
  { href: '/explore/profile', label: 'Profile',   icon: 'person',  exact: false },
]

const CITY_GUIDE_TAB = { href: '/explore/guide', label: 'City Guide', icon: 'map', exact: false }

interface Props {
  // City ID from the user's explorer profile (e.g. 'ahmedabad', 'pune').
  // When absent the guide tab is hidden until the city is resolved.
  userCity?: string | null
}

export default function ExploreNav({ userCity }: Props) {
  const pathname = usePathname()

  // City Guide tab is inserted between Following and Profile only for
  // explorer users in cities with an active City Government Edition.
  const tabs = CITY_EDITION_IDS.has(userCity ?? '')
    ? [BASE_TABS[0], BASE_TABS[1], CITY_GUIDE_TAB, BASE_TABS[2]]
    : BASE_TABS

  return (
    <nav style={{ display: 'flex', gap: 0 }}>
      {tabs.map((tab) => {
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
