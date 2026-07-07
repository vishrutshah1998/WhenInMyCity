'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { SK } from '@/lib/onboarding/session-keys'
import { BusinessCardArtifact } from '@/components/onboarding/BoardingPassArtifact'
import { useExistingProfileData } from '@/hooks/useExistingProfileData'
import { prefillVenueKeys, prefillBrandKeys } from '@/lib/onboarding/prefill'
import { prefetchGooglePhotos } from '@/app/actions/google-photos'

const ACCENT = '#5DD9D0'
const MONO   = "var(--font-jetbrains-mono), 'JetBrains Mono', monospace"
const BARLOW = "var(--font-barlow), 'Barlow Condensed', sans-serif"
const OUTFIT = "'Outfit', sans-serif"
const ABRIL  = "var(--font-abril), 'Abril Fatface', serif"
const DM     = "'DM Sans', sans-serif"

const CHROME_HEADER: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '5px 14px', borderBottom: '1px solid rgba(26,39,68,0.06)',
  background: 'rgba(26,39,68,0.02)',
}
const CHROME_LABEL: React.CSSProperties = {
  fontFamily: MONO, fontSize: 8, color: 'rgba(26,39,68,0.50)',
  textTransform: 'uppercase' as const, letterSpacing: '0.18em',
}

function slugify(n: string): string {
  return n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
}

