'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { VenueFormState } from './types'

// ─── Constants ────────────────────────────────────────────────────────────────

const AMENITY_CATEGORIES = [
  {
    label: 'Connectivity & Tech',
    amenities: [
      { slug: 'wifi',              label: 'Wi-Fi',                icon: 'wifi' },
      { slug: 'projector',         label: 'Projector / Screen',   icon: 'cast' },
      { slug: 'sound_system',      label: 'Sound system',         icon: 'speaker' },
      { slug: 'whiteboard',        label: 'Whiteboard',           icon: 'draw' },
      { slug: 'tv_display',        label: 'TV / Display',         icon: 'tv' },
      { slug: 'video_conf',        label: 'Video conferencing',   icon: 'videocam' },
    ],
  },
  {
    label: 'Facilities',
    amenities: [
      { slug: 'ac',                label: 'Air conditioning',     icon: 'ac_unit' },
      { slug: 'kitchen',           label: 'Kitchen / Pantry',     icon: 'kitchen' },
      { slug: 'coffee_machine',    label: 'Coffee machine',       icon: 'coffee' },
      { slug: 'generator',         label: 'Generator backup',     icon: 'bolt' },
      { slug: 'natural_light',     label: 'Natural light',        icon: 'wb_sunny' },
    ],
  },
  {
    label: 'AV & Events',
    amenities: [
      { slug: 'stage',             label: 'Stage / Podium',       icon: 'podium' },
      { slug: 'lighting_rig',      label: 'Lighting rig',         icon: 'light_mode' },
      { slug: 'pa_system',         label: 'PA system',            icon: 'surround_sound' },
      { slug: 'green_room',        label: 'Green room',           icon: 'meeting_room' },
      { slug: 'blackout_curtains', label: 'Blackout curtains',    icon: 'blinds' },
    ],
  },
  {
    label: 'Accessibility & Logistics',
    amenities: [
      { slug: 'accessible',        label: 'Wheelchair accessible', icon: 'accessible' },
      { slug: 'parking',           label: 'Parking',               icon: 'local_parking' },
      { slug: 'elevator',          label: 'Elevator',              icon: 'elevator' },
      { slug: 'bike_parking',      label: 'Bike parking',          icon: 'pedal_bike' },
      { slug: 'storage_room',      label: 'Storage room',          icon: 'inventory_2' },
    ],
  },
  {
    label: 'Food & Beverage',
    amenities: [
      { slug: 'outside_food',      label: 'Outside food allowed',  icon: 'lunch_dining' },
      { slug: 'alcohol_permitted', label: 'Alcohol permitted',     icon: 'liquor' },
      { slug: 'bar_setup',         label: 'Bar setup',             icon: 'local_bar' },
      { slug: 'catering_kitchen',  label: 'Catering kitchen',      icon: 'cooking' },
    ],
  },
]

// Similar venues data (static for now — swap with real API call when available)
const SIMILAR_VENUE_AMENITIES = [
  'wifi', 'projector', 'ac', 'parking', 'stage', 'pa_system', 'natural_light',
  'accessible', 'sound_system', 'lighting_rig',
]

// ─── Compare modal ────────────────────────────────────────────────────────────

function CompareModal({
  selected,
  onClose,
}: {
  selected: string[]
  onClose: () => void
}) {
  const missing = SIMILAR_VENUE_AMENITIES.filter(a => !selected.includes(a))
  const allAmenities = AMENITY_CATEGORIES.flatMap(c => c.amenities)

  function getMeta(slug: string) {
    return allAmenities.find(a => a.slug === slug) ?? { slug, label: slug, icon: 'check_circle' }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.18 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480,
          background: 'var(--venue-bg-surface)',
          border: '1px solid var(--venue-border-subtle)',
          borderRadius: 16, padding: 24,
          maxHeight: '80vh', overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h3 style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontWeight: 700, fontSize: 15,
              color: 'var(--venue-text-primary)', margin: 0,
            }}>
              Similar venues in your city offer…
            </h3>
            <p style={{
              fontSize: 12, color: 'var(--venue-text-muted)',
              fontFamily: 'var(--font-inter), sans-serif', margin: '4px 0 0',
            }}>
              Amenities you don&apos;t currently list
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 6,
              background: 'var(--venue-bg-overlay)', border: 'none',
              color: 'var(--venue-text-muted)', cursor: 'pointer',
              display: 'grid', placeItems: 'center',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
          </button>
        </div>

        {missing.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '24px 0',
            color: 'var(--venue-success)',
            fontFamily: 'var(--font-inter), sans-serif', fontSize: 13,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 32, display: 'block', marginBottom: 8 }}>
              verified
            </span>
            You have all common amenities listed!
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {missing.map(slug => {
              const meta = getMeta(slug)
              return (
                <div
                  key={slug}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '6px 12px', borderRadius: 6,
                    background: 'var(--venue-bg-overlay)',
                    border: '1px solid var(--venue-border-subtle)',
                    fontSize: 12, color: 'var(--venue-text-secondary)',
                    fontFamily: 'var(--font-inter), sans-serif',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--venue-amber)' }}>
                    {meta.icon}
                  </span>
                  {meta.label}
                </div>
              )
            })}
          </div>
        )}

        {missing.length > 0 && (
          <p style={{
            fontSize: 11, color: 'var(--venue-text-muted)', marginTop: 16,
            fontFamily: 'var(--font-inter), sans-serif', lineHeight: 1.5,
          }}>
            Adding these to your listing can increase booking requests by making
            your venue more discoverable in maker searches.
          </p>
        )}
      </motion.div>
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  amenities: VenueFormState['amenities']
  onChange: (amenities: string[]) => void
  isEditing: boolean
}

