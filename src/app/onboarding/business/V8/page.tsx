'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SK, clearNewOnboardingKeys } from '@/lib/onboarding/session-keys'
import { updatePersonas } from '@/lib/onboarding/update-personas'
import { completeVenueOnboarding, type CompleteVenueInput } from '@/app/actions/venue-onboarding'
import { createClient } from '@/lib/supabase/client'
import { ArtifactStyles, ScaledStage, VenuePoster } from '@/components/onboarding/artifacts'

const ACCENT  = '#5DD9D0'
const CORAL   = '#E8705A'
const NAVY    = '#1A2744'
const MONO    = "var(--font-jetbrains-mono), 'JetBrains Mono', monospace"
const BARLOW  = "var(--font-barlow), 'Barlow Condensed', sans-serif"
const ABRIL   = "var(--font-abril), 'Abril Fatface', serif"
const DM      = "'DM Sans', sans-serif"

// Maps V4 UI tile IDs → server-valid venue_type enum values (mirrors V4/page.tsx)
const TYPE_TO_VALID: Record<string, CompleteVenueInput['venue_type'][number]> = {
  cafe:       'cafe',       coworking:  'coworking', studio:     'studio',
  rooftop:    'rooftop',   gallery:    'gallery',   theatre:    'community_hall',
  event_hall: 'community_hall', retail: 'restaurant', bar:      'restaurant',
  outdoor:    'garden',    library:    'library',   sports:     'coworking',
  film_set:   'studio',    hotel_hall: 'community_hall', garden: 'garden',
  workshop:   'coworking', restaurant: 'restaurant',
}

function toValidVenueTypes(raw: string[]): CompleteVenueInput['venue_type'] {
  const seen = new Set<CompleteVenueInput['venue_type'][number]>()
  raw.forEach(t => { const v = TYPE_TO_VALID[t]; if (v) seen.add(v) })
  return Array.from(seen) as CompleteVenueInput['venue_type']
}

const PRICING_MAP: Record<string, CompleteVenueInput['pricing_model']> = {
  hourly:          'fixed_rental',
  split:           'door_split',
  hybrid:          'hybrid',
  fnb:             'f_and_b_minimum',
  fixed_rental:    'fixed_rental',
  door_split:      'door_split',
  f_and_b_minimum: 'f_and_b_minimum',
}

const LEAD_TO_WEEKS: Record<string, number> = {
  '1 week':   1,
  '2 weeks':  2,
  '1 month+': 4,
}

const DAY_TO_FULL: Record<string, string> = {
  MON: 'monday', TUE: 'tuesday', WED: 'wednesday', THU: 'thursday',
  FRI: 'friday', SAT: 'saturday', SUN: 'sunday',
  monday: 'monday', tuesday: 'tuesday', wednesday: 'wednesday', thursday: 'thursday',
  friday: 'friday', saturday: 'saturday', sunday: 'sunday',
}

const VALID_AMENITIES = new Set([
  'wifi', 'projector', 'sound_system', 'pa_system', 'microphone', 'power_backup',
  'serves_food', 'bar_alcohol', 'coffee_tea', 'outside_catering', 'kitchen',
  'parking', 'ac', 'wheelchair', 'accessible', 'outdoor', 'outdoor_space', 'near_transit',
  'board_games', 'photo_friendly', 'natural_light', 'dj_ok', 'smoking_area', 'late_night',
  'whiteboard',
])

function buildPricingConfig(model: string, rawAmount: string) {
  const n = Number(rawAmount)
  if (!rawAmount || isNaN(n) || n <= 0) return {}
  switch (model) {
    case 'hourly':           return { fixed_rental_paise:    Math.round(n * 100) }
    case 'split':            return { door_split_percent:    n }
    case 'hybrid':           return { hybrid_rental_paise:   Math.round(n * 100) }
    case 'fnb':              return { f_and_b_minimum_paise: Math.round(n * 100) }
    case 'fixed_rental':     return { fixed_rental_paise:    Math.round(n * 100) }
    case 'door_split':       return { door_split_percent:    n }
    case 'f_and_b_minimum':  return { f_and_b_minimum_paise: Math.round(n * 100) }
    default:                 return {}
  }
}

