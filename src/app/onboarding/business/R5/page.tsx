'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { SK, clearNewOnboardingKeys } from '@/lib/onboarding/session-keys'
import { updatePersonas } from '@/lib/onboarding/update-personas'
import { completeBusinessOnboarding } from '@/app/actions/persona-complete'
import { createClient } from '@/lib/supabase/client'
import { ArtifactStyles, ScaledStage, BrandCard } from '@/components/onboarding/artifacts'
import { profileUrl } from '@/lib/profile-url'

const ACCENT = '#F5A800'
const CORAL  = '#E8705A'
const NAVY   = '#1A2744'
const MONO   = "var(--font-jetbrains-mono), 'JetBrains Mono', monospace"
const BARLOW = "var(--font-barlow), 'Barlow Condensed', sans-serif"
const ABRIL  = "var(--font-abril), 'Abril Fatface', serif"
const DM     = "'DM Sans', sans-serif"
const OUTFIT = "'Outfit', sans-serif"

const KEYFRAMES = `
@keyframes r5-stamp-in {
  0%   { transform: scale(3) rotate(-15deg); opacity: 0; }
  100% { transform: scale(1) rotate(-15deg); opacity: 1; }
}
@keyframes r5-blink { 0%,100%{opacity:1} 50%{opacity:0} }
@keyframes r5-spin  { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes r5-thump {
  0%  { transform: scaleY(1); }
  30% { transform: scaleY(0.92); }
  70% { transform: scaleY(1.04); }
  100%{ transform: scaleY(1); }
}
@keyframes r5-reveal    { 0%{opacity:0} 100%{opacity:1} }
@keyframes r5-fade-up   { 0%{opacity:0;transform:translateY(20px)} 100%{opacity:1;transform:translateY(0)} }
@keyframes r5-pulse     { 0%,100%{opacity:1} 50%{opacity:0.4} }
@keyframes r5-stamp-ad  { 0%{transform:scale(4) rotate(-12deg);opacity:0} 60%{transform:scale(0.92) rotate(-12deg);opacity:1} 100%{transform:scale(1) rotate(-12deg);opacity:1} }
@keyframes r5-line-in   { 0%{width:0} 100%{width:100%} }
@keyframes r5-scan      { 0%{transform:translateY(-100%)} 100%{transform:translateY(100%)} }
`

const CAT_META: Record<string, string> = {
  retail: 'Retail', agency: 'Agency', startup: 'Startup', creative: 'Creative',
  fnb: 'F&B', fashion: 'Fashion', tech: 'Tech', media: 'Media',
  beauty: 'Beauty', education: 'Education', health: 'Health', other: 'Other',
}
const CAT_ICON: Record<string, string> = {
  retail: 'storefront', agency: 'work', startup: 'rocket_launch', creative: 'brush',
  fnb: 'restaurant', fashion: 'checkroom', tech: 'devices', media: 'movie',
  beauty: 'spa', education: 'school', health: 'local_hospital', other: 'bolt',
}

const AUDIENCE_CHIPS = [
  'GEN Z CREATORS', 'LOCAL ARTISTS', 'EVENT GOERS', 'VENUE OWNERS', 'CULTURE FANS',
]

const CONTACT_INPUTS = [
  { key: 'whatsapp',  type: 'tel',   icon: 'chat',           placeholder: 'WhatsApp Number' },
  { key: 'email',     type: 'email', icon: 'mail',           placeholder: 'Email (Required)' },
  { key: 'instagram', type: 'text',  icon: 'alternate_email', placeholder: 'Instagram Handle' },
] as const

function BrandStepDots() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>
      {Array.from({ length: 6 }, (_, i) => {
        const isLast = i === 5
        return (
          <div key={i} style={{
            width:      isLast ? 24 : 22,
            height:     8,
            borderRadius: 4,
            background: ACCENT,
            boxShadow:  isLast ? '0 0 10px 2px rgba(245,168,0,0.5)' : 'none',
            transition: 'all 200ms',
          }} />
        )
      })}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 6 }}>
        <span style={{ fontFamily: MONO, fontSize: 10, color: `${ACCENT}99`, letterSpacing: '0.10em' }}>
          06 / 06
        </span>
        <span style={{ fontFamily: MONO, fontSize: 10, color: CORAL, letterSpacing: '0.10em', textTransform: 'uppercase' as const }}>
          FINAL
        </span>
      </div>
    </div>
  )
}

