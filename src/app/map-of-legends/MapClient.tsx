'use client'

import { useState } from 'react'
import Link from 'next/link'
import { WimcWordmark } from '@/components/WimcWordmark'
import type { LegendaryVenue } from '@/app/actions/mapOfLegends'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pct(rate: number): string {
  return `${Math.round(rate * 100)}%`
}

function belovedSinceLabel(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
}

function VenuePlaceholder({ name }: { name: string }) {
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div style={{
      width: '100%', height: 160,
      background: 'linear-gradient(135deg, rgba(31,138,112,0.16) 0%, rgba(107,78,255,0.12) 100%)',
      display: 'grid', placeItems: 'center',
      fontFamily: 'var(--font-syne)', fontWeight: 900,
      fontSize: 36, color: 'rgba(31,138,112,0.45)',
    }}>
      {initials}
    </div>
  )
}

function StatPill({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5,
      padding: '5px 10px', borderRadius: 8,
      background: '#F3E8D6',
      border: '1px solid rgba(32,26,18,0.08)',
      flexShrink: 0,
    }}>
      <span className="material-symbols-outlined" style={{ fontSize: 13, color: '#1F8A70' }}>{icon}</span>
      <span style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 12, fontWeight: 700 }}>{value}</span>
      <span style={{ fontSize: 11, color: '#58503F' }}>{label}</span>
    </div>
  )
}

