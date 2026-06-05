'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { SK, clearNewOnboardingKeys, LEGACY_KEYS } from '@/lib/onboarding/session-keys'
import { completeOnboarding, uploadOnboardingAvatar } from '@/app/actions/onboarding'
import { INTEREST_TAGS } from '@/lib/constants/interests'
import { PLATFORM_REGISTRY } from '@/lib/platforms'
import { V2_CREATOR_TYPES } from '@/types/onboarding'
import ProfilePreview from '../_components/ProfilePreview'
import { getCategoryColour } from '@/lib/onboarding/design-tokens'

const SWATCHES = [
  { hex: '#E8705A', scheme: 'default'  },
  { hex: '#9B8FFF', scheme: 'indigo'   },
  { hex: '#F5A800', scheme: 'neel'     },
  { hex: '#5DD9D0', scheme: 'ocean'    },
  { hex: '#4ADE80', scheme: 'forest'   },
  { hex: '#F472B6', scheme: 'blush'    },
  { hex: '#60A5FA', scheme: 'midnight' },
  { hex: '#FCD34D', scheme: 'turmeric' },
] as const

type Swatch = typeof SWATCHES[number]
type CreatorTypeV2 = typeof V2_CREATOR_TYPES[number]

function isValidCreatorType(v: string): v is CreatorTypeV2 {
  return (V2_CREATOR_TYPES as readonly string[]).includes(v)
}

