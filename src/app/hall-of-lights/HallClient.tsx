'use client'

import { useState } from 'react'
import Link from 'next/link'
import { WimcWordmark } from '@/components/WimcWordmark'
import type { ShowcasedCreator } from '@/app/actions/hallOfLights'
import type { UserTier } from '@/types/marketplace'
import { cityToSlug } from '@/lib/profile-url'

// ---------------------------------------------------------------------------
// Tier meta
// ---------------------------------------------------------------------------

const TIER_META = {
  lantern: {
    label: 'Lantern',
    icon: 'light_mode',
    color: 'var(--wimc-amber)',
    bg: 'rgba(245,168,0,0.15)',
    border: 'rgba(245,168,0,0.35)',
    borderHover: 'rgba(245,168,0,0.65)',
    gradient: 'linear-gradient(135deg, rgba(245,168,0,0.1) 0%, rgba(232,87,42,0.06) 100%)',
  },
  beacon: {
    label: 'Beacon',
    icon: 'workspace_premium',
    color: '#a855f7',
    bg: 'rgba(168,85,247,0.15)',
    border: 'rgba(168,85,247,0.35)',
    borderHover: 'rgba(168,85,247,0.65)',
    gradient: 'linear-gradient(135deg, rgba(168,85,247,0.1) 0%, rgba(232,87,42,0.06) 100%)',
  },
} as const

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function paise(p: number): string {
  const rupees = Math.round(p / 100)
  if (rupees >= 100_000) return `₹${(rupees / 100_000).toFixed(1)}L`
  if (rupees >= 1_000)   return `₹${(rupees / 1_000).toFixed(1)}K`
  return `₹${rupees}`
}

function StarRating({ rating }: { rating: number }) {
  const filled = Math.round(rating)
  return (
    <span style={{ fontSize: 12, color: 'var(--wimc-amber)', letterSpacing: 1 }}>
      {'★'.repeat(Math.min(filled, 5))}{'☆'.repeat(Math.max(0, 5 - filled))}
      <span style={{ marginLeft: 5, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)' }}>
        {rating.toFixed(1)}
      </span>
    </span>
  )
}

function CreatorAvatar({ creator }: { creator: ShowcasedCreator }) {
  const meta = TIER_META[creator.userTier]
  const initials = creator.displayName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  return creator.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={creator.avatarUrl}
      alt={creator.displayName}
      style={{ width: 52, height: 52, borderRadius: 14, objectFit: 'cover', flexShrink: 0 }}
    />
  ) : (
    <div style={{
      width: 52, height: 52, borderRadius: 14, flexShrink: 0,
      background: meta.bg, border: `1px solid ${meta.border}`,
      display: 'grid', placeItems: 'center',
      fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 16, color: meta.color,
    }}>
      {initials}
    </div>
  )
}

