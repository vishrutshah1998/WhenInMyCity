'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SK } from '@/lib/onboarding/session-keys'
import { completeOnboarding } from '@/app/actions/onboarding'
import { INTEREST_TAGS } from '@/lib/constants/interests'
import { V2_CREATOR_TYPES } from '@/types/onboarding'
import ProfilePreview from '../_components/ProfilePreview'
import { getCategoryColour } from '@/lib/onboarding/design-tokens'
import RubberStamp from '@/components/ui/RubberStamp'

type CreatorTypeV2 = typeof V2_CREATOR_TYPES[number]

function isValidCreatorType(v: string): v is CreatorTypeV2 {
  return (V2_CREATOR_TYPES as readonly string[]).includes(v)
}

export default function C8RevealPage() {
  const router = useRouter()

  const [phase,            setPhase]          = useState<'stamping' | 'revealed' | 'error'>('stamping')
  const [bio,              setBio]            = useState('')
  const [username,         setUsername]       = useState('')
  const [firstName,        setFirstName]      = useState('')
  const [displayName,      setDisplayName]    = useState('')
  const [city,             setCity]           = useState('')
  const [category,         setCategory]       = useState('')
  const [subTypes,         setSubTypesList]   = useState<string[]>([])
  const [offlineActivities, setOfflineActivities] = useState<string[]>([])
  const [retryError,       setRetryError]     = useState('')
  const [isSaving,         setIsSaving]       = useState(false)

  const accent = getCategoryColour(category)

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

      let interestTags: string[] = []
      try {
        const raw: unknown[] = JSON.parse(sessionStorage.getItem(SK.c_interests) || '[]')
        interestTags = raw.map(i =>
          typeof i === 'string' ? i : (typeof i === 'object' && i !== null && 'tag' in i ? String((i as { tag: unknown }).tag) : '')
        ).filter(Boolean)
      } catch {}

      if (!dn) { router.replace('/onboarding/creator/C2'); return }

      setFirstName(dn.split(' ')[0])
      setDisplayName(dn)
      setUsername(storedUser)
      setCity(cityVal)
      setCategory(rawCat)
      setSubTypesList(subTypesArr)
      setOfflineActivities(offlineActsArr)

      const tags = interestTags.length >= 3
        ? interestTags
        : [
            ...interestTags,
            ...INTEREST_TAGS
              .filter(t => !interestTags.includes(t.id))
              .slice(0, 3 - interestTags.length)
              .map(t => t.id),
          ]

      const creatorType: CreatorTypeV2 = isValidCreatorType(rawCat) ? rawCat : 'exploring'

      try {
        const result = await completeOnboarding({
          displayName:       dn,
          username:          storedUser,
          creatorType,
          city:              cityVal,
          subTypes:          subTypesArr,
          offlineActivities: offlineActsArr,
          interestTags:      tags,
          socialLinks:       [],
          bio:               undefined,
          colorScheme:       undefined,
        })

        if (result.error) {
          setRetryError(result.error)
          setPhase('error')
          return
        }
        if (result.username) setUsername(result.username)
      } catch {
        setRetryError('Something went wrong. Please try again.')
        setPhase('error')
        return
      }

      setPhase('revealed')
    }

    doReveal()
  }, [router])

  async function handleContinue() {
    if (isSaving) return
    setIsSaving(true)
    if (bio.trim()) {
      try {
        await completeOnboarding({
          displayName,
          username,
          creatorType:       isValidCreatorType(category) ? category : 'exploring',
          city,
          subTypes,
          offlineActivities,
          interestTags:      [],
          socialLinks:       [],
          bio:               bio.trim(),
          colorScheme:       undefined,
        })
        sessionStorage.setItem(SK.c_bio, bio)
      } catch {}
    }
    router.push('/onboarding/creator/C9')
  }

  // ── Loading ────────────────────────────────────────────────────────────────
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
            width: 28, height: 28,
            border: `2px solid ${accent}`, borderTopColor: 'transparent',
            borderRadius: '50%', animation: 'c8-spin 1s linear infinite',
          }} />
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'rgba(255,255,255,0.40)' }}>
            Building your page...
          </span>
        </div>
      </>
    )
  }

  // ── Error ──────────────────────────────────────────────────────────────────
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

  // ── Revealed (dark bg — brand moment, bio + live preview) ─────────────────
  return (
    <>
      <style>{`@keyframes c8-pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>

      <div style={{
        minHeight:  '100%',
        background: '#1A2744',
        overflowY:  'auto',
        display:    'flex',
        flexDirection: 'column',
        paddingBottom: 96,
      }}>
        <div style={{ display: 'flex', flex: 1, gap: 0 }}>

          {/* Left: bio input */}
          <div style={{ flex: '0 0 auto', width: '100%', maxWidth: 560, padding: '48px 24px 0' }}>
            <h1 style={{
              fontFamily:  "'Outfit', sans-serif",
              fontWeight:  900,
              fontSize:    'clamp(28px, 7vw, 44px)',
              color:       '#ffffff',
              lineHeight:  1.05,
              margin:      '0 0 8px',
            }}>
              Tell people what you&apos;re about
            </h1>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: 'rgba(255,255,255,0.45)', margin: '0 0 32px' }}>
              A sentence or two — appears on your page
            </p>

            {/* TYPE D textarea */}
            <div style={{ position: 'relative', maxWidth: 480 }}>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Write something about yourself..."
                maxLength={160}
                rows={4}
                style={{
                  width:         '100%',
                  background:    'transparent',
                  border:        'none',
                  borderBottom:  `2px solid ${bio.length > 0 ? accent : 'rgba(255,255,255,0.15)'}`,
                  fontFamily:    "'DM Sans', sans-serif",
                  fontSize:      18,
                  color:         '#ffffff',
                  outline:       'none',
                  resize:        'none',
                  paddingBottom: 8,
                  caretColor:    accent,
                  lineHeight:    1.5,
                  boxSizing:     'border-box',
                  transition:    'border-color 200ms',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
                  {bio.length}/160
                </span>
              </div>
            </div>

            {/* Profile live preview — mobile */}
            <div className="lg:hidden" style={{ marginTop: 40 }}>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 16 }}>
                This is what your page looks like right now:
              </p>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <div style={{
                  width: 280, height: 480, borderRadius: 24,
                  background: '#1A2744', border: '8px solid rgba(255,255,255,0.10)',
                  overflow: 'hidden', position: 'relative',
                  boxShadow: `0 0 40px ${accent}20`,
                }}>
                  <ProfilePreview displayName={displayName} username={username} city={city} category={category} subTypes={subTypes} bio={bio || undefined} />
                </div>
                {/* Stamp — outside overflow:hidden container */}
                <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 20 }}>
                  <RubberStamp text={"CREATOR\nADMITTED\n2025"} color="#E8705A" size={56} rotate={-10} opacity={0.8} animate />
                </div>
                <div style={{
                  marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: accent, color: '#1A2744', borderRadius: 999, padding: '4px 12px',
                  animation: 'c8-pulse 2s ease-in-out infinite',
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#1A2744' }} />
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, fontWeight: 600 }}>LIVE</span>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop right preview is provided by layout's SplitRightPanel */}
        </div>
      </div>

      {/* Footer */}
      <footer style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, height: 72, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px',
        background: 'linear-gradient(to top, #1A2744 60%, transparent 100%)',
      }}>
        <button type="button" onClick={() => router.push('/onboarding/creator/C7')}
          style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: 'rgba(255,255,255,0.30)', cursor: 'pointer', padding: 0 }}>
          ← Back
        </button>
        <button type="button" onClick={handleContinue} disabled={isSaving}
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
            transition:  'opacity 200ms',
          }}>
          {isSaving ? 'Saving...' : 'Looks good, take me there →'}
        </button>
      </footer>
      {/* suppress unused var warning */}
      {firstName ? null : null}
    </>
  )
}
