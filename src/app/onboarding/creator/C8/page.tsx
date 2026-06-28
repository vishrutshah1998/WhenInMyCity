'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { SK } from '@/lib/onboarding/session-keys'
import { completeOnboarding, uploadOnboardingAvatar, getAuthUserPhone } from '@/app/actions/onboarding'
import { INTEREST_TAGS } from '@/lib/constants/interests'
import { PLATFORM_REGISTRY } from '@/lib/platforms'
import { V2_CREATOR_TYPES } from '@/types/onboarding'
import { recommendScheme } from '@/lib/theme/hsv'
import ProfilePreview from '../_components/ProfilePreview'
import { getCategoryColour } from '@/lib/onboarding/design-tokens'

type CreatorTypeV2 = typeof V2_CREATOR_TYPES[number]

function isValidCreatorType(v: string): v is CreatorTypeV2 {
  return (V2_CREATOR_TYPES as readonly string[]).includes(v)
}

// ── Editorial presets (mirrors ThemeEditor's EDITORIAL_PRESETS) ───────────────

interface EditorialPreset {
  name: string
  tagline: string
  colorScheme: string
  fontFamily: string
  backgroundStyle: string
  patternStyle?: string
  patternColorCombo?: string
  auroraStyle?: string
  noiseBg?: boolean
  heavyBorders?: boolean
  glassEffects?: boolean
  dropShadow?: string
  previewBg: string
  previewSurface: string
  previewPrimary: string
  previewText: string
  light: boolean
}

