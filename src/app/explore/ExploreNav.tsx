'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// City IDs with an active City (Government Edition). Add new clusters here.
const CITY_EDITION_IDS = new Set(['ahmedabad', 'gandhinagar'])

const DISCOVER_TAB = { href: '/explore', label: 'Discover', icon: 'explore', exact: true }

const CITY_GUIDE_TAB = { href: '/explore/guide', label: 'City Guide', icon: 'map', exact: false }

interface Props {
  // City ID from the user's explorer profile (e.g. 'ahmedabad', 'pune').
  // When absent the guide tab is hidden until the city is resolved.
  userCity?: string | null
}

export default function ExploreNav({ userCity }: Props) {
  const pathname = usePathname()

  // This bar is shown to anonymous visitors too, so it only ever carries
  // discovery-oriented tabs — no account-gated concepts (Following/Profile/
  // Spots), which live exclusively in the authenticated dashboard sidebar.
  // City Guide is further gated to explorer users in cities with an active
  // City Government Edition.
  const tabs = CITY_EDITION_IDS.has(userCity ?? '')
    ? [DISCOVER_TAB, CITY_GUIDE_TAB]
    : [DISCOVER_TAB]

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
