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
// tree, EXCEPT the index route itself — that route's own PersonaTabSwitcher
// already renders a live version of this nav, so rendering this too would
// stack two navs. A client component (not the Server Component persona
// layouts that render it) since only the client reliably knows the current
// pathname.
export default function PersonaNavGate({ pages, homeKey, indexHref, sectionRoutes, accentColor, mutedColor, elevatedBgColor, borderColor }: Props) {
  const pathname = usePathname()
  console.log('[NAV] PersonaNavGate — pathname:', pathname, '— will render:', pathname !== indexHref)
  if (pathname === indexHref) return null
  // Studio routes (/dashboard/studio, /business/venue/studio, etc.) render
  // StudioShell, which is its own full-viewport `position:fixed; inset:0`
  // overlay at the SAME z-index (20) as this nav — with no stacking-context
  // property of its own between them, that tie is currently broken only by
  // DOM order (StudioShell happens to sit later in the tree, so it paints on
  // top and visually covers this nav today). That's fragile to rely on, so
  // Studio routes skip rendering this nav outright instead — StudioShell has
  // its own bottom tool-strip (StudioTabStrip) as the mobile nav there, and a
  // second bottom nav on top of it would be confusing even if it were reliably
  // hidden by paint order.
  if (pathname.endsWith('/studio')) return null
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
