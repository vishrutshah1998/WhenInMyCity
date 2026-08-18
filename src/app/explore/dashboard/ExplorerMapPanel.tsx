'use client'

import { useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import type { CityAttraction } from '@/app/actions/cityGuide'
import PlaceCard from '@/app/explore/guide/PlaceCard'

const CityMap = dynamic(() => import('@/app/explore/guide/CityMap'), {
  ssr: false,
  loading: () => (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'var(--venue-bg-elevated)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--venue-text-secondary)', fontSize: 13,
    }}>
      Loading map…
    </div>
  ),
})

// Bottom overlay sits above the carousel's own bottom dot bar (56px, z-[55] —
// see ExplorerCarousel.tsx) so it never gets covered by it.
const DOT_BAR_H = 56

interface Props {
  attractions: CityAttraction[]
}

// Lean Map page for the carousel — full-bleed CityMap + a quick browse row,
// linking out to the full /explore/dashboard/guide (Civic/Transit/Emergency,
// vaul drawer) rather than embedding that whole experience here. Keeping this
// page to just the map + list means the only gesture conflict to resolve is
// Leaflet-vs-carousel (handled in ExplorerCarousel's edge-gutter), not a third
// vertical-drag system stacked on top.
export default function ExplorerMapPanel({ attractions }: Props) {
  const [selectedA, setSelectedA] = useState<CityAttraction | null>(null)

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0 }}>
        <CityMap
          attractions={attractions}
          civicPOIs={[]}
          activeLayers={[]}
          showAttractions
          onAttractionClick={setSelectedA}
          mapStyle={{ height: '100%', width: '100%', borderRadius: 0 }}
        />
      </div>

      {/* Bottom overlay — selected place detail (if any) + quick browse row + guide link */}
      <div
        style={{
          position: 'absolute', left: 0, right: 0, bottom: DOT_BAR_H,
          zIndex: 10,
          background: 'linear-gradient(to top, var(--venue-bg-base) 55%, transparent)',
          paddingTop: 28,
        }}
      >
        <div style={{ padding: '0 12px 10px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {selectedA && (
            <PlaceCard
              attraction={selectedA}
              variant="detail"
              onClose={() => setSelectedA(null)}
            />
          )}

          {attractions.length > 0 && (
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}>
              {attractions.map(a => (
                <div key={a.id} onClick={() => setSelectedA(a)} style={{ cursor: 'pointer', flexShrink: 0 }}>
                  <PlaceCard attraction={a} variant="horizontal" />
                </div>
              ))}
            </div>
          )}

          <Link
            href="/explore/dashboard/guide"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '10px 0', borderRadius: 10,
              border: '1px solid var(--venue-border-default)',
              background: 'var(--venue-bg-elevated)',
              color: 'var(--venue-text-primary)',
              textDecoration: 'none',
              fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-dm-sans)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>map</span>
            Full City Guide — Civic, Transit &amp; Emergency
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
