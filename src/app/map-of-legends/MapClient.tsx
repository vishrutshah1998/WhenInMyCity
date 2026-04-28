'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { LegendaryAdda } from '@/app/actions/mapOfLegends'

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

function AddaPlaceholder({ name }: { name: string }) {
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div style={{
      width: '100%', height: 160,
      background: 'linear-gradient(135deg, rgba(77,210,177,0.15) 0%, rgba(168,85,247,0.1) 100%)',
      display: 'grid', placeItems: 'center',
      fontFamily: 'var(--font-syne)', fontWeight: 900,
      fontSize: 36, color: 'rgba(77,210,177,0.5)',
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
      background: 'var(--wimc-bg-overlay)',
      border: '1px solid var(--wimc-border-subtle)',
      flexShrink: 0,
    }}>
      <span className="material-symbols-outlined" style={{ fontSize: 13, color: 'var(--wimc-teal)' }}>{icon}</span>
      <span style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 12, fontWeight: 700 }}>{value}</span>
      <span style={{ fontSize: 11, color: 'var(--wimc-text-secondary)' }}>{label}</span>
    </div>
  )
}

function AddaCard({ adda }: { adda: LegendaryAdda }) {
  const since = belovedSinceLabel(adda.belovedSince)

  return (
    <Link href={`/adda/${adda.slug}`} style={{ textDecoration: 'none' }}>
      <div
        style={{
          background: 'var(--wimc-bg-elevated)',
          border: '1px solid var(--wimc-border-default)',
          borderRadius: 18, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          transition: 'border-color 200ms, transform 200ms',
          cursor: 'pointer', height: '100%',
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLElement
          el.style.borderColor = 'rgba(77,210,177,0.5)'
          el.style.transform = 'translateY(-2px)'
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLElement
          el.style.borderColor = 'var(--wimc-border-default)'
          el.style.transform = 'translateY(0)'
        }}
      >
        {/* Cover */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          {adda.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={adda.coverImageUrl}
              alt={adda.name}
              style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <AddaPlaceholder name={adda.name} />
          )}

          {/* Legendary badge */}
          <div style={{
            position: 'absolute', top: 10, left: 10,
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 9999,
            background: 'rgba(10,10,11,0.82)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(77,210,177,0.4)',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 12, color: 'var(--wimc-teal)' }}>
              workspace_premium
            </span>
            <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--wimc-teal)', letterSpacing: '0.08em' }}>
              LEGENDARY
            </span>
          </div>

          {/* Trending badge */}
          {adda.isTrending && (
            <div style={{
              position: 'absolute', top: 10, right: 10,
              padding: '4px 10px', borderRadius: 9999,
              background: 'rgba(10,10,11,0.82)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(232,87,42,0.4)',
              fontSize: 10, fontWeight: 800, color: 'var(--wimc-coral)',
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
              {adda.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--wimc-text-secondary)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>location_on</span>
              {adda.neighbourhood ?? adda.cityName}
              {adda.capacityMax && (
                <>
                  <span style={{ color: 'var(--wimc-border-default)' }}>·</span>
                  <span>Up to {adda.capacityMax}</span>
                </>
              )}
            </div>
          </div>

          {/* Description */}
          {adda.description && (
            <p style={{
              fontSize: 13, color: 'var(--wimc-text-secondary)', lineHeight: 1.5,
              margin: 0,
              display: '-webkit-box', WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {adda.description}
            </p>
          )}

          {/* Signal stats */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 'auto' }}>
            <StatPill icon="star" value={adda.averageMakerRating.toFixed(1)} label="★" />
            <StatPill icon="group" value={pct(adda.repeatAttendeeRate)} label="repeat" />
            <StatPill icon="schedule" value={pct(adda.onTimeRate)} label="on-time" />
          </div>

          {/* Footer row */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            paddingTop: 10, borderTop: '1px solid var(--wimc-border-subtle)',
            fontSize: 12, color: 'var(--wimc-text-secondary)',
          }}>
            <span>
              <strong style={{ color: 'var(--wimc-text-primary)' }}>{adda.totalEventsHosted}</strong>
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
  addas: LegendaryAdda[]
}

export default function MapClient({ addas }: Props) {
  // Group by city
  const cityGroups = addas.reduce<Record<string, LegendaryAdda[]>>((acc, adda) => {
    if (!acc[adda.cityId]) acc[adda.cityId] = []
    acc[adda.cityId].push(adda)
    return acc
  }, {})

  const cities = Object.keys(cityGroups).sort((a, b) =>
    (cityGroups[b].length - cityGroups[a].length) || a.localeCompare(b),
  )

  const [cityFilter, setCityFilter] = useState<string>('all')

  const visibleCities = cityFilter === 'all' ? cities : cities.filter((c) => c === cityFilter)

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
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'var(--wimc-text-primary)' }}>
          <div style={{ width: 26, height: 26, background: 'var(--wimc-coral)', borderRadius: 7, display: 'grid', placeItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 900, color: '#fff', fontFamily: 'var(--font-syne)' }}>W</span>
          </div>
          <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 15 }}>WIMC</span>
        </Link>
        <span style={{ color: 'var(--wimc-border-default)' }}>·</span>
        <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 600, fontSize: 14, color: 'var(--wimc-teal)' }}>
          Map of Legends
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
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 20,
            padding: '5px 16px', borderRadius: 9999,
            background: 'rgba(77,210,177,0.1)', border: '1px solid rgba(77,210,177,0.3)',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--wimc-teal)' }}>workspace_premium</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--wimc-teal)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Legendary Addas
            </span>
          </div>

          <h1 style={{
            fontFamily: 'var(--font-syne)', fontWeight: 900,
            fontSize: 'clamp(32px, 6vw, 64px)', lineHeight: 0.92,
            letterSpacing: '-0.03em', margin: '0 0 16px',
          }}>
            Map of{' '}
            <span style={{
              backgroundImage: 'linear-gradient(110deg, var(--wimc-teal) 0%, #a855f7 70%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              Legends
            </span>
          </h1>
          <p style={{ fontSize: 16, color: 'var(--wimc-text-secondary)', maxWidth: 480, margin: '0 auto 24px', lineHeight: 1.6 }}>
            The venues where culture doesn&apos;t just happen — it stays.
            Ranked by the people who keep coming back.
          </p>

          {/* Summary */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 28 }}>
            {[
              { value: addas.length, label: 'Legendary Addas' },
              { value: cities.length, label: 'Cities' },
              { value: addas.filter((a) => a.isTrending).length, label: 'Trending now' },
            ].map(({ value, label }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 900, fontSize: 26, color: 'var(--wimc-teal)' }}>
                  {value}
                </div>
                <div style={{ fontSize: 12, color: 'var(--wimc-text-secondary)', marginTop: 2 }}>{label}</div>
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
                border: `1.5px solid ${cityFilter === 'all' ? 'var(--wimc-teal)' : 'var(--wimc-border-subtle)'}`,
                background: cityFilter === 'all' ? 'rgba(77,210,177,0.12)' : 'transparent',
                color: cityFilter === 'all' ? 'var(--wimc-teal)' : 'var(--wimc-text-secondary)',
                transition: 'all 150ms',
              }}
            >
              All cities ({addas.length})
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
                    border: `1.5px solid ${active ? 'var(--wimc-teal)' : 'var(--wimc-border-subtle)'}`,
                    background: active ? 'rgba(77,210,177,0.12)' : 'transparent',
                    color: active ? 'var(--wimc-teal)' : 'var(--wimc-text-secondary)',
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
        {addas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px', color: 'var(--wimc-text-secondary)', fontSize: 15 }}>
            No Legendary Addas yet — every institution starts somewhere.
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
                      fontSize: 13, color: 'var(--wimc-text-secondary)',
                      fontFamily: 'var(--font-jetbrains-mono)',
                    }}>
                      {group.length} legendary adda{group.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Card grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 20 }}>
                    {group.map((adda) => <AddaCard key={adda.id} adda={adda} />)}
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
