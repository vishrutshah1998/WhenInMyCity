'use client'

import { useState } from 'react'
import type { TransitRoute, CityAttraction } from '@/app/actions/cityGuide'

// ── Operator metadata ─────────────────────────────────────────────────────────

const OPERATOR_META: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  gmrc:    { label: 'GMRC Metro',    emoji: '🚇', color: '#1565C0', bg: 'rgba(21,101,192,0.10)' },
  janmarg: { label: 'Janmarg BRTS', emoji: '🚌', color: '#2E7D32', bg: 'rgba(46,125,50,0.10)'  },
  amts:    { label: 'AMTS City Bus', emoji: '🚐', color: '#E65100', bg: 'rgba(230,81,0,0.10)'   },
}

// ── Ride app config ───────────────────────────────────────────────────────────

type RideApp = 'uber' | 'ola' | 'rapido' | 'nammayatri'

const RIDE_APPS: {
  key:     RideApp
  label:   string
  emoji:   string
  bg:      string
  color:   string
  usesDest: boolean
  note?:   string
}[] = [
  { key: 'uber',       label: 'Uber',         emoji: '🚗', bg: '#000',     color: '#fff', usesDest: true  },
  { key: 'ola',        label: 'Ola',          emoji: '🚕', bg: '#27AE60',  color: '#fff', usesDest: true  },
  { key: 'rapido',     label: 'Rapido',       emoji: '🛵', bg: '#FFD100',  color: '#000', usesDest: true  },
  { key: 'nammayatri', label: 'Namma Yatri',  emoji: '🚖', bg: '#3B82F6',  color: '#fff', usesDest: false,
    note: 'Opens app home — destination pre-fill not in public spec' },
]

// ── Ahmedabad railway stations (display reference for IRCTC) ─────────────────

const STATIONS = [
  { name: 'Ahmedabad (Kalupur)',    code: 'ADI', lat: 23.0269, lng: 72.6019 },
  { name: 'Sabarmati Junction',     code: 'SAG', lat: 23.0750, lng: 72.5756 },
  { name: 'Gandhinagar Capital',    code: 'GNC', lat: 23.2082, lng: 72.6560 },
]

// ── Fare formatter ────────────────────────────────────────────────────────────

function formatFare(minP: number | null, maxP: number | null): string {
  if (!minP && !maxP) return '—'
  const min = minP ? `₹${(minP / 100).toFixed(0)}` : null
  const max = maxP ? `₹${(maxP / 100).toFixed(0)}` : null
  if (min && max && min !== max) return `${min}–${max}`
  return min ?? max ?? '—'
}

// ── Handoff URL builder ───────────────────────────────────────────────────────
// All outbound ride/booking links go through /api/transit/handoff so that
// a ride handoff originating from a gov-channel QR entry (ref param) is
// logged server-side. When Phase A adds an attribution_events table, the
// server route upgrades from console.log to a DB insert — no client change needed.

