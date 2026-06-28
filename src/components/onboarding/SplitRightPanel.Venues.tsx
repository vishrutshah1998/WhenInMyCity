'use client'

import React, { useState, useEffect } from 'react'
import { Snap, DARK, BARCODE, deriveVenueCity, getCityCoords } from './SplitRightPanel.shared'

const TEAL  = '#5DD9D0'
const AMBER = '#F5A800'
const MONO  = "var(--font-jetbrains-mono), 'JetBrains Mono', monospace"
const OUTFIT = "'Outfit', sans-serif"
const DM    = "'DM Sans', sans-serif"
const ABRIL = "var(--font-abril), 'Abril Fatface', serif"
const BARLOW = "var(--font-barlow), 'Barlow Condensed', sans-serif"

// ── Venue type emoji lookup ───────────────────────────────────────────────────
const VTYPE_EMOJI: Record<string, string> = {
  cafe: '☕', coworking: '🏠', studio: '🎙️', rooftop: '🌿',
  gallery: '🏛️', theatre: '🎭', event_hall: '🎪', retail: '🏪',
  bar: '🍺', outdoor: '🌊', library: '📚', sports: '🏋️',
  film_set: '🎬', hotel_hall: '🏨', garden: '🌳', workshop: '🎓',
}

const VTYPE_LABEL: Record<string, string> = {
  cafe: 'Café', coworking: 'Co-working', studio: 'Studio', rooftop: 'Rooftop',
  gallery: 'Gallery', theatre: 'Theatre', event_hall: 'Event Hall', retail: 'Retail',
  bar: 'Bar', outdoor: 'Outdoor', library: 'Library', sports: 'Sports',
  film_set: 'Film Set', hotel_hall: 'Hotel Hall', garden: 'Garden', workshop: 'Workshop / School',
}

// ── Punch hole ────────────────────────────────────────────────────────────────
function PunchHole({ side }: { side: 'left' | 'right' }) {
  return (
    <div style={{
      position: 'absolute', top: '50%', transform: 'translateY(-50%)',
      [side]: -10, width: 20, height: 20,
      background: DARK.bg, borderRadius: '50%',
      border: `1px solid ${TEAL}22`,
    }} />
  )
}

// ── Barcode strip ─────────────────────────────────────────────────────────────
function BarcodeStrip({ accent }: { accent: string }) {
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 28 }}>
      {BARCODE.map((w, i) => (
        <div key={i} style={{
          width: w * 1.6, height: `${45 + (i % 3) * 18}%`,
          background: `${accent}${i % 4 === 0 ? 'CC' : i % 4 === 1 ? '88' : i % 4 === 2 ? 'FF' : '55'}`,
        }} />
      ))}
    </div>
  )
}

