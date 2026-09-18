'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

// /explore/dashboard/guide's Leaflet map (CityMap.tsx) renders its
// .leaflet-container as position:relative, height:100% inside a full-height
// wrapper — CSS paints ANY positioned box above plain static content
// regardless of DOM order, so DashPageLink (a bare unstyled div) was
// rendering underneath the map there even though it comes first in the DOM.
// Every other /explore/dashboard/* route has no competing positioned
// full-bleed sibling at that spot, so DashPageLink already renders fine
// there — this wrapper only needs to act on Guide, checked by exact
// pathname rather than a blanket z-index bump, so nothing about those
// routes' stacking changes.
export default function GuideDashLinkBoost({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  if (pathname !== '/explore/dashboard/guide') return <>{children}</>

  // Leaflet's own highest internal z-index is .leaflet-top/.leaflet-bottom at
  // 1000 (node_modules/leaflet/dist/leaflet.css) — the pane housing its zoom
  // controls and attribution. Clearing that explicitly, rather than relying
  // on the map's own effective 0 that happens to work today, keeps this
  // correct even if CityMap's DOM/stacking ever changes.
  return <div style={{ position: 'relative', zIndex: 1001 }}>{children}</div>
}
