'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SK } from '@/lib/onboarding/session-keys'
import { completeBusinessOnboarding } from '@/app/actions/persona-complete'
import RubberStamp from '@/components/ui/RubberStamp'

const ACCENT = '#F5A800'

const TARGET_AUDIENCE = [
  'Gen Z creators', 'Local artists', 'Event goers', 'Venue owners', 'Culture fans',
]

const CAT_META: Record<string, string> = {
  retail: 'Retail', agency: 'Agency', startup: 'Startup', creative: 'Creative',
  fnb: 'F&B', fashion: 'Fashion', tech: 'Tech', media: 'Media',
  beauty: 'Beauty', education: 'Education', health: 'Health', other: 'Other',
}

export default function R5Page() {
  const router = useRouter()

  const [whatsapp,       setWhatsapp]       = useState('')
  const [email,          setEmail]          = useState('')
  const [instagram,      setInstagram]      = useState('')
  const [bio,            setBio]            = useState('')
  const [audience,       setAudience]       = useState<string[]>([])
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [isSubmitting,   setIsSubmitting]   = useState(false)
  const [bName,          setBName]          = useState('')
  const [bCity,          setBCity]          = useState('')
  const [rCategories,    setRCategories]    = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const subpath = sessionStorage.getItem(SK.b_subpath)
    const name    = sessionStorage.getItem(SK.b_name) ?? ''
    if (!name || subpath !== 'brand') { router.replace('/onboarding/business/B3'); return }
    const cats = sessionStorage.getItem(SK.r_categories) ?? ''
    if (!cats) { router.replace('/onboarding/business/R4'); return }
    setBName(name)
    setBCity(sessionStorage.getItem(SK.b_city) ?? '')
    setRCategories(cats)
    const saved = sessionStorage.getItem(SK.r_contact)
    if (saved) {
      try {
        const c = JSON.parse(saved) as { whatsapp?: string; email?: string; instagram?: string }
        if (c.whatsapp)  setWhatsapp(c.whatsapp)
        if (c.email)     setEmail(c.email)
        if (c.instagram) setInstagram(c.instagram)
      } catch {}
    }
  }, [router])

  useEffect(() => {
    try {
      sessionStorage.setItem(SK.r_contact, JSON.stringify({ whatsapp, email, instagram }))
    } catch {}
  }, [whatsapp, email, instagram])

  function getGoals(): string[] {
    try { return JSON.parse(sessionStorage.getItem(SK.r_goals) || '[]') as string[] } catch { return [] }
  }

  async function handleSuggestBio() {
    if (suggestLoading) return
    setSuggestLoading(true)
    try {
      const res = await fetch('/api/suggest-bio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandName: bName, city: bCity, category: CAT_META[rCategories] ?? rCategories, goals: getGoals(), audience, currentBio: bio }),
      })
      const { suggestion } = await res.json() as { suggestion: string }
      if (suggestion) setBio(suggestion)
    } catch {}
    finally { setSuggestLoading(false) }
  }

  async function handleDone() {
    if (!email.trim() || isSubmitting) return
    setIsSubmitting(true)
    try {
      const slug = (sessionStorage.getItem(SK.b_slug) || bName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `brand-${Date.now()}`)
      await completeBusinessOnboarding({
        displayName:      bName,
        username:         slug,
        city:             bCity,
        businessSlug:     slug,
        brandCategories:  rCategories ? [rCategories] : [],
        wimcGoals:        getGoals(),
        targetAudience:   audience,
        whatsapp:         whatsapp  || undefined,
        email:            email     || undefined,
        instagram:        instagram || undefined,
        brandDescription: bio,
      })
      ;[SK.b_name, SK.b_city, SK.b_slug, SK.b_subpath, SK.r_categories, SK.r_goals, SK.r_contact, SK.persona]
        .forEach(k => { try { sessionStorage.removeItem(k) } catch {} })
      const pending = sessionStorage.getItem('wimc_post_onboarding_redirect')
      if (pending) { sessionStorage.removeItem('wimc_post_onboarding_redirect'); router.push(pending) }
      else router.push('/dashboard')
    } catch { setIsSubmitting(false) }
  }

  const isEnabled = email.trim().length > 0

  return (
    <>

      <div style={{ minHeight: '100%', background: '#07070A', overflowY: 'auto', paddingTop: 48, paddingBottom: 96, paddingLeft: 24, paddingRight: 24 }}>

        {/* Brand pass card */}
        <div style={{ position: 'relative', maxWidth: 360, marginBottom: 40 }}>
          <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 20 }}>
            <RubberStamp text={"BRAND\nPARTNER\nWIMC"} color={ACCENT} size={52} rotate={12} opacity={0.85} animate />
          </div>
          <div style={{ background: '#111116', border: `1px solid ${ACCENT}30`, padding: 24 }}>
            <div style={{ display: 'inline-block', background: ACCENT, padding: '3px 12px', marginBottom: 16 }}>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 10, color: '#1A2744', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Brand partner</span>
            </div>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 28, color: '#ffffff', textTransform: 'uppercase', lineHeight: 1, marginBottom: 6 }}>
              {bName || 'Your Brand'}
            </div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.40)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {bCity} · {CAT_META[rCategories] ?? 'Brand'}
            </div>
          </div>
        </div>

        <h1 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 'clamp(28px,7vw,40px)', color: '#ffffff', lineHeight: 1.05, margin: '0 0 40px', maxWidth: 480 }}>
          Last step — how can creators reach you?
        </h1>

        {/* Contact inputs */}
        <div style={{ maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 40 }}>
          {[
            { label: 'Email *', value: email, onChange: setEmail, placeholder: 'your@brand.com' },
            { label: 'WhatsApp', value: whatsapp, onChange: setWhatsapp, placeholder: '+91 XXXXX XXXXX' },
            { label: 'Instagram', value: instagram, onChange: setInstagram, placeholder: '@yourbrand' },
          ].map(f => (
            <div key={f.label}>
              <label style={{ display: 'block', fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.40)', marginBottom: 8 }}>{f.label}</label>
              <input type="text" value={f.value} onChange={e => f.onChange(e.target.value)} placeholder={f.placeholder}
                style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: `1px solid ${f.value ? ACCENT : 'rgba(255,255,255,0.15)'}`, fontFamily: "'DM Sans', sans-serif", fontWeight: 400, fontSize: 18, color: '#ffffff', outline: 'none', paddingBottom: 8, caretColor: ACCENT, transition: 'border-color 200ms' }}
              />
            </div>
          ))}
        </div>

        {/* Target audience */}
        <section style={{ maxWidth: 480, marginBottom: 40 }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, color: 'rgba(255,255,255,0.40)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 16px' }}>
            Who do you want to reach? <span style={{ color: 'rgba(255,255,255,0.20)', textTransform: 'none' }}>(optional)</span>
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {TARGET_AUDIENCE.map(a => {
              const isSel = audience.includes(a)
              return (
                <button key={a} type="button" onClick={() => setAudience(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a])}
                  style={{ padding: '10px 18px', cursor: 'pointer', transition: 'all 150ms', border: isSel ? `1px solid ${ACCENT}` : '1px dashed rgba(255,255,255,0.15)', background: isSel ? `${ACCENT}20` : 'transparent', color: isSel ? '#ffffff' : 'rgba(255,255,255,0.45)', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14 }}
                >
                  {a}
                </button>
              )
            })}
          </div>
        </section>

        {/* Bio */}
        <div style={{ maxWidth: 480 }}>
          <label style={{ display: 'block', fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.40)', marginBottom: 8 }}>
            About your brand <span style={{ color: 'rgba(255,255,255,0.20)' }}>(optional)</span>
          </label>
          <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="What do you stand for?" maxLength={300} rows={3}
            style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: `1px solid ${bio ? ACCENT : 'rgba(255,255,255,0.15)'}`, fontFamily: "'DM Sans', sans-serif", fontSize: 16, color: '#ffffff', outline: 'none', resize: 'none', paddingBottom: 8, caretColor: ACCENT, lineHeight: 1.5, boxSizing: 'border-box', transition: 'border-color 200ms' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <button type="button" onClick={handleSuggestBio} disabled={suggestLoading}
              style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: `${ACCENT}80`, cursor: 'pointer', padding: 0 }}
            >
              ✦ {suggestLoading ? 'Generating...' : 'Try a suggestion'}
            </button>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.20)' }}>{bio.length}/300</span>
          </div>
        </div>
      </div>

      <footer style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 72, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', background: 'linear-gradient(to top, #07070A 60%, transparent 100%)' }}>
        <button type="button" onClick={() => router.push('/onboarding/business/R4')} style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: 'rgba(255,255,255,0.30)', cursor: 'pointer', padding: 0 }}>← Back</button>
        <button type="button" onClick={handleDone} disabled={!isEnabled || isSubmitting}
          style={{ background: isEnabled ? ACCENT : 'rgba(255,255,255,0.10)', color: isEnabled ? '#07070A' : 'rgba(255,255,255,0.20)', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 15, padding: '12px 32px', border: 'none', cursor: isEnabled ? 'pointer' : 'not-allowed', opacity: isSubmitting ? 0.7 : 1, transition: 'background 200ms' }}
        >
          {isSubmitting ? 'Saving...' : 'Claim my page →'}
        </button>
      </footer>
    </>
  )
}