// ── B3 Right Panel — Venue or Brand type selector (first business screen) ─────
export function B3RightPanel({ snap }: { snap: Snap }) {
  const [hovered, setHovered] = useState<string | null>(null)
  const active = hovered || snap.b_subpath || null

  useEffect(() => {
    function onHover(e: Event) {
      setHovered((e as CustomEvent).detail as string | null)
    }
    window.addEventListener('b3-left-hover', onHover)
    return () => window.removeEventListener('b3-left-hover', onHover)
  }, [])

  return (
    <div style={{
      width: '100%', height: '100%', background: DARK.bg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 20, padding: '32px 24px',
      position: 'relative', overflow: 'hidden',
    }}>

      {/* Header */}
      <div style={{ position: 'absolute', top: 18, left: 24, right: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.25em', color: `${TEAL}55`, textTransform: 'uppercase' }}>
          WIMC // BUSINESS TYPE
        </span>
        <span style={{ fontFamily: MONO, fontSize: 7, color: `${TEAL}33`, letterSpacing: '0.12em' }}>
          STEP 01
        </span>
      </div>

      {/* Two identity tiles */}
      {([
        { id: 'venue', accent: TEAL,  icon: '🏛️', label: 'VENUE',  sub: 'Spaces & addas' },
        { id: 'brand', accent: AMBER, icon: '🏷️', label: 'BRAND',  sub: 'Businesses & D2C' },
      ] as const).map(p => {
        const isActive = active === p.id
        return (
          <div key={p.id} style={{
            width: '100%', maxWidth: 260, padding: '20px 22px',
            background:  isActive ? `${p.accent}14` : `${p.accent}06`,
            border:      `1.5px solid ${isActive ? p.accent : `${p.accent}30`}`,
            transition:  'all 220ms ease',
            position:    'relative',
          }}>
            <PunchHole side="left" />
            <div style={{ fontFamily: MONO, fontSize: 7.5, letterSpacing: '0.22em', color: isActive ? p.accent : `${p.accent}55`, textTransform: 'uppercase', marginBottom: 8 }}>
              IDENTITY TYPE
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 22 }}>{p.icon}</span>
              <span style={{ fontFamily: OUTFIT, fontWeight: 900, fontSize: 24, color: isActive ? p.accent : DARK.muted, letterSpacing: '-0.02em' }}>
                {p.label}
              </span>
            </div>
            <div style={{ fontFamily: DM, fontSize: 11, color: isActive ? `${p.accent}99` : `${DARK.muted}66` }}>
              {p.sub}
            </div>
            {isActive && (
              <div style={{ position: 'absolute', top: 10, right: 14, fontFamily: MONO, fontSize: 9, color: p.accent }}>✓ SELECTED</div>
            )}
          </div>
        )
      })}

      {/* Footer barcode */}
      <div style={{ position: 'absolute', bottom: 16, left: 24, right: 24 }}>
        <BarcodeStrip accent={active === 'brand' ? AMBER : TEAL} />
      </div>
    </div>
  )
}

