'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { SK } from '@/lib/onboarding/session-keys'
import { uploadOnboardingAvatar } from '@/app/actions/onboarding'
const ACCENT = '#9B8FFF'
const NAVY   = '#1A2744'

const INTENT_OPTIONS = [
  { id: 'host',     emoji: '🎤', text: 'Maybe host an open mic or event'                   },
  { id: 'share',    emoji: '🎨', text: 'Share my work online someday'                       },
  { id: 'already',  emoji: '📸', text: "I already create — just haven't set up a page"      },
  { id: 'discover', emoji: '🙌', text: "Nah, I'm purely here to discover"                   },
] as const

export default function E6Page() {
  const router = useRouter()
  const [selectedIntent, setSelectedIntent] = useState<string>('')
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null)
  const [avatarUploading,  setAvatarUploading]  = useState(false)
  const [avatarError,      setAvatarError]      = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem(SK.persona) !== 'explorer') { router.replace('/onboarding'); return }
    const interests = sessionStorage.getItem(SK.e_interests)
    if (interests === null) { router.replace('/onboarding/explorer/E5'); return }
    if (sessionStorage.getItem(SK.e_formats) === null && sessionStorage.getItem(SK.e_price_max) === null) {
      // tolerate missing E5b keys for users mid-flow; don't force redirect
    }
    const savedIntent = sessionStorage.getItem(SK.e_intent)
    if (savedIntent) setSelectedIntent(savedIntent)
    const savedAvatarUrl = sessionStorage.getItem(SK.e_avatar_url)
    if (savedAvatarUrl) setAvatarPreviewUrl(savedAvatarUrl)
  }, [router])

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true)
    setAvatarError(null)
    const fd = new FormData()
    fd.append('file', file)
    const result = await uploadOnboardingAvatar(fd)
    setAvatarUploading(false)
    if (result.error) {
      setAvatarError(result.error)
    } else if (result.url) {
      setAvatarPreviewUrl(result.url)
      try { sessionStorage.setItem(SK.e_avatar_url, result.url) } catch {}
    }
  }

  function handleContinue() {
    if (selectedIntent) {
      try { sessionStorage.setItem(SK.e_intent, selectedIntent) } catch {}
    }
    router.push('/onboarding/explorer/E7')
  }

  function handleSkip() {
    router.push('/onboarding/explorer/E7')
  }

  return (
    <>
      <div style={{ minHeight: '100%', overflowY: 'auto', paddingTop: 20, paddingBottom: 96, paddingLeft: 24, paddingRight: 24 }}>

        <h1 style={{
          fontFamily: "var(--font-abril), 'Abril Fatface', serif",
          fontSize:   'clamp(28px, 7vw, 40px)',
          color:      '#F0EFF8',
          lineHeight: 1.05,
          margin:     '0 0 8px',
        }}>
          Would you consider hosting an event?
        </h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: '#9896B0', margin: '0 0 32px', maxWidth: 400 }}>
          Just a quick gut check — totally optional
        </p>

        {/* ── Profile photo ────────────────────────────────────────────── */}
        <section style={{ marginBottom: 28, maxWidth: 480 }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 10px' }}>
            Profile photo (optional)
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
              background: `${ACCENT}25`, display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', flexShrink: 0,
            }}>
              {avatarPreviewUrl
                ? <img src={avatarPreviewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span className="material-symbols-outlined" style={{ fontSize: 22, color: ACCENT }}>
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

        {/* TYPE B single-select tiles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 480 }}>
          {INTENT_OPTIONS.map(opt => {
            const isSel = selectedIntent === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedIntent(prev => prev === opt.id ? '' : opt.id)}
                style={{
                  width:      '100%',
                  textAlign:  'left',
                  padding:    '14px 16px 14px 20px',
                  position:   'relative',
                  height:     64,
                  background: '#09090E',
                  border:     `1px solid ${isSel ? `${ACCENT}60` : `${ACCENT}20`}`,
                  borderLeft: `3px solid ${ACCENT}`,
                  cursor:     'pointer',
                  transition: 'all 200ms',
                  display:    'flex',
                  alignItems: 'center',
                  gap:        12,
                  overflow:   'visible',
                }}
              >
                {/* Ticket notch */}
                <div style={{
                  position: 'absolute', right: -7, top: '50%', transform: 'translateY(-50%)',
                  width: 14, height: 14, borderRadius: '50%', background: NAVY, zIndex: 2,
                }} />
                <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{opt.emoji}</span>
                <span style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 400,
                  fontSize:   15,
                  color:      isSel ? '#F0EFF8' : 'rgba(240,239,248,0.60)',
                  transition: 'color 200ms',
                }}>
                  {opt.text}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <footer style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, height: 72, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px',
        background: 'linear-gradient(to top, var(--ob-panel-bg, #1A2744) 60%, transparent 100%)',
      }}>
        <button type="button" onClick={() => router.push('/onboarding/explorer/E5b')}
          style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: 'rgba(255,255,255,0.25)', cursor: 'pointer', padding: 0 }}>
          ← Back
        </button>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button type="button" onClick={handleSkip}
            style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'rgba(255,255,255,0.25)', cursor: 'pointer', padding: 0, textDecoration: 'underline', textDecorationStyle: 'dashed', textUnderlineOffset: 3 }}>
            Skip for now
          </button>
          <button type="button" onClick={handleContinue}
            style={{
              background:    ACCENT,
              color:         '#1A2744',
              fontFamily:    "var(--font-barlow), 'Barlow Condensed', sans-serif",
              fontWeight:    700,
              fontSize:      15,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding:       '12px 32px',
              border:        'none',
              boxShadow:     '8px 8px 0px 0px #000000',
              cursor:        'pointer',
            }}>
            Continue →
          </button>
        </div>
      </footer>
    </>
  )
}