function VenueCard({ venue }: { venue: LegendaryVenue }) {
  const since = belovedSinceLabel(venue.belovedSince)

  return (
    <Link href={`/venue/${venue.slug}`} style={{ textDecoration: 'none' }}>
      <div
        style={{
          background: '#FFFFFF',
          border: '1.5px dashed rgba(32,26,18,0.15)',
          borderRadius: 18, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          transition: 'border-color 200ms, transform 200ms',
          cursor: 'pointer', height: '100%',
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLElement
          el.style.borderColor = '#1F8A70'
          el.style.transform = 'translateY(-2px)'
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLElement
          el.style.borderColor = 'rgba(32,26,18,0.15)'
          el.style.transform = 'translateY(0)'
        }}
      >
        {/* Cover */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          {venue.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={venue.coverImageUrl}
              alt={venue.name}
              style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <VenuePlaceholder name={venue.name} />
          )}

          {/* Legendary badge */}
          <div style={{
            position: 'absolute', top: 10, left: 10,
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 9999,
            background: 'rgba(251,243,231,0.94)', backdropFilter: 'blur(8px)',
            border: '1px dashed rgba(31,138,112,0.55)',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 12, color: '#1F8A70' }}>
              workspace_premium
            </span>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#1F8A70', letterSpacing: '0.08em' }}>
              LEGENDARY
            </span>
          </div>

          {/* Trending badge */}
          {venue.isTrending && (
            <div style={{
              position: 'absolute', top: 10, right: 10,
              padding: '4px 10px', borderRadius: 9999,
              background: 'rgba(251,243,231,0.94)', backdropFilter: 'blur(8px)',
              border: '1px dashed rgba(216,67,46,0.55)',
              fontSize: 10, fontWeight: 800, color: '#D8432E',
            }}>
              🔥 Trending
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>

          {/* Name + location */}
          <div>
            <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
              {venue.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#58503F' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>location_on</span>
              {venue.neighbourhood ?? venue.cityName}
              {venue.capacityMax && (
                <>
                  <span style={{ color: 'rgba(32,26,18,0.12)' }}>·</span>
                  <span>Up to {venue.capacityMax}</span>
                </>
              )}
            </div>
          </div>

          {/* Description */}
          {venue.description && (
            <p style={{
              fontSize: 13, color: '#58503F', lineHeight: 1.5,
              margin: 0,
              display: '-webkit-box', WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {venue.description}
            </p>
          )}

          {/* Signal stats */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 'auto' }}>
            <StatPill icon="star" value={venue.averageMakerRating.toFixed(1)} label="★" />
            <StatPill icon="group" value={pct(venue.repeatAttendeeRate)} label="repeat" />
            <StatPill icon="schedule" value={pct(venue.onTimeRate)} label="on-time" />
          </div>

          {/* Footer row */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            paddingTop: 10, borderTop: '1px solid rgba(32,26,18,0.08)',
            fontSize: 12, color: '#58503F',
          }}>
            <span>
              <strong style={{ color: '#201A12' }}>{venue.totalEventsHosted}</strong>
              {' '}events hosted
            </span>
            {since && (
              <span style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11 }}>
                Beloved since {since}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Props + component
// ---------------------------------------------------------------------------

interface Props {
  venues: LegendaryVenue[]
}

export default function MapClient({ venues }: Props) {
  // Group by city
  const cityGroups = venues.reduce<Record<string, LegendaryVenue[]>>((acc, venue) => {
    if (!acc[venue.cityId]) acc[venue.cityId] = []
    acc[venue.cityId].push(venue)
    return acc
  }, {})

  const cities = Object.keys(cityGroups).sort((a, b) =>
    (cityGroups[b].length - cityGroups[a].length) || a.localeCompare(b),
  )

  const [cityFilter, setCityFilter] = useState<string>('all')

  const visibleCities = cityFilter === 'all' ? cities : cities.filter((c) => c === cityFilter)

  return (
    <div style={{ minHeight: '100vh', background: '#FBF3E7', color: '#201A12' }}>

      {/* ── Nav ──────────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(251,243,231,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(32,26,18,0.08)',
        padding: '0 32px', height: 60,
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <WimcWordmark color="#FF6B35" height={20} />
        </Link>
        <span style={{ color: 'rgba(32,26,18,0.12)' }}>·</span>
        <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 600, fontSize: 14, color: '#1F8A70' }}>
          Map of Legends
        </span>
        <div style={{ flex: 1 }} />
        <Link href="/signin" style={{
          padding: '6px 16px', borderRadius: 8, fontSize: 12.5, fontWeight: 600,
          background: '#FF6B35', color: '#fff', textDecoration: 'none',
          fontFamily: 'var(--font-syne)',
        }}>
          Join WIMC
        </Link>
      </nav>

      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 48, textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 20,
            padding: '5px 16px', borderRadius: 9999,
            background: 'rgba(31,138,112,0.1)', border: '1px dashed rgba(31,138,112,0.35)',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#1F8A70' }}>workspace_premium</span>
            <span style={{ fontFamily: 'var(--font-dm-serif)', fontSize: 11, fontWeight: 700, color: '#1F8A70', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Legendary Venues
            </span>
          </div>

          <h1 style={{
            fontFamily: 'var(--font-syne)', fontWeight: 900,
            fontSize: 'clamp(32px, 6vw, 64px)', lineHeight: 0.92,
            letterSpacing: '-0.03em', margin: '0 0 16px',
          }}>
            Map of{' '}
            <span style={{
              backgroundImage: 'linear-gradient(110deg, #1F8A70 0%, #6B4EFF 70%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              Legends
            </span>
          </h1>
          <p style={{ fontSize: 16, color: '#58503F', maxWidth: 480, margin: '0 auto 24px', lineHeight: 1.6 }}>
            The Venues where culture doesn&apos;t just happen — it stays.
            Ranked by the people who keep coming back.
          </p>

          {/* Summary */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 28 }}>
            {[
              { value: venues.length, label: 'Legendary Venues' },
              { value: cities.length, label: 'Cities' },
              { value: venues.filter((a) => a.isTrending).length, label: 'Trending now' },
            ].map(({ value, label }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 900, fontSize: 26, color: '#1F8A70' }}>
                  {value}
                </div>
                <div style={{ fontSize: 12, color: '#58503F', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── City filter ────────────────────────────────────────────────────── */}
        {cities.length > 1 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 36 }}>
            <button
              onClick={() => setCityFilter('all')}
              style={{
                padding: '6px 14px', borderRadius: 9999, fontSize: 12.5, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'var(--font-dm-sans)',
                border: `1.5px dashed ${cityFilter === 'all' ? '#1F8A70' : 'rgba(32,26,18,0.15)'}`,
                background: cityFilter === 'all' ? 'rgba(31,138,112,0.12)' : 'transparent',
                color: cityFilter === 'all' ? '#1F8A70' : '#58503F',
                transition: 'all 150ms',
              }}
            >
              All cities ({venues.length})
            </button>
            {cities.map((cityId) => {
              const first = cityGroups[cityId][0]
              const active = cityFilter === cityId
              return (
                <button
                  key={cityId}
                  onClick={() => setCityFilter(cityId)}
                  style={{
                    padding: '6px 14px', borderRadius: 9999, fontSize: 12.5, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'var(--font-dm-sans)',
                    border: `1.5px dashed ${active ? '#1F8A70' : 'rgba(32,26,18,0.15)'}`,
                    background: active ? 'rgba(31,138,112,0.12)' : 'transparent',
                    color: active ? '#1F8A70' : '#58503F',
                    transition: 'all 150ms',
                  }}
                >
                  {first.cityEmoji} {first.cityName} ({cityGroups[cityId].length})
                </button>
              )
            })}
          </div>
        )}

        {/* ── City sections ──────────────────────────────────────────────────── */}
        {venues.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px', color: '#58503F', fontSize: 15 }}>
            No Legendary Venues yet — every institution starts somewhere.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 52 }}>
            {visibleCities.map((cityId) => {
              const group = cityGroups[cityId]
              const first = group[0]
              return (
                <section key={cityId}>
                  {/* City header */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 20 }}>
                    <span style={{ fontSize: 28 }}>{first.cityEmoji}</span>
                    <h2 style={{
                      fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 22, margin: 0,
                    }}>
                      {first.cityName}
                    </h2>
                    <span style={{
                      fontSize: 13, color: '#58503F',
                      fontFamily: 'var(--font-jetbrains-mono)',
                    }}>
                      {group.length} legendary venue{group.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Card grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 20 }}>
                    {group.map((venue) => <VenueCard key={venue.id} venue={venue} />)}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