export default function V8Page() {
  const router = useRouter()

  const [whatsapp,       setWhatsapp]       = useState('')
  const [email,          setEmail]          = useState('')
  const [instagram,      setInstagram]      = useState('')
  const [bio,            setBio]            = useState('')

  function syncContact(wa: string, mail: string, ig: string, b: string) {
    try {
      sessionStorage.setItem('wimc_ob_v_contact', JSON.stringify({ whatsapp: wa, email: mail, instagram: ig, bio: b }))
      window.dispatchEvent(new Event('ob-snap-update'))
    } catch {}
  }
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [isSubmitting,   setIsSubmitting]   = useState(false)
  const [submitError,    setSubmitError]    = useState<string | null>(null)
  const [bName,          setBName]          = useState('')
  const [bCity,          setBCity]          = useState('')
  const [bSlug,          setBSlug]          = useState('')
  const [isAddMode,      setIsAddMode]      = useState(false)
  const [whatsappError,  setWhatsappError]  = useState<string | null>(null)
  const [focusWa,        setFocusWa]        = useState(false)
  const [focusEmail,     setFocusEmail]     = useState(false)
  const [focusIg,        setFocusIg]        = useState(false)
  const [focusBio,       setFocusBio]       = useState(false)
  const [pendingRedirect, setPendingRedirect] = useState<string | null>(null)
  const [venueAddress,   setVenueAddress]   = useState('')
  const [venuePhotoUrl,  setVenuePhotoUrl]  = useState<string | null>(null)
  const [venueTags,      setVenueTags]      = useState<string[]>([])
  const [hostName,       setHostName]       = useState<string | null>(null)

  // Reveal state (post-submit) — overlays the left panel only
  const [revealState, setRevealState] = useState<'editing' | 'revealed'>('editing')
  const [isLeaving,   setIsLeaving]   = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setIsAddMode(sessionStorage.getItem('wimc_ob_mode') === 'add')
    const name    = sessionStorage.getItem(SK.b_name) ?? ''
    const subpath = sessionStorage.getItem(SK.b_subpath)
    if (!name || subpath !== 'venue') { router.replace('/onboarding/business/B3'); return }
    setBName(name)
    setBCity(sessionStorage.getItem(SK.b_city) ?? '')
    setBSlug(sessionStorage.getItem(SK.v_slug) ?? '')
    setPendingRedirect(sessionStorage.getItem('wimc_post_onboarding_redirect'))
    setVenueAddress(sessionStorage.getItem(SK.v_address) ?? '')

    try {
      const rawTypes = JSON.parse(sessionStorage.getItem(SK.v_types) || '[]') as string[]
      setVenueTags(rawTypes.map(t => t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())))
    } catch {}

    try {
      const photos = JSON.parse(sessionStorage.getItem(SK.v_google_photos) || '[]') as string[]
      if (photos[0]) setVenuePhotoUrl(photos[0])
    } catch {}

    let wa = '', mail = '', ig = '', bioText = ''
    try {
      const saved = sessionStorage.getItem(SK.v_contact)
      if (saved) {
        const c = JSON.parse(saved) as { whatsapp?: string; email?: string; instagram?: string; bio?: string }
        wa = c.whatsapp || ''; mail = c.email || ''; ig = c.instagram || ''; bioText = c.bio || ''
      }
    } catch {}
    if (!bioText) {
      const editorial = sessionStorage.getItem(SK.v_editorial)
      if (editorial) bioText = editorial.slice(0, 500)
    }
    if (!wa || !mail || !ig) {
      try {
        const brandSaved = sessionStorage.getItem(SK.r_contact)
        if (brandSaved) {
          const c = JSON.parse(brandSaved) as { whatsapp?: string; email?: string; instagram?: string }
          if (!wa   && c.whatsapp)  wa   = c.whatsapp
          if (!mail && c.email)     mail = c.email
          if (!ig   && c.instagram) ig   = c.instagram
        }
      } catch {}
    }
    if (!ig) {
      try {
        const handles = JSON.parse(sessionStorage.getItem(SK.c_social_handles) || '{}') as Record<string, string>
        if (handles.instagram) ig = handles.instagram.replace(/^@/, '')
      } catch {}
    }
    if (wa)      setWhatsapp(wa)
    if (mail)    setEmail(mail)
    if (ig)      setInstagram(ig)
    if (bioText) setBio(bioText)

    createClient().auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      if (!wa && user.phone) {
        const digits = user.phone.replace(/\D/g, '').slice(-10)
        if (digits.length === 10) setWhatsapp(digits)
      }
      if (!mail && user.email) setEmail(user.email)
      // No dedicated "host name" field is collected during venue onboarding —
      // fall back to the auth account's OAuth full name (e.g. Google sign-in)
      // rather than fabricating one; VenuePoster omits the row entirely if null.
      const fullName = (user.user_metadata as Record<string, unknown> | undefined)?.full_name
      if (typeof fullName === 'string' && fullName.trim()) setHostName(fullName.trim())
    }).catch(() => {})
  }, [router])

  async function handleSuggestBio() {
    if (suggestLoading) return
    setSuggestLoading(true)
    try {
      const response = await fetch('/api/suggest-bio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venueName: bName, city: bCity,
          types:  JSON.parse(sessionStorage.getItem(SK.v_types)  || '[]'),
          events: JSON.parse(sessionStorage.getItem(SK.v_events) || '[]'),
          currentBio: bio,
        }),
      })
      const { suggestion } = await response.json() as { suggestion: string }
      setBio(suggestion.slice(0, 500))
    } catch { /* silent */ }
    finally { setSuggestLoading(false) }
  }

  async function handleDone() {
    if (!email.trim() || isSubmitting) return
    setIsSubmitting(true)
    setSubmitError(null)
    if (whatsapp && whatsapp.length !== 10) {
      setWhatsappError('Enter a valid 10-digit WhatsApp number')
      setIsSubmitting(false)
      return
    }
    try { sessionStorage.setItem(SK.v_contact, JSON.stringify({ whatsapp, email, instagram, bio })) } catch {}
    try {
      const name      = sessionStorage.getItem(SK.b_name)    || ''
      const city      = sessionStorage.getItem(SK.b_city)    || ''
      const address   = sessionStorage.getItem(SK.v_address) || ''
      const rawTypes  = JSON.parse(sessionStorage.getItem(SK.v_types) || '[]') as string[]
      const venue_type = toValidVenueTypes(rawTypes)

      const capRaw = sessionStorage.getItem(SK.v_capacity)
      const cap    = capRaw
        ? (JSON.parse(capRaw) as { standing?: number; seated?: number; classroom?: number; min_pax?: number; min?: number; max?: number })
        : {}
      const capMax = Math.max(cap.standing ?? 0, cap.seated ?? 0, cap.classroom ?? 0, cap.max ?? 0) || undefined
      const capMin = cap.min_pax ?? cap.min ?? undefined
      const capacityConfigurations = [
        cap.standing  ? { type: 'standing',  capacity: cap.standing  } : null,
        cap.seated    ? { type: 'seated',    capacity: cap.seated    } : null,
        cap.classroom ? { type: 'classroom', capacity: cap.classroom } : null,
      ].filter(Boolean) as { type: string; capacity: number }[]

      const amenitiesRaw  = sessionStorage.getItem(SK.v_amenities)
      const amenities     = ((amenitiesRaw ? JSON.parse(amenitiesRaw) : []) as string[])
        .filter(a => VALID_AMENITIES.has(a)) as CompleteVenueInput['amenities']
      const rawPricing       = sessionStorage.getItem(SK.v_pricing) || ''
      const rawPricingAmount = sessionStorage.getItem(SK.v_pricing_amount) || ''
      const pricing_model    = PRICING_MAP[rawPricing] ?? 'fixed_rental'
      const available_days   = (JSON.parse(sessionStorage.getItem(SK.v_days) || '[]') as string[])
        .map(d => DAY_TO_FULL[d]).filter(Boolean) as CompleteVenueInput['available_days']

      let preferred_times: ('morning' | 'afternoon' | 'evening' | 'late_night')[] = []
      try { preferred_times = JSON.parse(sessionStorage.getItem(SK.v_times) || '[]') } catch {}
      let event_preferences: string[] = []
      try { event_preferences = JSON.parse(sessionStorage.getItem(SK.v_events) || '[]') } catch {}

      const rawLead          = sessionStorage.getItem(SK.v_lead) || '1 week'
      const lead_time_weeks  = LEAD_TO_WEEKS[rawLead] ?? 1
      const alcohol_license  = sessionStorage.getItem(SK.v_alcohol_license) === 'true'
      const sound_curfew_time = (() => {
        const v = sessionStorage.getItem(SK.v_sound_curfew)
        return (!v || v === 'none') ? undefined : v
      })()

      let google_place_types: string[] = []
      try { google_place_types = JSON.parse(sessionStorage.getItem(SK.v_google_types) || '[]') } catch {}

      const neighbourhood = sessionStorage.getItem(SK.v_neighbourhood) || undefined
      const latRaw        = sessionStorage.getItem(SK.v_lat)
      const lngRaw        = sessionStorage.getItem(SK.v_lng)
      const lat           = latRaw ? parseFloat(latRaw)  : undefined
      const lng           = lngRaw ? parseFloat(lngRaw)  : undefined
      const googlePlaceId = sessionStorage.getItem(SK.v_google_place_id) || undefined
      const googleName    = sessionStorage.getItem(SK.v_google_name)     || undefined
      const phone         = sessionStorage.getItem(SK.v_phone)           || undefined
      const website       = sessionStorage.getItem(SK.v_website)         || undefined
      const ratingRaw     = sessionStorage.getItem(SK.v_google_rating)
      const googleRating  = ratingRaw ? parseFloat(ratingRaw) : undefined
      let googleReviews: NonNullable<CompleteVenueInput['google_reviews']> = []
      let googlePhotoUrls: string[] = []
      try { googleReviews   = JSON.parse(sessionStorage.getItem(SK.v_google_reviews) || '[]') } catch {}
      try { googlePhotoUrls = JSON.parse(sessionStorage.getItem(SK.v_google_photos)  || '[]') } catch {}

      const result = await completeVenueOnboarding({
        name,
        description:             bio || undefined,
        city,
        neighbourhood,
        address,
        lat:                     isNaN(lat as number) ? undefined : lat,
        lng:                     isNaN(lng as number) ? undefined : lng,
        venue_type,
        capacity_min:            capMin,
        capacity_max:            capMax,
        capacity_configurations: capacityConfigurations,
        amenities,
        pricing_model,
        pricing_config:          buildPricingConfig(rawPricing, rawPricingAmount),
        available_days,
        preferred_times,
        event_preferences,
        lead_time_weeks,
        alcohol_license,
        sound_curfew_time,
        google_place_types,
        contact_whatsapp:        whatsapp  || '',
        contact_email:           email     || '',
        instagram_handle:        instagram || '',
        google_place_id:         googlePlaceId,
        google_name:             googleName,
        phone,
        website,
        google_rating:           isNaN(googleRating as number) ? undefined : googleRating,
        google_reviews:          googleReviews,
        google_photo_urls:       googlePhotoUrls.length ? googlePhotoUrls : undefined,
      })

      if (result.error) {
        setIsSubmitting(false)
        setSubmitError(result.error || 'Something went wrong. Please try again.')
        return
      }

      try { sessionStorage.setItem(SK.v_slug, result.slug) } catch {}
      setBSlug(result.slug)
      // Signal right panel to transition to V9 confirmation view
      try { sessionStorage.setItem('wimc_v8_revealed', 'true'); window.dispatchEvent(new Event('ob-snap-update')) } catch {}
      setRevealState('revealed')
    } catch { setIsSubmitting(false) }
  }

  async function handleContinueToStudio() {
    if (isLeaving) return
    setIsLeaving(true)
    if (isAddMode) {
      try { await updatePersonas('venue') } catch {}
    }
    const dest = pendingRedirect || '/business/venue/studio'
    try { sessionStorage.removeItem('wimc_post_onboarding_redirect') } catch {}
    clearNewOnboardingKeys()
    router.replace(dest)
  }

  const isEnabled = email.trim().length > 0

  // ── Reveal overlay — position:fixed is contained to the left panel ────────────
  if (revealState === 'revealed') {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        background: '#07070A',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '32px 28px',
        zIndex: 100,
        animation: 'v8-reveal 0.5s ease both',
      }}>
        <style>{`
          @keyframes v8-reveal   { 0%{opacity:0} 100%{opacity:1} }
          @keyframes v8-fade-up  { 0%{opacity:0;transform:translateY(16px)} 100%{opacity:1;transform:translateY(0)} }
          @keyframes v8-pulse    { 0%,100%{opacity:1} 50%{opacity:0.4} }
          @keyframes v8-stamp-in { 0%{transform:scale(3) rotate(-12deg);opacity:0} 70%{transform:scale(0.95) rotate(-12deg);opacity:1} 100%{transform:scale(1) rotate(-12deg);opacity:1} }
          @keyframes v8-line-in  { 0%{width:0} 100%{width:100%} }
          @keyframes v8-spin-slow{ from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        `}</style>

        {/* Live dot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 28, animation: 'v8-fade-up 0.4s ease 0.1s both' }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22C55E', animation: 'v8-pulse 2s ease-in-out infinite' }} />
          <span style={{ fontFamily: MONO, fontSize: 9, color: '#22C55E', letterSpacing: '0.2em', textTransform: 'uppercase' }}>VENUE LIVE</span>
        </div>

        {/* Overline */}
        <p style={{ fontFamily: MONO, fontSize: 9, color: `${CORAL}99`, letterSpacing: '0.35em', textTransform: 'uppercase', margin: '0 0 10px', animation: 'v8-fade-up 0.4s ease 0.2s both' }}>
          — YOUR VENUE IS LIVE —
        </p>

        {/* Name */}
        <h1 style={{
          fontFamily: ABRIL, fontSize: 'clamp(30px, 8vw, 48px)',
          color: '#F0EFF8', lineHeight: 1.0, margin: '0 0 32px',
          textAlign: 'center', textTransform: 'uppercase',
          animation: 'v8-fade-up 0.5s ease 0.3s both',
        }}>
          {bName}
        </h1>

        {/* Venue notice/bulletin poster artifact — scaled to fit the boxed left
            panel (V8 is not FULL_BLEED; the 42vw/340px-min containment comes
            from onboarding/layout.tsx, not from this page). */}
        <div style={{ width: '100%', marginBottom: 36 }}>
          <ArtifactStyles />
          <ScaledStage width={480} height={720} maxWidth={260}>
            <VenuePoster
              name={bName}
              photoUrl={venuePhotoUrl}
              tags={venueTags}
              address={venueAddress}
              hostName={hostName}
              profileUrl={`wheninmycity.com/venue/${bSlug}`}
            />
          </ScaledStage>
        </div>

        {/* CTA */}
        <div style={{ width: '100%', maxWidth: 320, animation: 'v8-fade-up 0.4s ease 1.2s both' }}>
          <button
            type="button"
            onClick={handleContinueToStudio}
            disabled={isLeaving}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', background: ACCENT, color: NAVY,
              fontFamily: MONO, fontWeight: 700, fontSize: 12,
              letterSpacing: '0.10em', textTransform: 'uppercase',
              padding: '15px 20px', border: `1px solid ${NAVY}`,
              boxShadow: '5px 5px 0px 0px rgba(0,0,0,0.9)',
              cursor: isLeaving ? 'default' : 'pointer',
              opacity: isLeaving ? 0.6 : 1,
            }}
          >
            <span>Continue to your Venue page</span>
            <span className="material-symbols-outlined" style={{ fontSize: 17 }}>arrow_forward</span>
          </button>
        </div>
      </div>
    )
  }

  // ── Form ──────────────────────────────────────────────────────────────────────
  return (
    <>
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 96 }}>
        <div style={{ padding: '28px 28px 0' }}>

          {/* ── Headline ────────────────────────────────────────────────── */}
          <p style={{ fontFamily: BARLOW, fontWeight: 600, fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: `${ACCENT}99`, margin: '0 0 8px' }}>
            — CLOSING THE LOOP
          </p>
          <h1 style={{ fontFamily: ABRIL, fontSize: 'clamp(26px, 5vw, 38px)', color: '#F0EFF8', lineHeight: 1.05, margin: '0 0 6px' }}>
            Last few details.
          </h1>
          <p style={{ fontFamily: DM, fontSize: 14, color: '#9896B0', margin: '0 0 36px', lineHeight: 1.6 }}>
            How should creators reach you? What should they know?
          </p>

          {/* ── Contact fields ──────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32, marginBottom: 40 }}>

            {/* WhatsApp */}
            <div>
              <label style={{ fontFamily: MONO, fontSize: 10, color: '#F0EFF8', textTransform: 'uppercase', letterSpacing: '0.20em', display: 'block', marginBottom: 8 }}>
                WHATSAPP NUMBER
              </label>
              <div style={{ display: 'flex', alignItems: 'center', borderBottom: `2px solid ${focusWa ? CORAL : '#b9c6eb50'}`, transition: 'border-color 150ms' }}>
                <span style={{ fontFamily: MONO, fontSize: 15, color: ACCENT, flexShrink: 0, paddingRight: 8, userSelect: 'none' }}>+91</span>
                <div style={{ width: 1, height: 16, background: '#b9c6eb30', flexShrink: 0, marginRight: 8, alignSelf: 'center' }} />
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={whatsapp}
                  onChange={e => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
                    setWhatsapp(digits)
                    if (whatsappError) setWhatsappError(null)
                    syncContact(digits, email, instagram, bio)
                  }}
                  onFocus={() => setFocusWa(true)}
                  onBlur={() => setFocusWa(false)}
                  placeholder="98765 43210"
                  style={{
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    padding: '8px 28px 8px 0',
                    fontFamily: DM, fontSize: 16, color: '#F0EFF8', caretColor: CORAL,
                    boxSizing: 'border-box',
                  }}
                />
                <span className="material-symbols-outlined" style={{ fontSize: 18, lineHeight: 1, color: focusWa ? CORAL : 'rgba(185,198,235,0.50)', transition: 'color 150ms' }}>
                  call
                </span>
              </div>
              {whatsappError && (
                <span style={{ fontFamily: MONO, fontSize: 10, color: '#ffb4a6', letterSpacing: '0.05em', display: 'block', marginTop: 4 }}>
                  ⚠ {whatsappError}
                </span>
              )}
            </div>

            {/* Email */}
            <div>
              <label style={{ fontFamily: MONO, fontSize: 10, color: '#F0EFF8', textTransform: 'uppercase', letterSpacing: '0.20em', display: 'block', marginBottom: 8 }}>
                VENUE EMAIL <span style={{ color: CORAL }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); syncContact(whatsapp, e.target.value, instagram, bio) }}
                  onFocus={() => setFocusEmail(true)}
                  onBlur={() => setFocusEmail(false)}
                  placeholder="official@yourvenue.in"
                  style={{
                    width: '100%', background: 'transparent', border: 'none',
                    borderBottom: `2px solid ${focusEmail ? CORAL : '#b9c6eb50'}`,
                    outline: 'none', padding: '8px 28px 8px 0',
                    fontFamily: DM, fontSize: 16, color: '#F0EFF8', caretColor: CORAL,
                    transition: 'border-color 150ms', boxSizing: 'border-box',
                  }}
                />
                <span className="material-symbols-outlined" style={{
                  position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
                  fontSize: 18, lineHeight: 1,
                  color: focusEmail ? CORAL : 'rgba(185,198,235,0.50)', transition: 'color 150ms',
                }}>
                  mail
                </span>
              </div>
            </div>

            {/* Instagram */}
            <div>
              <label style={{ fontFamily: MONO, fontSize: 10, color: '#F0EFF8', textTransform: 'uppercase', letterSpacing: '0.20em', display: 'block', marginBottom: 8 }}>
                INSTAGRAM HANDLE
              </label>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                borderBottom: `2px solid ${focusIg ? CORAL : '#b9c6eb50'}`,
                paddingBottom: 8, transition: 'border-color 150ms',
              }}>
                <span style={{ fontFamily: DM, fontSize: 16, color: ACCENT, flexShrink: 0, lineHeight: 1 }}>@</span>
                <input
                  type="text"
                  value={instagram}
                  onChange={e => { const v = e.target.value.replace(/^@/, ''); setInstagram(v); syncContact(whatsapp, email, v, bio) }}
                  onFocus={() => setFocusIg(true)}
                  onBlur={() => setFocusIg(false)}
                  placeholder="your_venue_handle"
                  style={{
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    padding: 0, fontFamily: DM, fontSize: 16, color: '#F0EFF8', caretColor: CORAL,
                  }}
                />
              </div>
            </div>
          </div>

          {/* ── Bio textarea ────────────────────────────────────────────── */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontFamily: MONO, fontSize: 10, color: '#F0EFF8', textTransform: 'uppercase', letterSpacing: '0.20em' }}>
                PUBLIC BIO / DESCRIPTION
              </label>
              <span style={{ fontFamily: MONO, fontSize: 10, color: '#9896B0' }}>
                {bio.length} / 500
              </span>
            </div>
            <div style={{ position: 'relative' }}>
              <textarea
                value={bio}
                onChange={e => { setBio(e.target.value); syncContact(whatsapp, email, instagram, e.target.value) }}
                onFocus={() => setFocusBio(true)}
                onBlur={() => setFocusBio(false)}
                placeholder="Describe the vibe, the history, and the soul of your space..."
                maxLength={500}
                rows={5}
                style={{
                  width: '100%', background: '#09090E',
                  border: `2px solid ${focusBio ? ACCENT : 'rgba(255,255,255,0.12)'}`,
                  outline: 'none', padding: '14px 14px 48px',
                  fontFamily: DM, fontSize: 14, color: '#F0EFF8', caretColor: ACCENT,
                  resize: 'none', lineHeight: 1.6,
                  boxSizing: 'border-box', transition: 'border-color 150ms',
                }}
              />
              <button
                type="button"
                onClick={handleSuggestBio}
                disabled={suggestLoading}
                style={{
                  position: 'absolute', bottom: 10, right: 10,
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: '#07070A',
                  color: suggestLoading ? 'rgba(255,255,255,0.30)' : '#F0EFF8',
                  fontFamily: MONO, fontWeight: 700, fontSize: 10,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  padding: '6px 10px', border: `1px solid rgba(255,255,255,0.12)`,
                  cursor: suggestLoading ? 'wait' : 'pointer',
                  opacity: suggestLoading ? 0.6 : 1, transition: 'all 150ms',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 13, lineHeight: 1, fontVariationSettings: "'FILL' 1" }}>
                  {suggestLoading ? 'pending' : 'auto_awesome'}
                </span>
                {suggestLoading ? '...' : 'SUGGEST'}
              </button>
            </div>
          </div>

          {/* ── Identity check strip ────────────────────────────────────── */}
          <div style={{
            padding: '14px 18px',
            border: `2px dashed ${ACCENT}`,
            background: `${ACCENT}08`,
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22, color: ACCENT, fontVariationSettings: "'FILL' 1", lineHeight: 1, flexShrink: 0 }}>
              verified
            </span>
            <div>
              <div style={{ fontFamily: BARLOW, fontWeight: 700, fontSize: 16, color: '#F0EFF8', lineHeight: 1.1 }}>
                Identity Check
              </div>
              <div style={{ fontFamily: DM, fontSize: 11, color: '#9896B0', marginTop: 2 }}>
                Contact details stamped to your Venue profile.
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Footer ── contained in left panel via layout's transform ──────────── */}
      <footer style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        height: 80, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px',
        background: '#1A274490',
        borderTop: '1px dashed rgba(93,217,208,0.18)',
        backdropFilter: 'blur(8px)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.10em', textTransform: 'uppercase' }}>
            STEP 06 / 06
          </span>
          <span style={{ fontFamily: MONO, fontSize: 9, color: ACCENT, letterSpacing: '0.10em', textTransform: 'uppercase' }}>
            {isEnabled ? 'READY TO STAMP' : 'AWAITING EMAIL'}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          {submitError && (
            <div style={{
              background: 'rgba(255,180,166,0.1)', border: '1px solid rgba(255,180,166,0.3)',
              padding: '5px 10px', fontFamily: MONO, fontSize: 10, color: '#ffb4a6',
              letterSpacing: '0.05em', maxWidth: 220, textAlign: 'right',
            }}>
              ⚠ {submitError}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              type="button"
              onClick={() => router.push('/onboarding/business/V7')}
              style={{
                background: 'none', border: 'none',
                fontFamily: DM, fontSize: 14, color: 'rgba(255,255,255,0.25)',
                cursor: 'pointer', padding: 0,
              }}
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={handleDone}
              disabled={!isEnabled || isSubmitting}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: isEnabled ? ACCENT : `${ACCENT}30`,
                color: isEnabled ? NAVY : `${NAVY}66`,
                fontFamily: BARLOW, fontWeight: 700, fontSize: 16,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                padding: '12px 22px', border: 'none',
                boxShadow: isEnabled ? '6px 6px 0px 0px rgba(0,0,0,0.9)' : 'none',
                cursor: isEnabled ? 'pointer' : 'not-allowed',
                opacity: isSubmitting ? 0.7 : 1, transition: 'all 150ms',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 17, lineHeight: 1 }}>
                arrow_forward
              </span>
              {isSubmitting ? 'Saving…' : 'DONE. LET ME IN.'}
            </button>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes v8-spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  )
}
