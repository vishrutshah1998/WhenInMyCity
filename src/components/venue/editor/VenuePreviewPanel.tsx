'use client'

import type { VenueFormState } from './types'

// ─── Public-page color tokens (hardcoded to match wimc theme) ─────────────────

const C = {
  bgBase:        '#0a0a0b',
  bgRaised:      '#111114',
  bgOverlay:     '#1a1a1e',
  textPrimary:   '#f0f0f0',
  textSecondary: '#a0a0a8',
  textMuted:     '#606066',
  borderSubtle:  'rgba(255,255,255,0.06)',
  coral:         '#e8572a',
  teal:          '#4dd2b1',
  amber:         '#f5a623',
}

const VENUE_TYPE_LABELS: Record<string, string> = {
  cafe: 'Café', coworking: 'Coworking', gallery: 'Gallery',
  community_hall: 'Community Hall', rooftop: 'Rooftop', garden: 'Garden',
  studio: 'Studio', library: 'Library', restaurant: 'Restaurant',
}

const AMENITY_META: Record<string, { icon: string; label: string }> = {
  wifi:              { icon: 'wifi',           label: 'Wi-Fi' },
  projector:         { icon: 'cast',           label: 'Projector' },
  sound_system:      { icon: 'speaker',        label: 'Sound system' },
  whiteboard:        { icon: 'draw',           label: 'Whiteboard' },
  ac:                { icon: 'ac_unit',        label: 'AC' },
  kitchen:           { icon: 'kitchen',        label: 'Kitchen' },
  pa_system:         { icon: 'surround_sound', label: 'PA system' },
  stage:             { icon: 'podium',         label: 'Stage' },
  accessible:        { icon: 'accessible',     label: 'Accessible' },
  parking:           { icon: 'local_parking',  label: 'Parking' },
  natural_light:     { icon: 'wb_sunny',       label: 'Natural light' },
  outside_food:      { icon: 'lunch_dining',   label: 'Outside food' },
  alcohol_permitted: { icon: 'liquor',         label: 'Alcohol OK' },
  lighting_rig:      { icon: 'light_mode',     label: 'Lighting rig' },
  elevator:          { icon: 'elevator',       label: 'Elevator' },
  bike_parking:      { icon: 'pedal_bike',     label: 'Bike parking' },
  green_room:        { icon: 'meeting_room',   label: 'Green room' },
  tv_display:        { icon: 'tv',             label: 'TV / Display' },
  video_conf:        { icon: 'videocam',       label: 'Video conf' },
  coffee_machine:    { icon: 'coffee',         label: 'Coffee' },
  generator:         { icon: 'bolt',           label: 'Generator' },
  storage_room:      { icon: 'inventory_2',    label: 'Storage' },
  blackout_curtains: { icon: 'blinds',         label: 'Blackout' },
  bar_setup:         { icon: 'local_bar',      label: 'Bar setup' },
  catering_kitchen:  { icon: 'cooking',        label: 'Catering kitchen' },
  high_speed_net:    { icon: 'router',         label: 'High-speed net' },
  tables:            { icon: 'table_restaurant', label: 'Tables' },
  chairs:            { icon: 'chair',          label: 'Chairs' },
  outdoor_seating:   { icon: 'deck',           label: 'Outdoor seating' },
  wheelchair_ramp:   { icon: 'accessible',     label: 'Wheelchair ramp' },
  accessible_wc:     { icon: 'wc',             label: 'Accessible WC' },
  step_free:         { icon: 'accessibility_new', label: 'Step-free' },
  freight_elevator:  { icon: 'elevator',       label: 'Freight elevator' },
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  state: VenueFormState
}