export default function C9PolishPage() {
  const router       = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const themeTimer   = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [displayName,       setDisplayName]       = useState('')
  const [username,          setUsername]          = useState('')
  const [city,              setCity]              = useState('')
  const [creatorType,       setCreatorType]       = useState('')
  const [subTypes,          setSubTypes]          = useState<string[]>([])
  const [offlineActivities, setOfflineActivities] = useState<string[]>([])
  const [interestTags,      setInterestTags]      = useState<string[]>([])
  const [platforms,         setPlatforms]         = useState<string[]>([])
  const [ready,          setReady]          = useState(false)
  const [accent,         setAccent]         = useState('#E8705A')

  const [bio,              setBio]             = useState('')
  const [selectedSwatch,   setSelectedSwatch]  = useState<Swatch>(SWATCHES[0])
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null)
  const [avatarUploading,  setAvatarUploading] = useState(false)
  const [avatarError,      setAvatarError]     = useState<string | null>(null)
  const [socialLinks,      setSocialLinks]     = useState<Record<string, string>>({})
  const [isSaving,         setIsSaving]        = useState(false)
  const [saveError,        setSaveError]       = useState<string | null>(null)
  const [cacheBust,        setCacheBust]       = useState(() => Date.now())

  useEffect(() => {
    const storedUsername = sessionStorage.getItem(SK.c_username) || ''
    if (!storedUsername) { router.replace('/onboarding/creator/C8'); return }
    setUsername(storedUsername)
    setDisplayName(sessionStorage.getItem(SK.c_name) || '')
    setCity(sessionStorage.getItem(SK.c_city) || '')
    const cat = sessionStorage.getItem(SK.c_category) || ''
    setCreatorType(cat)
    setAccent(getCategoryColour(cat))
    try { setSubTypes(JSON.parse(sessionStorage.getItem(SK.c_subtypes) || '[]')) } catch {}
    try { setOfflineActivities(JSON.parse(sessionStorage.getItem(SK.c_offline_acts) || '[]')) } catch {}
    try { setInterestTags(JSON.parse(sessionStorage.getItem(SK.c_interests) || '[]')) } catch {}
    try { setPlatforms(JSON.parse(sessionStorage.getItem(SK.c_platforms) || '[]')) } catch {}
    const savedBio = sessionStorage.getItem(SK.c_bio)
    if (savedBio) setBio(savedBio)
    setReady(true)
  }, [router])

  function buildPayload(opts: { bio?: string; scheme?: string; links?: { platform: string; url: string }[] }) {
    const ct: CreatorTypeV2 = isValidCreatorType(creatorType) ? creatorType : 'exploring'
    const tags = interestTags.length >= 3
      ? interestTags
      : [...interestTags, ...INTEREST_TAGS.filter(t => !interestTags.includes(t.id)).slice(0, 3 - interestTags.length).map(t => t.id)]
    return {
      displayName,
      username,
      creatorType:       ct,
      city,
      subTypes,
      offlineActivities,
      interestTags:      tags,
      bio:               opts.bio !== undefined ? (opts.bio.trim() || undefined) : undefined,
      colorScheme:       opts.scheme as Parameters<typeof completeOnboarding>[0]['colorScheme'],
      socialLinks:       opts.links ?? [],
    }
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
    if (result.error) { setAvatarError(result.error); return }
    setCacheBust(Date.now())
  }

  function handleSwatchClick(sw: Swatch) {
    setSelectedSwatch(sw)
    if (themeTimer.current) clearTimeout(themeTimer.current)
    themeTimer.current = setTimeout(async () => {
      try { await completeOnboarding(buildPayload({ scheme: sw.scheme })); setCacheBust(Date.now()) } catch {}
    }, 600)
  }

  async function handleDone() {
    setIsSaving(true)
    setSaveError(null)
    try {
      const links = Object.entries(socialLinks).filter(([, url]) => url.trim()).map(([platform, url]) => ({ platform, url }))
      const result = await completeOnboarding(buildPayload({ bio, scheme: selectedSwatch.scheme, links }))
      if (result.error) {
        setSaveError(result.error)
        setIsSaving(false)
        return
      }
    } catch {
      setSaveError('Something went wrong. Please try again.')
      setIsSaving(false)
      return
    }
    clearNewOnboardingKeys()
    LEGACY_KEYS.forEach(k => { try { sessionStorage.removeItem(k) } catch {} })
    const pending = sessionStorage.getItem('wimc_post_onboarding_redirect')
    if (pending) { sessionStorage.removeItem('wimc_post_onboarding_redirect'); router.push(pending) }
    else router.push('/dashboard')
  }

  if (!ready) return null

  return (
    <>
      <style>{`
        @keyframes c9-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes c9-blink  { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>

      <div style={{
        minHeight:  '100%',
        background: '#1A2744',
        display:    'flex',
        overflowY:  'auto',
        paddingBottom: 96,
      }}>

        {/* Left: polish widgets */}
        <div style={{ flex: '0 0 auto', width: '100%', maxWidth: 520, padding: '48px 24px 0' }}>
          <h1 style={{
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 900,
            fontSize:   'clamp(28px, 6vw, 40px)',
            color:      '#ffffff',
            lineHeight: 1.05,
            margin:     '0 0 8px',
          }}>
            Polish your page.
          </h1>
          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize:   14,
            color:      'rgba(255,255,255,0.35)',
            margin:     '0 0 40px',
            fontStyle:  'italic',
          }}>
            Optional — your page is already live
          </p>

          {/* Avatar */}
          <section style={{ marginBottom: 32 }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, color: 'rgba(255,255,255,0.40)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>
              Profile photo
            </p>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleAvatarChange} style={{ display: 'none' }} />
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={avatarUploading}
              style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#111116', border: '1px solid rgba(255,255,255,0.08)', padding: 16, cursor: 'pointer', width: '100%' }}
            >
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: `${accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                {avatarPreviewUrl
                  ? <img src={avatarPreviewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span className="material-symbols-outlined" style={{ fontSize: 24, color: accent }}>{avatarUploading ? 'hourglass_empty' : 'photo_camera'}</span>
                }
              </div>
              <div style={{ textAlign: 'left' }}>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 15, color: '#ffffff', margin: 0 }}>
                  {avatarUploading ? 'Uploading...' : avatarPreviewUrl ? 'Change photo' : 'Upload a photo'}
                </p>
                {avatarError && <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#FF6B6B', margin: '4px 0 0' }}>{avatarError}</p>}
              </div>
            </button>
          </section>

          {/* Bio */}
          <section style={{ marginBottom: 32 }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, color: 'rgba(255,255,255,0.40)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>
              Bio
            </p>
            <div style={{ background: '#111116', border: '1px solid rgba(255,255,255,0.08)', padding: 16, position: 'relative' }}>
              <textarea
                value={bio}
                maxLength={160}
                onChange={e => { setBio(e.target.value); try { sessionStorage.setItem(SK.c_bio, e.target.value) } catch {} }}
                placeholder="Tell the city who you are..."
                rows={3}
                style={{
                  width:      '100%',
                  background: 'transparent',
                  border:     'none',
                  outline:    'none',
                  resize:     'none',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize:   15,
                  color:      '#ffffff',
                  caretColor: accent,
                  paddingBottom: 24,
                  boxSizing:  'border-box',
                }}
              />
              <div style={{ position: 'absolute', bottom: 12, right: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.20)' }}>{bio.length}/160</span>
                <div style={{ width: 4, height: 14, background: accent, animation: 'c9-blink 1s step-end infinite' }} />
              </div>
            </div>
          </section>

          {/* Theme */}
          <section style={{ marginBottom: 32 }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, color: 'rgba(255,255,255,0.40)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>
              Colour mood
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {SWATCHES.map(sw => {
                const isSel = selectedSwatch.hex === sw.hex
                return (
                  <button key={sw.hex} type="button" onClick={() => handleSwatchClick(sw)}
                    style={{
                      width: 40, height: 40, background: sw.hex, border: isSel ? '2px solid white' : '2px solid transparent',
                      outline: isSel ? `2px solid ${sw.hex}` : 'none', outlineOffset: 2,
                      transform: isSel ? 'scale(1.1)' : 'scale(1)', transition: 'transform 150ms', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}
                  >
                    {isSel && <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#1A2744', fontVariationSettings: "'FILL' 1" }}>check</span>}
                  </button>
                )
              })}
            </div>
          </section>

          {/* Socials */}
          {platforms.length > 0 && (
            <section style={{ marginBottom: 32 }}>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, color: 'rgba(255,255,255,0.40)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>
                Link your socials
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {platforms.map(pid => {
                  const plat = PLATFORM_REGISTRY.find(p => p.id === pid)
                  return (
                    <div key={pid} style={{ borderBottom: `1px solid ${accent}40`, paddingBottom: 8 }}>
                      <label style={{ display: 'block', fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.30)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                        {plat?.label ?? pid}
                      </label>
                      <input
                        type="text"
                        placeholder={plat?.placeholder ?? '@handle'}
                        value={socialLinks[pid] ?? ''}
                        onChange={e => setSocialLinks(prev => ({ ...prev, [pid]: e.target.value }))}
                        style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: accent, caretColor: accent }}
                      />
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Preview — mobile only (desktop uses SplitRightPanel from layout) */}
          <div className="lg:hidden" style={{ marginBottom: 24 }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.30)', marginBottom: 16 }}>Live preview:</p>
            <div style={{ width: 240, height: 420, borderRadius: 24, background: '#09090E', border: '6px solid rgba(255,255,255,0.10)', overflow: 'hidden', position: 'relative' }}>
              <ProfilePreview displayName={displayName} username={username} city={city} category={creatorType} subTypes={subTypes} bio={bio || undefined} avatarUrl={avatarPreviewUrl} />
            </div>
          </div>
        </div>

        {/* Desktop right preview is provided by layout's SplitRightPanel */}
      </div>

      <footer style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, height: 72, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px',
        background: 'linear-gradient(to top, #1A2744 60%, transparent 100%)',
      }}>
        <button
          type="button"
          onClick={() => router.push('/onboarding/creator/C8')}
          style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: 'rgba(255,255,255,0.30)', cursor: 'pointer', padding: 0 }}
        >
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
              background:  accent,
              color:       '#ffffff',
              fontFamily:  "'DM Sans', sans-serif",
              fontWeight:  600,
              fontSize:    15,
              padding:     '12px 32px',
              border:      'none',
              cursor:      isSaving ? 'default' : 'pointer',
              opacity:     isSaving ? 0.7 : 1,
            }}
          >
            {isSaving ? 'Saving...' : 'Claim my page →'}
          </button>
        </div>
      </footer>
    </>
  )
}
