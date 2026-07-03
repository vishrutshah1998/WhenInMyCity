'use client'

import { useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Drawer } from 'vaul'
import type { CityAttraction, CityAttractionSource, TransitRoute } from '@/app/actions/cityGuide'
import type { CivicPOI, ActiveLayer } from './CityMap'
import PlaceCard from './PlaceCard'
import CivicPanel from './CivicPanel'
import TransitPanel from './TransitPanel'
import EmergencyPanel from './EmergencyPanel'
import CivicReportFlow        from './CivicReportFlow'
import TrafficViolationFlow   from './TrafficViolationFlow'

const CityMap = dynamic(() => import('./CityMap'), {
  ssr: false,
  loading: () => (
    <div style={{
      height: 380, borderRadius: 12,
      background: 'var(--wimc-bg-elevated)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--wimc-text-secondary)', fontSize: 13,
    }}>
      Loading map…
    </div>
  ),
})

// ── Guide group tiles (wireframe home-tile style) ─────────────────────────────

type GuideGroup = 'all' | 'eat' | 'culture' | 'nature' | 'discover'

const GUIDE_GROUPS: Record<GuideGroup, {
  key: GuideGroup
  label: string
  emoji: string
  color: string
  bg: string
  categories: string[] | null  // null = all categories
}> = {
  all:      { key: 'all',     label: 'All',           emoji: '🗺',  color: '#9B8FFF', bg: 'rgba(155,143,255,0.12)', categories: null },
  eat:      { key: 'eat',     label: 'Eat & Drink',   emoji: '🍽',  color: '#FF7043', bg: 'rgba(255,112,67,0.12)',  categories: ['food', 'market'] },
  culture:  { key: 'culture', label: 'Arts & Culture',emoji: '🎨',  color: '#9C27B0', bg: 'rgba(156,39,176,0.12)', categories: ['heritage', 'arts', 'temple'] },
  nature:   { key: 'nature',  label: 'Parks & Nature',emoji: '🌿',  color: '#4CAF50', bg: 'rgba(76,175,80,0.12)',  categories: ['park', 'nature'] },
  discover: { key: 'discover',label: 'Must See',      emoji: '⭐',  color: '#F5A800', bg: 'rgba(245,168,0,0.12)',  categories: ['attraction', 'shopping'] },
}

// Fine-grained category display config — reuses the same palette as CityMap icons
const CATEGORY_META: Record<string, { emoji: string; label: string; color: string }> = {
  all:        { emoji: '🗺',  label: 'All',       color: '#9B8FFF' },
  heritage:   { emoji: '🏛',  label: 'Heritage',  color: '#E8A838' },
  park:       { emoji: '🌳',  label: 'Parks',     color: '#4CAF50' },
  market:     { emoji: '🛍',  label: 'Markets',   color: '#E8705A' },
  food:       { emoji: '🍽',  label: 'Food',      color: '#FF7043' },
  temple:     { emoji: '🛕',  label: 'Temples',   color: '#9C27B0' },
  nature:     { emoji: '🌿',  label: 'Nature',    color: '#2E7D32' },
  arts:       { emoji: '🎨',  label: 'Arts',      color: '#1976D2' },
  shopping:   { emoji: '🏬',  label: 'Shopping',  color: '#0288D1' },
  attraction: { emoji: '⭐',  label: 'Must-See',  color: '#F5A800' },
}

// ── DPDP consent ──────────────────────────────────────────────────────────────

const CONSENT_KEY = 'wimc_city_guide_consent_v1'

// ── Source attribution labels ─────────────────────────────────────────────────

const SOURCE_LABEL: Record<CityAttractionSource, string> = {
  curated:          'Curated by WIMC',
  heritage_dataset: 'Heritage dataset · GODL-India',
}

// ── Directions URL helper ────────────────────────────────────────────────────
// Links out to Google Maps — never routes through WIMC ticketing.

function directionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  attractions:   CityAttraction[]
  transitRoutes: TransitRoute[]
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

type MainTab = 'guide' | 'civic' | 'transit' | 'emergency'

// ── Bottom nav height (matches BottomNav component: h-14 = 56px) ──────────────
// The vaul drawer has paddingBottom equal to this value so that drawer content
// always clears the fixed BottomNav bar. The BottomNav is z-50; our mobile
// overlay is z-20, so BottomNav visually sits on top — the padding prevents
// scrollable content from disappearing behind it.
const BOTTOM_NAV_H = 56

// ── Mobile snap points ────────────────────────────────────────────────────────
// '190px' = drawer peek height. At this snap:
//   • BottomNav (z-50) covers the bottom 56 px of the drawer (its paddingBottom)
//   • 190 - 56 = 134 px of visible drawer content above the BottomNav
//   • That 134 px holds: handle (12 px) + tab bar (44 px) + group chips (44 px) + gap
// No overlap or collision between nav bar, drawer, and chips at any snap.
const SNAP_PEEK  = '190px'
const SNAP_MID   = '55%'
const SNAP_FULL  = '92%'

// ── Component ─────────────────────────────────────────────────────────────────

