'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SK } from '@/lib/onboarding/session-keys'
import { VenueNoticePoster } from '@/components/onboarding/BoardingPassArtifact'
import { inferAmenitiesFromGoogle } from '@/lib/onboarding/google-type-map'

const ACCENT = '#5DD9D0'
const MONO   = "var(--font-jetbrains-mono), 'JetBrains Mono', monospace"
const BARLOW = "var(--font-barlow), 'Barlow Condensed', sans-serif"
const OUTFIT = "'Outfit', sans-serif"
const ABRIL  = "var(--font-abril), 'Abril Fatface', serif"
const DM     = "'DM Sans', sans-serif"

interface AmenityCategory {
  id:    string
  icon:  string
  label: string
  items: string[]
}

const AMENITY_CATEGORIES: AmenityCategory[] = [
  { id: 'connectivity', icon: 'wifi',              label: 'Connectivity & Tech',
    items: ['WiFi (Fibre)', 'AV System', 'Projector', 'PA System', 'Power Backup', 'Smart TV', 'Ethernet Ports', 'DMX Lighting'] },
  { id: 'food_drink',   icon: 'restaurant',         label: 'Food & Drink',
    items: ['In-House Café', 'Bar & Alcohol', 'Coffee & Tea', 'Outside Catering OK', 'Kitchen Access', 'Vending Machine'] },
  { id: 'space',        icon: 'deck',               label: 'Space & Outdoors',
    items: ['Outdoor Terrace', 'Rooftop Access', 'Garden / Lawn', 'Dedicated Stage', 'Private Booth', 'Basement Access'] },
  { id: 'access',       icon: 'accessible',         label: 'Access & Parking',
    items: ['Wheelchair Ramp', 'Elevator Access', 'Near Metro', 'Free Parking', 'Valet Parking', 'Accessible Toilets'] },
  { id: 'production',   icon: 'video_camera_front', label: 'Production & Media',
    items: ['Photography Friendly', 'Video Shoot Ready', 'Green Screen Wall', 'Studio Lighting', 'Live Stream Setup', 'Drone-Friendly'] },
  { id: 'ambiance',     icon: 'wb_sunny',           label: 'Ambiance & Light',
    items: ['Natural Light', 'Blackout Curtains', 'Skylight', 'Neon Signage', 'Art Walls', 'Industrial Look', 'Heritage / Vintage'] },
  { id: 'vibe',         icon: 'nightlife',          label: 'Vibe & Rules',
    items: ['DJ / Live Music OK', 'Late Night (12am+)', 'Pets Allowed', 'Smoking Zone', 'BYOB Allowed', 'Board Games'] },
  { id: 'work',         icon: 'laptop',             label: 'Work & Focus',
    items: ['Whiteboard', 'AC Throughout', 'Private Meeting Room', 'Silent Zone', 'Standing Desks', 'Phone Booth'] },
]

const TYPE_DEFAULTS: Record<string, string[]> = {
  cafe:           ['WiFi (Fibre)', 'Coffee & Tea', 'In-House Café', 'Natural Light'],
  restaurant:     ['In-House Café', 'Bar & Alcohol', 'Coffee & Tea'],
  coworking:      ['WiFi (Fibre)', 'AC Throughout', 'Projector', 'Whiteboard'],
  studio:         ['PA System', 'AV System', 'WiFi (Fibre)', 'Photography Friendly'],
  gallery:        ['Photography Friendly', 'Natural Light', 'Art Walls'],
  rooftop:        ['Rooftop Access', 'Outdoor Terrace'],
  library:        ['WiFi (Fibre)', 'Natural Light', 'Silent Zone'],
  garden:         ['Outdoor Terrace', 'Garden / Lawn'],
  community_hall: ['Free Parking', 'AC Throughout', 'PA System'],
}

