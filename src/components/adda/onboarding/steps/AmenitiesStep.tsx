'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useOnboarding } from '@/components/adda/onboarding/OnboardingShell'

interface Amenity {
  slug: string
  label: string
  icon: string
}

interface Category {
  label: string
  amenities: Amenity[]
  foodVenuePreFilled?: boolean
}

const CATEGORIES: Category[] = [
  {
    label: 'Connectivity & Tech',
    amenities: [
      { slug: 'wifi',              label: 'Wi-Fi',                  icon: 'wifi'           },
      { slug: 'high_speed_net',    label: 'High-speed internet',    icon: 'router'         },
      { slug: 'projector',         label: 'Projector / Screen',     icon: 'cast'           },
      { slug: 'tv_display',        label: 'TV / Display',           icon: 'tv'             },
      { slug: 'video_conf',        label: 'Video conferencing',     icon: 'videocam'       },
      { slug: 'whiteboard',        label: 'Whiteboard',             icon: 'draw'           },
      { slug: 'sound_system',      label: 'Sound system',           icon: 'speaker'        },
    ],
  },
  {
    label: 'Furniture & Capacity',
    amenities: [
      { slug: 'tables',            label: 'Tables',                 icon: 'table_restaurant' },
      { slug: 'chairs',            label: 'Chairs',                 icon: 'chair'            },
      { slug: 'standing_desks',    label: 'Standing desks',         icon: 'desk'             },
      { slug: 'lounge_seating',    label: 'Lounge seating',         icon: 'weekend'          },
      { slug: 'outdoor_seating',   label: 'Outdoor seating',        icon: 'deck'             },
      { slug: 'modular_furniture', label: 'Modular furniture',      icon: 'category'         },
    ],
  },
  {
    label: 'Facilities',
    amenities: [
      { slug: 'ac',                label: 'Air conditioning',       icon: 'ac_unit'          },
      { slug: 'heating',           label: 'Heating',                icon: 'thermostat'       },
      { slug: 'kitchen',           label: 'Kitchen / Pantry',       icon: 'kitchen'          },
      { slug: 'refrigerator',      label: 'Refrigerator',           icon: 'kitchen'          },
      { slug: 'microwave',         label: 'Microwave',              icon: 'microwave'        },
      { slug: 'coffee_machine',    label: 'Coffee machine',         icon: 'coffee'           },
      { slug: 'generator',         label: 'Generator backup',       icon: 'bolt'             },
    ],
  },
  {
    label: 'Accessibility',
    amenities: [
      { slug: 'wheelchair_ramp',   label: 'Wheelchair ramp',        icon: 'accessible'       },
      { slug: 'elevator',          label: 'Elevator',               icon: 'elevator'         },
      { slug: 'accessible_wc',     label: 'Accessible restroom',    icon: 'wc'               },
      { slug: 'step_free',         label: 'Step-free entrance',     icon: 'accessibility_new' },
    ],
  },
  {
    label: 'Storage & Logistics',
    amenities: [
      { slug: 'parking',           label: 'Parking',                icon: 'local_parking'    },
      { slug: 'bike_parking',      label: 'Bike parking',           icon: 'pedal_bike'       },
      { slug: 'storage_room',      label: 'Storage room',           icon: 'inventory_2'      },
      { slug: 'freight_elevator',  label: 'Freight elevator',       icon: 'elevator'         },
    ],
  },
  {
    label: 'AV & Events',
    amenities: [
      { slug: 'stage',             label: 'Stage / Podium',         icon: 'podium'           },
      { slug: 'lighting_rig',      label: 'Lighting rig',           icon: 'light_mode'       },
      { slug: 'blackout_curtains', label: 'Blackout curtains',      icon: 'blinds'           },
      { slug: 'green_room',        label: 'Green room',             icon: 'meeting_room'     },
      { slug: 'pa_system',         label: 'PA system',              icon: 'surround_sound'   },
    ],
  },
  {
    label: 'Food & Beverage',
    foodVenuePreFilled: true,
    amenities: [
      { slug: 'alcohol_permitted', label: 'Alcohol permitted',      icon: 'liquor'           },
      { slug: 'outside_food',      label: 'Outside food allowed',   icon: 'lunch_dining'     },
      { slug: 'catering_kitchen',  label: 'Catering kitchen',       icon: 'cooking'          },
      { slug: 'bar_setup',         label: 'Bar setup',              icon: 'local_bar'        },
    ],
  },
]

const FOOD_VENUE_TYPES = new Set(['cafe', 'restaurant'])

