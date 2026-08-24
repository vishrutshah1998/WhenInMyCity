'use client'

import { usePathname } from 'next/navigation'
import { PersonaNavStandalone, type PersonaNavPage } from './PersonaNav'
import { resolveActiveNavKey } from '@/lib/constants/personaNavPages'

interface Props {
  pages:           PersonaNavPage[]
  homeKey:         string
  indexHref:       string
  /** Path prefixes that count as "inside" a given tab (page key → prefixes) —
   *  e.g. Creator's Business tab covers /dashboard/earn, /dashboard/payouts,
   *  etc. Sub-routes not listed anywhere fall back to homeKey. */
  sectionRoutes:   Record<string, string[]>
  accentColor:     string
  mutedColor:      string
  elevatedBgColor: string
  borderColor:     string
}

// Renders the persistent nav on every sub-route within a persona's dashboard
// tree, EXCEPT the index route itself — that route's own SwipeCarousel
// already renders a live, drag-synced nav, so rendering this too would stack
// two navs. A client component (not the Server Component persona layouts
// that render it) since only the client reliably knows the current pathname.
export default function PersonaNavGate({ pages, homeKey, indexHref, sectionRoutes, accentColor, mutedColor, elevatedBgColor, borderColor }: Props) {
  const pathname = usePathname()
  if (pathname === indexHref) return null
  const activeKey = resolveActiveNavKey(pathname, pages, homeKey, sectionRoutes)
  return (
    <PersonaNavStandalone
      pages={pages}
      activeKey={activeKey}
      indexHref={indexHref}
      accentColor={accentColor}
      mutedColor={mutedColor}
      elevatedBgColor={elevatedBgColor}
      borderColor={borderColor}
    />
  )
}