export default function R5Page() {
  const router  = useRouter()
  const ctaRef  = useRef<HTMLButtonElement>(null)

  const [whatsapp,       setWhatsapp]       = useState('')
  const [email,          setEmail]          = useState('')
  const [instagram,      setInstagram]      = useState('')
  const [bio,            setBio]            = useState('')
  const [audience,       setAudience]       = useState<string[]>([])
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [isSubmitting,   setIsSubmitting]   = useState(false)
  const [submitError,    setSubmitError]    = useState<string | null>(null)
  const [focusedField,   setFocusedField]   = useState<string | null>(null)
  const [suggestError,   setSuggestError]   = useState(false)
  const [bName,          setBName]          = useState('')
  const [bCity,          setBCity]          = useState('')
  const [bSlug,          setBSlug]          = useState('')
  const [bLogoUrl,       setBLogoUrl]       = useState<string | null>(null)
  const [catLabel,       setCatLabel]       = useState('')
  const [rCategories,    setRCategories]    = useState('')
  const [isWide,         setIsWide]         = useState(true)

  // Reveal state (post-submit)
  const [revealState,     setRevealState]     = useState<'editing' | 'revealed'>('editing')
  const [isLeaving,       setIsLeaving]       = useState(false)
  const [pendingRedirect, setPendingRedirect] = useState<string | null>(null)

  const fieldValues: Record<string, string> = { whatsapp, email, instagram }
  const fieldSetters: Record<string, (v: string) => void> = {
    whatsapp:  setWhatsapp,
    email:     setEmail,
    instagram: (v: string) => setInstagram(v.replace(/^@+/, '')),
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
const name    = sessionStorage.getItem(SK.b_name) ?? ''
    const subpath = sessionStorage.getItem(SK.b_subpath)
    if (!name || subpath !== 'brand') { router.replace('/onboarding/business/B3'); return }
    const cats = sessionStorage.getItem(SK.r_categories) ?? ''
    if (!cats) { router.replace('/onboarding/business/R4'); return }
    setBName(name)
    setBCity(sessionStorage.getItem(SK.b_city) ?? '')
    setRCategories(cats)
    setBSlug(sessionStorage.getItem(SK.b_slug) ?? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''))
    setBLogoUrl(sessionStorage.getItem(SK.b_logo_url))
    setCatLabel(CAT_META[cats] ?? cats)
    setPendingRedirect(sessionStorage.getItem('wimc_post_onboarding_redirect'))
    let wa = '', mail = '', ig = '', bioText = ''

    // 1. Own saved contact
    try {
      const saved = sessionStorage.getItem(SK.r_contact)
      if (saved) {
        const c = JSON.parse(saved) as { whatsapp?: string; email?: string; instagram?: string; bio?: string }
        wa = c.whatsapp || ''; mail = c.email || ''; ig = c.instagram || ''; bioText = c.bio || ''
      }
    } catch {}

    // 2. Cross-fill from venue contact (v_contact)
    if (!wa || !mail || !ig) {
      try {
        const vSaved = sessionStorage.getItem(SK.v_contact)
        if (vSaved) {
          const c = JSON.parse(vSaved) as { whatsapp?: string; email?: string; instagram?: string }
          if (!wa   && c.whatsapp)  wa   = c.whatsapp
          if (!mail && c.email)     mail = c.email
          if (!ig   && c.instagram) ig   = c.instagram
        }
      } catch {}
    }

    // 3. Instagram from creator social handles
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

    // 4. Auth user phone/email for remaining gaps
    if (!wa || !mail) {
      createClient().auth.getUser().then(({ data: { user } }) => {
        if (!user) return
        if (!wa && user.phone) {
          const digits = user.phone.replace(/\D/g, '').slice(-10)
          if (digits.length === 10) setWhatsapp(digits)
        }
        if (!mail && user.email) setEmail(user.email)
      }).catch(() => {})
    }

    const mq = window.matchMedia('(min-width: 520px)')
    setIsWide(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsWide(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [router])

  useEffect(() => {
    try {
      sessionStorage.setItem(SK.r_contact, JSON.stringify({ whatsapp, email, instagram, bio }))
    } catch {}
  }, [whatsapp, email, instagram, bio])

  function getGoals(): string[] {
    try { return JSON.parse(sessionStorage.getItem(SK.r_goals) || '[]') as string[] } catch { return [] }
  }

  async function handleSuggestBio() {
    if (suggestLoading) return
    setSuggestLoading(true)
    setSuggestError(false)
    try {
      const res = await fetch('/api/suggest-bio', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          brandName:  bName,
          city:       bCity,
          category:   CAT_META[rCategories] ?? rCategories,
          goals:      getGoals(),
          audience,
          currentBio: bio,
        }),
      })
      const { suggestion } = await res.json() as { suggestion: string }
      if (suggestion) setBio(suggestion)
      else setSuggestError(true)
    } catch { setSuggestError(true) }
    finally { setSuggestLoading(false) }
  }

  function triggerThump() {
    const el = ctaRef.current
    if (!el) return
    el.style.animation = 'none'
    void el.offsetWidth
    el.style.animation = 'r5-thump 300ms ease-out'
  }

  async function handleDone() {
    if (!email.trim() || isSubmitting) return
    triggerThump()
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const slug    = sessionStorage.getItem(SK.b_slug) || bName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `brand-${Date.now()}`
      const logoUrl = sessionStorage.getItem(SK.b_logo_url) || undefined
      const result = await completeBusinessOnboarding({
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
        logoUrl,
      })
      // Store the final slug (may differ from desired if username was taken)
      try { sessionStorage.setItem(SK.b_slug, result.username) } catch {}
      setBSlug(result.username)
      setRevealState('revealed')
    } catch (err) {
      // Re-throw Next.js redirect errors so they propagate correctly
      if (err instanceof Error && err.message === 'NEXT_REDIRECT') throw err
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setIsSubmitting(false)
    }
  }

  async function handleContinueToStudio() {
    if (isLeaving) return
    setIsLeaving(true)
    if (sessionStorage.getItem('wimc_ob_mode') === 'add') {
      try { await updatePersonas('brand') } catch {}
    }
    const dest = pendingRedirect || '/business/brand/studio'
    try { sessionStorage.removeItem('wimc_post_onboarding_redirect') } catch {}
    clearNewOnboardingKeys()
    router.replace(dest)
  }

  const isEnabled  = email.trim().length > 0
  const catIcon    = CAT_ICON[rCategories]  ?? 'storefront'
  const statusText = isEnabled ? 'AWAITING_STAMP' : 'AWAITING_EMAIL'

  // ── Reveal phase (post-submit) ────────────────────────────────────────────────
  if (revealState === 'revealed') {
    return (
      <>
        {/* eslint-disable-next-line react/no-danger */}
        <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />

        {/* Scanning line effect */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
          <div style={{
            position: 'absolute', left: 0, right: 0, height: 2,
            background: `linear-gradient(to right, transparent, ${ACCENT}60, transparent)`,
            animation: 'r5-scan 2s linear infinite',
          }} />
        </div>

        <div style={{
          position: 'fixed', inset: 0, background: '#07070A',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '24px 24px 40px', overflowY: 'auto',
          animation: 'r5-reveal 0.6s ease both',
        }}>
          {/* WIMC wordmark — top left */}
          <div style={{ position: 'absolute', top: 24, left: 28, animation: 'r5-fade-up 0.5s ease 0.2s both' }}>
            <span style={{ fontFamily: OUTFIT, fontWeight: 900, fontSize: 14, color: `${ACCENT}80`, letterSpacing: '0.15em' }}>
              WHEN IN MY CITY
            </span>
          </div>

          {/* Status tag — top right */}
          <div style={{
            position: 'absolute', top: 24, right: 28,
            display: 'flex', alignItems: 'center', gap: 6,
            animation: 'r5-fade-up 0.5s ease 0.2s both',
          }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22C55E', animation: 'r5-pulse 2s ease-in-out infinite' }} />
            <span style={{ fontFamily: MONO, fontSize: 9, color: '#22C55E', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
              BRAND LIVE
            </span>
          </div>

          {/* Main content */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 480, width: '100%' }}>

            {/* Overline */}
            <p style={{
              fontFamily: MONO, fontSize: 9, color: `${CORAL}99`,
              letterSpacing: '0.35em', textTransform: 'uppercase',
              margin: '0 0 12px', animation: 'r5-fade-up 0.5s ease 0.3s both',
            }}>
              — YOUR BRAND IS LIVE —
            </p>

            {/* Brand name */}
            <h1 style={{
              fontFamily: ABRIL, fontSize: 'clamp(36px, 10vw, 64px)',
              color: '#F0EFF8', lineHeight: 1.0, margin: '0 0 8px',
              textAlign: 'center', animation: 'r5-fade-up 0.6s ease 0.4s both',
              textTransform: 'uppercase',
            }}>
              {bName}
            </h1>

            {/* City · Category */}
            {(bCity || catLabel) && (
              <p style={{
                fontFamily: BARLOW, fontWeight: 600, fontSize: 13,
                color: `${ACCENT}90`, letterSpacing: '0.25em',
                textTransform: 'uppercase', margin: '0 0 36px',
                animation: 'r5-fade-up 0.5s ease 0.5s both',
              }}>
                {[catLabel, bCity].filter(Boolean).join(' · ')}
              </p>
            )}

            {/* Brand business card artifact */}
            <div style={{ width: '100%', marginBottom: 40 }}>
              <ArtifactStyles />
              <ScaledStage width={360} height={210} maxWidth={340}>
                <BrandCard
                  name={bName}
                  tagline={bio || null}
                  profileUrl={`wheninmycity.com${profileUrl(bCity, bSlug)}`}
                  logoUrl={bLogoUrl}
                />
              </ScaledStage>
            </div>

            {/* Separator */}
            <div style={{ width: '100%', maxWidth: 360, marginBottom: 28, animation: 'r5-fade-up 0.4s ease 1.3s both' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, height: 1, background: `${ACCENT}20` }} />
                <span style={{ fontFamily: MONO, fontSize: 9, color: `${ACCENT}50`, letterSpacing: '0.25em' }}>WHAT&apos;S NEXT</span>
                <div style={{ flex: 1, height: 1, background: `${ACCENT}20` }} />
              </div>
            </div>

            {/* Single CTA */}
            <div style={{ width: '100%', maxWidth: 360, animation: 'r5-fade-up 0.5s ease 1.4s both' }}>
              <button
                type="button"
                onClick={handleContinueToStudio}
                disabled={isLeaving}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', background: ACCENT, color: NAVY,
                  fontFamily: MONO, fontWeight: 700, fontSize: 13,
                  letterSpacing: '0.10em', textTransform: 'uppercase',
                  padding: '16px 20px', border: `1px solid ${NAVY}`,
                  boxShadow: '6px 6px 0px 0px rgba(0,0,0,0.9)',
                  cursor: isLeaving ? 'default' : 'pointer',
                  opacity: isLeaving ? 0.6 : 1,
                  transition: 'transform 120ms, box-shadow 120ms',
                }}
                onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translate(3px,3px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '3px 3px 0px 0px rgba(0,0,0,0.9)' }}
                onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; (e.currentTarget as HTMLButtonElement).style.boxShadow = '6px 6px 0px 0px rgba(0,0,0,0.9)' }}
              >
                <span>Continue to your page</span>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>open_in_new</span>
              </button>
            </div>
          </div>

          {/* Bottom watermark */}
          <div style={{
            position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
            animation: 'r5-fade-up 0.4s ease 1.6s both', whiteSpace: 'nowrap',
          }}>
            <span style={{ fontFamily: MONO, fontSize: 9, color: `${ACCENT}25`, letterSpacing: '0.20em' }}>
              NODE_ID: R005-BRAND · GATEWAY: VERIFIED
            </span>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      {/* eslint-disable-next-line react/no-danger */}
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />

      <div style={{ minHeight: '100%', overflowY: 'auto', paddingTop: 20, paddingBottom: 96, paddingLeft: 24, paddingRight: 24 }}>

        <BrandStepDots />

        {/* ── Overline + headline ───────────────────────── */}
        <p style={{ fontFamily: MONO, fontSize: 9, color: `${ACCENT}99`, letterSpacing: '0.25em', textTransform: 'uppercase', margin: '0 0 10px' }}>
          — LAST STEP
        </p>
        <h1 style={{
          fontFamily: ABRIL,
          fontSize:   'clamp(28px, 7vw, 44px)',
          color:      '#F0EFF8',
          lineHeight: 1.05,
          margin:     '0 0 6px',
        }}>
          Last few details.
        </h1>
        <p style={{ fontFamily: DM, fontSize: 14, color: '#9896B0', margin: '0 0 28px' }}>
          How should creators reach you?
        </p>

        {/* ── Brand card ────────────────────────────────── */}
        <div style={{ position: 'relative', maxWidth: 340, marginBottom: 28, transform: 'rotate(-2deg)' }}>
          <div style={{
            background: '#FAF7F0',
            boxShadow:  '8px 8px 0px 0px rgba(0,0,0,1)',
            border:     '1px solid black',
            padding:    '16px 16px 16px 24px',
            position:   'relative',
            overflow:   'hidden',
          }}>
            {/* Left amber bar */}
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 8, background: ACCENT }} />

            {/* Verified stamp — animates in once */}
            <div style={{
              position:        'absolute',
              inset:           0,
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              pointerEvents:   'none',
              zIndex:          10,
              overflow:        'hidden',
            }}>
              <div style={{
                border:       `6px solid ${ACCENT}`,
                padding:      '8px 20px',
                display:      'flex',
                flexDirection: 'column',
                alignItems:   'center',
                background:   'rgba(250,247,240,0.85)',
                boxShadow:    '0 10px 25px rgba(0,0,0,0.20)',
                animation:    'r5-stamp-in 0.5s cubic-bezier(0.175,0.885,0.32,1.275) both',
                animationDelay: '0.2s',
              }}>
                <span style={{ fontFamily: OUTFIT, fontWeight: 900, fontSize: 40, color: ACCENT, lineHeight: 1 }}>VERIFIED</span>
                <span style={{ fontFamily: MONO, fontSize: 10, color: ACCENT, marginTop: 4, letterSpacing: '0.3em' }}>BRAND GATEWAY</span>
              </div>
            </div>

            {/* Card rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontFamily: MONO, fontSize: 11, color: NAVY }}>
              {[
                { label: 'BRAND',    value: bName.toUpperCase()          },
                { label: 'CITY',     value: bCity                    },
                { label: 'CATEGORY', value: catLabel                 },
                { label: 'CONTACT',  value: email || null            },
              ].map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed rgba(26,39,68,0.20)', paddingBottom: 8 }}>
                  <span style={{ opacity: 0.50 }}>{row.label}</span>
                  {row.value
                    ? <span style={{ fontWeight: 700, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.value}</span>
                    : <span style={{ display: 'inline-block', width: 8, height: 14, background: ACCENT, animation: 'r5-blink 1s step-end infinite' }} />
                  }
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Three contact inputs ──────────────────────── */}
        <section style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 0 }}>
          {CONTACT_INPUTS.map((field, idx) => {
            const val     = fieldValues[field.key]
            const isFocus = focusedField === field.key
            const borderColor = isFocus ? CORAL : ACCENT
            return (
              <div
                key={field.key}
                style={{
                  position:     'relative',
                  display:      'flex',
                  alignItems:   'center',
                  gap:          12,
                  background:   '#FAF7F0',
                  borderTop:    idx === 0 ? `1px solid ${NAVY}` : 'none',
                  borderLeft:   `4px solid ${borderColor}`,
                  borderRight:  `1px solid ${NAVY}`,
                  borderBottom: `1px solid ${NAVY}`,
                  padding:      12,
                  boxShadow:    isFocus ? '4px 4px 0px 0px rgba(0,0,0,0.45)' : '4px 4px 0px 0px rgba(0,0,0,0.25)',
                  transform:    isFocus ? 'scale(1.02)' : 'scale(1)',
                  transformOrigin: 'left center',
                  transition:   'all 150ms',
                  marginBottom: idx < 2 ? 8 : 0,
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 20, color: NAVY, flexShrink: 0 }}
                >
                  {field.icon}
                </span>
                <input
                  type={field.type}
                  value={val}
                  onChange={e => fieldSetters[field.key](e.target.value)}
                  onFocus={() => setFocusedField(field.key)}
                  onBlur={() => setFocusedField(null)}
                  placeholder={field.placeholder}
                  style={{
                    flex:       1,
                    background: 'transparent',
                    border:     'none',
                    outline:    'none',
                    fontFamily: MONO,
                    fontSize:   14,
                    color:      NAVY,
                    caretColor: ACCENT,
                  }}
                />
              </div>
            )
          })}
        </section>

        {/* ── Bio textarea ──────────────────────────────── */}
        <section style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
            <span style={{ fontFamily: BARLOW, fontWeight: 600, fontSize: 10, color: ACCENT, letterSpacing: '0.3em', textTransform: 'uppercase' as const }}>
              Brand Bio
            </span>
            <span style={{ fontFamily: MONO, fontSize: 10, color: '#9896B0' }}>{bio.length}/500</span>
          </div>
          <div style={{
            background: '#FAF7F0',
            borderLeft:   `4px solid ${ACCENT}`,
            borderTop:    `1px solid ${NAVY}`,
            borderRight:  `1px solid ${NAVY}`,
            borderBottom: `1px solid ${NAVY}`,
            boxShadow:    '4px 4px 0px 0px rgba(0,0,0,0.25)',
            position:     'relative',
          }}>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Describe your brand vibe..."
              maxLength={500}
              rows={4}
              style={{
                display:    'block',
                width:      '100%',
                background: 'transparent',
                border:     'none',
                outline:    'none',
                padding:    '14px 14px 44px',
                fontFamily: DM,
                fontSize:   14,
                color:      NAVY,
                caretColor: ACCENT,
                resize:     'none',
                boxSizing:  'border-box',
                lineHeight: 1.6,
              }}
            />
            {/* SUGGEST DESCRIPTION button */}
            <button
              type="button"
              onClick={handleSuggestBio}
              disabled={suggestLoading}
              style={{
                position:      'absolute',
                bottom:        10,
                right:         10,
                display:       'flex',
                alignItems:    'center',
                gap:           4,
                background:    NAVY,
                color:         suggestLoading ? 'rgba(255,255,255,0.40)' : '#ffffff',
                fontFamily:    MONO,
                fontSize:      10,
                letterSpacing: '0.12em',
                textTransform: 'uppercase' as const,
                padding:       '6px 12px',
                border:        `1px solid ${NAVY}`,
                boxShadow:     '2px 2px 0px 0px rgba(0,0,0,1)',
                cursor:        suggestLoading ? 'wait' : 'pointer',
                transition:    'background 150ms, color 150ms',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 12 }}>auto_awesome</span>
              {suggestLoading ? 'Writing…' : 'Suggest Description'}
            </button>
          </div>
          {suggestError && (
            <p style={{ fontFamily: DM, fontSize: 12, color: '#F87171', margin: '6px 0 0' }}>
              AI unavailable — try again
            </p>
          )}
        </section>

        {/* ── Target audience chips ─────────────────────── */}
        <section style={{ marginBottom: 24 }}>
          <p style={{ fontFamily: BARLOW, fontWeight: 600, fontSize: 10, color: ACCENT, letterSpacing: '0.3em', textTransform: 'uppercase', margin: '0 0 12px' }}>
            Target Audience
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {AUDIENCE_CHIPS.map(label => {
              const isSel = audience.includes(label)
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setAudience(prev => prev.includes(label) ? prev.filter(a => a !== label) : [...prev, label])}
                  style={{
                    padding:      '6px 16px',
                    borderRadius: 9999,
                    border:       `1px solid ${isSel ? ACCENT : '#57423e'}`,
                    background:   isSel ? ACCENT : 'transparent',
                    color:        isSel ? NAVY : 'rgba(255,255,255,0.60)',
                    fontFamily:   MONO,
                    fontSize:     10,
                    fontWeight:   isSel ? 700 : 400,
                    letterSpacing: '0.10em',
                    textTransform: 'uppercase' as const,
                    cursor:       'pointer',
                    transition:   'all 150ms',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </section>

        {/* ── Identity check strip ─────────────────────── */}
        <div style={{
          border:     `2px dashed ${ACCENT}`,
          background: `${ACCENT}08`,
          padding:    '16px 20px',
          marginBottom: 16,
          display:    'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap:        12,
        }}>
          <div style={{ position: 'relative', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <div style={{
              position:     'absolute',
              inset:        0,
              borderRadius: '50%',
              border:       `1px dashed ${ACCENT}`,
              animation:    'r5-spin 4s linear infinite',
            }} />
            <span className="material-symbols-outlined" style={{ fontSize: 14, color: ACCENT }}>verified</span>
          </div>
          <span style={{ fontFamily: MONO, fontSize: 11, color: ACCENT, letterSpacing: '0.25em', textTransform: 'uppercase' as const }}>
            Identity Check Active
          </span>
        </div>

        {/* ── Brand card preview (desktop desktop — wider display) ── */}
        {isWide && (
          <div style={{ marginBottom: 16, border: `1px solid rgba(255,255,255,0.06)`, padding: 14, background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.12em', textTransform: 'uppercase' as const }}>
                Brand Preview
              </span>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: `${ACCENT}60` }}>{catIcon}</span>
            </div>
            <div style={{ fontFamily: DM, fontSize: 13, color: bio ? 'rgba(255,255,255,0.60)' : 'rgba(255,255,255,0.20)', fontStyle: 'italic', lineHeight: 1.5, marginBottom: 10 }}>
              {bio ? bio.slice(0, 120) + (bio.length > 120 ? '…' : '') : 'Describe your brand vibe…'}
            </div>
            {(email || instagram) && (
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {instagram && (
                  <span style={{ fontFamily: MONO, fontSize: 11, color: `${ACCENT}70`, letterSpacing: '0.06em' }}>
                    @{instagram}
                  </span>
                )}
                {email && (
                  <span style={{ fontFamily: MONO, fontSize: 11, color: `${ACCENT}70`, letterSpacing: '0.06em' }}>
                    {email}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── Fixed footer ──────────────────────────────── */}
      <footer style={{
        position:   'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, height: 72,
        display:    'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px',
        background: `linear-gradient(to top, ${NAVY} 60%, transparent 100%)`,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontFamily: MONO, fontSize: 10, color: `${ACCENT}99`, letterSpacing: '0.15em', textTransform: 'uppercase' as const }}>
            NODE_ID: R005-BRAND
          </span>
          <span style={{ fontFamily: MONO, fontSize: 10, color: isEnabled ? ACCENT : 'rgba(255,255,255,0.20)', letterSpacing: '0.15em', textTransform: 'uppercase' as const }}>
            STATUS: {statusText}
          </span>
          <button
            type="button"
            onClick={() => router.push('/onboarding/business/R4')}
            style={{ background: 'none', border: 'none', fontFamily: DM, fontSize: 13, color: 'rgba(255,255,255,0.25)', cursor: 'pointer', padding: 0, textAlign: 'left' }}
          >
            ← Back
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          {submitError && (
            <span style={{ fontFamily: DM, fontSize: 11, color: '#F87171', maxWidth: 200, textAlign: 'right' as const }}>
              {submitError}
            </span>
          )}
        <button
          ref={ctaRef}
          type="button"
          onClick={handleDone}
          disabled={!isEnabled || isSubmitting}
          style={{
            background:    isEnabled ? ACCENT : 'rgba(255,255,255,0.08)',
            color:         isEnabled ? NAVY   : 'rgba(255,255,255,0.22)',
            fontFamily:    MONO,
            fontSize:      13,
            fontWeight:    700,
            letterSpacing: '0.10em',
            textTransform: 'uppercase' as const,
            padding:       '14px 24px',
            border:        `1px solid ${isEnabled ? NAVY : 'transparent'}`,
            boxShadow:     isEnabled ? '8px 8px 0px 0px rgba(0,0,0,0.9)' : 'none',
            cursor:        isEnabled ? 'pointer' : 'not-allowed',
            opacity:       isSubmitting ? 0.7 : 1,
            transition:    'background 200ms, box-shadow 150ms',
            display:       'flex',
            alignItems:    'center',
            gap:           8,
          }}
        >
          {isSubmitting ? 'Saving…' : 'DONE. LET ME IN.'}
          {!isSubmitting && (
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
          )}
        </button>
        </div>
      </footer>
    </>
  )
}
