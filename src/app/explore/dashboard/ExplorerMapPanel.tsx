'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import type { CityAttraction } from '@/app/actions/cityGuide'
import PlaceCard from '@/app/explore/guide/PlaceCard'
import { CATEGORY_META } from '@/app/explore/guide/categoryMeta'
import { NAV_HEIGHT } from '@/components/shared/SwipeCarousel'

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

interface Props {
  attractions: CityAttraction[]
}

// Full-bleed Map page for the carousel — the map fills everything between
// the header and the carousel's own circular nav (NAV_HEIGHT), with a
// floating category-pill row + guide-link button on top of it, rather than
// pushing the map into a rounded card with a list underneath. Linking out to
// the full /explore/dashboard/guide (Civic/Transit/Emergency, vaul drawer)
// rather than embedding that whole experience here keeps the only gesture
// conflict to resolve as Leaflet-vs-carousel (handled in ExplorerCarousel's
// edge-gutter), not a third vertical-drag system stacked on top.
export default function ExplorerMapPanel({ attractions }: Props) {
  const [selectedA, setSelectedA] = useState<CityAttraction | null>(null)
  const [categoryFilter, setCategoryFilter] = useState('all')

  const categories = useMemo(
    () => Array.from(new Set(attractions.map(a => a.category))),
    [attractions],
  )
  const filteredAttractions = categoryFilter === 'all'
    ? attractions
    : attractions.filter(a => a.category === categoryFilter)

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* Map fills exactly the space above the carousel's circular nav — not
          behind it, so pins there stay tappable rather than hidden under an
          opaque, higher-z-index bar. */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: `calc(100% - ${NAV_HEIGHT}px)` }}>
        <CityMap
          attractions={filteredAttractions}
          civicPOIs={[]}
          activeLayers={[]}
          showAttractions
          onAttractionClick={setSelectedA}
          mapStyle={{ height: '100%', width: '100%', borderRadius: 0 }}
        />
      </div>

      {/* Floating top row — scrollable category pills + a pinned guide-link
          button sharing one row, so the two can never collide by construction. */}
      <div
        style={{
          position: 'absolute', top: 12, left: 12, right: 12, zIndex: 10,
          display: 'flex', alignItems: 'center', gap: 8,
        }}
      >
        <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {['all', ...categories].map(cat => {
            const meta = CATEGORY_META[cat] ?? { emoji: '📍', label: cat, color: '#9B8FFF' }
            const active = categoryFilter === cat
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
                  padding: '6px 12px', borderRadius: 9999,
                  border: `1.5px solid ${active ? meta.color : `${meta.color}90`}`,
                  // Tinted by the pin's own category color even when inactive
                  // (not a flat generic background), so a pill reads as the
                  // same color as its pins on the map at a glance.
                  background: active ? `${meta.color}dd` : `${meta.color}40`,
                  backdropFilter: 'blur(6px)',
                  WebkitBackdropFilter: 'blur(6px)',
                  color: '#fff',
                  fontSize: 12, fontWeight: active ? 700 : 500,
                  fontFamily: 'var(--font-dm-sans)',
                  cursor: 'pointer',
                }}
              >
                <span>{meta.emoji}</span>
                {meta.label}
              </button>
            )
          })}
        </div>

        <Link
          href="/explore/dashboard/guide"
          aria-label="Full City Guide — Civic, Transit & Emergency"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            width: 36, height: 36, borderRadius: '50%',
            border: '1.5px solid rgba(255,255,255,0.5)',
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            color: '#fff',
            textDecoration: 'none',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>map</span>
        </Link>
      </div>

      {/* Selected-place detail card — floats above the circular nav */}
      {selectedA && (
        <div
          style={{
            position: 'absolute', left: 0, right: 0, bottom: NAV_HEIGHT,
            zIndex: 10,
            background: 'linear-gradient(to top, var(--venue-bg-base) 55%, transparent)',
            paddingTop: 28,
          }}
        >
          <div style={{ padding: '0 12px 10px' }}>
            <PlaceCard
              attraction={selectedA}
              variant="detail"
              onClose={() => setSelectedA(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