function MsIcon({ name, size = 16 }: { name: string; size?: number }) {
  return (
    <span
      className="material-symbols-outlined"
      style={{ fontSize: size, lineHeight: 1, userSelect: 'none', fontVariationSettings: "'FILL' 0, 'wght' 300" }}
      aria-hidden
    >
      {name}
    </span>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 200ms ease', flexShrink: 0 }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

export default function AmenitiesStep() {
  const { handleAnswer, snapshot, send } = useOnboarding()
  const venueType = snapshot.context.answers.venueType ?? ''
  const isFoodVenue = FOOD_VENUE_TYPES.has(venueType)

  const initialSelected = useMemo<Set<string>>(() => {
    const base = new Set<string>(snapshot.context.answers.amenities ?? [])
    if (isFoodVenue) {
      CATEGORIES.find(c => c.foodVenuePreFilled)?.amenities.forEach(a => base.add(a.slug))
    }
    return base
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [selected, setSelected] = useState<Set<string>>(initialSelected)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')

  const trimmedQuery = query.trim().toLowerCase()

  function toggleAmenity(slug: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
  }

  function toggleCategory(label: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  function handleConfirm() {
    handleAnswer('amenities', Array.from(selected), `${selected.size} amenities selected`)
  }

  const canGoBack = snapshot.can({ type: 'BACK' })

  const filteredCategories = useMemo(() => {
    if (!trimmedQuery) return CATEGORIES
    return CATEGORIES
      .map(cat => ({
        ...cat,
        amenities: cat.amenities.filter(a => a.label.toLowerCase().includes(trimmedQuery)),
      }))
      .filter(cat => cat.amenities.length > 0)
  }, [trimmedQuery])

  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute',
            left: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--adda-text-muted)',
            display: 'flex',
            alignItems: 'center',
          }}>
            <MsIcon name="search" size={16} />
          </span>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search amenities…"
            style={{
              width: '100%',
              padding: '9px 12px 9px 32px',
              borderRadius: 8,
              background: 'var(--adda-bg-elevated)',
              border: '1px solid var(--adda-border-default)',
              color: 'var(--adda-text-primary)',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              fontSize: 13,
              outline: 'none',
              caretColor: 'var(--adda-amber)',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Category sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {filteredCategories.map(cat => {
            const isOpen = trimmedQuery ? true : !collapsed.has(cat.label)
            const isPreFilled = cat.foodVenuePreFilled && isFoodVenue

            return (
              <div key={cat.label}>
                {/* Category header */}
                <button
                  onClick={() => !trimmedQuery && toggleCategory(cat.label)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '7px 2px',
                    background: 'transparent',
                    border: 'none',
                    cursor: trimmedQuery ? 'default' : 'pointer',
                    gap: 6,
                  }}
                >
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--adda-text-muted)',
                    fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  }}>
                    {cat.label}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {isPreFilled && (
                      <span style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: '2px 7px',
                        borderRadius: 100,
                        background: 'var(--adda-amber-tint)',
                        border: '1px solid var(--adda-amber-border)',
                        color: 'var(--adda-amber)',
                        fontFamily: 'var(--font-inter), system-ui, sans-serif',
                        letterSpacing: '0.05em',
                      }}>
                        Pre-filled
                      </span>
                    )}
                    {!trimmedQuery && <ChevronIcon open={isOpen} />}
                  </div>
                </button>

                {/* Chips grid */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.18 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div className="amenity-chip-grid" style={{ paddingBottom: 6 }}>
                        {cat.amenities.map(amenity => {
                          const on = selected.has(amenity.slug)
                          return (
                            <button
                              key={amenity.slug}
                              onClick={() => toggleAmenity(amenity.slug)}
                              style={{
                                height: 36,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '0 12px',
                                borderRadius: 6,
                                border: on
                                  ? '1.5px solid var(--adda-amber-border)'
                                  : '1px solid var(--adda-border-default)',
                                background: on ? 'var(--adda-amber-tint)' : 'var(--adda-bg-elevated)',
                                color: on ? 'var(--adda-amber)' : 'var(--adda-text-secondary)',
                                fontFamily: 'var(--font-inter), system-ui, sans-serif',
                                fontSize: 12,
                                fontWeight: on ? 500 : 400,
                                cursor: 'pointer',
                                transition: 'all 120ms ease',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <MsIcon name={amenity.icon} size={16} />
                              {amenity.label}
                            </button>
                          )
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>

        {/* Counter + confirm */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
          <AnimatePresence mode="wait">
            <motion.span
              key={selected.size}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.14 }}
              style={{
                fontSize: 13,
                color: selected.size > 0 ? 'var(--adda-amber)' : 'var(--adda-text-muted)',
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
                fontWeight: selected.size > 0 ? 600 : 400,
              }}
            >
              {selected.size > 0 ? `${selected.size} selected` : 'None selected yet'}
            </motion.span>
          </AnimatePresence>

          <button
            onClick={handleConfirm}
            style={{
              padding: '9px 20px',
              borderRadius: 100,
              background: 'var(--adda-amber)',
              color: '#000',
              fontWeight: 700,
              fontSize: 14,
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {selected.size === 0 ? 'Skip →' : 'Done →'}
          </button>
        </div>

        {canGoBack && (
          <button
            onClick={() => send({ type: 'BACK' })}
            style={{
              alignSelf: 'flex-start',
              padding: '6px 0',
              background: 'transparent',
              border: 'none',
              color: 'var(--adda-text-muted)',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            ← Go back
          </button>
        )}
      </div>

      <style>{`
        .amenity-chip-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
      `}</style>
    </>
  )
}