// ─── Main section ─────────────────────────────────────────────────────────────

export default function AmenitiesSection({ amenities, onChange, isEditing }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [showCompare, setShowCompare] = useState(false)
  const [expandedCats, setExpandedCats] = useState<Set<string>>(
    new Set(AMENITY_CATEGORIES.map(c => c.label))
  )

  function toggle(slug: string) {
    if (!isEditing) return
    const next = amenities.includes(slug)
      ? amenities.filter(a => a !== slug)
      : [...amenities, slug]
    onChange(next)
  }

  function toggleCat(label: string) {
    setExpandedCats(prev => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  return (
    <>
      <div style={{
        borderBottom: '1px solid var(--venue-border-subtle)',
        paddingBottom: 24, marginBottom: 24,
      }}>
        {/* Section header */}
        <button
          onClick={() => setCollapsed(c => !c)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 0 12px',
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--venue-text-primary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--venue-amber)' }}>
              check_circle
            </span>
            <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontWeight: 600, fontSize: 14 }}>
              Amenities
            </span>
            <span style={{
              padding: '1px 8px', borderRadius: 9999,
              background: 'var(--venue-bg-overlay)',
              fontSize: 11, fontFamily: 'var(--font-jetbrains-mono), monospace',
              color: amenities.length > 0 ? 'var(--venue-amber)' : 'var(--venue-text-muted)',
            }}>
              {amenities.length} selected
            </span>
          </div>
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: 18, color: 'var(--venue-text-muted)',
              transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
              transition: 'transform 200ms ease',
            }}
          >
            expand_more
          </span>
        </button>

        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden' }}
            >
              {/* Compare link */}
              {isEditing && (
                <button
                  onClick={() => setShowCompare(true)}
                  style={{
                    marginBottom: 14,
                    padding: 0, background: 'none', border: 'none',
                    cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    color: 'var(--venue-amber)', fontSize: 12, fontWeight: 600,
                    fontFamily: 'var(--font-inter), sans-serif',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>compare_arrows</span>
                  Compare to similar venues
                </button>
              )}

              {/* Category grid */}
              {AMENITY_CATEGORIES.map(cat => (
                <div key={cat.label} style={{ marginBottom: 4 }}>
                  <button
                    onClick={() => toggleCat(cat.label)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between', padding: '6px 0',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                    }}
                  >
                    <span style={{
                      fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
                      textTransform: 'uppercase', color: 'var(--venue-text-muted)',
                      fontFamily: 'var(--font-inter), sans-serif',
                    }}>
                      {cat.label}
                    </span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2.5" style={{
                        transform: expandedCats.has(cat.label) ? 'rotate(180deg)' : 'none',
                        transition: 'transform 180ms',
                        color: 'var(--venue-text-muted)',
                      }}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  <AnimatePresence initial={false}>
                    {expandedCats.has(cat.label) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.16 }}
                        style={{ overflow: 'hidden', paddingBottom: 8 }}
                      >
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {cat.amenities.map(a => {
                            const on = amenities.includes(a.slug)
                            return (
                              <button
                                key={a.slug}
                                onClick={() => toggle(a.slug)}
                                style={{
                                  height: 34, display: 'inline-flex', alignItems: 'center', gap: 5,
                                  padding: '0 12px', borderRadius: 6,
                                  border: on ? '1.5px solid var(--venue-amber-border)' : '1px solid var(--venue-border-default)',
                                  background: on ? 'var(--venue-amber-tint)' : 'var(--venue-bg-elevated)',
                                  color: on ? 'var(--venue-amber)' : 'var(--venue-text-secondary)',
                                  fontSize: 12, fontWeight: on ? 500 : 400,
                                  fontFamily: 'var(--font-inter), sans-serif',
                                  cursor: isEditing ? 'pointer' : 'default',
                                  transition: 'all 120ms ease',
                                }}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                                  {a.icon}
                                </span>
                                {a.label}
                              </button>
                            )
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Compare modal */}
      <AnimatePresence>
        {showCompare && (
          <CompareModal
            selected={amenities}
            onClose={() => setShowCompare(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