export default function V6Page() {
  const router = useRouter()

  const [selectedAmenities,   setSelectedAmenities]   = useState<Set<string>>(new Set())
  const [googleInferred,      setGoogleInferred]      = useState<Set<string>>(new Set())
  const [openCategories,      setOpenCategories]      = useState<Set<string>>(new Set(['connectivity']))
  const [bName,             setBName]             = useState('')
  const [bCity,             setBCity]             = useState('')
  const [vType,             setVType]             = useState('')
  const [isSaving,          setIsSaving]          = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const name    = sessionStorage.getItem(SK.b_name) ?? ''
    const subpath = sessionStorage.getItem(SK.b_subpath)
    if (!name || subpath !== 'venue') { router.replace('/onboarding/business/B3'); return }
    const address = sessionStorage.getItem(SK.v_address) ?? ''
    if (!address) { router.replace('/onboarding/business/V4'); return }
    setBName(name)
    setBCity(sessionStorage.getItem(SK.b_city) ?? '')

    let firstType = ''
    try {
      const types = sessionStorage.getItem(SK.v_types)
      if (types) {
        const parsed = JSON.parse(types) as string[]
        if (parsed[0]) { setVType(parsed[0]); firstType = parsed[0] }
      }
    } catch {}

    const saved = sessionStorage.getItem(SK.v_amenities)
    if (saved) {
      try { setSelectedAmenities(new Set(JSON.parse(saved) as string[])) } catch {}
    } else {
      // Merge venue-type defaults with Google-inferred amenities
      const typeDefaults = (firstType && TYPE_DEFAULTS[firstType]) ? new Set(TYPE_DEFAULTS[firstType]) : new Set<string>()
      try {
        const googleTypes   = JSON.parse(sessionStorage.getItem(SK.v_google_types) ?? '[]') as string[]
        const isWheelchair  = sessionStorage.getItem(SK.v_wheelchair) === 'true'
        const fromGoogle    = inferAmenitiesFromGoogle(googleTypes, isWheelchair ? true : null)
        setGoogleInferred(fromGoogle)
        const merged = new Set([...typeDefaults, ...fromGoogle])
        setSelectedAmenities(merged)
        sessionStorage.setItem(SK.v_amenities, JSON.stringify([...merged]))

        // Auto-open all categories that have at least one pre-selected item
        const autoOpen = AMENITY_CATEGORIES
          .filter(cat => cat.items.some(item => merged.has(item)))
          .map(cat => cat.id)
        if (autoOpen.length > 0) setOpenCategories(new Set(autoOpen))
      } catch {
        // Fallback: just use venue-type defaults
        setSelectedAmenities(typeDefaults)
        if (typeDefaults.size > 0) {
          sessionStorage.setItem(SK.v_amenities, JSON.stringify([...typeDefaults]))
          const autoOpen = AMENITY_CATEGORIES
            .filter(cat => cat.items.some(item => typeDefaults.has(item)))
            .map(cat => cat.id)
          if (autoOpen.length > 0) setOpenCategories(new Set(autoOpen))
        }
      }
    }
  }, [router])

  function toggleItem(item: string) {
    setSelectedAmenities(prev => {
      const next = new Set(prev)
      if (next.has(item)) next.delete(item)
      else next.add(item)
      try { sessionStorage.setItem(SK.v_amenities, JSON.stringify([...next])) } catch {}
      return next
    })
  }

  function toggleCategory(id: string) {
    setOpenCategories(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function clearAll() {
    setSelectedAmenities(new Set())
    try { sessionStorage.setItem(SK.v_amenities, JSON.stringify([])) } catch {}
  }

  function handleSaveDraft() {
    try { sessionStorage.setItem(SK.v_amenities, JSON.stringify([...selectedAmenities])) } catch {}
  }

  async function handleLookingGood() {
    if (isSaving) return
    setIsSaving(true)
    try { sessionStorage.setItem(SK.v_amenities, JSON.stringify([...selectedAmenities])) } catch {}
    router.push('/onboarding/business/V7')
  }

  const totalSelected = selectedAmenities.size

  return (
    <>
      <div style={{ minHeight: '100%', overflowY: 'auto', paddingBottom: 96 }}>

        {/* Counter strip — sticky within scroll container */}
        <div style={{
          position:     'sticky', top: 0, zIndex: 20,
          background:   '#1A2744',
          borderBottom: `1px solid ${totalSelected > 0 ? `${ACCENT}30` : 'transparent'}`,
          padding:      '0 24px',
          display:      'flex', justifyContent: 'space-between', alignItems: 'center',
          height:       36,
          transition:   'border-color 200ms',
        }}>
          <span style={{
            fontFamily:    BARLOW, fontWeight: 700, fontSize: 13,
            color:         totalSelected > 0 ? ACCENT : 'rgba(255,255,255,0.12)',
            letterSpacing: '0.10em', textTransform: 'uppercase',
            transition:    'color 200ms',
          }}>
            {totalSelected > 0
              ? `${totalSelected} AMENIT${totalSelected === 1 ? 'Y' : 'IES'} SELECTED`
              : 'SELECT AMENITIES'}
          </span>
          {totalSelected > 0 && (
            <button
              type="button"
              onClick={clearAll}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: DM, fontSize: 12,
                color: 'rgba(255,255,255,0.35)', padding: 0,
              }}
            >
              Clear all
            </button>
          )}
        </div>

        <div style={{ paddingTop: 20, paddingLeft: 24, paddingRight: 24 }}>
          <VenueNoticePoster
            name={bName || undefined}
            city={bCity || undefined}
            type={vType || undefined}
            accent={ACCENT}
          />

          <p style={{
            fontFamily: BARLOW, fontWeight: 600, fontSize: 10,
            letterSpacing: '0.3em', textTransform: 'uppercase',
            color: `${ACCENT}99`, margin: '0 0 10px',
          }}>
            — YOUR SPACE
          </p>
          <h1 style={{
            fontFamily: ABRIL, fontSize: 'clamp(28px, 7vw, 44px)',
            color: '#F0EFF8', lineHeight: 1.05,
            margin: '0 0 8px',
          }}>
            What does your space offer?
          </h1>
          <p style={{ fontFamily: DM, fontSize: 13, color: '#9896B0', margin: '0 0 24px' }}>
            Creators filter by amenities — tick everything that applies.
          </p>

          {/* Accordion categories */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {AMENITY_CATEGORIES.map(cat => {
              const isOpen   = openCategories.has(cat.id)
              const catCount = cat.items.filter(i => selectedAmenities.has(i)).length

              return (
                <div key={cat.id} style={{
                  background: '#09090E',
                  border:     `1px dashed ${ACCENT}20`,
                }}>
                  {/* Accordion header */}
                  <button
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    style={{
                      width:   '100%',
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px',
                      background:   isOpen ? `${ACCENT}08` : 'transparent',
                      border:       'none', cursor: 'pointer',
                      borderBottom: isOpen ? `1px solid ${ACCENT}20` : 'none',
                      transition:   'background 150ms',
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize:             16, lineHeight: 1,
                        color:                catCount > 0 ? ACCENT : 'rgba(255,255,255,0.28)',
                        fontVariationSettings: catCount > 0 ? "'FILL' 1" : "'FILL' 0",
                        transition:           'all 150ms',
                      }}
                    >
                      {cat.icon}
                    </span>
                    <span style={{
                      fontFamily:    BARLOW, fontWeight: 700, fontSize: 12,
                      letterSpacing: '0.12em', textTransform: 'uppercase',
                      color:         catCount > 0 ? '#F0EFF8' : '#9896B0',
                      flex:          1, textAlign: 'left',
                      transition:    'color 150ms',
                    }}>
                      {cat.label}
                    </span>
                    {catCount > 0 && (
                      <span style={{
                        fontFamily:   MONO, fontSize: 9,
                        color:        ACCENT,
                        background:   `${ACCENT}20`,
                        padding:      '2px 8px', borderRadius: 999,
                        flexShrink:   0,
                      }}>
                        {catCount}
                      </span>
                    )}
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize:   16, lineHeight: 1,
                        color:      'rgba(255,255,255,0.22)',
                        transform:  isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 200ms',
                        flexShrink: 0,
                      }}
                    >
                      expand_more
                    </span>
                  </button>

                  {/* Chip grid */}
                  {isOpen && (
                    <div style={{ padding: '12px 14px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {cat.items.map(item => {
                        const isSel      = selectedAmenities.has(item)
                        const isGoogle   = googleInferred.has(item)
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => toggleItem(item)}
                            style={{
                              padding:      '6px 14px',
                              background:   isSel ? ACCENT : 'transparent',
                              border:       `1px dashed ${isSel ? 'transparent' : `${ACCENT}35`}`,
                              borderRadius: 999,
                              cursor:       'pointer',
                              fontFamily:   DM,
                              fontWeight:   isSel ? 700 : 400,
                              fontSize:     12,
                              color:        isSel ? '#1A2744' : '#9896B0',
                              transition:   'all 150ms',
                              whiteSpace:   'nowrap',
                              position:     'relative',
                            }}
                          >
                            {isGoogle && isSel && (
                              <span style={{
                                position:     'absolute',
                                top:          -8, right: -4,
                                fontFamily:   MONO, fontSize: 7,
                                color:        '#1A2744',
                                background:   ACCENT,
                                padding:      '1px 4px',
                                letterSpacing: '0.04em',
                                pointerEvents: 'none',
                              }}>
                                ✦
                              </span>
                            )}
                            {item}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {totalSelected === 0 && (
            <p style={{ fontFamily: DM, fontSize: 12, color: '#3C3A52', marginTop: 16, fontStyle: 'italic' }}>
              You can update this from your dashboard anytime.
            </p>
          )}
        </div>
      </div>

      <footer style={{
        position:   'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: 'linear-gradient(to top, var(--ob-panel-bg, #1A2744) 60%, transparent 100%)',
      }}>
        <p style={{
          fontFamily:  MONO, fontSize: 9, letterSpacing: '0.06em',
          color:       'rgba(255,255,255,0.15)', textAlign: 'center',
          margin:      '0 0 6px', paddingTop: 8,
        }}>
          More amenities = more creator bookings
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 72, padding: '0 24px' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => router.push('/onboarding/business/V4')}
              style={{ background: 'none', border: 'none', fontFamily: DM, fontSize: 15, color: 'rgba(255,255,255,0.25)', cursor: 'pointer', padding: 0 }}
            >
              ← Back
            </button>
            <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.12)' }} />
            <button
              type="button"
              onClick={handleSaveDraft}
              style={{ background: 'none', border: 'none', fontFamily: DM, fontSize: 13, color: 'rgba(255,255,255,0.28)', cursor: 'pointer', padding: 0 }}
            >
              Save Draft
            </button>
          </div>
          <button
            type="button"
            onClick={handleLookingGood}
            disabled={isSaving}
            style={{
              background:    ACCENT, color: '#1A2744',
              fontFamily:    BARLOW, fontWeight: 700, fontSize: 15,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              padding:       '12px 28px', border: 'none',
              boxShadow:     '4px 4px 0px 0px rgba(0,0,0,1)',
              cursor:        'pointer',
              opacity:       isSaving ? 0.7 : 1,
              transition:    'opacity 200ms',
            }}
          >
            {isSaving ? 'Saving…' : 'Looking good →'}
          </button>
        </div>
      </footer>

      <style>{`
        @keyframes v6-fade-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </>
  )
}
