'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SK, clearNewOnboardingKeys } from '@/lib/onboarding/session-keys'
import { completeAddaOnboarding, type CompleteAddaInput } from '@/app/actions/adda-onboarding'
import RubberStamp from '@/components/ui/RubberStamp'

const ACCENT = '#5DD9D0'

const PRICING_MAP: Record<string, CompleteAddaInput['pricing_model']> = {
  hourly:       'fixed_rental',
  split:        'door_split',
  hybrid:       'hybrid',
  fnb:          'f_and_b_minimum',
  fixed_rental: 'fixed_rental',
  door_split:   'door_split',
  f_and_b_minimum: 'f_and_b_minimum',
}

export default function V8Page() {
  const router = useRouter()

  const [whatsapp,       setWhatsapp]       = useState('')
  const [email,          setEmail]          = useState('')
  const [instagram,      setInstagram]      = useState('')
  const [bio,            setBio]            = useState('')
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [isSubmitting,   setIsSubmitting]   = useState(false)
  const [bName,          setBName]          = useState('')
  const [bCity,          setBCity]          = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const name    = sessionStorage.getItem(SK.b_name) ?? ''
    const subpath = sessionStorage.getItem(SK.b_subpath)
    if (!name || subpath !== 'venue') { router.replace('/onboarding/business/B3'); return }
    setBName(name)
    setBCity(sessionStorage.getItem(SK.b_city) ?? '')
    try {
      const saved = sessionStorage.getItem(SK.v_contact)
      if (saved) {
        const parsed = JSON.parse(saved) as { whatsapp?: string; email?: string; instagram?: string; bio?: string }
        if (parsed.whatsapp)  setWhatsapp(parsed.whatsapp)
        if (parsed.email)     setEmail(parsed.email)
        if (parsed.instagram) setInstagram(parsed.instagram)
        if (parsed.bio)       setBio(parsed.bio)
      }
    } catch {}
  }, [router])

  async function handleSuggestBio() {
    if (suggestLoading) return
    setSuggestLoading(true)
    try {
      const response = await fetch('/api/suggest-bio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venueName: bName,
          city:      bCity,
          types:     JSON.parse(sessionStorage.getItem(SK.v_types) || '[]'),
          events:    JSON.parse(sessionStorage.getItem(SK.v_events) || '[]'),
          currentBio: bio,
        }),
      })
      const { suggestion } = await response.json() as { suggestion: string }
      setBio(suggestion.slice(0, 500))
    } catch {}
    finally { setSuggestLoading(false) }
  }

  async function handleDone() {
    if (!email.trim() || isSubmitting) return
    setIsSubmitting(true)
    try {
      sessionStorage.setItem(SK.v_contact, JSON.stringify({ whatsapp, email, instagram, bio }))
    } catch {}
    try {
      const name        = sessionStorage.getItem(SK.b_name) || ''
      const city        = sessionStorage.getItem(SK.b_city) || ''
      const address     = sessionStorage.getItem(SK.v_address) || ''
      const rawTypes    = sessionStorage.getItem(SK.v_types) || '[]'
      const adda_type   = JSON.parse(rawTypes) as CompleteAddaInput['adda_type']
      const capRaw      = sessionStorage.getItem(SK.v_capacity)
      const cap         = capRaw ? (JSON.parse(capRaw) as { min?: number; max?: number }) : {}
      const amenitiesRaw = sessionStorage.getItem(SK.v_amenities)
      const amenities   = (amenitiesRaw ? JSON.parse(amenitiesRaw) : []) as CompleteAddaInput['amenities']
      const rawPricing  = sessionStorage.getItem(SK.v_pricing) || ''
      const pricing_model = PRICING_MAP[rawPricing] ?? 'fixed_rental'

      const result = await completeAddaOnboarding({
        name,
        description:             bio || undefined,
        city,
        address,
        adda_type,
        capacity_min:            cap.min,
        capacity_max:            cap.max,
        capacity_configurations: [],
        amenities,
        pricing_model,
        pricing_config:          {},
        contact_whatsapp:        whatsapp || '',
        contact_email:           email    || '',
        instagram_handle:        instagram || '',
      })

      if (result.error) { setIsSubmitting(false); return }

      clearNewOnboardingKeys()
      const pending = sessionStorage.getItem('wimc_post_onboarding_redirect')
      if (pending) { sessionStorage.removeItem('wimc_post_onboarding_redirect'); router.push(pending) }
      else router.push('/dashboard')
    } catch { setIsSubmitting(false) }
  }

  const isEnabled = email.trim().length > 0

  return (
    <>
      <style>{`@keyframes v8-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>


      <div style={{ minHeight: '100%', background: '#07070A', overflowY: 'auto', paddingTop: 48, paddingBottom: 96, paddingLeft: 24, paddingRight: 24 }}>

        {/* Venue pass card */}
        <div style={{ position: 'relative', maxWidth: 360, marginBottom: 40 }}>
          <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 20 }}>
            <RubberStamp text={"SPACE\nVERIFIED"} color={ACCENT} size={52} rotate={12} opacity={0.85} animate />
          </div>
          <div style={{ background: '#111116', border: `1px solid ${ACCENT}30`, padding: 24 }}>
            <div style={{ display: 'inline-block', background: ACCENT, padding: '3px 12px', marginBottom: 16 }}>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 10, color: '#1A2744', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Adda verified</span>
            </div>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 28, color: '#ffffff', textTransform: 'uppercase', lineHeight: 1, marginBottom: 6 }}>
              {bName || 'Your Space'}
            </div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.40)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {bCity} · Venue
            </div>
            <div style={{ margin: '16px 0', height: 2, background: `repeating-linear-gradient(90deg, ${ACCENT}, ${ACCENT} 3px, transparent 3px, transparent 6px)` }} />
            <div style={{ display: 'flex', gap: 8 }}>
              {['0 events hosted', '0 creators'].map((s, i) => (
                <div key={i} style={{ background: '#07070A', padding: '4px 8px', flex: 1 }}>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: 'rgba(255,255,255,0.30)' }}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <h1 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 'clamp(28px,7vw,40px)', color: '#ffffff', lineHeight: 1.05, margin: '0 0 8px', maxWidth: 480 }}>
          Almost there — how can creators reach you?
        </h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: 'rgba(255,255,255,0.45)', margin: '0 0 40px', maxWidth: 400 }}>
          Add your contact so creators can book your space
        </p>

        {/* Contact fields */}
        <div style={{ maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 40 }}>
          {[
            { label: 'Email *', value: email, onChange: setEmail, placeholder: 'your@email.com', required: true },
            { label: 'WhatsApp', value: whatsapp, onChange: setWhatsapp, placeholder: '+91 XXXXX XXXXX', required: false },
            { label: 'Instagram', value: instagram, onChange: setInstagram, placeholder: '@yourspace', required: false },
          ].map(field => (
            <div key={field.label}>
              <label style={{ display: 'block', fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.40)', marginBottom: 8 }}>
                {field.label}
              </label>
              <input
                type="text"
                value={field.value}
                onChange={e => field.onChange(e.target.value)}
                placeholder={field.placeholder}
                style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: `1px solid ${field.value ? ACCENT : 'rgba(255,255,255,0.15)'}`, fontFamily: "'DM Sans', sans-serif", fontWeight: 400, fontSize: 18, color: '#ffffff', outline: 'none', paddingBottom: 8, caretColor: ACCENT, transition: 'border-color 200ms' }}
              />
            </div>
          ))}
        </div>

        {/* Bio */}
        <div style={{ maxWidth: 480 }}>
          <label style={{ display: 'block', fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.40)', marginBottom: 8 }}>
            About your space <span style={{ color: 'rgba(255,255,255,0.20)' }}>(optional)</span>
          </label>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="Tell creators what makes your space special..."
            maxLength={500}
            rows={4}
            style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: `1px solid ${bio ? ACCENT : 'rgba(255,255,255,0.15)'}`, fontFamily: "'DM Sans', sans-serif", fontSize: 16, color: '#ffffff', outline: 'none', resize: 'none', paddingBottom: 8, caretColor: ACCENT, lineHeight: 1.5, boxSizing: 'border-box', transition: 'border-color 200ms' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <button type="button" onClick={handleSuggestBio} disabled={suggestLoading}
              style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: `${ACCENT}80`, cursor: 'pointer', padding: 0 }}
            >
              ✦ {suggestLoading ? 'Generating...' : 'Try a suggestion'}
            </button>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.20)' }}>{bio.length}/500</span>
          </div>
        </div>
      </div>

      <footer style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 72, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', background: 'linear-gradient(to top, #07070A 60%, transparent 100%)' }}>
        <button type="button" onClick={() => router.push('/onboarding/business/V7')} style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: 'rgba(255,255,255,0.30)', cursor: 'pointer', padding: 0 }}>← Back</button>
        <button type="button" onClick={handleDone} disabled={!isEnabled || isSubmitting}
          style={{ background: isEnabled ? ACCENT : 'rgba(255,255,255,0.10)', color: isEnabled ? '#07070A' : 'rgba(255,255,255,0.20)', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 15, padding: '12px 32px', border: 'none', cursor: isEnabled ? 'pointer' : 'not-allowed', opacity: isSubmitting ? 0.7 : 1, transition: 'background 200ms' }}
        >
          {isSubmitting ? 'Saving...' : 'Claim my space →'}
        </button>
      </footer>
    </>
  )
}
