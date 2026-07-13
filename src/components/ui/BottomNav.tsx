'use client'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const NAV_ITEMS = [
  { href: '/explore',              label: 'EXPLORE',  icon: 'explore',             activeClass: 'text-ds-coral' },
  { href: '/explore?tab=events',   label: 'EVENTS',   icon: 'confirmation_number', activeClass: 'text-ds-coral' },
  { href: '/explore?tab=creators', label: 'CREATORS', icon: 'person_search',       activeClass: 'text-[#9B8FFF]' },
  { href: '/explore?tab=venues',   label: 'VENUES',   icon: 'location_on',         activeClass: 'text-ds-teal' },
] as const

function BottomNavInner() {
  const pathname    = usePathname()
  const searchParams = useSearchParams()
  const tab         = searchParams.get('tab')

  const isExplore  = pathname === '/explore' && (!tab || tab === 'all')
  const isEvents   = (pathname === '/explore' && tab === 'events') || pathname.startsWith('/events/')
  const isCreators = (pathname === '/explore' && tab === 'creators') || /^\/[^/]+$/.test(pathname)
  const isVenues   = (pathname === '/explore' && tab === 'venues') || pathname.startsWith('/business/venue/')

  function isActive(href: string): boolean {
    if (href === '/explore')               return isExplore
    if (href === '/explore?tab=events')    return isEvents
    if (href === '/explore?tab=creators')  return isCreators
    if (href === '/explore?tab=venues')    return isVenues
    return false
  }

  return (
    <nav className="fixed bottom-0 w-full h-14 bg-[#F5ECD7] border-t-2 border-dashed border-[#57423e] z-50 flex items-center">
      {NAV_ITEMS.map(item => {
        const active     = isActive(item.href)
        const colorClass = active ? item.activeClass : 'text-[rgba(26,39,68,0.4)]'
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex-1 flex flex-col items-center justify-center pt-1 transition-all"
          >
            <span
              className={`material-symbols-outlined text-[22px] ${colorClass}`}
              style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
            >
              {item.icon}
            </span>
            <span className={`font-mono text-[9px] uppercase mt-0.5 font-bold ${colorClass}`}>
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}

export function BottomNav() {
  return (
    <Suspense fallback={null}>
      <BottomNavInner />
    </Suspense>
  )
}