const EDITORIAL_PRESETS: EditorialPreset[] = [
  {
    name: 'WIMC Classic', tagline: 'Boarding pass — the original WIMC',
    colorScheme: 'default', fontFamily: 'archivo-black', backgroundStyle: 'solid', noiseBg: true, heavyBorders: true,
    previewBg: '#FAF7F0', previewSurface: '#F0EBE0', previewPrimary: '#E8572A', previewText: '#1A2744', light: true,
  },
  {
    name: 'Golden Stage', tagline: 'Bask in the glow',
    colorScheme: 'neel', fontFamily: 'archivo-black', backgroundStyle: 'solid',
    previewBg: '#0B1420', previewSurface: '#16203A', previewPrimary: '#F5A800', previewText: '#F7F2E8', light: false,
  },
  {
    name: 'Indigo Night', tagline: 'Created after midnight',
    colorScheme: 'indigo', fontFamily: 'space-grotesk', backgroundStyle: 'aurora', auroraStyle: 'nebula', glassEffects: true,
    previewBg: '#1A1108', previewSurface: '#24183A', previewPrimary: '#818CF8', previewText: '#F7F2E8', light: false,
  },
  {
    name: 'Maximalist', tagline: 'Every inch speaks',
    colorScheme: 'turmeric', fontFamily: 'archivo-black', backgroundStyle: 'pattern', patternStyle: 'hex', patternColorCombo: 'warm', noiseBg: true, heavyBorders: true,
    previewBg: '#1A1108', previewSurface: '#2C1E0F', previewPrimary: '#F5A800', previewText: '#F7F2E8', light: false,
  },
  {
    name: 'Drop Shadow', tagline: 'Floating in the dark',
    colorScheme: 'midnight', fontFamily: 'space-grotesk', backgroundStyle: 'aurora', auroraStyle: 'nebula', dropShadow: 'thicc',
    previewBg: '#080812', previewSurface: '#14143A', previewPrimary: '#818CF8', previewText: '#E8E8FF', light: false,
  },
  {
    name: 'Neon Night', tagline: 'Electric glow',
    colorScheme: 'electric', fontFamily: 'space-grotesk', backgroundStyle: 'aurora', auroraStyle: 'rays', glassEffects: true, dropShadow: 'natural',
    previewBg: '#080C10', previewSurface: '#0E1C28', previewPrimary: '#00E5FF', previewText: '#E0FAFF', light: false,
  },
  {
    name: 'Botanica', tagline: 'Grown from the earth',
    colorScheme: 'forest', fontFamily: 'playfair', backgroundStyle: 'pattern', patternStyle: 'dots', patternColorCombo: 'cool',
    previewBg: '#0F231A', previewSurface: '#1B4332', previewPrimary: '#6EE7B7', previewText: '#D1FAE5', light: false,
  },
  {
    name: 'Old School', tagline: 'Classic press energy',
    colorScheme: 'steel', fontFamily: 'archivo-black', backgroundStyle: 'pattern', patternStyle: 'grid', patternColorCombo: 'mono', noiseBg: true, heavyBorders: true,
    previewBg: '#14130E', previewSurface: '#3D3D3D', previewPrimary: '#5B8DEF', previewText: '#E7E2D8', light: false,
  },
  {
    name: 'Fire', tagline: 'Pigment as statement',
    colorScheme: 'gulaal', fontFamily: 'archivo-black', backgroundStyle: 'solid', noiseBg: true, heavyBorders: true,
    previewBg: '#1A1108', previewSurface: '#2C1E0F', previewPrimary: '#E8342A', previewText: '#F7F2E8', light: false,
  },
  {
    name: 'Cinematic', tagline: 'Every frame is a story',
    colorScheme: 'default', fontFamily: 'archivo-black', backgroundStyle: 'solid', noiseBg: true, glassEffects: true,
    previewBg: '#121212', previewSurface: '#2C2C2C', previewPrimary: '#E8572A', previewText: '#F2F0EF', light: false,
  },
  {
    name: 'Minimalist', tagline: 'Less is more',
    colorScheme: 'gallery', fontFamily: 'inter', backgroundStyle: 'solid',
    previewBg: '#FAFAFA', previewSurface: '#F0F0F0', previewPrimary: '#1A1A1A', previewText: '#1A1A1A', light: true,
  },
  {
    name: 'Elegant', tagline: 'Timeless refinement',
    colorScheme: 'parchment', fontFamily: 'playfair', backgroundStyle: 'solid', glassEffects: true,
    previewBg: '#F7F3E9', previewSurface: '#EDE4CE', previewPrimary: '#4A3728', previewText: '#4A3728', light: true,
  },
  {
    name: 'Warmth', tagline: 'Made by hand',
    colorScheme: 'terracotta', fontFamily: 'playfair', backgroundStyle: 'solid',
    previewBg: '#FAF0E6', previewSurface: '#EAD8C0', previewPrimary: '#C4552A', previewText: '#2C1A0E', light: true,
  },
]

// Recommended scheme → editorial preset name
const SCHEME_TO_EDITORIAL: Record<string, string> = {
  default:  'WIMC Classic',
  midnight: 'Drop Shadow',
  forest:   'Botanica',
  neel:     'Golden Stage',
  turmeric: 'Maximalist',
  indigo:   'Indigo Night',
  steel:    'Old School',
  gulaal:   'Fire',
}

function getRecommendedPreset(category: string): EditorialPreset {
  const topScheme = recommendScheme(category)[0]?.scheme ?? 'default'
  const name = SCHEME_TO_EDITORIAL[topScheme]
  return EDITORIAL_PRESETS.find(ep => ep.name === name) ?? EDITORIAL_PRESETS[0]
}