function CreatorCard({ creator, cohort = false }: { creator: ShowcasedCreator; cohort?: boolean }) {
  const meta = TIER_META[creator.userTier]
  return (
    <Link href={`/${cityToSlug(creator.cityId)}/${creator.username}?src=platform_discovery`} style={{ textDecoration: 'none' }}>
      <div
        style={{
          background: cohort ? meta.gradient : 'var(--wimc-bg-elevated)',
          border: `1px solid ${cohort ? meta.border : 'var(--wimc-border-default)'}`,
          borderRadius: 18, padding: 20,
          display: 'flex', flexDirection: 'column', gap: 16,
          transition: 'border-color 200ms, transform 200ms',
          cursor: 'pointer', height: '100%',
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLElement
          el.style.borderColor = cohort ? meta.borderHover : 'var(--wimc-coral)'
          el.style.transform = 'translateY(-2px)'
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLElement
          el.style.borderColor = cohort ? meta.border : 'var(--wimc-border-default)'
          el.style.transform = 'translateY(0)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <CreatorAvatar creator={creator} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 15 }}>
                {creator.displayName}
              </span>
              {creator.isFoundingMaker && (
                <span style={{
                  fontSize: 9, fontWeight: 800, letterSpacing: '0.07em',
                  padding: '2px 6px', borderRadius: 9999, textTransform: 'uppercase',
                  background: 'rgba(245,168,0,0.15)', color: 'var(--wimc-amber)',
                  border: '1px solid rgba(245,168,0,0.3)',
                }}>
                  Founding
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 11, color: 'var(--wimc-text-secondary)',
                fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'capitalize',
              }}>
                {creator.creatorType.replace(/_/g, ' ')}
              </span>
              <span style={{ color: 'var(--wimc-border-default)', fontSize: 10 }}>·</span>
              <span style={{
                fontSize: 11, fontFamily: 'var(--font-jetbrains-mono)',
                color: cohort ? meta.color : 'var(--wimc-text-secondary)',
              }}>
                {creator.cityName}
              </span>
            </div>
          </div>

          {/* Tier badge icon */}
          <div style={{
            flexShrink: 0, width: 28, height: 28, borderRadius: 8,
            background: meta.bg, border: `1px solid ${meta.border}`,
            display: 'grid', placeItems: 'center',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: meta.color }}>
              {meta.icon}
            </span>
          </div>
        </div>

        {/* Rating */}
        {creator.avgRating > 0 && <StarRating rating={creator.avgRating} />}

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            { label: 'Events',  value: String(creator.cumEventsHosted) },
            { label: 'Reached', value: creator.cumUniqueAttendees >= 1000
                ? `${(creator.cumUniqueAttendees / 1000).toFixed(1)}K`
                : String(creator.cumUniqueAttendees) },
            { label: 'Revenue', value: creator.cumGmvPaise > 0 ? paise(creator.cumGmvPaise) : '—' },
          ].map(({ label, value }) => (
            <div key={label} style={{
              background: 'var(--wimc-bg-overlay)', borderRadius: 10,
              padding: '8px 10px', textAlign: 'center',
            }}>
              <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 16 }}>{value}</div>
              <div style={{ fontSize: 10, color: 'var(--wimc-text-secondary)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Props + component
// ---------------------------------------------------------------------------

interface Props {
  creators:   ShowcasedCreator[]
  viewerCity: string | null
  viewerTier: UserTier | null
}

export default function HallClient({ creators, viewerCity, viewerTier }: Props) {
  const viewerIsLanternPlus = viewerTier === 'lantern' || viewerTier === 'beacon'

  const cities = [...new Set(creators.map((c) => c.cityId))]
    .map((id) => ({ id, name: creators.find((c) => c.cityId === id)!.cityName }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const [tierFilter, setTierFilter]   = useState<'all' | 'lantern' | 'beacon'>('all')
  const [cityFilter, setCityFilter]   = useState<string>('all')

  const cohort = viewerIsLanternPlus && viewerCity
    ? creators.filter((c) => c.cityId === viewerCity)
    : []

  const filtered = creators.filter((c) => {
    if (tierFilter !== 'all' && c.userTier !== tierFilter) return false
    if (cityFilter !== 'all' && c.cityId !== cityFilter)   return false
    return true
  })

  const beaconCount  = creators.filter((c) => c.userTier === 'beacon').length
  const lanternCount = creators.filter((c) => c.userTier === 'lantern').length

  const card: React.CSSProperties = {
    background: 'var(--wimc-bg-base)',
  }
  void card

  return (
    <div style={{ minHeight: '100vh', background: 'var(--wimc-bg-base)' }}>

      {/* ── Nav ──────────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(10,10,11,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--wimc-border-subtle)',
        padding: '0 32px', height: 60,
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <WimcWordmark color="#E8705A" height={20} />
        </Link>
        <span style={{ color: 'var(--wimc-border-default)' }}>·</span>
        <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 600, fontSize: 14, color: '#a855f7' }}>
          Hall of Lights
        </span>
        <div style={{ flex: 1 }} />
        <Link href="/signin" style={{
          padding: '6px 16px', borderRadius: 8, fontSize: 12.5, fontWeight: 600,
          background: 'var(--wimc-coral)', color: '#fff', textDecoration: 'none',
          fontFamily: 'var(--font-syne)',
        }}>
          Join WIMC
        </Link>
      </nav>

      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 48, textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 20 }}>
            {(['lantern', 'beacon'] as const).map((tier) => {
              const m = TIER_META[tier]
              return (
                <div key={tier} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '5px 14px', borderRadius: 9999,
                  background: m.bg, border: `1px solid ${m.border}`,
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14, color: m.color }}>{m.icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: m.color, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    {m.label}
                  </span>
                </div>
              )
            })}
          </div>

          <h1 style={{
            fontFamily: 'var(--font-syne)', fontWeight: 900,
            fontSize: 'clamp(32px, 6vw, 64px)', lineHeight: 0.92,
            letterSpacing: '-0.03em', margin: '0 0 16px',
          }}>
            Hall of{' '}
            <span style={{
              backgroundImage: 'linear-gradient(110deg, #a855f7 0%, #F5A800 70%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              Lights
            </span>
          </h1>
          <p style={{ fontSize: 16, color: 'var(--wimc-text-secondary)', maxWidth: 520, margin: '0 auto', lineHeight: 1.6 }}>
            Lanterns who light the stage. Beacons who built the culture.
            Every name here earned it.
          </p>

          {/* Summary counts */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 24 }}>
            {[
              { label: 'Beacons',  value: beaconCount,  color: '#a855f7' },
              { label: 'Lanterns', value: lanternCount, color: 'var(--wimc-amber)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 900, fontSize: 28, color }}>{value}</div>
                <div style={{ fontSize: 12, color: 'var(--wimc-text-secondary)', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Cohort (Lantern+ viewers only) ─────────────────────────────────── */}
        {cohort.length > 0 && (
          <div style={{ marginBottom: 48 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: TIER_META[viewerTier as 'lantern' | 'beacon']?.color ?? '#a855f7' }}>group</span>
              <h2 style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 17, margin: 0 }}>Your Cohort</h2>
              <span style={{ fontSize: 12, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)' }}>
                Lantern &amp; Beacon creators in your city
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {cohort.map((c) => <CreatorCard key={c.id} creator={c} cohort />)}
            </div>
          </div>
        )}

        {/* ── Filters ────────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
          {/* Tier filter */}
          {([
            { id: 'all',     label: `All (${creators.length})` },
            { id: 'beacon',  label: `Beacon (${beaconCount})` },
            { id: 'lantern', label: `Lantern (${lanternCount})` },
          ] as { id: 'all' | 'beacon' | 'lantern'; label: string }[]).map(({ id, label }) => {
            const active = tierFilter === id
            const color = id === 'beacon' ? '#a855f7' : id === 'lantern' ? 'var(--wimc-amber)' : 'var(--wimc-text-secondary)'
            return (
              <button
                key={id}
                onClick={() => setTierFilter(id)}
                style={{
                  padding: '6px 14px', borderRadius: 9999, fontSize: 12.5, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'var(--font-dm-sans)',
                  border: `1.5px solid ${active ? color : 'var(--wimc-border-subtle)'}`,
                  background: active ? (id === 'beacon' ? 'rgba(168,85,247,0.12)' : id === 'lantern' ? 'rgba(245,168,0,0.12)' : 'var(--wimc-bg-overlay)') : 'transparent',
                  color: active ? color : 'var(--wimc-text-secondary)',
                  transition: 'all 150ms',
                }}
              >
                {label}
              </button>
            )
          })}

          {/* Divider */}
          {cities.length > 1 && <span style={{ width: 1, background: 'var(--wimc-border-subtle)', margin: '0 4px' }} />}

          {/* City filter */}
          {cities.length > 1 && [{ id: 'all', name: 'All cities' }, ...cities].map((c) => {
            const active = cityFilter === c.id
            return (
              <button
                key={c.id}
                onClick={() => setCityFilter(c.id)}
                style={{
                  padding: '6px 14px', borderRadius: 9999, fontSize: 12.5, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'var(--font-dm-sans)',
                  border: `1.5px solid ${active ? 'var(--wimc-coral)' : 'var(--wimc-border-subtle)'}`,
                  background: active ? 'rgba(232,87,42,0.1)' : 'transparent',
                  color: active ? 'var(--wimc-coral)' : 'var(--wimc-text-secondary)',
                  transition: 'all 150ms',
                }}
              >
                {c.name}
              </button>
            )
          })}
        </div>

        {/* ── Creator grid ───────────────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px', color: 'var(--wimc-text-secondary)', fontSize: 15 }}>
            No creators here yet — be the first.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 20 }}>
            {filtered.map((c) => <CreatorCard key={c.id} creator={c} />)}
          </div>
        )}

      </div>
    </div>
  )
}