export default function GuideClient({ attractions, transitRoutes }: Props) {
  const [mainTab,        setMainTab]        = useState<MainTab>('guide')
  const [activeGroup,    setActiveGroup]    = useState<GuideGroup>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [selectedA,      setSelectedA]      = useState<CityAttraction | null>(null)
  const [activeLayers,   setActiveLayers]   = useState<ActiveLayer[]>([])
  const [loadingLayers,  setLoadingLayers]  = useState<ActiveLayer[]>([])
  const [layerData,      setLayerData]      = useState<Record<string, CivicPOI[]>>({})
  const [consentGiven,   setConsentGiven]   = useState(true)
  const [showConsent,    setShowConsent]    = useState(false)
  const [creditsOpen,    setCreditsOpen]    = useState(false)
  const [refLat,         setRefLat]         = useState(23.0225)
  const [refLng,         setRefLng]         = useState(72.5714)
  const [usingUserLoc,   setUsingUserLoc]   = useState(false)
  const [locLoading,     setLocLoading]     = useState(false)
  const [showReport,        setShowReport]        = useState(false)
  const [showTrafficReport, setShowTrafficReport] = useState(false)
  const [entryRef,       setEntryRef]       = useState<string | null>(null)
  // Client-side save state for guide places. No server action exists yet for
  // place-level saves (spot_lists requires a listId). Optimistic local toggle.
  const [savedPlaceIds, setSavedPlaceIds] = useState<Set<string>>(new Set())

  function toggleSavePlaceLocal(id: string) {
    setSavedPlaceIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Mobile drawer snap state — starts at the peek position
  const [mobileSnap, setMobileSnap] = useState<string | number>(SNAP_PEEK)
  // vaul's setActiveSnapPoint allows null (dismissed state); we guard against it
  // since dismissible={false} means null should never arrive in practice.
  function handleSnapChange(snap: string | number | null) {
    if (snap !== null) setMobileSnap(snap)
  }

  // Portal container ref for the mobile vaul drawer.
  // We portal INTO the md:hidden overlay div so that Drawer.Portal renders
  // inside the display:none parent on desktop — hiding it completely without
  // any position:fixed leakage to document.body.
  const [drawerContainer, setDrawerContainer] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY)
    if (!stored) setShowConsent(true)
    else setConsentGiven(true)
    const params = new URLSearchParams(window.location.search)
    const ref = params.get('ref') ?? params.get('utm_source') ?? null
    if (ref) setEntryRef(ref)
  }, [])

  function acceptConsent() {
    localStorage.setItem(CONSENT_KEY, '1')
    setConsentGiven(true)
    setShowConsent(false)
  }

  function selectGroup(g: GuideGroup) {
    setActiveGroup(g)
    setCategoryFilter('all')
    setSelectedA(null)
  }

  function requestUserLocation() {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return
    setLocLoading(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setRefLat(pos.coords.latitude)
        setRefLng(pos.coords.longitude)
        setUsingUserLoc(true)
        setLocLoading(false)
        setLayerData({})
        setActiveLayers([])
      },
      () => setLocLoading(false),
      { timeout: 10000, maximumAge: 60000 },
    )
  }

  const toggleLayer = useCallback(async (layer: ActiveLayer) => {
    setActiveLayers(prev =>
      prev.includes(layer) ? prev.filter(l => l !== layer) : [...prev, layer],
    )
    if (!layerData[layer]) {
      setLoadingLayers(prev => [...prev, layer])
      try {
        const params = new URLSearchParams({ layer, lat: String(refLat), lng: String(refLng) })
        const res    = await fetch(`/api/city/overpass?${params}`)
        type RawPOI  = { id: string; name: string | null; lat: number; lng: number }
        const json   = await res.json() as { places?: RawPOI[] }
        const tagged: CivicPOI[] = (json.places ?? []).map(p => ({
          id:    p.id,
          name:  p.name,
          lat:   p.lat,
          lng:   p.lng,
          layer,
        }))
        setLayerData(prev => ({ ...prev, [layer]: tagged }))
      } catch {
        setLayerData(prev => ({ ...prev, [layer]: [] }))
      } finally {
        setLoadingLayers(prev => prev.filter(l => l !== layer))
      }
    }
  }, [layerData, refLat, refLng])

  // ── Filtering pipeline ───────────────────────────────────────────────────────
  const groupMeta    = GUIDE_GROUPS[activeGroup]
  const groupFiltered = groupMeta.categories
    ? attractions.filter(a => groupMeta.categories!.includes(a.category))
    : attractions

  const finalFiltered = categoryFilter === 'all'
    ? groupFiltered
    : groupFiltered.filter(a => a.category === categoryFilter)

  const availableCategories = ['all', ...Array.from(
    new Set(groupFiltered.map(a => a.category)),
  )]

  const allCivicPOIs = activeLayers.flatMap(l => layerData[l] ?? [])

  // ── Style helpers ────────────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background:   'var(--wimc-bg-elevated)',
    border:       '1px solid var(--wimc-border-default)',
    borderRadius: 14,
    overflow:     'hidden',
  }

  // ── Shared tab bar renderer (used in both desktop and mobile drawer) ──────────
  function TabBar({ compact = false }: { compact?: boolean }) {
    return (
      <div style={{
        display: 'flex', gap: 0,
        borderBottom: '1px solid var(--wimc-border-subtle)',
        flexShrink: 0,
      }}>
        {([
          { key: 'guide',     label: 'Guide',     icon: 'map',               emergency: false },
          { key: 'civic',     label: 'Civic',     icon: 'local_police',      emergency: false },
          { key: 'transit',   label: 'Transit',   icon: 'directions_transit',emergency: false },
          { key: 'emergency', label: 'Emergency', icon: 'emergency',         emergency: true  },
        ] as const).map(({ key, label, icon, emergency }) => {
          const isActive    = mainTab === key
          const activeColor = emergency ? '#C62828' : 'var(--wimc-coral)'
          const idleColor   = emergency ? 'rgba(198,40,40,0.55)' : 'var(--wimc-text-secondary)'
          return (
            <button
              key={key}
              onClick={() => {
                setMainTab(key)
                // Snap to mid when switching tabs so content is visible
                if (compact) setMobileSnap(SNAP_MID)
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: compact ? 3 : 5,
                padding: compact ? '8px 10px' : '10px 13px',
                fontSize: compact ? 12 : 13, fontWeight: isActive ? 600 : 400,
                color: isActive ? activeColor : idleColor,
                background: 'transparent', border: 'none', cursor: 'pointer',
                borderBottom: isActive ? `2px solid ${activeColor}` : '2px solid transparent',
                fontFamily: 'var(--font-dm-sans)',
                transition: 'color 180ms, border-color 180ms',
                flexShrink: 0,
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: compact ? 15 : 17,
                  fontVariationSettings: isActive
                    ? "'FILL' 1,'wght' 500,'GRAD' 0,'opsz' 24"
                    : "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24",
                }}
              >
                {icon}
              </span>
              {label}
            </button>
          )
        })}
      </div>
    )
  }

  // ── Group filter pills (shown in mobile drawer peek, desktop above map) ───────
  function GroupPills({ compact = false }: { compact?: boolean }) {
    return (
      <div style={{
        display: 'flex', gap: compact ? 6 : 8,
        overflowX: 'auto', flexShrink: 0,
        padding: compact ? '8px 16px' : '0',
        scrollbarWidth: 'none',
      }}>
        {(Object.values(GUIDE_GROUPS) as typeof GUIDE_GROUPS[GuideGroup][]).map(g => {
          const active = activeGroup === g.key
          return (
            <button
              key={g.key}
              onClick={() => selectGroup(g.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: compact ? '5px 10px' : '10px 4px',
                flexDirection: compact ? 'row' : 'column',
                flexShrink: 0,
                borderRadius: compact ? 9999 : 12,
                width: compact ? 'auto' : undefined,
                border: `1.5px solid ${active ? g.color : 'var(--wimc-border-default)'}`,
                background: active ? g.bg : 'var(--wimc-bg-elevated)',
                cursor: 'pointer',
                transition: 'all 150ms',
              }}
            >
              <span style={{ fontSize: compact ? 14 : 22 }}>{g.emoji}</span>
              <span style={{
                fontSize: compact ? 11 : 10, fontWeight: active ? 700 : 500,
                color: active ? g.color : 'var(--wimc-text-secondary)',
                fontFamily: 'var(--font-dm-sans)',
                textAlign: 'center', lineHeight: 1.2,
                whiteSpace: 'nowrap',
              }}>
                {g.label}
              </span>
            </button>
          )
        })}
      </div>
    )
  }

  // ── Fine-grained category chips ───────────────────────────────────────────────
  function CategoryChips() {
    if (availableCategories.length <= 2) return null
    return (
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}>
        {availableCategories.map(cat => {
          const meta = CATEGORY_META[cat] ?? { emoji: '📍', label: cat, color: '#9B8FFF' }
          const active = categoryFilter === cat
          return (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 12px', borderRadius: 9999, flexShrink: 0,
                border: `1.5px solid ${active ? meta.color : 'var(--wimc-border-default)'}`,
                background: active ? `${meta.color}22` : 'transparent',
                color: active ? meta.color : 'var(--wimc-text-secondary)',
                fontSize: 12, fontWeight: active ? 600 : 400,
                cursor: 'pointer', fontFamily: 'var(--font-dm-sans)',
                transition: 'all 150ms',
              }}
            >
              <span>{meta.emoji}</span>
              {meta.label}
            </button>
          )
        })}
      </div>
    )
  }

  // ── Horizontal card row for a section (bleeds past container padding) ───────────
  // Uses negative margin so the row is edge-to-edge, then re-adds padding inside
  // so the first/last card keeps breathing room against the screen edge.
  function CardRow({ places }: { places: CityAttraction[] }) {
    if (places.length === 0) return null
    return (
      <div style={{ marginLeft: -16, marginRight: -16 }}>
        <div style={{
          display: 'flex', gap: 12, overflowX: 'auto',
          paddingLeft: 16, paddingRight: 16, paddingBottom: 4,
          scrollbarWidth: 'none',
        }}>
          {places.map(a => (
            <div
              key={a.id}
              onClick={() => {
                setSelectedA(prev => prev?.id === a.id ? null : a)
                setMobileSnap(SNAP_MID)
              }}
              style={{ cursor: 'pointer', flexShrink: 0 }}
            >
              <PlaceCard
                attraction={a}
                variant="horizontal"
                isSaved={savedPlaceIds.has(a.id)}
                onToggleSave={() => toggleSavePlaceLocal(a.id)}
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Vertical attraction list (desktop + mobile detail) ────────────────────────
  function AttractionList() {
    return (
      <div style={card}>
        <div style={{
          padding: '12px 16px', borderBottom: '1px solid var(--wimc-border-subtle)',
          fontSize: 11, fontWeight: 700, color: 'var(--wimc-text-secondary)',
          fontFamily: 'var(--font-jetbrains-mono)', letterSpacing: '0.12em', textTransform: 'uppercase',
        }}>
          {finalFiltered.length} place{finalFiltered.length !== 1 ? 's' : ''}
          {activeGroup !== 'all' ? ` · ${groupMeta.label}` : ''}
          {categoryFilter !== 'all' ? ` · ${CATEGORY_META[categoryFilter]?.label}` : ''}
        </div>

        {finalFiltered.map((a, i) => {
          const meta = CATEGORY_META[a.category] ?? { emoji: '📍', color: '#9B8FFF' }
          const isSelected = selectedA?.id === a.id
          return (
            <button
              key={a.id}
              onClick={() => setSelectedA(isSelected ? null : a)}
              style={{
                width: '100%', display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '12px 16px', textAlign: 'left',
                borderBottom: i < finalFiltered.length - 1 ? '1px solid var(--wimc-border-subtle)' : 'none',
                background: isSelected ? 'rgba(155,143,255,0.06)' : 'transparent',
                border: 'none', cursor: 'pointer',
                transition: 'background 150ms',
              }}
            >
              <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{meta.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--wimc-text-primary)' }}>{a.name}</div>
                {a.description && (
                  <div style={{
                    fontSize: 11, color: 'var(--wimc-text-secondary)', marginTop: 2,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {a.description}
                  </div>
                )}
                {a.address && (
                  <div style={{ fontSize: 10, color: 'var(--wimc-text-muted)', marginTop: 3, fontFamily: 'var(--font-jetbrains-mono)' }}>
                    {a.address}
                  </div>
                )}
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 9999,
                color: meta.color, background: `${meta.color}22`,
                flexShrink: 0, alignSelf: 'center',
                fontFamily: 'var(--font-jetbrains-mono)', letterSpacing: '0.04em', textTransform: 'uppercase',
              }}>
                {a.category}
              </span>
            </button>
          )
        })}

        {finalFiltered.length === 0 && (
          <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--wimc-text-secondary)', fontSize: 14 }}>
            No places in this category.
          </div>
        )}
      </div>
    )
  }

  // ── Desktop: attraction detail panel (info-only) ──────────────────────────────
  // Kept as an inline function since it's only rendered inside the desktop wrapper.
  function DesktopAttractionDetail() {
    if (!selectedA) return null
    const a    = selectedA
    const meta = {
      heritage:   { emoji: '🏛',  color: '#E8A838' },
      park:       { emoji: '🌳',  color: '#4CAF50' },
      market:     { emoji: '🛍',  color: '#E8705A' },
      food:       { emoji: '🍽',  color: '#FF7043' },
      temple:     { emoji: '🛕',  color: '#9C27B0' },
      nature:     { emoji: '🌿',  color: '#2E7D32' },
      arts:       { emoji: '🎨',  color: '#1976D2' },
      shopping:   { emoji: '🏬',  color: '#0288D1' },
      attraction: { emoji: '⭐',  color: '#F5A800' },
    }[a.category] ?? { emoji: '📍', color: '#9B8FFF' }

    return (
      <div style={{
        background: 'var(--wimc-bg-elevated)',
        border: `1.5px solid ${meta.color}44`,
        borderRadius: 14, overflow: 'hidden',
      }}>
        <div style={{
          padding: '14px 16px', background: `${meta.color}0D`,
          borderBottom: '1px solid var(--wimc-border-subtle)',
          display: 'flex', alignItems: 'flex-start', gap: 12,
        }}>
          <span style={{ fontSize: 28, flexShrink: 0, lineHeight: 1.2 }}>{meta.emoji}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--wimc-text-primary)', fontFamily: 'var(--font-syne)', lineHeight: 1.2 }}>
              {a.name}
            </div>
            <span style={{
              display: 'inline-block', marginTop: 4,
              fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 9999,
              color: meta.color, background: `${meta.color}22`,
              fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase',
            }}>
              {a.category}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
            <button
              onClick={() => toggleSavePlaceLocal(a.id)}
              aria-label={savedPlaceIds.has(a.id) ? 'Remove from saved' : 'Save place'}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '4px', lineHeight: 1,
                color: savedPlaceIds.has(a.id) ? 'var(--wimc-coral)' : 'var(--wimc-text-muted)',
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: 20,
                  fontVariationSettings: savedPlaceIds.has(a.id) ? "'FILL' 1" : "'FILL' 0",
                }}
              >
                favorite
              </span>
            </button>
            <button
              onClick={() => setSelectedA(null)}
              aria-label="Close"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--wimc-text-muted)', fontSize: 18, padding: '4px', lineHeight: 1 }}
            >✕</button>
          </div>
        </div>

        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {a.description && (
            <p style={{ fontSize: 13, color: 'var(--wimc-text-secondary)', margin: 0, lineHeight: 1.6 }}>{a.description}</p>
          )}
          {a.address && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 11, color: 'var(--wimc-text-muted)', fontFamily: 'var(--font-jetbrains-mono)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>location_on</span>
              {a.address}
            </div>
          )}
          <div style={{ fontSize: 10, color: 'var(--wimc-text-muted)', fontFamily: 'var(--font-jetbrains-mono)', letterSpacing: '0.04em' }}>
            {a.source === 'heritage_dataset' ? '📜 Heritage dataset · GODL-India (data.gov.in)' : '✏️ Curated by WIMC'}
          </div>
        </div>

        {/* External-only action row — discovery only, no WIMC ticketing */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--wimc-border-subtle)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a
            href={directionsUrl(a.lat, a.lng)}
            target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--wimc-border-default)', color: 'var(--wimc-text-primary)', textDecoration: 'none', fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-dm-sans)' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>directions</span>
            Directions
          </a>
          {a.external_url && (
            <a
              href={a.external_url}
              target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--wimc-border-default)', color: 'var(--wimc-text-primary)', textDecoration: 'none', fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-dm-sans)' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>open_in_new</span>
              Learn more
            </a>
          )}
          <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--wimc-text-muted)', fontFamily: 'var(--font-jetbrains-mono)', alignSelf: 'center', letterSpacing: '0.04em' }}>
            Opens outside WIMC
          </span>
        </div>
      </div>
    )
  }

  // ── Mobile guide tab content (rendered inside the vaul drawer) ────────────────
  function MobileGuideContent() {
    // ── "All" view: one section per GUIDE_GROUP, each with a horizontal card row ──
    if (activeGroup === 'all') {
      const groups = (Object.values(GUIDE_GROUPS) as typeof GUIDE_GROUPS[GuideGroup][]).filter(
        g => g.key !== 'all',
      )
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Selected place detail floats above sections */}
          {selectedA && (
            <PlaceCard
              attraction={selectedA}
              variant="detail"
              onClose={() => setSelectedA(null)}
              isSaved={savedPlaceIds.has(selectedA.id)}
              onToggleSave={() => toggleSavePlaceLocal(selectedA.id)}
            />
          )}

          {groups.map(g => {
            const places = g.categories
              ? attractions.filter(a => g.categories!.includes(a.category))
              : attractions
            if (places.length === 0) return null
            return (
              <div key={g.key}>
                {/* Section heading */}
                <div style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', marginBottom: 10,
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    fontSize: 14, fontWeight: 700,
                    color: g.color, fontFamily: 'var(--font-syne)',
                  }}>
                    <span>{g.emoji}</span>
                    {g.label}
                  </div>
                  <button
                    onClick={() => selectGroup(g.key)}
                    style={{
                      fontSize: 11, color: 'var(--wimc-text-secondary)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontFamily: 'var(--font-dm-sans)',
                    }}
                  >
                    See all →
                  </button>
                </div>
                <CardRow places={places} />
              </div>
            )
          })}

          <DataCredits open={creditsOpen} onToggle={() => setCreditsOpen(o => !o)} />
        </div>
      )
    }

    // ── Specific group selected: one section per sub-category ─────────────────────
    // groupMeta.categories is always string[] here (only 'all' has null).
    const groupCats: string[] = groupMeta.categories ?? []
    // When a sub-filter chip is active, collapse to just that one section.
    const sectionsToShow = categoryFilter === 'all' ? groupCats : [categoryFilter]

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Sub-category filter chips */}
        <CategoryChips />

        {/* Selected place detail */}
        {selectedA && (
          <PlaceCard
            attraction={selectedA}
            variant="detail"
            onClose={() => setSelectedA(null)}
            isSaved={savedPlaceIds.has(selectedA.id)}
            onToggleSave={() => toggleSavePlaceLocal(selectedA.id)}
          />
        )}

        {/* One section per sub-category */}
        {sectionsToShow.map(cat => {
          const catMeta = CATEGORY_META[cat] ?? { emoji: '📍', label: cat, color: '#9B8FFF' }
          const places = groupFiltered.filter(a => a.category === cat)
          if (places.length === 0) return null
          return (
            <div key={cat}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10,
              }}>
                <span style={{ fontSize: 18 }}>{catMeta.emoji}</span>
                <span style={{
                  fontSize: 13, fontWeight: 700,
                  color: 'var(--wimc-text-primary)',
                  fontFamily: 'var(--font-syne)',
                }}>
                  {catMeta.label}
                </span>
                <span style={{
                  fontSize: 10, color: 'var(--wimc-text-secondary)',
                  fontFamily: 'var(--font-jetbrains-mono)',
                }}>
                  {places.length}
                </span>
              </div>
              <CardRow places={places} />
            </div>
          )
        })}

        {/* Vertical list — full catalogue for this group, for deep browsing */}
        <AttractionList />

        <DataCredits open={creditsOpen} onToggle={() => setCreditsOpen(o => !o)} />
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ══════════════════════════════════════════════════════════════════════
          MOBILE: full-screen fixed overlay (hidden on md+ via className)
          Layout: full-bleed map underneath + vaul bottom sheet on top.

          z-index stack on mobile:
            20 — this overlay (map lives here)
            40 — vaul Drawer.Content (inside overlay via custom container portal)
            50 — BottomNav (fixed, always on top; untouched by this pass)

          The drawer portal renders into `drawerContainer` which is a div
          INSIDE this md:hidden element. On desktop, display:none on the parent
          hides the portal content — no position:fixed leaks to document.body.
      ══════════════════════════════════════════════════════════════════════ */}
      <div
        className="md:hidden"
        style={{ position: 'fixed', inset: 0, zIndex: 20, overflow: 'hidden' }}
      >
        {/* Full-bleed Leaflet map — absolute fill behind the drawer */}
        <div style={{ position: 'absolute', inset: 0 }}>
          <CityMap
            attractions={mainTab === 'guide' ? finalFiltered : []}
            civicPOIs={mainTab === 'civic' ? allCivicPOIs : []}
            activeLayers={mainTab === 'civic' ? activeLayers : []}
            showAttractions={mainTab === 'guide'}
            onAttractionClick={a => {
              setSelectedA(a)
              setMobileSnap(SNAP_MID)
            }}
            mapStyle={{ height: '100%', width: '100%', borderRadius: 0 }}
          />
        </div>

        {/* DPDP consent overlay — above map, below drawer */}
        {showConsent && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 15,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'flex-end',
            paddingBottom: `calc(${BOTTOM_NAV_H}px + ${SNAP_PEEK})`,
          }}>
            <div style={{
              margin: 16, borderRadius: 14, padding: 16,
              background: 'var(--wimc-bg-base)',
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--wimc-text-primary)' }}>
                🔒 Data &amp; Privacy Notice
              </div>
              <div style={{ fontSize: 12, color: 'var(--wimc-text-secondary)', lineHeight: 1.6 }}>
                The Civic Utility layers use your approximate location to find nearby public services
                via OpenStreetMap (ODbL). Location data is not stored on our servers.
                See our <a href="/explore/dashboard/settings" style={{ color: '#9B8FFF' }}>Privacy Settings</a>.
              </div>
              <button
                onClick={acceptConsent}
                style={{
                  alignSelf: 'flex-start', padding: '8px 18px', borderRadius: 8,
                  background: '#9B8FFF', color: '#fff',
                  fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-dm-sans)',
                }}
              >
                I understand, continue
              </button>
            </div>
          </div>
        )}

        {/*
          Portal container div — vaul's Drawer.Portal renders INTO this element
          (not document.body), keeping the drawer inside the md:hidden parent.
          pointer-events:none on the container; the drawer content enables its own.
        */}
        <div
          ref={setDrawerContainer}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        />

        {/* Vaul bottom drawer — only mounted once container ref is available */}
        {drawerContainer && (
          <Drawer.Root
            modal={false}
            defaultOpen
            dismissible={false}
            snapPoints={[SNAP_PEEK, SNAP_MID, SNAP_FULL]}
            activeSnapPoint={mobileSnap}
            setActiveSnapPoint={handleSnapChange}
          >
            <Drawer.Portal container={drawerContainer}>
              <Drawer.Content
                style={{
                  position: 'absolute',    // absolute within the overlay container
                  bottom: 0, left: 0, right: 0,
                  zIndex: 40,
                  background: 'var(--wimc-bg-base)',
                  borderRadius: '16px 16px 0 0',
                  boxShadow: '0 -4px 32px rgba(0,0,0,0.22)',
                  display: 'flex', flexDirection: 'column',
                  outline: 'none',
                  // Height sufficient to fill the SNAP_FULL snap point.
                  // vaul translates this div to reveal the correct snap portion.
                  height: '92dvh',
                  // paddingBottom clears both the BottomNav and the iOS
                  // home-indicator gap (env(safe-area-inset-bottom)).
                  paddingBottom: `calc(${BOTTOM_NAV_H}px + env(safe-area-inset-bottom, 0px))`,
                  pointerEvents: 'auto',
                  overflow: 'hidden',
                }}
              >
                {/* Drag handle */}
                <Drawer.Handle style={{ marginTop: 10, marginBottom: 2 }} />

                {/* Tab bar — always visible at peek snap */}
                <TabBar compact />

                {/* Group filter pills — visible at peek snap (Guide tab only) */}
                {mainTab === 'guide' && <GroupPills compact />}

                {/* Scrollable content — visible at mid/full snap */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {mainTab === 'guide' && <MobileGuideContent />}
                  {mainTab === 'civic' && (
                    <CivicPanel
                      activeLayers={activeLayers}
                      loadingLayers={loadingLayers}
                      layerData={layerData}
                      onToggleLayer={consentGiven ? toggleLayer : () => setShowConsent(true)}
                      refLat={refLat}
                      refLng={refLng}
                      usingUserLoc={usingUserLoc}
                      locLoading={locLoading}
                      onRequestLocation={requestUserLocation}
                      onOpenReport={() => setShowReport(true)}
                      onOpenTrafficReport={() => setShowTrafficReport(true)}
                    />
                  )}
                  {mainTab === 'transit' && (
                    <TransitPanel routes={transitRoutes} attractions={attractions} entryRef={entryRef} />
                  )}
                  {mainTab === 'emergency' && <EmergencyPanel />}
                </div>
              </Drawer.Content>
            </Drawer.Portal>
          </Drawer.Root>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          DESKTOP: exact existing layout — completely unchanged.
          Hidden on mobile via className="hidden md:block".
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="hidden md:block">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

          {/* ── DPDP consent banner ──────────────────────────────────────────── */}
          {showConsent && (
            <div style={{
              padding: '14px 16px',
              background: 'rgba(155,143,255,0.08)',
              border: '1px solid rgba(155,143,255,0.25)',
              borderRadius: 12, marginBottom: 20,
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--wimc-text-primary)' }}>
                🔒 Data &amp; Privacy Notice
              </div>
              <div style={{ fontSize: 12, color: 'var(--wimc-text-secondary)', lineHeight: 1.6 }}>
                The Civic Utility layers use your approximate location to find nearby public services
                via OpenStreetMap (ODbL). Location data is not stored on our servers. Attraction
                information is served from WIMC&apos;s own database. You can withdraw consent any time
                in Settings. See our{' '}
                <a href="/explore/dashboard/settings" style={{ color: '#9B8FFF' }}>Privacy Settings</a>{' '}
                for details.
              </div>
              <button
                onClick={acceptConsent}
                style={{
                  alignSelf: 'flex-start', padding: '8px 18px', borderRadius: 8,
                  background: '#9B8FFF', color: '#fff',
                  fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-dm-sans)',
                }}
              >
                I understand, continue
              </button>
            </div>
          )}

          {/* ── Co-brand header ───────────────────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 0 20px' }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              background: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, flexShrink: 0,
            }}>🏙</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--wimc-text-primary)', fontFamily: 'var(--font-syne)', lineHeight: 1.1 }}>
                Ahmedabad–Gandhinagar
              </div>
              <div style={{ fontSize: 11, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2 }}>
                City Guide · WIMC
              </div>
            </div>
          </div>

          {/* ── Main tab bar ─────────────────────────────────────────────────── */}
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--wimc-border-subtle)', marginBottom: 20 }}>
            {([
              { key: 'guide',     label: 'Guide',     icon: 'map',               emergency: false },
              { key: 'civic',     label: 'Civic',     icon: 'local_police',      emergency: false },
              { key: 'transit',   label: 'Transit',   icon: 'directions_transit',emergency: false },
              { key: 'emergency', label: 'Emergency', icon: 'emergency',         emergency: true  },
            ] as const).map(({ key, label, icon, emergency }) => {
              const isActive    = mainTab === key
              const activeColor = emergency ? '#C62828' : 'var(--wimc-coral)'
              const idleColor   = emergency ? 'rgba(198,40,40,0.55)' : 'var(--wimc-text-secondary)'
              return (
                <button
                  key={key}
                  onClick={() => setMainTab(key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '10px 13px',
                    fontSize: 13, fontWeight: isActive ? 600 : 400,
                    color: isActive ? activeColor : idleColor,
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    borderBottom: isActive ? `2px solid ${activeColor}` : '2px solid transparent',
                    fontFamily: 'var(--font-dm-sans)',
                    transition: 'color 180ms, border-color 180ms',
                    flexShrink: 0,
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: 17,
                      fontVariationSettings: isActive
                        ? "'FILL' 1,'wght' 500,'GRAD' 0,'opsz' 24"
                        : "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24",
                    }}
                  >
                    {icon}
                  </span>
                  {label}
                </button>
              )
            })}
          </div>

          {/* ── Guide tab ────────────────────────────────────────────────────── */}
          {mainTab === 'guide' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* ── Group tile buttons (wireframe home-tile style) ─────────── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                {(Object.values(GUIDE_GROUPS) as typeof GUIDE_GROUPS[GuideGroup][]).map(g => {
                  const active = activeGroup === g.key
                  return (
                    <button
                      key={g.key}
                      onClick={() => selectGroup(g.key)}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        gap: 5, padding: '10px 4px',
                        borderRadius: 12,
                        border: `1.5px solid ${active ? g.color : 'var(--wimc-border-default)'}`,
                        background: active ? g.bg : 'var(--wimc-bg-elevated)',
                        cursor: 'pointer', transition: 'all 150ms',
                      }}
                    >
                      <span style={{ fontSize: 22 }}>{g.emoji}</span>
                      <span style={{
                        fontSize: 10, fontWeight: active ? 700 : 500,
                        color: active ? g.color : 'var(--wimc-text-secondary)',
                        fontFamily: 'var(--font-dm-sans)', textAlign: 'center', lineHeight: 1.2,
                      }}>
                        {g.label}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* ── Map ─────────────────────────────────────────────────────── */}
              <CityMap
                attractions={finalFiltered}
                civicPOIs={[]}
                activeLayers={[]}
                showAttractions
                onAttractionClick={setSelectedA}
              />

              {/* ── Fine-grained category chips ──────────────────────────── */}
              {availableCategories.length > 2 && (
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
                  {availableCategories.map(cat => {
                    const meta = CATEGORY_META[cat] ?? { emoji: '📍', label: cat, color: '#9B8FFF' }
                    const active = categoryFilter === cat
                    return (
                      <button
                        key={cat}
                        onClick={() => setCategoryFilter(cat)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          padding: '6px 12px', borderRadius: 9999, flexShrink: 0,
                          border: `1.5px solid ${active ? meta.color : 'var(--wimc-border-default)'}`,
                          background: active ? `${meta.color}22` : 'transparent',
                          color: active ? meta.color : 'var(--wimc-text-secondary)',
                          fontSize: 12, fontWeight: active ? 600 : 400,
                          cursor: 'pointer', fontFamily: 'var(--font-dm-sans)',
                          transition: 'all 150ms',
                        }}
                      >
                        <span>{meta.emoji}</span>
                        {meta.label}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* ── Selected attraction detail panel (info-only) ─────────── */}
              <DesktopAttractionDetail />

              {/* ── Attraction list ──────────────────────────────────────── */}
              <AttractionList />

              {/* ── Attribution / data credits ───────────────────────────── */}
              <DataCredits open={creditsOpen} onToggle={() => setCreditsOpen(o => !o)} />

            </div>
          )}

          {/* ── Civic tab ────────────────────────────────────────────────────── */}
          {mainTab === 'civic' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <CityMap
                attractions={[]}
                civicPOIs={allCivicPOIs}
                activeLayers={activeLayers}
                showAttractions={false}
              />
              <CivicPanel
                activeLayers={activeLayers}
                loadingLayers={loadingLayers}
                layerData={layerData}
                onToggleLayer={consentGiven ? toggleLayer : () => setShowConsent(true)}
                refLat={refLat}
                refLng={refLng}
                usingUserLoc={usingUserLoc}
                locLoading={locLoading}
                onRequestLocation={requestUserLocation}
                onOpenReport={() => setShowReport(true)}
                onOpenTrafficReport={() => setShowTrafficReport(true)}
              />
            </div>
          )}

          {/* ── Transit tab ──────────────────────────────────────────────────── */}
          {mainTab === 'transit' && (
            <TransitPanel routes={transitRoutes} attractions={attractions} entryRef={entryRef} />
          )}

          {/* ── Emergency tab ────────────────────────────────────────────────── */}
          {mainTab === 'emergency' && <EmergencyPanel />}

        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          Report overlays — rendered outside both the mobile overlay and the
          desktop wrapper so they appear on top of everything (zIndex: 200
          set internally by CivicReportFlow and TrafficViolationFlow).
      ══════════════════════════════════════════════════════════════════════ */}
      {showReport && (
        <CivicReportFlow
          refLat={refLat}
          refLng={refLng}
          usingUserLoc={usingUserLoc}
          locLoading={locLoading}
          onRequestLocation={requestUserLocation}
          onClose={() => setShowReport(false)}
        />
      )}
      {showTrafficReport && (
        <TrafficViolationFlow
          refLat={refLat}
          refLng={refLng}
          usingUserLoc={usingUserLoc}
          locLoading={locLoading}
          onRequestLocation={requestUserLocation}
          onClose={() => setShowTrafficReport(false)}
        />
      )}
    </>
  )
}

// ── Data credits / attribution disclosure ─────────────────────────────────────

function DataCredits({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <div style={{ border: '1px solid var(--wimc-border-subtle)', borderRadius: 10, overflow: 'hidden', fontSize: 11 }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', background: 'var(--wimc-bg-elevated)',
          border: 'none', cursor: 'pointer', color: 'var(--wimc-text-muted)',
          fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
        }}
      >
        <span>About this data</span>
        <span style={{ fontSize: 12 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{
          padding: '12px 14px', background: 'var(--wimc-bg-base)',
          borderTop: '1px solid var(--wimc-border-subtle)',
          display: 'flex', flexDirection: 'column', gap: 8,
          color: 'var(--wimc-text-secondary)',
          fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10, lineHeight: 1.7,
        }}>
          <div>
            <strong style={{ color: 'var(--wimc-text-primary)' }}>Map tiles</strong>{' '}
            ©{' '}
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--wimc-coral)' }}>
              OpenStreetMap contributors
            </a>
            , ODbL
          </div>
          <div>
            <strong style={{ color: 'var(--wimc-text-primary)' }}>Curated places</strong>{' '}
            © City Collective LLP · Independently verified by WIMC team
          </div>
          <div>
            <strong style={{ color: 'var(--wimc-text-primary)' }}>Heritage dataset entries</strong>{' '}
            sourced under the{' '}
            <a href="https://data.gov.in/government-open-data-license-india" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--wimc-coral)' }}>
              Government Open Data License – India (GODL-India)
            </a>
          </div>
          <div style={{ marginTop: 2, color: 'var(--wimc-text-muted)' }}>
            Guide places are for discovery only and do not reflect WIMC event inventory.
            External links open in third-party websites; WIMC is not responsible for their content.
          </div>
        </div>
      )}
    </div>
  )
}