export default function VenuePreviewPanel({ state }: Props) {
  const coverPhoto = state.photos.find(p => p.is_cover)
  const galleryPhotos = state.photos.filter(p => !p.is_cover).slice(0, 4)

  const capacityText = state.capacity_min != null && state.capacity_max != null
    ? `${state.capacity_min}–${state.capacity_max} guests`
    : state.capacity_max != null
      ? `Up to ${state.capacity_max} guests`
      : null

  return (
    <div style={{
      fontFamily: 'system-ui, sans-serif',
      background: C.bgBase,
      color: C.textPrimary,
      borderRadius: 12,
      overflow: 'hidden',
      border: `1px solid ${C.borderSubtle}`,
      fontSize: 13,
    }}>
      {/* Label */}
      <div style={{
        padding: '8px 14px',
        background: 'rgba(245,166,35,0.08)',
        borderBottom: `1px solid rgba(245,166,35,0.15)`,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 14, color: C.amber }}>
          visibility
        </span>
        <span style={{
          fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: C.amber,
          fontFamily: 'var(--font-jetbrains-mono), monospace',
        }}>
          Creator view
        </span>
      </div>

      {/* Hero */}
      <div style={{
        position: 'relative', height: 200,
        background: coverPhoto ? undefined : C.bgRaised,
      }}>
        {coverPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverPhoto.url}
            alt={coverPhoto.alt_text}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%', display: 'grid', placeItems: 'center',
            background: 'linear-gradient(135deg, rgba(232,87,42,0.1) 0%, rgba(10,10,11,0.6) 100%)',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 48, color: C.textMuted, opacity: 0.3 }}>
              apartment
            </span>
          </div>
        )}

        {/* Gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, transparent 30%, rgba(10,10,11,0.92) 100%)',
        }} />

        {/* Hero text */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 16px 16px' }}>
          {/* Type chips */}
          {state.venue_type.length > 0 && (
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 7 }}>
              {state.venue_type.map(t => (
                <span key={t} style={{
                  padding: '2px 8px', borderRadius: 9999,
                  background: 'rgba(232,87,42,0.15)', border: '1px solid rgba(232,87,42,0.3)',
                  color: C.coral, fontSize: 9, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  fontFamily: 'var(--font-jetbrains-mono), monospace',
                }}>
                  {VENUE_TYPE_LABELS[t] ?? t}
                </span>
              ))}
            </div>
          )}

          {/* Name */}
          <div style={{
            fontWeight: 800, fontSize: 20, color: '#fff',
            lineHeight: 1.1, marginBottom: 4,
            fontFamily: 'var(--font-syne), sans-serif',
          }}>
            {state.name || 'Your Venue Name'}
          </div>
        </div>
      </div>

      {/* Stats bar */}
      {capacityText && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '10px 16px',
          background: C.bgRaised,
          borderBottom: `1px solid ${C.borderSubtle}`,
          color: C.textSecondary, fontSize: 12,
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14, color: C.textMuted }}>people</span>
          <span style={{ fontWeight: 700, color: C.textPrimary, fontFamily: 'var(--font-jetbrains-mono), monospace' }}>
            {capacityText}
          </span>
        </div>
      )}

      {/* Gallery strip */}
      {galleryPhotos.length > 0 && (
        <div style={{
          display: 'flex', gap: 6, padding: '10px 16px',
          overflowX: 'auto', scrollbarWidth: 'none',
          borderBottom: `1px solid ${C.borderSubtle}`,
        }}>
          {galleryPhotos.map(p => (
            <div key={p.id} style={{
              position: 'relative', flexShrink: 0,
              width: 90, height: 62, borderRadius: 6, overflow: 'hidden',
              background: C.bgOverlay,
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={p.alt_text} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ))}
        </div>
      )}

      {/* Body sections */}
      <div style={{ padding: '16px' }}>

        {/* About */}
        {state.description && (
          <div style={{ marginBottom: 20 }}>
            <SectionHeading>About</SectionHeading>
            <p style={{
              fontSize: 13, lineHeight: 1.7,
              color: C.textSecondary, margin: 0,
            }}>
              {state.description.length > 200
                ? state.description.slice(0, 200) + '…'
                : state.description}
            </p>
          </div>
        )}

        {/* Amenities */}
        {state.amenities.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <SectionHeading>Amenities</SectionHeading>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {state.amenities.slice(0, 8).map(a => {
                const meta = AMENITY_META[a] ?? { icon: 'check_circle', label: a }
                return (
                  <div key={a} style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '5px 10px', borderRadius: 9999,
                    background: C.bgRaised, border: `1px solid ${C.borderSubtle}`,
                    fontSize: 11, color: C.textPrimary,
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 12, color: C.teal }}>
                      {meta.icon}
                    </span>
                    {meta.label}
                  </div>
                )
              })}
              {state.amenities.length > 8 && (
                <div style={{
                  display: 'flex', alignItems: 'center',
                  padding: '5px 10px', borderRadius: 9999,
                  background: C.bgRaised, border: `1px solid ${C.borderSubtle}`,
                  fontSize: 11, color: C.textMuted,
                }}>
                  +{state.amenities.length - 8} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pricing rules summary */}
        {state.pricing_rules.filter(r => r.active).length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <SectionHeading>Pricing</SectionHeading>
            <div style={{
              padding: 12, borderRadius: 10,
              background: C.bgRaised, border: `1px solid ${C.borderSubtle}`,
            }}>
              {state.pricing_rules.filter(r => r.active).slice(0, 3).map(rule => (
                <div key={rule.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '5px 0',
                  borderBottom: `1px solid ${C.borderSubtle}`,
                }}>
                  <span style={{ fontSize: 12, color: C.textSecondary }}>{rule.name}</span>
                  <span style={{
                    fontSize: 12, fontWeight: 700, color: C.amber,
                    fontFamily: 'var(--font-jetbrains-mono), monospace',
                  }}>
                    ₹{Math.round(rule.rate_per_hour_paise / 100).toLocaleString('en-IN')}/hr
                  </span>
                </div>
              ))}
              {state.pricing_rules.filter(r => r.active).length > 3 && (
                <div style={{ fontSize: 11, color: C.textMuted, paddingTop: 6 }}>
                  +{state.pricing_rules.filter(r => r.active).length - 3} more rules
                </div>
              )}
            </div>
          </div>
        )}

        {/* Cancellation policy badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 12px', borderRadius: 9999,
          background: 'rgba(77,210,177,0.1)',
          border: '1px solid rgba(77,210,177,0.25)',
          fontSize: 11, color: C.teal, fontWeight: 600,
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>policy</span>
          {state.cancellation_policy.charAt(0).toUpperCase() + state.cancellation_policy.slice(1)} cancellation
        </div>

      </div>

      {/* CTA footer preview */}
      <div style={{
        padding: '12px 16px',
        borderTop: `1px solid ${C.borderSubtle}`,
        background: 'rgba(10,10,11,0.8)',
        display: 'flex', gap: 8,
      }}>
        <div style={{
          flex: 1, padding: '8px 0', borderRadius: 8,
          background: C.coral,
          color: '#fff', fontWeight: 700, fontSize: 12,
          textAlign: 'center',
          fontFamily: 'var(--font-syne), sans-serif',
        }}>
          Book this Venue
        </div>
        <div style={{
          padding: '8px 14px', borderRadius: 8,
          background: 'rgba(255,255,255,0.06)',
          border: `1px solid ${C.borderSubtle}`,
          color: C.textMuted, fontSize: 12,
          display: 'grid', placeItems: 'center',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chat</span>
        </div>
      </div>
    </div>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontWeight: 700, fontSize: 13,
      color: C.textPrimary, marginBottom: 10,
      fontFamily: 'var(--font-syne), sans-serif',
    }}>
      {children}
    </div>
  )
}
