'use client'

import type { CityAttraction } from '@/app/actions/cityGuide'

// ── Category display config ───────────────────────────────────────────────────

const CATEGORY_META: Record<string, { emoji: string; color: string }> = {
  heritage:   { emoji: '🏛', color: '#E8A838' },
  park:       { emoji: '🌳', color: '#4CAF50' },
  market:     { emoji: '🛍', color: '#E8705A' },
  food:       { emoji: '🍽', color: '#FF7043' },
  temple:     { emoji: '🛕', color: '#9C27B0' },
  nature:     { emoji: '🌿', color: '#2E7D32' },
  arts:       { emoji: '🎨', color: '#1976D2' },
  shopping:   { emoji: '🏬', color: '#0288D1' },
  attraction: { emoji: '⭐', color: '#F5A800' },
}

// External directions link — routes to Google Maps, never to WIMC ticketing.
function directionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface PlaceCardProps {
  attraction:    CityAttraction
  variant?:      'horizontal' | 'detail'
  onClose?:      () => void
  isSaved?:      boolean
  onToggleSave?: () => void
}

// ── Horizontal card (168 px wide, for section rows) ───────────────────────────

function HorizontalCard({
  a,
  isSaved = false,
  onToggleSave,
}: {
  a:             CityAttraction
  isSaved?:      boolean
  onToggleSave?: () => void
}) {
  const meta = CATEGORY_META[a.category] ?? { emoji: '📍', color: '#9B8FFF' }

  return (
    <div style={{
      flexShrink: 0,
      width: 168,
      borderRadius: 14,
      background: 'var(--wimc-bg-elevated)',
      border: '1px solid var(--wimc-border-default)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>

      {/* ── Image / emoji thumbnail ──────────────────────────────────────── */}
      <div style={{
        height: 96, position: 'relative', flexShrink: 0,
        background: `${meta.color}18`, overflow: 'hidden',
      }}>
        {a.photo_url
          ? <img
              src={a.photo_url}
              alt={a.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          : <div style={{
              width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 36,
            }}>
              {meta.emoji}
            </div>
        }

        {/* Category badge — bottom-left of image */}
        <span style={{
          position: 'absolute', bottom: 5, left: 8,
          fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 9999,
          color: '#fff',
          background: `${meta.color}cc`,
          fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}>
          {a.category}
        </span>

        {/* Save heart — top-right overlay */}
        {onToggleSave && (
          <button
            onClick={e => { e.stopPropagation(); onToggleSave() }}
            aria-label={isSaved ? 'Remove from saved' : 'Save place'}
            style={{
              position: 'absolute', top: 6, right: 6,
              width: 28, height: 28, borderRadius: 9999,
              background: 'rgba(0,0,0,0.40)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: 15,
                color: isSaved ? 'var(--wimc-coral)' : '#fff',
                fontVariationSettings: isSaved ? "'FILL' 1" : "'FILL' 0",
              }}
            >
              favorite
            </span>
          </button>
        )}
      </div>

      {/* ── Name + location subtitle ─────────────────────────────────────── */}
      <div style={{ padding: '8px 10px 6px', flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{
          fontSize: 12, fontWeight: 700, color: 'var(--wimc-text-primary)',
          lineHeight: 1.3,
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {a.name}
        </div>
        {a.address && (
          <div style={{
            fontSize: 10, color: 'var(--wimc-text-muted)',
            fontFamily: 'var(--font-jetbrains-mono)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {a.address}
          </div>
        )}
      </div>

      {/*
        ── FIREWALL ──────────────────────────────────────────────────────────────
        Guide place action cascade — external links ONLY.
          1. external_url present → "Reserve" button opening that URL in a new tab
          2. else                 → "Directions" to Google Maps

        This file has ZERO import of initiateRSVP, confirmRSVPPayment, or any
        Razorpay/payment function. WIMC event booking lives in event-page.tsx only.
        The /api/transit/handoff route is allow-listed for ride apps (uber/ola/…)
        and does not accept arbitrary booking URLs, so guide places use a plain
        <a rel="noopener noreferrer"> — a client-side hyperlink, not a server
        redirect, so there is no open-redirect risk.
        ──────────────────────────────────────────────────────────────────────── */}
      <div style={{ padding: '0 10px 10px' }}>
        {a.external_url ? (
          <a
            href={a.external_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              padding: '7px 0', borderRadius: 8,
              background: 'var(--wimc-coral)', color: '#fff',
              textDecoration: 'none',
              fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-dm-sans)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>open_in_new</span>
            Reserve
          </a>
        ) : (
          <a
            href={directionsUrl(a.lat, a.lng)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              padding: '7px 0', borderRadius: 8,
              border: '1px solid var(--wimc-border-default)',
              color: 'var(--wimc-text-secondary)',
              textDecoration: 'none',
              fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-dm-sans)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>directions</span>
            Directions
          </a>
        )}
      </div>
    </div>
  )
}

// ── Detail card (full info panel, shown when a place is selected) ─────────────

function DetailCard({
  a,
  onClose,
  isSaved = false,
  onToggleSave,
}: {
  a:             CityAttraction
  onClose?:      () => void
  isSaved?:      boolean
  onToggleSave?: () => void
}) {
  const meta = CATEGORY_META[a.category] ?? { emoji: '📍', color: '#9B8FFF' }

  return (
    <div style={{
      background: 'var(--wimc-bg-elevated)',
      border: `1.5px solid ${meta.color}44`,
      borderRadius: 14,
      overflow: 'hidden',
    }}>

      {/* Header */}
      <div style={{
        padding: '14px 16px',
        background: `${meta.color}0D`,
        borderBottom: '1px solid var(--wimc-border-subtle)',
        display: 'flex', alignItems: 'flex-start', gap: 12,
      }}>
        <span style={{ fontSize: 28, flexShrink: 0, lineHeight: 1.2 }}>{meta.emoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 16, fontWeight: 700, color: 'var(--wimc-text-primary)',
            fontFamily: 'var(--font-syne)', lineHeight: 1.2,
          }}>
            {a.name}
          </div>
          {/* Location subtitle */}
          {a.address && (
            <div style={{
              fontSize: 11, color: 'var(--wimc-text-muted)',
              fontFamily: 'var(--font-jetbrains-mono)', marginTop: 3,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {a.address}
            </div>
          )}
          <span style={{
            display: 'inline-block', marginTop: 5,
            fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 9999,
            color: meta.color, background: `${meta.color}22`,
            fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase',
          }}>
            {a.category}
          </span>
        </div>

        {/* Save + close controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
          {onToggleSave && (
            <button
              onClick={onToggleSave}
              aria-label={isSaved ? 'Remove from saved' : 'Save place'}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '4px', lineHeight: 1,
                color: isSaved ? 'var(--wimc-coral)' : 'var(--wimc-text-muted)',
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: 20,
                  fontVariationSettings: isSaved ? "'FILL' 1" : "'FILL' 0",
                }}
              >
                favorite
              </span>
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--wimc-text-muted)', fontSize: 18,
                padding: '4px', lineHeight: 1,
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {a.description && (
          <p style={{ fontSize: 13, color: 'var(--wimc-text-secondary)', margin: 0, lineHeight: 1.6 }}>
            {a.description}
          </p>
        )}
        <div style={{
          fontSize: 10, color: 'var(--wimc-text-muted)',
          fontFamily: 'var(--font-jetbrains-mono)', letterSpacing: '0.04em',
        }}>
          {a.source === 'heritage_dataset'
            ? '📜 Heritage dataset · GODL-India (data.gov.in)'
            : '✏️ Curated by WIMC'}
        </div>
      </div>

      {/*
        ── FIREWALL (same cascade as HorizontalCard) ─────────────────────────────
        All CTAs are <a> tags pointing outside WIMC.
        No RSVP, no payment function is imported or called in this file.
        ──────────────────────────────────────────────────────────────────────── */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--wimc-border-subtle)',
        display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center',
      }}>
        <a
          href={directionsUrl(a.lat, a.lng)}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 8,
            border: '1px solid var(--wimc-border-default)',
            color: 'var(--wimc-text-primary)', textDecoration: 'none',
            fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-dm-sans)',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>directions</span>
          Directions
        </a>
        {a.external_url && (
          <a
            href={a.external_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 8,
              background: 'var(--wimc-coral)', color: '#fff',
              textDecoration: 'none',
              fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-dm-sans)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>open_in_new</span>
            Reserve
          </a>
        )}
        <span style={{
          marginLeft: 'auto', fontSize: 10, color: 'var(--wimc-text-muted)',
          fontFamily: 'var(--font-jetbrains-mono)', alignSelf: 'center',
          letterSpacing: '0.04em',
        }}>
          Opens outside WIMC
        </span>
      </div>
    </div>
  )
}

// ── Public export ─────────────────────────────────────────────────────────────

export default function PlaceCard({
  attraction,
  variant = 'detail',
  onClose,
  isSaved,
  onToggleSave,
}: PlaceCardProps) {
  if (variant === 'horizontal') {
    return <HorizontalCard a={attraction} isSaved={isSaved} onToggleSave={onToggleSave} />
  }
  return <DetailCard a={attraction} onClose={onClose} isSaved={isSaved} onToggleSave={onToggleSave} />
}