function presetToThemeJson(ep: EditorialPreset): Record<string, unknown> {
  const t: Record<string, unknown> = {
    colorScheme: ep.colorScheme,
    fontFamily: ep.fontFamily,
    backgroundStyle: ep.backgroundStyle,
  }
  if (ep.patternStyle)     t.patternStyle     = ep.patternStyle
  if (ep.patternColorCombo) t.patternColorCombo = ep.patternColorCombo
  if (ep.auroraStyle)      t.auroraStyle      = ep.auroraStyle
  if (ep.noiseBg)          t.noiseBg          = ep.noiseBg
  if (ep.heavyBorders)     t.heavyBorders     = ep.heavyBorders
  if (ep.glassEffects)     t.glassEffects     = ep.glassEffects
  if (ep.dropShadow)       t.dropShadow       = ep.dropShadow
  return t
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function C8CombinedPage() {
  const router       = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [phase,     setPhase]     = useState<'stamping' | 'revealed' | 'error'>('stamping')
  const [retryError, setRetryError] = useState('')

  // Profile data (loaded from sessionStorage)
  const [displayName,       setDisplayName]       = useState('')
  const [username,          setUsername]          = useState('')
  const [city,              setCity]              = useState('')
  const [category,          setCategory]          = useState('')
  const [subTypes,          setSubTypes]          = useState<string[]>([])
  const [offlineActivities, setOfflineActivities] = useState<string[]>([])
  const [interestTags,      setInterestTags]      = useState<string[]>([])
  const [platforms,         setPlatforms]         = useState<string[]>([])
  const [isAddMode,         setIsAddMode]         = useState(false)

  // Polish fields
  const [bio,              setBio]             = useState('')
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null)
  const [avatarUploading,  setAvatarUploading] = useState(false)
  const [avatarError,      setAvatarError]     = useState<string | null>(null)
  const [socialLinks,      setSocialLinks]     = useState<Record<string, string>>({})
  const [selectedPreset,   setSelectedPreset]  = useState<EditorialPreset>(EDITORIAL_PRESETS[0])
  const [recommendedName,  setRecommendedName] = useState('')

  const [isSaving,  setIsSaving]  = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const accent = getCategoryColour(category)

  function writeThemePreview(ep: EditorialPreset) {
    try {
      sessionStorage.setItem(SK.c_theme_preview, JSON.stringify({
        bg: ep.previewBg, primary: ep.previewPrimary,
        surface: ep.previewSurface, text: ep.previewText, light: ep.light,
      }))
      window.dispatchEvent(new Event('ob-snap-update'))
    } catch {}
  }

  useEffect(() => {
    async function doReveal() {
      const dn         = sessionStorage.getItem(SK.c_name)     || ''
      const storedUser = sessionStorage.getItem(SK.c_username) || ''
      const rawCat     = sessionStorage.getItem(SK.c_category) || ''
      const cityVal    = sessionStorage.getItem(SK.c_city)     || ''

      let subTypesArr: string[] = []
      try { subTypesArr = JSON.parse(sessionStorage.getItem(SK.c_subtypes) || '[]') } catch {}

      let offlineActsArr: string[] = []
      try { offlineActsArr = JSON.parse(sessionStorage.getItem(SK.c_offline_acts) || '[]') } catch {}

      let tagsArr: string[] = []
      try {
        const raw: unknown[] = JSON.parse(sessionStorage.getItem(SK.c_interests) || '[]')
        tagsArr = raw.map(i =>
          typeof i === 'string' ? i : (typeof i === 'object' && i !== null && 'tag' in i ? String((i as {tag:unknown}).tag) : '')
        ).filter(Boolean)
      } catch {}

      let platsArr: string[] = []
      try { platsArr = JSON.parse(sessionStorage.getItem(SK.c_platforms) || '[]') } catch {}

      let savedHandles: Record<string, string> = {}
      try { savedHandles = JSON.parse(sessionStorage.getItem(SK.c_social_handles) || '{}') } catch {}

      if (!dn) { router.replace('/onboarding/creator/C2'); return }

      // Auto-populate WhatsApp from the authenticated phone number if not already set
      if (platsArr.includes('whatsapp') && !savedHandles['whatsapp']) {
        try {
          const { phone } = await getAuthUserPhone()
          if (phone) {
            savedHandles = { ...savedHandles, whatsapp: phone }
          }
        } catch {}
      }

      setDisplayName(dn)
      setUsername(storedUser)
      setCity(cityVal)
      setCategory(rawCat)
      setSubTypes(subTypesArr)
      setOfflineActivities(offlineActsArr)
      setInterestTags(tagsArr)
      setPlatforms(platsArr)
      if (Object.keys(savedHandles).length > 0) setSocialLinks(savedHandles)
      setIsAddMode(sessionStorage.getItem('wimc_ob_mode') === 'add')

      const savedBio = sessionStorage.getItem(SK.c_bio)
      if (savedBio) setBio(savedBio)

      // Auto-select recommended preset for this category
      const rec = getRecommendedPreset(rawCat)
      setSelectedPreset(rec)
      setRecommendedName(rec.name)
      writeThemePreview(rec)

      // Pad interest tags to minimum 3
      const paddedTags = tagsArr.length >= 3
        ? tagsArr
        : [...tagsArr, ...INTEREST_TAGS.filter(t => !tagsArr.includes(t.id)).slice(0, 3 - tagsArr.length).map(t => t.id)]

      const creatorType: CreatorTypeV2 = isValidCreatorType(rawCat) ? rawCat : 'exploring'

      try {
        // Create the profile now with no blocks — the sections screen (C8b) will
        // call completeOnboarding() again with the user's chosen blocks
        const result = await completeOnboarding({
          displayName: dn, username: storedUser, creatorType,
          city: cityVal, subTypes: subTypesArr, offlineActivities: offlineActsArr,
          interestTags: paddedTags, socialLinks: [],
          bio: undefined, colorScheme: undefined,
        }, [])
        if (result.error) { setRetryError(result.error); setPhase('error'); return }
        if (result.username) {
          setUsername(result.username)
          try { sessionStorage.setItem(SK.c_final_username, result.username) } catch {}
        }
      } catch {
        setRetryError('Something went wrong. Please try again.')
        setPhase('error')
        return
      }

      setPhase('revealed')
    }

    doReveal()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  function handlePresetClick(ep: EditorialPreset) {
    setSelectedPreset(ep)
    writeThemePreview(ep)
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarPreviewUrl(URL.createObjectURL(file))
    setAvatarUploading(true)
    setAvatarError(null)
    const fd = new FormData()
    fd.append('file', file)
    const result = await uploadOnboardingAvatar(fd)
    setAvatarUploading(false)
    if (result.error) setAvatarError(result.error)
  }

  function handleDone() {
    if (isSaving) return
    setIsSaving(true)
    setSaveError(null)

    // Persist all polish data to session — C8b sections screen will call
    // completeOnboarding() with the user's chosen blocks and this data
    const trimmedBio = bio.trim()
    try {
      if (trimmedBio) sessionStorage.setItem(SK.c_bio, trimmedBio)
      sessionStorage.setItem(SK.c_social_handles, JSON.stringify(socialLinks))
      sessionStorage.setItem(SK.c_colorscheme, selectedPreset.colorScheme)
      sessionStorage.setItem(SK.c_theme_json, JSON.stringify(presetToThemeJson(selectedPreset)))
    } catch {}

    router.push('/onboarding/creator/C8b')
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (phase === 'stamping') {
    return (
      <>
        <style>{`@keyframes c8-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
        <div style={{
          position: 'fixed', inset: 0, background: '#1A2744',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 16,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            border: `2px solid ${accent}`, borderTopColor: 'transparent',
            animation: 'c8-spin 1s linear infinite',
          }} />
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'rgba(255,255,255,0.40)' }}>
            Building your page...
          </span>
        </div>
      </>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: '#1A2744',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center',
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 40, color: accent }}>error</span>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'rgba(255,255,255,0.45)', maxWidth: 320, margin: 0 }}>
          {retryError || 'Could not create your profile. Please try again.'}
        </p>
        <button onClick={() => router.replace('/onboarding/creator/C2')}
          style={{ background: accent, color: '#ffffff', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14, padding: '12px 24px', border: 'none', cursor: 'pointer' }}>
          Start over
        </button>
      </div>
    )
  }

  // ── Revealed ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`@keyframes c8-blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>

      <div style={{
        minHeight: '100%', background: '#1A2744',
        overflowY: 'auto', paddingBottom: 96,
      }}>

        {/* Header */}
        <div style={{ padding: '32px 24px 0' }}>
          <h1 style={{
            fontFamily: "var(--font-abril), 'Abril Fatface', serif",
            fontSize: 'clamp(26px, 6vw, 38px)',
            color: '#F0EFF8', lineHeight: 1.05, margin: '0 0 8px',
          }}>
            {isAddMode ? '✦ Creator added' : 'Polish your page.'}
          </h1>
          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 14, color: 'rgba(255,255,255,0.35)',
            margin: '0 0 28px', fontStyle: 'italic',
          }}>
            {isAddMode ? 'Switch personas from your dashboard.' : 'Optional — your page is already live'}
          </p>
        </div>

        {/* ── Profile photo ────────────────────────────────────────────── */}
        <section style={{ padding: '0 24px', marginBottom: 24 }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 10px' }}>
            Profile photo
          </p>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleAvatarChange} style={{ display: 'none' }} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarUploading}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              padding: '12px 16px', cursor: 'pointer', width: '100%', boxSizing: 'border-box',
            }}
          >
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: `${accent}25`, display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', flexShrink: 0,
            }}>
              {avatarPreviewUrl
                ? <img src={avatarPreviewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span className="material-symbols-outlined" style={{ fontSize: 22, color: accent }}>
                    {avatarUploading ? 'hourglass_empty' : 'photo_camera'}
                  </span>
              }
            </div>
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14, color: '#ffffff', margin: 0 }}>
                {avatarUploading ? 'Uploading...' : avatarPreviewUrl ? 'Change photo' : 'Upload a photo'}
              </p>
              {avatarError && <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#FF6B6B', margin: '2px 0 0' }}>{avatarError}</p>}
            </div>
          </button>
        </section>

        {/* ── Bio ──────────────────────────────────────────────────────── */}
        <section style={{ padding: '0 24px', marginBottom: 24 }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 10px' }}>
            Your bio
          </p>
          <div style={{ position: 'relative' }}>
            <textarea
              value={bio}
              maxLength={160}
              onChange={e => {
                setBio(e.target.value)
                try { sessionStorage.setItem(SK.c_bio, e.target.value); window.dispatchEvent(new Event('ob-snap-update')) } catch {}
              }}
              placeholder="Tell the city who you are..."
              rows={3}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${bio.length > 0 ? accent + '55' : 'rgba(255,255,255,0.08)'}`,
                padding: '12px 12px 32px',
                fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: '#ffffff',
                outline: 'none', resize: 'none', caretColor: accent, lineHeight: 1.5,
                transition: 'border-color 200ms',
              }}
            />
            <div style={{ position: 'absolute', bottom: 10, right: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.20)' }}>{bio.length}/160</span>
              <div style={{ width: 2, height: 12, background: accent, animation: 'c8-blink 1s step-end infinite' }} />
            </div>
          </div>
        </section>

        {/* ── Theme / Choose your vibe ─────────────────────────────────── */}
        <section style={{ padding: '0 24px', marginBottom: 24 }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 10px' }}>
            Choose your vibe
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {EDITORIAL_PRESETS.map(ep => {
              const active = selectedPreset.name === ep.name
              const isRec  = ep.name === recommendedName && !active
              return (
                <button
                  key={ep.name}
                  type="button"
                  onClick={() => handlePresetClick(ep)}
                  style={{
                    display: 'flex', flexDirection: 'column', padding: 0, cursor: 'pointer',
                    border: active ? `2px solid ${ep.previewPrimary}` : '2px solid rgba(255,255,255,0.08)',
                    boxShadow: active ? `0 0 0 2px ${ep.previewPrimary}25` : 'none',
                    borderRadius: 6, overflow: 'hidden', background: 'transparent',
                    transition: 'border-color 120ms, box-shadow 120ms', textAlign: 'left',
                  }}
                >
                  {/* Swatch */}
                  <div style={{ height: 44, width: '100%', position: 'relative', background: ep.previewBg, flexShrink: 0 }}>
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 14, background: ep.previewSurface }} />
                    <div style={{ position: 'absolute', bottom: 3, left: 8, width: 20, height: 5, borderRadius: 2, background: ep.previewPrimary }} />
                    {/* ✦ For you badge */}
                    {isRec && (
                      <div style={{
                        position: 'absolute', top: 4, right: 4,
                        background: ep.previewPrimary, color: ep.light ? '#000' : '#fff',
                        fontSize: 7, fontWeight: 700, letterSpacing: '0.04em',
                        padding: '1px 4px', fontFamily: "'DM Sans', sans-serif",
                        textTransform: 'uppercase', borderRadius: 2,
                      }}>✦ For you</div>
                    )}
                    {active && (
                      <div style={{
                        position: 'absolute', top: 4, right: 4,
                        width: 14, height: 14, borderRadius: '50%',
                        background: ep.previewPrimary,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <svg viewBox="0 0 24 24" width="9" height="9" fill="none"
                          stroke={ep.light ? '#000' : '#fff'} strokeWidth="3"
                          strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {/* Label */}
                  <div style={{ padding: '5px 8px 6px', background: ep.previewSurface }}>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 700, color: ep.previewText, margin: 0, lineHeight: 1.2 }}>{ep.name}</p>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 8, color: ep.previewText, opacity: 0.55, margin: '1px 0 0', lineHeight: 1.2 }}>{ep.tagline}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* ── Socials (if platforms selected in C7) ────────────────────── */}
        {platforms.length > 0 && (
          <section style={{ padding: '0 24px', marginBottom: 24 }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 10px' }}>
              Link your socials
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {platforms.map(pid => {
                const plat = PLATFORM_REGISTRY.find(p => p.id === pid)
                return (
                  <div key={pid} style={{ borderBottom: `1px solid ${accent}30`, paddingBottom: 8 }}>
                    <label style={{ display: 'block', fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.30)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                      {plat?.label ?? pid}
                    </label>
                    <input
                      type="text"
                      placeholder={plat?.placeholder ?? '@handle'}
                      value={socialLinks[pid] ?? ''}
                      onChange={e => setSocialLinks(prev => ({ ...prev, [pid]: e.target.value }))}
                      style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: accent, caretColor: accent, boxSizing: 'border-box' }}
                    />
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Live preview */}
        <div style={{ padding: '0 24px', marginBottom: 24 }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.25)', marginBottom: 10 }}>Live preview:</p>
          <div style={{ width: 240, height: 420, borderRadius: 20, overflow: 'hidden', border: '6px solid rgba(255,255,255,0.10)', position: 'relative' }}>
            <ProfilePreview
              displayName={displayName} username={username} city={city}
              category={category} subTypes={subTypes} bio={bio || undefined}
              avatarUrl={avatarPreviewUrl}
              socialLinks={Object.keys(socialLinks).length > 0 ? socialLinks : undefined}
              previewPrimary={selectedPreset.previewPrimary}
              previewBg={selectedPreset.previewBg}
              previewSurface={selectedPreset.previewSurface}
              previewText={selectedPreset.previewText}
              previewLight={selectedPreset.light}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, height: 72, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px',
        background: 'linear-gradient(to top, #1A2744 60%, transparent 100%)',
      }}>
        <button type="button" onClick={() => router.push('/onboarding/creator/C6')}
          style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: 'rgba(255,255,255,0.30)', cursor: 'pointer', padding: 0 }}>
          ← Back
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          {saveError && (
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#FF6B6B', margin: 0, maxWidth: 220, textAlign: 'right' }}>
              {saveError}
            </p>
          )}
          <button
            type="button"
            onClick={handleDone}
            disabled={isSaving}
            style={{
              background: accent, color: '#ffffff',
              fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 15,
              padding: '12px 32px', border: 'none',
              cursor: isSaving ? 'default' : 'pointer',
              opacity: isSaving ? 0.7 : 1,
            }}
          >
            {isSaving ? 'Saving...' : 'Claim my page →'}
          </button>
        </div>
      </footer>
    </>
  )
}