function handoffUrl(
  app: string,
  dest: { name: string; lat: number; lng: number },
  ref: string | null,
): string {
  const params = new URLSearchParams({
    app,
    dest: dest.name,
    lat:  String(dest.lat),
    lng:  String(dest.lng),
  })
  if (ref) params.set('ref', ref)
  return `/api/transit/handoff?${params.toString()}`
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  routes:      TransitRoute[]
  attractions: CityAttraction[]
  // Passed from the URL (?ref=gov-qr-X) if a gov-channel QR was the entry point.
  // Forwarded to /api/transit/handoff for server-side attribution logging.
  entryRef:    string | null
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TransitPanel({ routes, attractions, entryRef }: Props) {
  const [activeOperator, setActiveOperator] = useState<'all' | 'gmrc' | 'janmarg' | 'amts'>('all')
  const [destIdx,        setDestIdx]        = useState(0)

  const filtered = activeOperator === 'all'
    ? routes
    : routes.filter(r => r.operator === activeOperator)

  // Destinations: guide attractions + railway stations
  const destinations = [
    ...attractions.map(a => ({ name: a.name, lat: a.lat, lng: a.lng })),
    ...STATIONS.map(s => ({ name: s.name, lat: s.lat, lng: s.lng })),
  ]
  const dest = destinations[destIdx] ?? destinations[0]

  const card: React.CSSProperties = {
    background:   'var(--wimc-bg-elevated)',
    border:       '1px solid var(--wimc-border-default)',
    borderRadius: 14,
    overflow:     'hidden',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Staleness disclaimer — prominent ──────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '12px 14px',
        background: 'rgba(245,168,0,0.09)',
        border: '1.5px solid rgba(245,168,0,0.30)',
        borderRadius: 10,
        fontSize: 12, color: 'var(--wimc-text-secondary)',
        fontFamily: 'var(--font-dm-sans)',
      }}>
        <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>⚠️</span>
        <span style={{ lineHeight: 1.55 }}>
          Fares and schedules are indicative and may be out of date.{' '}
          <strong style={{ color: 'var(--wimc-amber)' }}>Verify before travel</strong>{' '}
          at the operator's official counter, app, or website — routes and timings change.
        </span>
      </div>

      {/* ── Operator filter ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {(['all', 'gmrc', 'janmarg', 'amts'] as const).map(op => {
          const meta   = op !== 'all' ? OPERATOR_META[op] : null
          const active = activeOperator === op
          return (
            <button
              key={op}
              onClick={() => setActiveOperator(op)}
              style={{
                padding: '7px 14px', borderRadius: 9999,
                border: `1.5px solid ${active ? (meta?.color ?? 'var(--wimc-coral)') : 'var(--wimc-border-default)'}`,
                background: active
                  ? (meta ? meta.bg : 'rgba(232,112,90,0.12)')
                  : 'transparent',
                color: active ? (meta?.color ?? 'var(--wimc-coral)') : 'var(--wimc-text-secondary)',
                fontSize: 13, fontWeight: active ? 600 : 400,
                cursor: 'pointer', fontFamily: 'var(--font-dm-sans)',
                transition: 'all 160ms',
              }}
            >
              {meta ? `${meta.emoji} ${meta.label}` : 'All Routes'}
            </button>
          )
        })}
      </div>

      {/* ── Route cards ───────────────────────────────────────────────────── */}
      {filtered.map(route => {
        const meta = OPERATOR_META[route.operator] ?? OPERATOR_META.amts
        return (
          <div key={route.id} style={card}>
            {/* Header */}
            <div style={{
              padding: '12px 16px',
              background: meta.bg,
              borderBottom: '1px solid var(--wimc-border-subtle)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 20 }}>{meta.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: meta.color, letterSpacing: '0.02em' }}>
                  {meta.label}{route.route_number ? ` · ${route.route_number}` : ''}
                </div>
                <div style={{
                  fontSize: 13, fontWeight: 600, color: 'var(--wimc-text-primary)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {route.name}
                </div>
              </div>
              <div style={{
                textAlign: 'right', flexShrink: 0,
                fontFamily: 'var(--font-jetbrains-mono)', fontSize: 13, fontWeight: 700,
                color: meta.color,
              }}>
                {formatFare(route.fare_min_paise, route.fare_max_paise)}
              </div>
            </div>

            {/* Details */}
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--wimc-text-secondary)', flexShrink: 0 }}>From</span>
                <span style={{ fontWeight: 600, color: 'var(--wimc-text-primary)' }}>{route.from_stop}</span>
                <span style={{ color: 'var(--wimc-text-muted)' }}>→</span>
                <span style={{ fontWeight: 600, color: 'var(--wimc-text-primary)' }}>{route.to_stop}</span>
              </div>

              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--wimc-text-secondary)', flexWrap: 'wrap' }}>
                {route.frequency_minutes != null && (
                  <span>⏱ Every ~{route.frequency_minutes} min</span>
                )}
                {route.operating_hours && (
                  <span>🕐 {route.operating_hours}</span>
                )}
              </div>

              {route.notes && (
                <div style={{
                  fontSize: 11, color: 'var(--wimc-text-muted)',
                  fontFamily: 'var(--font-jetbrains-mono)',
                  padding: '6px 10px', background: 'var(--wimc-bg-base)',
                  borderRadius: 6, borderLeft: `3px solid ${meta.color}`,
                }}>
                  {route.notes}
                </div>
              )}
            </div>
          </div>
        )
      })}

      {filtered.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '40px 24px',
          color: 'var(--wimc-text-secondary)', fontSize: 14,
        }}>
          No routes for this operator.
        </div>
      )}

      {/* ── Book a Ride ───────────────────────────────────────────────────── */}
      <div style={{ ...card, marginTop: 8 }}>
        {/* Section header */}
        <div style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--wimc-border-subtle)',
          display: 'flex', alignItems: 'baseline', gap: 8,
        }}>
          <span style={{
            fontSize: 14, fontWeight: 700, color: 'var(--wimc-text-primary)',
            fontFamily: 'var(--font-syne)',
          }}>
            Book a Ride
          </span>
          <span style={{
            fontSize: 11, color: 'var(--wimc-text-muted)',
            fontFamily: 'var(--font-jetbrains-mono)',
          }}>
            handoff to third-party app
          </span>
        </div>

        <div style={{ padding: '16px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Destination picker */}
          <div>
            <label style={{
              display: 'block', marginBottom: 6,
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.12em', color: 'var(--wimc-text-secondary)',
              fontFamily: 'var(--font-jetbrains-mono)',
            }}>
              Drop destination
            </label>
            <select
              value={destIdx}
              onChange={e => setDestIdx(Number(e.target.value))}
              style={{
                width: '100%', padding: '9px 12px', borderRadius: 8,
                border: '1px solid var(--wimc-border-default)',
                background: 'var(--wimc-bg-base)', color: 'var(--wimc-text-primary)',
                fontSize: 13, fontFamily: 'var(--font-dm-sans)',
              }}
            >
              <optgroup label="Attractions">
                {attractions.map((a, i) => (
                  <option key={a.id} value={i}>{a.name}</option>
                ))}
              </optgroup>
              <optgroup label="Railway Stations">
                {STATIONS.map((s, i) => (
                  <option key={s.code} value={attractions.length + i}>{s.name}</option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Ride hailing — 2-column grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 10,
          }}>
            {RIDE_APPS.map(app => (
              <a
                key={app.key}
                href={handoffUrl(app.key, dest, entryRef)}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display:        'flex',
                  flexDirection:  'column',
                  alignItems:     'flex-start',
                  gap:            4,
                  padding:        '12px 14px',
                  borderRadius:   10,
                  background:     app.bg,
                  color:          app.color,
                  textDecoration: 'none',
                  transition:     'opacity 150ms',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontSize: 17 }}>{app.emoji}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-dm-sans)' }}>
                    {app.label}
                  </span>
                </div>
                <span style={{
                  fontSize: 10, opacity: 0.75, fontFamily: 'var(--font-jetbrains-mono)',
                  lineHeight: 1.3,
                }}>
                  {app.note ?? `continues in ${app.label} →`}
                </span>
              </a>
            ))}
          </div>

          {/* Disclaimer */}
          <div style={{
            fontSize: 11, color: 'var(--wimc-text-muted)',
            fontFamily: 'var(--font-jetbrains-mono)', lineHeight: 1.55,
          }}>
            WIMC does not process payments or bookings. Each link opens in the respective
            third-party app or website. Fares shown in the app may differ from the static
            route data above.
          </div>
        </div>
      </div>

      {/* ── Trains (IRCTC — display only) ──────────────────────────────────── */}
      <div style={card}>
        <div style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--wimc-border-subtle)',
          display: 'flex', alignItems: 'baseline', gap: 8,
        }}>
          <span style={{ fontSize: 20, marginRight: 4 }}>🚆</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--wimc-text-primary)', fontFamily: 'var(--font-syne)' }}>
            Trains
          </span>
          <span style={{ fontSize: 11, color: 'var(--wimc-text-muted)', fontFamily: 'var(--font-jetbrains-mono)' }}>
            display only — no train fare API
          </span>
        </div>

        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Station reference */}
          <div>
            <div style={{
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
              color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)',
              marginBottom: 8,
            }}>
              Stations in this cluster
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {STATIONS.map(s => (
                <div key={s.code} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', borderRadius: 8,
                  background: 'var(--wimc-bg-base)',
                  border: '1px solid var(--wimc-border-subtle)',
                }}>
                  <span style={{
                    fontFamily: 'var(--font-jetbrains-mono)', fontSize: 12, fontWeight: 700,
                    color: 'var(--wimc-coral)', flexShrink: 0, width: 36,
                  }}>
                    {s.code}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--wimc-text-primary)' }}>{s.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* IRCTC handoff */}
          <a
            href={handoffUrl('irctc', { name: 'Ahmedabad', lat: 0, lng: 0 }, entryRef)}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'space-between',
              padding:        '11px 14px',
              borderRadius:   9,
              border:         '1.5px solid var(--wimc-border-default)',
              background:     'var(--wimc-bg-base)',
              textDecoration: 'none',
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--wimc-text-primary)', fontFamily: 'var(--font-dm-sans)' }}>
                Book on IRCTC
              </div>
              <div style={{ fontSize: 11, color: 'var(--wimc-text-muted)', fontFamily: 'var(--font-jetbrains-mono)', marginTop: 2 }}>
                continues in irctc.co.in →
              </div>
            </div>
            <span style={{
              fontSize: 12, fontWeight: 600, color: 'var(--wimc-coral)',
              fontFamily: 'var(--font-dm-sans)', flexShrink: 0,
            }}>
              Open IRCTC ↗
            </span>
          </a>

          <div style={{
            fontSize: 10, color: 'var(--wimc-text-muted)',
            fontFamily: 'var(--font-jetbrains-mono)', lineHeight: 1.55,
          }}>
            IRCTC does not publish a public deep-link API for train search pre-fill.
            You will be taken to the IRCTC train-search page to complete your booking.
          </div>
        </div>
      </div>

    </div>
  )
}
