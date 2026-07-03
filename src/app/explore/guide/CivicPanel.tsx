'use client'

import type { ActiveLayer, CivicPOI } from './CityMap'

// ── Layer config ──────────────────────────────────────────────────────────────

const LAYERS: { key: ActiveLayer; label: string; emoji: string; color: string }[] = [
  { key: 'hospital', label: 'Hospitals',      emoji: '🏥', color: '#EF5350' },
  { key: 'police',   label: 'Police',         emoji: '🚔', color: '#1565C0' },
  { key: 'petrol',   label: 'Petrol Pumps',   emoji: '⛽', color: '#FB8C00' },
  { key: 'toilet',   label: 'Public Toilets', emoji: '🚻', color: '#5DD9D0' },
]

// ── Haversine distance ────────────────────────────────────────────────────────

function distMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R  = 6371000
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lng2 - lng1) * Math.PI) / 180
  const a  = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatDist(m: number): string {
  if (m < 100)  return '< 100 m'
  if (m < 1000) return `~${Math.round(m / 50) * 50} m`
  return `~${(m / 1000).toFixed(1)} km`
}

// ── Directions deep-link (opens Google Maps / maps app externally) ────────────

function directionsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  activeLayers:        ActiveLayer[]
  loadingLayers:       ActiveLayer[]
  layerData:           Record<string, CivicPOI[]>
  onToggleLayer:       (layer: ActiveLayer) => void
  refLat:              number
  refLng:              number
  usingUserLoc:        boolean
  locLoading:          boolean
  onRequestLocation:   () => void
  onOpenReport:        () => void
  onOpenTrafficReport: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CivicPanel({
  activeLayers,
  loadingLayers,
  layerData,
  onToggleLayer,
  refLat,
  refLng,
  usingUserLoc,
  locLoading,
  onRequestLocation,
  onOpenReport,
  onOpenTrafficReport,
}: Props) {
  const card: React.CSSProperties = {
    background:   'var(--wimc-bg-elevated)',
    border:       '1px solid var(--wimc-border-default)',
    borderRadius: 14,
    overflow:     'hidden',
  }

  const allActivePOIs = activeLayers.flatMap(l => layerData[l] ?? [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Location banner ──────────────────────────────────────────── */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px',
            background: usingUserLoc
              ? 'rgba(77,210,177,0.08)'
              : 'rgba(155,143,255,0.06)',
            border: `1px solid ${usingUserLoc ? 'rgba(77,210,177,0.25)' : 'var(--wimc-border-subtle)'}`,
            borderRadius: 10,
          }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>
              {usingUserLoc ? '📍' : '🏙'}
            </span>
            <span style={{
              flex: 1, fontSize: 12, color: 'var(--wimc-text-secondary)',
              fontFamily: 'var(--font-dm-sans)',
            }}>
              {usingUserLoc
                ? 'Showing results near your location'
                : 'Showing results near Ahmedabad centre'}
            </span>
            {!usingUserLoc && (
              <button
                onClick={onRequestLocation}
                disabled={locLoading}
                style={{
                  flexShrink: 0,
                  padding: '5px 12px', borderRadius: 7,
                  border: '1px solid var(--wimc-border-default)',
                  background: 'var(--wimc-bg-base)',
                  color: 'var(--wimc-text-primary)',
                  fontSize: 11, fontWeight: 600, cursor: locLoading ? 'default' : 'pointer',
                  opacity: locLoading ? 0.6 : 1,
                  fontFamily: 'var(--font-dm-sans)',
                }}
              >
                {locLoading ? 'Locating…' : 'Use my location'}
              </button>
            )}
          </div>

          {/* ── Layer toggle buttons ─────────────────────────────────────── */}
          <div style={card}>
            <div style={{
              padding: '12px 16px', borderBottom: '1px solid var(--wimc-border-subtle)',
              fontSize: 11, fontWeight: 700, color: 'var(--wimc-text-secondary)',
              fontFamily: 'var(--font-jetbrains-mono)', letterSpacing: '0.12em', textTransform: 'uppercase',
            }}>
              Toggle map layers
            </div>
            <div style={{ padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {LAYERS.map(({ key, label, emoji, color }) => {
                const active  = activeLayers.includes(key)
                const loading = loadingLayers.includes(key)
                const count   = layerData[key]?.length ?? 0
                return (
                  <button
                    key={key}
                    onClick={() => onToggleLayer(key)}
                    disabled={loading}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 7,
                      padding: '8px 14px', borderRadius: 9999,
                      border: `1.5px solid ${active ? color : 'var(--wimc-border-default)'}`,
                      background: active ? `${color}22` : 'transparent',
                      color: active ? color : 'var(--wimc-text-secondary)',
                      fontSize: 13, fontWeight: active ? 600 : 400,
                      cursor: loading ? 'default' : 'pointer',
                      opacity: loading ? 0.6 : 1,
                      transition: 'all 180ms ease',
                      fontFamily: 'var(--font-dm-sans)',
                    }}
                  >
                    <span>{loading ? '⟳' : emoji}</span>
                    {label}
                    {active && count > 0 && (
                      <span style={{
                        marginLeft: 2, fontSize: 10, fontWeight: 700,
                        background: color, color: '#fff',
                        borderRadius: 9999, padding: '1px 5px',
                      }}>
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            {/* OSM attribution — data sourced from Overpass/OpenStreetMap */}
            {activeLayers.length > 0 && (
              <div style={{
                padding: '8px 16px 12px',
                fontSize: 11, color: 'var(--wimc-text-muted)',
                fontFamily: 'var(--font-jetbrains-mono)',
              }}>
                Civic data ©{' '}
                <a
                  href="https://www.openstreetmap.org/copyright"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'inherit' }}
                >
                  OpenStreetMap contributors
                </a>
                {' '}· May not reflect live status · {RADIUS_KM} km radius
              </div>
            )}
          </div>

          {/* ── POI list ─────────────────────────────────────────────────── */}
          {activeLayers.length > 0 && allActivePOIs.length > 0 && (
            <div style={card}>
              <div style={{
                padding: '12px 16px', borderBottom: '1px solid var(--wimc-border-subtle)',
                fontSize: 11, fontWeight: 700, color: 'var(--wimc-text-secondary)',
                fontFamily: 'var(--font-jetbrains-mono)', letterSpacing: '0.12em', textTransform: 'uppercase',
              }}>
                Nearby — {allActivePOIs.length} result{allActivePOIs.length !== 1 ? 's' : ''}
              </div>
              <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                {activeLayers.flatMap(layer =>
                  (layerData[layer] ?? [])
                    .map(poi => {
                      const meta = LAYERS.find(l => l.key === layer)
                      const dist = formatDist(distMetres(refLat, refLng, poi.lat, poi.lng))
                      return (
                        <div
                          key={poi.id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '11px 16px',
                            borderBottom: '1px solid var(--wimc-border-subtle)',
                          }}
                        >
                          <span style={{ fontSize: 18, flexShrink: 0 }}>{meta?.emoji}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: 13, fontWeight: 500,
                              color: 'var(--wimc-text-primary)',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {poi.name ?? 'Unnamed'}
                            </div>
                            <div style={{
                              fontSize: 11, color: 'var(--wimc-text-muted)',
                              fontFamily: 'var(--font-jetbrains-mono)', marginTop: 2,
                            }}>
                              {dist}
                            </div>
                          </div>
                          <a
                            href={directionsUrl(poi.lat, poi.lng)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              flexShrink: 0,
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '5px 10px', borderRadius: 7,
                              border: '1px solid var(--wimc-border-default)',
                              color: 'var(--wimc-text-primary)',
                              fontSize: 11, fontWeight: 500,
                              textDecoration: 'none',
                              fontFamily: 'var(--font-dm-sans)',
                            }}
                          >
                            Directions ↗
                          </a>
                        </div>
                      )
                    }),
                )}
              </div>
            </div>
          )}

          {activeLayers.length > 0 && allActivePOIs.length === 0 && loadingLayers.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '32px 24px',
              color: 'var(--wimc-text-secondary)', fontSize: 14,
            }}>
              No results found in this area. OSM coverage may be incomplete.
            </div>
          )}

          {/* ── Report an issue CTA ──────────────────────────────────────── */}
          <div style={{
            background: 'var(--wimc-bg-elevated)',
            border: '1px solid var(--wimc-border-default)',
            borderRadius: 14, overflow: 'hidden',
          }}>
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--wimc-border-subtle)',
              fontSize: 11, fontWeight: 700, color: 'var(--wimc-text-secondary)',
              fontFamily: 'var(--font-jetbrains-mono)', letterSpacing: '0.12em', textTransform: 'uppercase',
            }}>
              Citizen reporting
            </div>
            <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--wimc-text-secondary)', lineHeight: 1.6 }}>
                Spot a pothole, broken streetlight, overflowing garbage bin, or waterlogging?
                WIMC captures your report and forwards it to the relevant government channel.
              </p>
              <p style={{
                margin: 0, fontSize: 11, color: 'var(--wimc-text-muted)', lineHeight: 1.5,
                fontFamily: 'var(--font-jetbrains-mono)',
              }}>
                WIMC is a capture-and-forward layer only — we do not investigate or resolve reports.
              </p>
              <button
                onClick={onOpenReport}
                style={{
                  alignSelf: 'flex-start',
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '10px 18px', borderRadius: 9,
                  background: 'var(--wimc-coral)', color: '#fff',
                  fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-syne)',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 17 }}>
                  report
                </span>
                Report an issue
              </button>
            </div>
          </div>

          {/* ── Traffic violation report CTA ─────────────────────────── */}
          <div style={{
            background: 'var(--wimc-bg-elevated)',
            border: '1px solid rgba(245,124,0,0.3)',
            borderRadius: 14, overflow: 'hidden',
          }}>
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--wimc-border-subtle)',
              fontSize: 11, fontWeight: 700, color: '#F57C00',
              fontFamily: 'var(--font-jetbrains-mono)', letterSpacing: '0.12em', textTransform: 'uppercase',
            }}>
              Traffic violation reporting
            </div>
            <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--wimc-text-secondary)', lineHeight: 1.6 }}>
                Witnessed wrong parking, signal jumping, rash driving, or another traffic
                violation? Report it directly to the Gujarat Traffic Police via a pre-filled
                message — with vehicle number, photo, and location.
              </p>
              <p style={{
                margin: 0, fontSize: 11, color: 'var(--wimc-text-muted)', lineHeight: 1.5,
                fontFamily: 'var(--font-jetbrains-mono)',
              }}>
                Private report to authorities only — never shown to other users.
                You may be summoned to testify. Full warning shown before submit.
              </p>
              <button
                onClick={onOpenTrafficReport}
                style={{
                  alignSelf: 'flex-start',
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '10px 18px', borderRadius: 9,
                  background: '#F57C00', color: '#fff',
                  fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-syne)',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 17 }}>
                  local_police
                </span>
                Report a violation
              </button>
            </div>
          </div>

    </div>
  )
}

// ── Module-level constant (avoids magic number in attribution string) ─────────
const RADIUS_KM = 3