function PunchHole({ pos }: { pos: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' }) {
  const style: React.CSSProperties = {
    position: 'absolute', width: 16, height: 16,
    background: 'var(--ob-panel-bg, #1A2744)',
    borderRadius: '50%',
    ...(pos.includes('top')  ? { top: -8 }  : { bottom: -8 }),
    ...(pos.includes('left') ? { left: 14 } : { right: 14 }),
  }
  return <div style={style} />
}

interface PlaceDetails {
  formattedAddress: string
  lat: number; lng: number
  city: string; state: string; pincode: string
  neighbourhood: string; googlePlaceId: string; googleName: string
  phone: string; website: string
  existingRating: number | null; openingHours: unknown
  openingHoursParsed: Record<string, { open: string; close: string } | null>
  photoRefs: string[]
  reviews: { author_name: string; rating: number; text: string; time: number }[]
  editorialSummary: string | null
  placeTypes: string[]
  wheelchairAccessible: boolean | null
  priceLevel: number | null
}

interface Prediction {
  place_id: string; description: string
  structured_formatting: { main_text: string; secondary_text: string }
}

type Phase = 'idle' | 'loadingDetails' | 'confirming' | 'prefetchingPhotos'

export default function B2Page() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const isAddMode    = searchParams.get('mode') === 'add'
  const addType      = searchParams.get('type') ?? 'venue'

  // ── Name ─────────────────────────────────────────────────────────────────────
  const [businessName, setBusinessName] = useState('')
  const [slugPreview,  setSlugPreview]  = useState('')
  const [nameFocused,  setNameFocused]  = useState(false)
  const [isAdvancing,  setIsAdvancing]  = useState(false)

  // ── Address ──────────────────────────────────────────────────────────────────
  const inputRef        = useRef<HTMLInputElement>(null)
  const debounceRef     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sessionTokenRef = useRef(crypto.randomUUID())

  const [query,          setQuery]          = useState('')
  const [predictions,    setPredictions]    = useState<Prediction[]>([])
  const [showDropdown,   setShowDropdown]   = useState(false)
  const [highlightedIdx, setHighlightedIdx] = useState(-1)
  const [phase,          setPhase]          = useState<Phase>('idle')
  const [details,        setDetails]        = useState<PlaceDetails | null>(null)
  const [neighbourhood,  setNeighbourhood]  = useState('')
  const [manual,         setManual]         = useState(false)
  const [manualAddress,  setManualAddress]  = useState('')

  const { data: existingData } = useExistingProfileData()

  useEffect(() => {
    if (isAddMode && existingData) {
      if (addType === 'venue') prefillVenueKeys(existingData)
      else                     prefillBrandKeys(existingData)
    }
  }, [isAddMode, existingData]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!isAddMode && sessionStorage.getItem(SK.persona) !== 'business') {
      router.replace('/onboarding')
      return
    }
    if (isAddMode) {
      sessionStorage.setItem('wimc_ob_mode', 'add')
      sessionStorage.setItem(SK.persona, 'business')
      sessionStorage.setItem(SK.b_subpath, addType)
    }

    const savedName = sessionStorage.getItem(SK.b_name)
    if (savedName) { setBusinessName(savedName); setSlugPreview(slugify(savedName)) }

    // Restore confirmed address from a previous visit to this step
    const savedAddress = sessionStorage.getItem(SK.v_address)
    const savedLat     = sessionStorage.getItem(SK.v_lat)
    const savedLng     = sessionStorage.getItem(SK.v_lng)
    if (savedAddress && savedLat && savedLng) {
      const savedGoogleName = sessionStorage.getItem(SK.v_google_name) ?? savedAddress.split(',')[0]
      const savedCity       = sessionStorage.getItem(SK.b_city) ?? ''
      const savedNbhd       = sessionStorage.getItem(SK.v_neighbourhood) ?? ''
      setQuery(savedAddress)
      setDetails({
        formattedAddress:   savedAddress,
        lat:                parseFloat(savedLat),
        lng:                parseFloat(savedLng),
        city:               savedCity,
        state:              '',
        pincode:            '',
        neighbourhood:      savedNbhd,
        googlePlaceId:      sessionStorage.getItem(SK.v_google_place_id) ?? '',
        googleName:         savedGoogleName,
        phone:              sessionStorage.getItem(SK.v_phone) ?? '',
        website:            sessionStorage.getItem(SK.v_website) ?? '',
        existingRating:     parseFloat(sessionStorage.getItem(SK.v_google_rating) ?? '') || null,
        openingHours:       null,
        openingHoursParsed: {},
        photoRefs:          [],
        reviews:            JSON.parse(sessionStorage.getItem(SK.v_google_reviews) ?? '[]'),
        editorialSummary:   sessionStorage.getItem(SK.v_editorial),
        placeTypes:         JSON.parse(sessionStorage.getItem(SK.v_google_types) ?? '[]'),
        wheelchairAccessible: sessionStorage.getItem(SK.v_wheelchair) === 'true' ? true
                            : sessionStorage.getItem(SK.v_wheelchair) === 'false' ? false : null,
        priceLevel:         parseFloat(sessionStorage.getItem('wimc_ob_v_price_level') ?? '') || null,
      })
      setPhase('confirming')
      if (savedNbhd) setNeighbourhood(savedNbhd)
    } else if (savedAddress) {
      setQuery(savedAddress)
    }
    const savedNbhd = sessionStorage.getItem(SK.v_neighbourhood)
    if (savedNbhd && !neighbourhood) setNeighbourhood(savedNbhd)
  }, [router, isAddMode, addType]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleNameChange(val: string) {
    setBusinessName(val)
    const slug = slugify(val)
    setSlugPreview(slug)
    try { sessionStorage.setItem(SK.b_name, val); sessionStorage.setItem(SK.b_slug, slug) } catch {}
  }

  const fetchPredictions = useCallback(async (input: string) => {
    if (input.length < 2) { setPredictions([]); setShowDropdown(false); return }
    try {
      const res  = await fetch(`/api/venue/places/autocomplete?input=${encodeURIComponent(input)}&sessionToken=${sessionTokenRef.current}`)
      const data = await res.json() as { predictions: Prediction[] }
      setPredictions(data.predictions)
      setShowDropdown(data.predictions.length > 0)
    } catch {
      setPredictions([]); setShowDropdown(false)
    }
  }, [])

  function handleQueryChange(val: string) {
    setQuery(val); setHighlightedIdx(-1)
    if (phase !== 'idle') { setPhase('idle'); setDetails(null) }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchPredictions(val), 350)
  }

  async function selectPrediction(placeId: string, description: string) {
    setQuery(description); setPredictions([]); setShowDropdown(false)
    setPhase('loadingDetails')
    try {
      const res = await fetch(`/api/venue/places/details?placeId=${encodeURIComponent(placeId)}&sessionToken=${sessionTokenRef.current}`)
      if (!res.ok) throw new Error('fetch failed')
      const d = await res.json() as PlaceDetails
      setDetails(d)
      setPhase('confirming')
      if (d.neighbourhood) setNeighbourhood(d.neighbourhood)
      try { if (d.city) sessionStorage.setItem(SK.b_city, d.city) } catch {}
      sessionTokenRef.current = crypto.randomUUID()
    } catch {
      setPhase('idle')
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown) return
    if (e.key === 'ArrowDown')  { e.preventDefault(); setHighlightedIdx(i => Math.min(i + 1, predictions.length - 1)) }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setHighlightedIdx(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && highlightedIdx >= 0) {
      e.preventDefault()
      const p = predictions[highlightedIdx]
      if (p) selectPrediction(p.place_id, p.description)
    } else if (e.key === 'Escape') { setShowDropdown(false) }
  }

  function searchAgain() {
    setPhase('idle'); setDetails(null); setQuery('')
    setTimeout(() => inputRef.current?.focus(), 80)
  }

  const isLoadingAddress = phase === 'loadingDetails'
  const isConfirming     = phase === 'confirming' || phase === 'prefetchingPhotos'
  const isPrefetching    = phase === 'prefetchingPhotos'
  const nameChromeShadow = (nameFocused || businessName)
    ? '4px 4px 0px 0px rgba(0,0,0,0.50)'
    : '4px 4px 0px 0px rgba(0,0,0,0.30)'
  const addressConfirmed = isConfirming || (manual && manualAddress.trim().length >= 5)
  const canProceed       = businessName.trim().length >= 3 && addressConfirmed && !isAdvancing

  async function handleNext() {
    if (!canProceed) return
    setIsAdvancing(true)
    try {
      sessionStorage.setItem(SK.b_name, businessName)
      sessionStorage.setItem(SK.b_slug, slugPreview)
    } catch {}

    if (!manual && details) {
      try {
        sessionStorage.setItem(SK.v_address,         details.formattedAddress)
        sessionStorage.setItem(SK.v_neighbourhood,   neighbourhood || details.neighbourhood || '')
        sessionStorage.setItem(SK.b_city,            details.city || '')
        sessionStorage.setItem(SK.v_city,            details.city || '')
        sessionStorage.setItem(SK.v_lat,             String(details.lat))
        sessionStorage.setItem(SK.v_lng,             String(details.lng))
        sessionStorage.setItem(SK.v_google_place_id, details.googlePlaceId)
        sessionStorage.setItem(SK.v_google_name,     details.googleName)
        sessionStorage.setItem(SK.v_phone,           details.phone)
        sessionStorage.setItem(SK.v_website,         details.website)
        sessionStorage.setItem(SK.v_google_rating,   String(details.existingRating ?? ''))
        sessionStorage.setItem(SK.v_google_reviews,  JSON.stringify(details.reviews ?? []))
        sessionStorage.setItem(SK.v_opening_hours,   JSON.stringify(details.openingHoursParsed ?? {}))
        sessionStorage.setItem(SK.v_google_types,    JSON.stringify(details.placeTypes ?? []))
        if (details.editorialSummary) sessionStorage.setItem(SK.v_editorial, details.editorialSummary)
        if (details.wheelchairAccessible !== null) sessionStorage.setItem(SK.v_wheelchair, String(details.wheelchairAccessible))
        if (details.priceLevel !== null) sessionStorage.setItem('wimc_ob_v_price_level', String(details.priceLevel))
      } catch {}
      if (details.photoRefs.length > 0) {
        setPhase('prefetchingPhotos')
        const result = await prefetchGooglePhotos(details.photoRefs)
        try { sessionStorage.setItem(SK.v_google_photos, JSON.stringify(result.urls)) } catch {}
      }
    } else if (manual) {
      try {
        sessionStorage.setItem(SK.v_address,       manualAddress)
        sessionStorage.setItem(SK.v_neighbourhood, neighbourhood)
      } catch {}
    }

    const subpath = sessionStorage.getItem(SK.b_subpath)
    router.push(subpath === 'brand' ? '/onboarding/business/R1' : '/onboarding/business/V4')
  }

  return (
    <>
      <div style={{ minHeight: '100%', overflowY: 'auto', paddingTop: 20, paddingBottom: 96, paddingLeft: 24, paddingRight: 24 }}>

        {/* ── Business card artifact ───────────────────────────── */}
        <BusinessCardArtifact
          name={businessName || undefined}
          city={details?.city || undefined}
          accent={ACCENT}
        />

        {/* ── Section label ────────────────────────────────────── */}
        <p style={{
          fontFamily: BARLOW, fontWeight: 600, fontSize: 10,
          letterSpacing: '0.3em', textTransform: 'uppercase',
          color: `${ACCENT}99`, margin: '0 0 12px',
        }}>
          — YOUR BUSINESS
        </p>

        {/* ── Headline ─────────────────────────────────────────── */}
        <h1 style={{
          fontFamily: ABRIL,
          fontSize:   'clamp(32px, 7vw, 52px)',
          color:      '#F0EFF8',
          lineHeight: 0.95,
          margin:     '0 0 32px',
        }}>
          What&apos;s your business called?
        </h1>

        {/* ── Name input — ticket chrome ───────────────────────── */}
        <div style={{ marginBottom: 28 }}>
          <div style={{
            background: '#FAF7F0', borderLeft: `6px solid ${ACCENT}`,
            boxShadow: nameChromeShadow, overflow: 'hidden', transition: 'box-shadow 200ms',
          }}>
            <div style={CHROME_HEADER}>
              <span style={CHROME_LABEL}>BUSINESS NAME</span>
              {slugPreview && (
                <span style={{ fontFamily: MONO, fontSize: 9, color: ACCENT }}>
                  wheninmycity.com/{slugPreview}
                </span>
              )}
            </div>
            <input
              type="text"
              value={businessName}
              onChange={e => handleNameChange(e.target.value)}
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
              placeholder="The Hidden Courtyard, Chai Culture..."
              autoComplete="off"
              autoFocus
              style={{
                display: 'block', width: '100%', padding: '14px 14px',
                background: 'transparent', border: 'none', outline: 'none',
                fontFamily: OUTFIT, fontWeight: 900, fontSize: 22,
                color: '#1A2744', textTransform: 'uppercase' as const,
                caretColor: ACCENT, letterSpacing: '-0.01em',
              }}
            />
          </div>
        </div>

        {/* ── Location section ─────────────────────────────────── */}
        <p style={{
          fontFamily: BARLOW, fontWeight: 600, fontSize: 10,
          letterSpacing: '0.3em', textTransform: 'uppercase',
          color: `${ACCENT}99`, margin: '0 0 8px',
        }}>
          — YOUR LOCATION
        </p>
        <p style={{
          fontFamily: DM, fontSize: 13, color: '#9896B0',
          margin: '0 0 20px', lineHeight: 1.55,
        }}>
          {manual
            ? 'Street address or landmark — appears on your listing page.'
            : 'Cultural hubs are about the pin, not just the pin-code. Help seekers find your vibe.'}
        </p>

        {/* ── Autocomplete search ──────────────────────────────── */}
        {!isConfirming && !manual && (
          <div style={{ marginBottom: 12, position: 'relative' }}>
            <div style={{
              background: '#FAF7F0', borderLeft: `4px solid ${ACCENT}`,
              boxShadow: '4px 4px 0px 0px rgba(0,0,0,0.30)',
              overflow: 'visible', position: 'relative',
            }}>
              <div style={CHROME_HEADER}>
                <span style={CHROME_LABEL}>BUSINESS ADDRESS</span>
                {query.length > 0 && (
                  <span style={{ fontFamily: MONO, fontSize: 8, color: '#9896B0', textTransform: 'uppercase', letterSpacing: '0.10em' }}>
                    {isLoadingAddress ? 'SEARCHING...' : 'ENTER TO SELECT'}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', padding: '11px 14px', gap: 8 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: isLoadingAddress ? '#9896B0' : ACCENT, flexShrink: 0, transition: 'color 200ms' }}>
                  {isLoadingAddress ? 'hourglass_empty' : 'location_on'}
                </span>
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => handleQueryChange(e.target.value)}
                  onKeyDown={onKeyDown}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                  onFocus={() => predictions.length > 0 && setShowDropdown(true)}
                  disabled={isLoadingAddress}
                  placeholder="Search your venue or address…"
                  style={{
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    fontFamily: OUTFIT, fontWeight: 900, fontSize: 18,
                    color: '#1A2744', caretColor: ACCENT,
                    opacity: isLoadingAddress ? 0.55 : 1,
                  }}
                />
              </div>

              <AnimatePresence>
                {showDropdown && (
                  <motion.ul role="listbox"
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.14 }}
                    style={{
                      position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                      background: '#09090E', border: '1px solid rgba(255,255,255,0.10)',
                      boxShadow: '0 20px 40px rgba(0,0,0,0.60)', padding: '4px 0',
                      listStyle: 'none', margin: 0, zIndex: 50, overflow: 'hidden',
                    }}
                  >
                    {predictions.map((p, idx) => (
                      <li key={p.place_id} role="option" aria-selected={idx === highlightedIdx}
                        onMouseDown={() => selectPrediction(p.place_id, p.description)}
                        onMouseEnter={() => setHighlightedIdx(idx)}
                        style={{
                          padding: '10px 14px', cursor: 'pointer',
                          background: idx === highlightedIdx ? `${ACCENT}12` : 'transparent',
                          borderLeft: idx === highlightedIdx ? `2px solid ${ACCENT}` : '2px solid transparent',
                          transition: 'background 80ms ease',
                        }}
                      >
                        <div style={{ fontSize: 14, color: '#F0EFF8', fontFamily: DM, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.structured_formatting.main_text}
                        </div>
                        <div style={{ fontSize: 12, color: '#9896B0', fontFamily: DM, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.structured_formatting.secondary_text}
                        </div>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* ── Loading dots ─────────────────────────────────────── */}
        {isLoadingAddress && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', marginBottom: 12 }}>
            {[0, 1, 2].map(i => (
              <motion.span key={i}
                style={{ display: 'block', width: 7, height: 7, borderRadius: '50%', background: ACCENT }}
                animate={{ y: [0, -5, 0] }}
                transition={{ repeat: Infinity, duration: 0.7, delay: i * 0.15, ease: 'easeInOut' }}
              />
            ))}
            <span style={{ fontSize: 13, color: '#9896B0', fontFamily: DM }}>Looking that up…</span>
          </motion.div>
        )}

        {/* ── Manual address input ─────────────────────────────── */}
        {manual && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ background: '#FAF7F0', borderLeft: `4px solid ${ACCENT}`, boxShadow: '4px 4px 0px 0px rgba(0,0,0,0.30)', overflow: 'hidden' }}>
              <div style={CHROME_HEADER}>
                <span style={CHROME_LABEL}>BUSINESS ADDRESS</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', padding: '11px 14px', gap: 8 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: ACCENT, flexShrink: 0 }}>location_on</span>
                <input
                  value={manualAddress}
                  onChange={e => setManualAddress(e.target.value)}
                  placeholder="Street name, area, city..."
                  autoFocus
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: OUTFIT, fontWeight: 900, fontSize: 18, color: '#1A2744', caretColor: ACCENT }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Confirmation punch-hole card ─────────────────────── */}
        {isConfirming && details && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            style={{
              background: '#FAF7F0', border: '2px solid #1A2744',
              boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)', padding: '20px 18px 16px',
              position: 'relative', marginBottom: 12,
            }}
          >
            <PunchHole pos="top-left" /><PunchHole pos="top-right" />

            {details.photoRefs.length > 0 && (
              <div style={{ marginBottom: 14, display: 'grid', gap: 4, gridTemplateColumns: details.photoRefs.length >= 3 ? '2fr 1fr' : '1fr', overflow: 'hidden' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/venue/places/photo?ref=${encodeURIComponent(details.photoRefs[0])}`} alt="Venue" style={{ display: 'block', width: '100%', height: 140, objectFit: 'cover' }} />
                {details.photoRefs.length >= 3 && (
                  <div style={{ display: 'grid', gap: 4 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/venue/places/photo?ref=${encodeURIComponent(details.photoRefs[1])}`} alt="Venue" style={{ display: 'block', width: '100%', height: 68, objectFit: 'cover' }} />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/venue/places/photo?ref=${encodeURIComponent(details.photoRefs[2])}`} alt="Venue" style={{ display: 'block', width: '100%', height: 68, objectFit: 'cover' }} />
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div style={{ flex: 1, minWidth: 0, marginRight: 10 }}>
                <div style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(26,39,68,0.55)', textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: 3 }}>
                  Selected Quadrant
                </div>
                <div style={{ fontFamily: ABRIL, fontSize: 18, color: '#1A2744', lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {details.googleName}
                </div>
              </div>
              <div style={{ background: '#39B54A', padding: '3px 10px', flexShrink: 0 }}>
                <span style={{ fontFamily: MONO, fontSize: 9, color: 'white', textTransform: 'uppercase', letterSpacing: '0.08em' }}>CONFIRMED</span>
              </div>
            </div>

            <div style={{ borderTop: '1px dashed rgba(26,39,68,0.20)', paddingTop: 12, marginBottom: 12 }}>
              <p style={{ fontFamily: DM, fontSize: 12, color: 'rgba(26,39,68,0.70)', lineHeight: 1.5, margin: 0 }}>
                {details.formattedAddress}
              </p>
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              {details.existingRating && (
                <span style={{ fontFamily: DM, fontSize: 11, background: 'rgba(26,39,68,0.08)', padding: '3px 8px', color: '#1A2744' }}>
                  ⭐ {details.existingRating} Google
                </span>
              )}
              {details.photoRefs.length > 0 && (
                <span style={{ fontFamily: DM, fontSize: 11, background: `${ACCENT}20`, padding: '3px 8px', color: ACCENT }}>
                  ✦ {details.photoRefs.length} photos
                </span>
              )}
              {details.placeTypes.length > 0 && (
                <span style={{ fontFamily: DM, fontSize: 11, background: 'rgba(26,39,68,0.08)', padding: '3px 8px', color: '#1A2744', textTransform: 'capitalize' }}>
                  {details.placeTypes[0].replace(/_/g, ' ')}
                </span>
              )}
            </div>

            <button onClick={searchAgain}
              style={{ background: 'transparent', border: '1px solid rgba(26,39,68,0.20)', padding: '6px 14px', fontFamily: DM, fontSize: 12, color: 'rgba(26,39,68,0.55)', cursor: 'pointer' }}>
              Search again
            </button>

            <PunchHole pos="bottom-left" /><PunchHole pos="bottom-right" />
          </motion.div>
        )}

        {/* ── Neighbourhood input ──────────────────────────────── */}
        {(isConfirming || manual) && (
          <div style={{ background: '#FAF7F0', borderLeft: '4px solid rgba(87,66,62,0.45)', overflow: 'hidden', marginBottom: 12 }}>
            <div style={CHROME_HEADER}>
              <span style={CHROME_LABEL}>SPECIFIC AREA / NEIGHBOURHOOD</span>
            </div>
            <input
              value={neighbourhood}
              onChange={e => setNeighbourhood(e.target.value)}
              placeholder="e.g. Near 56 Dukan, Saket, Koregaon Park..."
              style={{ display: 'block', width: '100%', padding: '11px 14px', background: 'transparent', border: 'none', outline: 'none', fontFamily: DM, fontWeight: 500, fontSize: 14, color: '#1A2744', caretColor: ACCENT }}
            />
          </div>
        )}

        {/* ── Manual fallback button ───────────────────────────── */}
        {phase === 'idle' && !manual && (
          <button onClick={() => setManual(true)}
            style={{
              padding: '8px 16px', background: 'transparent',
              border: `1px solid rgba(93,217,208,0.30)`,
              color: 'rgba(255,255,255,0.55)', fontFamily: DM, fontSize: 12,
              cursor: 'pointer', letterSpacing: '0.02em',
            }}>
            📍 My venue isn&apos;t on Google Maps — enter manually
          </button>
        )}

      </div>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, height: 72, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px',
        background: 'linear-gradient(to top, var(--ob-panel-bg, #1A2744) 60%, transparent 100%)',
      }}>
        <button
          type="button"
          onClick={() => isAddMode ? router.back() : router.push('/onboarding/business/B3')}
          style={{ background: 'none', border: 'none', fontFamily: DM, fontSize: 15, color: 'rgba(255,255,255,0.25)', cursor: 'pointer', padding: 0 }}
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={!canProceed}
          style={{
            background:    canProceed ? ACCENT : 'rgba(255,255,255,0.08)',
            color:         canProceed ? '#1A2744' : 'rgba(255,255,255,0.22)',
            fontFamily:    BARLOW, fontWeight: 700, fontSize: 15,
            letterSpacing: '0.08em', textTransform: 'uppercase' as const,
            padding:       '12px 32px', border: 'none',
            boxShadow:     canProceed ? '8px 8px 0px 0px #000000' : 'none',
            cursor:        canProceed ? 'pointer' : 'not-allowed',
            transition:    'all 150ms',
          }}
        >
          {isPrefetching ? 'Importing…' : isAdvancing ? 'Loading…' : 'Continue →'}
        </button>
      </footer>
    </>
  )
}