// ── B2 Right Panel — Business name + address (second business screen) ─────────
export function B2RightPanel({ snap }: { snap: Snap }) {
  const accent = snap.b_subpath === 'brand' ? AMBER : TEAL
  const city   = snap.v_city || snap.b_city || ''
  const coords = city ? getCityCoords(city) : ''

  return (
    <div style={{
      width: '100%', height: '100%', background: DARK.bg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '40px 28px',
      position: 'relative', overflow: 'hidden',
    }}>

      {/* Background watermark */}
      <div aria-hidden style={{
        position: 'absolute', bottom: -30, right: -20,
        fontFamily: OUTFIT, fontWeight: 900,
        fontSize: 180, color: `${accent}08`,
        lineHeight: 1, letterSpacing: '-0.04em',
        pointerEvents: 'none', userSelect: 'none',
      }}>
        {snap.b_subpath === 'brand' ? 'BRAND' : 'ADDA'}
      </div>

      {/* Header label */}
      <div style={{ position: 'absolute', top: 18, left: 24, right: 24, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.22em', color: `${accent}55`, textTransform: 'uppercase' }}>
          WIMC // BUSINESS IDENTITY
        </span>
        <span style={{ fontFamily: MONO, fontSize: 7, color: `${accent}33` }}>STEP 02</span>
      </div>

      {/* Main card */}
      <div style={{
        width: '100%', maxWidth: 288,
        background: DARK.surface,
        border: `1.5px solid ${accent}30`,
        position: 'relative', overflow: 'hidden',
      }}>
        <PunchHole side="left" />
        <PunchHole side="right" />

        {/* Accent bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: accent }} />

        {/* Card header */}
        <div style={{ padding: '16px 18px 10px', borderBottom: `1px dashed ${accent}22` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.22em', color: `${accent}77`, textTransform: 'uppercase' }}>
              WHEN IN MY CITY
            </span>
            <span style={{ fontFamily: MONO, fontSize: 7, color: `${accent}44` }}>
              {snap.b_subpath === 'brand' ? 'BRAND PASS' : 'VENUE PASS'}
            </span>
          </div>
          <BarcodeStrip accent={accent} />
        </div>

        {/* Name */}
        <div style={{ padding: '14px 18px 10px' }}>
          <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.20em', color: `${accent}55`, textTransform: 'uppercase', marginBottom: 4 }}>
            BUSINESS NAME
          </div>
          <div style={{
            fontFamily: OUTFIT, fontWeight: 900, fontSize: snap.b_name ? 20 : 16,
            color: snap.b_name ? DARK.text : `${DARK.muted}44`,
            letterSpacing: '-0.02em', minHeight: 28,
            transition: 'all 200ms',
          }}>
            {snap.b_name || '— enter name above —'}
          </div>
          {snap.b_slug && (
            <div style={{ fontFamily: MONO, fontSize: 8, color: `${accent}66`, marginTop: 4 }}>
              wheninmycity.com/{snap.b_slug}
            </div>
          )}
        </div>

        {/* City row */}
        <div style={{
          padding: '8px 18px 14px',
          borderTop: `1px dashed ${accent}18`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.16em', color: `${accent}44`, textTransform: 'uppercase', marginBottom: 2 }}>
              CITY
            </div>
            <div style={{ fontFamily: BARLOW, fontWeight: 700, fontSize: 14, color: city ? DARK.text : `${DARK.muted}33`, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {city || '—'}
            </div>
          </div>
          {coords && (
            <div style={{ fontFamily: MONO, fontSize: 7, color: `${accent}44`, textAlign: 'right', lineHeight: 1.4 }}>
              {coords.replace(', ', '\n')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── V4 Right Panel — Venue types ──────────────────────────────────────────────
export function V4RightPanel({ snap }: { snap: Snap }) {
  const city    = snap.v_city || snap.b_city || ''
  const coords  = city ? getCityCoords(city) : ''
  const types   = snap.v_types

  return (
    <div style={{
      width: '100%', height: '100%', background: DARK.bg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '36px 28px',
      position: 'relative', overflow: 'hidden',
    }}>

      {/* Header */}
      <div style={{ position: 'absolute', top: 18, left: 24, right: 24, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.22em', color: `${TEAL}55`, textTransform: 'uppercase' }}>
          WIMC // ADDA LISTING
        </span>
        <span style={{ fontFamily: MONO, fontSize: 7, color: `${TEAL}33` }}>STEP 03</span>
      </div>

      {/* Flyer card */}
      <div style={{
        width: '100%', maxWidth: 280,
        background: DARK.surface,
        border: `1.5px solid ${TEAL}28`,
        position: 'relative', overflow: 'hidden',
      }}>
        <PunchHole side="left" />
        <PunchHole side="right" />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: TEAL }} />

        {/* Header */}
        <div style={{ padding: '12px 16px 10px', borderBottom: `1px dashed ${TEAL}22` }}>
          <BarcodeStrip accent={TEAL} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <span style={{ fontFamily: MONO, fontSize: 7, color: `${TEAL}66`, letterSpacing: '0.18em' }}>ADDA TYPE</span>
            {types.length > 0 && (
              <span style={{ fontFamily: MONO, fontSize: 7, color: `${TEAL}88` }}>{types.length} SELECTED</span>
            )}
          </div>
        </div>

        {/* Venue name */}
        <div style={{ padding: '12px 16px 8px' }}>
          <div style={{
            fontFamily: OUTFIT, fontWeight: 900, fontSize: 18, letterSpacing: '-0.02em',
            color: snap.b_name ? DARK.text : `${DARK.muted}33`, minHeight: 24,
          }}>
            {snap.b_name || 'YOUR VENUE'}
          </div>
          {city && (
            <div style={{ fontFamily: BARLOW, fontWeight: 600, fontSize: 11, color: `${TEAL}88`, letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 2 }}>
              {city}
            </div>
          )}
        </div>

        {/* Type chips */}
        <div style={{ padding: '6px 16px 14px', minHeight: 56 }}>
          {types.length === 0 ? (
            <div style={{ fontFamily: MONO, fontSize: 9, color: `${DARK.muted}33`, letterSpacing: '0.10em' }}>
              — pick your space type above —
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {types.map(t => (
                <div key={t} style={{
                  background: `${TEAL}14`, border: `1px solid ${TEAL}44`,
                  padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  <span style={{ fontSize: 10 }}>{VTYPE_EMOJI[t] ?? '🏛️'}</span>
                  <span style={{ fontFamily: MONO, fontSize: 7.5, color: TEAL, letterSpacing: '0.10em', textTransform: 'uppercase' }}>
                    {VTYPE_LABEL[t] ?? t}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* City / coords footer */}
        {coords && (
          <div style={{ padding: '6px 16px 10px', borderTop: `1px dashed ${TEAL}18`, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: MONO, fontSize: 7, color: `${TEAL}44`, letterSpacing: '0.12em' }}>
              {coords}
            </span>
          </div>
        )}
      </div>

      {/* Background city watermark */}
      {city && (
        <div aria-hidden style={{
          position: 'absolute', bottom: 20, right: 16,
          fontFamily: OUTFIT, fontWeight: 900, fontSize: 72,
          color: `${TEAL}06`, letterSpacing: '-0.04em',
          lineHeight: 1, pointerEvents: 'none', userSelect: 'none',
        }}>
          {city.slice(0, 3).toUpperCase()}
        </div>
      )}
    </div>
  )
}

// ── V5 Right Panel — (redirect to V6, mirror its panel) ──────────────────────
export function V5RightPanel({ snap }: { snap: Snap }) {
  return <V6RightPanel snap={snap} />
}

// ── V6 Right Panel — Amenities ────────────────────────────────────────────────
export function V6RightPanel({ snap }: { snap: Snap }) {
  const amenities = snap.v_amenities
  const types     = snap.v_types
  const city      = snap.v_city || snap.b_city || ''

  const AMENITY_ICON: Record<string, string> = {
    wifi: '📶', projector: '📽️', pa_system: '🔊', stage: '🎤',
    green_room: '🚪', ac: '❄️', parking: '🅿️', catering: '🍱',
    bar_service: '🍷', av_technician: '🎛️', piano: '🎹', natural_light: '☀️',
    outdoor_space: '🌳', whiteboard: '📋', live_streaming: '📹',
    dressing_room: '💄', lift: '🛗', wheelchair: '♿',
  }

  return (
    <div style={{
      width: '100%', height: '100%', background: DARK.bg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '36px 24px',
      position: 'relative', overflow: 'hidden',
    }}>

      {/* Header */}
      <div style={{ position: 'absolute', top: 18, left: 24, right: 24, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.22em', color: `${TEAL}55`, textTransform: 'uppercase' }}>
          WIMC // SPACE FEATURES
        </span>
        <span style={{ fontFamily: MONO, fontSize: 7, color: `${TEAL}33` }}>STEP 04</span>
      </div>

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: 280,
        background: DARK.surface, border: `1.5px solid ${TEAL}28`, position: 'relative',
      }}>
        <PunchHole side="left" />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: TEAL }} />

        <div style={{ padding: '12px 16px 8px', borderBottom: `1px dashed ${TEAL}22` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: OUTFIT, fontWeight: 900, fontSize: 16, color: DARK.text, letterSpacing: '-0.01em' }}>
              {snap.b_name || 'YOUR VENUE'}
            </span>
            {types[0] && (
              <span style={{ fontSize: 16 }}>{VTYPE_EMOJI[types[0]] ?? '🏛️'}</span>
            )}
          </div>
          {city && (
            <div style={{ fontFamily: BARLOW, fontWeight: 600, fontSize: 10, color: `${TEAL}77`, letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 2 }}>
              {city}
            </div>
          )}
        </div>

        <div style={{ padding: '10px 16px', minHeight: 80 }}>
          <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.16em', color: `${TEAL}55`, textTransform: 'uppercase', marginBottom: 8 }}>
            AMENITIES {amenities.length > 0 ? `(${amenities.length})` : ''}
          </div>
          {amenities.length === 0 ? (
            <div style={{ fontFamily: MONO, fontSize: 9, color: `${DARK.muted}33` }}>— select what your space offers —</div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {amenities.slice(0, 12).map(a => (
                <div key={a} style={{
                  display: 'flex', alignItems: 'center', gap: 3,
                  background: `${TEAL}10`, border: `1px solid ${TEAL}35`,
                  padding: '2px 6px',
                }}>
                  <span style={{ fontSize: 9 }}>{AMENITY_ICON[a] ?? '✓'}</span>
                  <span style={{ fontFamily: MONO, fontSize: 6.5, color: TEAL, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {a.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
              {amenities.length > 12 && (
                <div style={{ fontFamily: MONO, fontSize: 6.5, color: `${TEAL}55`, padding: '2px 6px', border: `1px dashed ${TEAL}33` }}>
                  +{amenities.length - 12} more
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ padding: '6px 16px 10px', borderTop: `1px dashed ${TEAL}18` }}>
          <BarcodeStrip accent={TEAL} />
        </div>
      </div>
    </div>
  )
}

// ── VC Right Panel — Capacity ─────────────────────────────────────────────────
export function VCRightPanel({ snap }: { snap: Snap }) {
  const cap     = snap.v_cap_detail
  const types   = snap.v_types
  const city    = snap.v_city || snap.b_city || ''
  const maxCap  = Math.max(cap.standing ?? 0, cap.seated ?? 0, cap.classroom ?? 0, 0)
  const pax     = cap.min_pax

  const rows: { label: string; value: number | null; icon: string }[] = [
    { label: 'STANDING', value: cap.standing, icon: '🧍' },
    { label: 'SEATED',   value: cap.seated,   icon: '🪑' },
    { label: 'CLASS',    value: cap.classroom, icon: '📋' },
  ]

  return (
    <div style={{
      width: '100%', height: '100%', background: DARK.bg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '36px 24px',
      position: 'relative', overflow: 'hidden',
    }}>

      {/* Header */}
      <div style={{ position: 'absolute', top: 18, left: 24, right: 24, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.22em', color: `${TEAL}55`, textTransform: 'uppercase' }}>
          WIMC // CAPACITY
        </span>
        <span style={{ fontFamily: MONO, fontSize: 7, color: `${TEAL}33` }}>STEP 05</span>
      </div>

      <div style={{ width: '100%', maxWidth: 280, background: DARK.surface, border: `1.5px solid ${TEAL}28`, position: 'relative' }}>
        <PunchHole side="left" />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: TEAL }} />

        <div style={{ padding: '12px 16px 10px', borderBottom: `1px dashed ${TEAL}22` }}>
          <div style={{ fontFamily: OUTFIT, fontWeight: 900, fontSize: 16, color: DARK.text }}>
            {snap.b_name || 'YOUR VENUE'}
          </div>
          {city && (
            <div style={{ fontFamily: BARLOW, fontWeight: 600, fontSize: 10, color: `${TEAL}77`, letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 2 }}>
              {[types[0] ? (VTYPE_LABEL[types[0]] ?? types[0]) : null, city].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>

        {/* Capacity rows */}
        <div style={{ padding: '12px 16px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.map(r => (
            <div key={r.label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 10 }}>{r.icon}</span>
                  <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.14em', color: `${TEAL}66`, textTransform: 'uppercase' }}>
                    {r.label}
                  </span>
                </div>
                <span style={{ fontFamily: MONO, fontSize: 10, color: r.value ? TEAL : `${DARK.muted}33` }}>
                  {r.value ?? '—'}
                </span>
              </div>
              <div style={{ height: 3, background: DARK.elevated, position: 'relative' }}>
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0,
                  width: maxCap > 0 && r.value ? `${Math.min(100, (r.value / maxCap) * 100)}%` : '0%',
                  background: TEAL, transition: 'width 400ms ease',
                }} />
              </div>
            </div>
          ))}
          {pax != null && pax > 0 && (
            <div style={{ marginTop: 4, fontFamily: MONO, fontSize: 8, color: `${TEAL}66`, borderTop: `1px dashed ${TEAL}22`, paddingTop: 8 }}>
              MIN BOOKING: {pax} PAX
            </div>
          )}
        </div>

        <div style={{ padding: '6px 16px 10px', borderTop: `1px dashed ${TEAL}18` }}>
          <BarcodeStrip accent={TEAL} />
        </div>
      </div>

      {/* Watermark */}
      {maxCap > 0 && (
        <div aria-hidden style={{
          position: 'absolute', bottom: 16, right: 16,
          fontFamily: OUTFIT, fontWeight: 900, fontSize: 90,
          color: `${TEAL}07`, lineHeight: 1, pointerEvents: 'none', userSelect: 'none',
        }}>
          {maxCap}
        </div>
      )}
    </div>
  )
}

// ── V7 Right Panel — Pricing + events ────────────────────────────────────────
export function V7RightPanel({ snap }: { snap: Snap }) {
  const types    = snap.v_types
  const city     = snap.v_city || snap.b_city || ''
  const pricing  = snap.v_pricing
  const events   = snap.v_events
  const days     = snap.v_days

  const PRICING_LABEL: Record<string, string> = {
    free:        'Free',
    hourly:      'Hourly Rate',
    per_head:    'Per Head',
    revenue_rev: 'Revenue Share',
    flat_rate:   'Flat Rate',
    custom:      'Custom',
  }

  const EVENT_ICON: Record<string, string> = {
    music_concerts: '🎵', comedy_shows: '🎤', art_exhibitions: '🎨',
    corporate_events: '💼', workshops_classes: '🎓', film_screenings: '🎬',
    dance_performances: '💃', pop_ups: '🛍️', networking: '🤝', festivals: '🎪',
    sports: '🏆', wellness: '🧘',
  }

  const DAY_SHORT: Record<string, string> = {
    MON: 'M', TUE: 'T', WED: 'W', THU: 'T', FRI: 'F', SAT: 'S', SUN: 'S',
  }

  return (
    <div style={{
      width: '100%', height: '100%', background: DARK.bg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '36px 24px',
      position: 'relative', overflow: 'hidden',
    }}>

      {/* Header */}
      <div style={{ position: 'absolute', top: 18, left: 24, right: 24, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.22em', color: `${TEAL}55`, textTransform: 'uppercase' }}>
          WIMC // BOOKING TERMS
        </span>
        <span style={{ fontFamily: MONO, fontSize: 7, color: `${TEAL}33` }}>STEP 06</span>
      </div>

      <div style={{ width: '100%', maxWidth: 280, background: DARK.surface, border: `1.5px solid ${TEAL}28`, position: 'relative' }}>
        <PunchHole side="left" />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: TEAL }} />

        <div style={{ padding: '12px 16px 10px', borderBottom: `1px dashed ${TEAL}22` }}>
          <div style={{ fontFamily: OUTFIT, fontWeight: 900, fontSize: 16, color: DARK.text }}>
            {snap.b_name || 'YOUR VENUE'}
          </div>
          {city && types[0] && (
            <div style={{ fontFamily: BARLOW, fontWeight: 600, fontSize: 10, color: `${TEAL}77`, letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 2 }}>
              {(VTYPE_LABEL[types[0]] ?? types[0])} · {city}
            </div>
          )}
        </div>

        {/* Pricing badge */}
        <div style={{ padding: '10px 16px 8px', borderBottom: `1px dashed ${TEAL}18` }}>
          <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.16em', color: `${TEAL}55`, textTransform: 'uppercase', marginBottom: 6 }}>PRICING</div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: pricing ? `${TEAL}14` : DARK.elevated,
            border: `1px solid ${pricing ? TEAL : DARK.border}40`,
            padding: '4px 10px',
          }}>
            <span style={{ fontFamily: MONO, fontSize: 9, color: pricing ? TEAL : `${DARK.muted}44`, letterSpacing: '0.10em', textTransform: 'uppercase' }}>
              {pricing ? (PRICING_LABEL[pricing] ?? pricing) : '— not set —'}
            </span>
          </div>
        </div>

        {/* Days */}
        {days.length > 0 && (
          <div style={{ padding: '8px 16px', borderBottom: `1px dashed ${TEAL}18` }}>
            <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.16em', color: `${TEAL}55`, textTransform: 'uppercase', marginBottom: 6 }}>OPEN DAYS</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {['MON','TUE','WED','THU','FRI','SAT','SUN'].map(d => (
                <div key={d} style={{
                  width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: days.includes(d) ? `${TEAL}20` : 'transparent',
                  border: `1px solid ${days.includes(d) ? TEAL : `${DARK.border}40`}`,
                }}>
                  <span style={{ fontFamily: MONO, fontSize: 7, color: days.includes(d) ? TEAL : `${DARK.muted}33` }}>
                    {DAY_SHORT[d]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Events */}
        {events.length > 0 && (
          <div style={{ padding: '8px 16px 10px' }}>
            <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.16em', color: `${TEAL}55`, textTransform: 'uppercase', marginBottom: 6 }}>
              OPEN FOR ({events.length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {events.slice(0, 6).map(e => (
                <div key={e} style={{
                  display: 'flex', alignItems: 'center', gap: 3,
                  background: `${TEAL}0E`, border: `1px solid ${TEAL}30`, padding: '2px 6px',
                }}>
                  <span style={{ fontSize: 8 }}>{EVENT_ICON[e] ?? '✨'}</span>
                  <span style={{ fontFamily: MONO, fontSize: 6, color: TEAL, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {e.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ padding: '6px 16px 10px', borderTop: `1px dashed ${TEAL}18` }}>
          <BarcodeStrip accent={TEAL} />
        </div>
      </div>
    </div>
  )
}

// ── V8 Right Panel — Contact details → transitions to live confirmation ──────
export function V8RightPanel({ snap }: { snap: Snap }) {
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    function check() {
      try { setRevealed(sessionStorage.getItem('wimc_v8_revealed') === 'true') } catch {}
    }
    check()
    window.addEventListener('ob-snap-update', check)
    return () => window.removeEventListener('ob-snap-update', check)
  }, [])

  if (revealed) return <V9RightPanel snap={snap} />

  const types  = snap.v_types
  const city   = snap.v_city || snap.b_city || ''
  const contact = snap.v_contact

  return (
    <div style={{
      width: '100%', height: '100%', background: DARK.bg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '36px 24px',
      position: 'relative', overflow: 'hidden',
    }}>

      {/* Header */}
      <div style={{ position: 'absolute', top: 18, left: 24, right: 24, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.22em', color: `${TEAL}55`, textTransform: 'uppercase' }}>
          WIMC // CONTACT
        </span>
        <span style={{ fontFamily: MONO, fontSize: 7, color: `${TEAL}33` }}>STEP 07</span>
      </div>

      <div style={{ width: '100%', maxWidth: 280, background: DARK.surface, border: `1.5px solid ${TEAL}28`, position: 'relative' }}>
        <PunchHole side="left" />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: TEAL }} />

        <div style={{ padding: '12px 16px 10px', borderBottom: `1px dashed ${TEAL}22` }}>
          <div style={{ fontFamily: OUTFIT, fontWeight: 900, fontSize: 18, color: DARK.text, letterSpacing: '-0.01em' }}>
            {snap.b_name || 'YOUR VENUE'}
          </div>
          {city && (
            <div style={{ fontFamily: BARLOW, fontWeight: 600, fontSize: 10, color: `${TEAL}77`, letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 2 }}>
              {[types[0] ? (VTYPE_LABEL[types[0]] ?? types[0]) : null, city].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>

        {/* Contact fields */}
        <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { icon: '💬', label: 'WHATSAPP', value: contact.whatsapp ? `+91 ${contact.whatsapp}` : null },
            { icon: '📧', label: 'EMAIL',     value: contact.email    || null },
            { icon: '📸', label: 'INSTAGRAM', value: contact.instagram ? `@${contact.instagram}` : null },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, flexShrink: 0 }}>{row.icon}</span>
              <div>
                <div style={{ fontFamily: MONO, fontSize: 6.5, letterSpacing: '0.14em', color: `${TEAL}55`, textTransform: 'uppercase' }}>
                  {row.label}
                </div>
                <div style={{ fontFamily: DM, fontSize: 11, color: row.value ? DARK.text : `${DARK.muted}33`, marginTop: 1 }}>
                  {row.value ?? '—'}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bio preview */}
        {contact.bio && (
          <div style={{ padding: '8px 16px 10px', borderTop: `1px dashed ${TEAL}18` }}>
            <div style={{ fontFamily: MONO, fontSize: 6.5, letterSpacing: '0.14em', color: `${TEAL}55`, textTransform: 'uppercase', marginBottom: 4 }}>BIO</div>
            <div style={{ fontFamily: DM, fontSize: 11, color: DARK.muted, lineHeight: 1.5, maxHeight: 48, overflow: 'hidden' }}>
              {contact.bio}
            </div>
          </div>
        )}

        <div style={{ padding: '6px 16px 10px', borderTop: `1px dashed ${TEAL}18` }}>
          <BarcodeStrip accent={TEAL} />
        </div>
      </div>
    </div>
  )
}

// ── V9 Right Panel — Confirmed / live ────────────────────────────────────────
export function V9RightPanel({ snap }: { snap: Snap }) {
  const types  = snap.v_types
  const city   = snap.v_city || snap.b_city || ''
  const coords = city ? getCityCoords(city) : ''

  return (
    <div style={{
      width: '100%', height: '100%', background: DARK.bg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '40px 28px',
      position: 'relative', overflow: 'hidden',
    }}>

      {/* Header */}
      <div style={{ position: 'absolute', top: 18, left: 24, right: 24, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.22em', color: `${TEAL}55`, textTransform: 'uppercase' }}>
          WIMC // ADDA CONFIRMED
        </span>
        <span style={{ fontFamily: MONO, fontSize: 7, color: `${TEAL}88` }}>● LIVE</span>
      </div>

      {/* Celebration card */}
      <div style={{
        width: '100%', maxWidth: 296,
        background: DARK.surface,
        border: `2px solid ${TEAL}`,
        boxShadow: `0 0 40px ${TEAL}18`,
        position: 'relative', overflow: 'hidden',
      }}>
        <PunchHole side="left" />
        <PunchHole side="right" />

        {/* Top accent */}
        <div style={{ height: 4, background: `linear-gradient(90deg, ${TEAL}, ${TEAL}55)` }} />

        {/* Confirmed stamp header */}
        <div style={{ padding: '12px 16px 8px', borderBottom: `1px dashed ${TEAL}30`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.22em', color: `${TEAL}88`, textTransform: 'uppercase' }}>
            WHEN IN MY CITY
          </span>
          <div style={{
            background: `${TEAL}20`, border: `1px solid ${TEAL}`,
            padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <span style={{ fontFamily: MONO, fontSize: 7, color: TEAL, letterSpacing: '0.12em' }}>✓ LIVE</span>
          </div>
        </div>

        {/* Venue name */}
        <div style={{ padding: '16px 16px 8px', textAlign: 'center' }}>
          <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.22em', color: `${TEAL}66`, textTransform: 'uppercase', marginBottom: 6 }}>
            — YOUR ADDA IS —
          </div>
          <div style={{
            fontFamily: ABRIL, fontSize: 28, color: DARK.text,
            lineHeight: 1.0, letterSpacing: '-0.01em',
            textTransform: 'uppercase',
          }}>
            {snap.b_name || 'YOUR VENUE'}
          </div>
          {(city || types[0]) && (
            <div style={{
              fontFamily: BARLOW, fontWeight: 600, fontSize: 11,
              color: `${TEAL}88`, letterSpacing: '0.25em', textTransform: 'uppercase', marginTop: 8,
            }}>
              {[types[0] ? (VTYPE_EMOJI[types[0]] ?? '') + ' ' + (VTYPE_LABEL[types[0]] ?? types[0]) : null, city].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>

        {/* Barcode + coords */}
        <div style={{ padding: '10px 16px 12px', borderTop: `1px dashed ${TEAL}22` }}>
          <BarcodeStrip accent={TEAL} />
          {coords && (
            <div style={{ marginTop: 6, fontFamily: MONO, fontSize: 7, color: `${TEAL}44`, letterSpacing: '0.10em', textAlign: 'right' }}>
              {coords}
            </div>
          )}
        </div>
      </div>

      {/* City watermark */}
      {city && (
        <div aria-hidden style={{
          position: 'absolute', bottom: -20, right: -10,
          fontFamily: OUTFIT, fontWeight: 900, fontSize: 130,
          color: `${TEAL}07`, letterSpacing: '-0.04em',
          lineHeight: 1, pointerEvents: 'none', userSelect: 'none',
        }}>
          {city.slice(0, 3).toUpperCase()}
        </div>
      )}
    </div>
  )
}
