'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SK } from '@/lib/onboarding/session-keys'
import { getCategoryColour, getCategoryWarmBg } from '@/lib/onboarding/design-tokens'


const PLATFORMS = [
  { id: 'instagram',  emoji: '📸', label: 'Instagram',   placeholder: '@yourhandle'           },
  { id: 'youtube',    emoji: '▶️',  label: 'YouTube',     placeholder: '@yourchannel'          },
  { id: 'x',          emoji: '🐦', label: 'X (Twitter)', placeholder: '@yourhandle'           },
  { id: 'spotify',    emoji: '🎵', label: 'Spotify',     placeholder: 'Artist URL'            },
  { id: 'soundcloud', emoji: '🎧', label: 'SoundCloud',  placeholder: '@yourprofile'          },
  { id: 'website',    emoji: '🌐', label: 'Website',     placeholder: 'https://yoursite.com'  },
] as const

type PlatformId = typeof PLATFORMS[number]['id']

export default function C7Page() {
  const router = useRouter()

  const [handles,    setHandles]    = useState<Partial<Record<PlatformId, string>>>({})
  const [accent,     setAccent]     = useState('#E8705A')
  const [warmBg,     setWarmBg]     = useState('#FFF8F5')
  const [holderName, setHolderName] = useState('')
  const [city,       setCity]       = useState('')
  const [category,   setCategory]   = useState('')
  const [platforms,  setPlatforms]  = useState<string[]>([])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const interests = sessionStorage.getItem(SK.c_interests)
    if (!interests) { router.replace('/onboarding/creator/C6'); return }
    const name = sessionStorage.getItem(SK.c_name) || ''
    const c    = sessionStorage.getItem(SK.c_city) || ''
    const cat  = sessionStorage.getItem(SK.c_category) || ''
    setHolderName(name)
    setCity(c)
    setCategory(cat)
    setAccent(getCategoryColour(cat))
    setWarmBg(getCategoryWarmBg(cat))
    try {
      const saved = JSON.parse(sessionStorage.getItem(SK.c_platforms) || '[]') as string[]
      if (saved.length > 0) setPlatforms(saved)
    } catch {}
  }, [router])

  function handleHandleChange(id: PlatformId, val: string) {
    setHandles(prev => ({ ...prev, [id]: val }))
    const filled = Object.entries({ ...handles, [id]: val })
      .filter(([, v]) => v && v.trim().length > 0)
      .map(([k]) => k)
    setPlatforms(filled)
  }

  function handleContinue() {
    try { sessionStorage.setItem(SK.c_platforms, JSON.stringify(platforms)) } catch {}
    router.push('/onboarding/creator/C8')
  }

  function handleSkip() {
    try { sessionStorage.setItem(SK.c_platforms, '[]') } catch {}
    router.push('/onboarding/creator/C8')
  }

  return (
    <>
      <div style={{
        minHeight:     '100%',
        overflowY:     'auto',
        paddingTop:    48,
        paddingBottom: 96,
        paddingLeft:   24,
        paddingRight:  24,
      }}>
        <h1 style={{
          fontFamily:  "'Outfit', sans-serif",
          fontWeight:  900,
          fontSize:    'clamp(28px, 7vw, 44px)',
          color:       '#F0EFF8',
          lineHeight:  1.05,
          margin:      '0 0 8px',
          maxWidth:    480,
        }}>
          Where else can people find you?
        </h1>
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize:   15,
          color:      'rgba(240,239,248,0.5)',
          margin:     '0 0 40px',
          maxWidth:   400,
        }}>
          These show as stickers on your page cover
        </p>

        {/* Platform rows */}
        <div style={{ maxWidth: 480, display: 'flex', flexDirection: 'column' }}>
          {PLATFORMS.map((plat, idx) => {
            const val = handles[plat.id] || ''
            return (
              <div
                key={plat.id}
                style={{
                  display:      'flex',
                  alignItems:   'center',
                  gap:          16,
                  padding:      '16px 0',
                  borderBottom: idx < PLATFORMS.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: 128, flexShrink: 0 }}>
                  <span style={{ fontSize: 16, lineHeight: 1 }}>{plat.emoji}</span>
                  <span style={{
                    fontFamily:  "'DM Sans', sans-serif",
                    fontWeight:  600,
                    fontSize:    15,
                    color:       val ? '#F0EFF8' : 'rgba(240,239,248,0.45)',
                    transition:  'color 200ms',
                  }}>
                    {plat.label}
                  </span>
                </div>
                <input
                  type="text"
                  value={val}
                  onChange={e => handleHandleChange(plat.id, e.target.value)}
                  placeholder={plat.placeholder}
                  autoComplete="off"
                  style={{
                    flex:          1,
                    background:    'transparent',
                    border:        'none',
                    borderBottom:  `1px solid ${val ? accent : 'rgba(255,255,255,0.15)'}`,
                    fontFamily:    "'DM Sans', sans-serif",
                    fontWeight:    400,
                    fontSize:      15,
                    color:         '#F0EFF8',
                    outline:       'none',
                    paddingBottom: 4,
                    caretColor:    accent,
                    transition:    'border-color 200ms',
                  }}
                />
              </div>
            )
          })}
        </div>
      </div>

      <footer style={{
        position:       'fixed',
        bottom:         0,
        left:           0,
        right:          0,
        height:         72,
        zIndex:         50,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        padding:        '0 24px',
        background:     'linear-gradient(to top, #1A2744 60%, transparent 100%)',
      }}>
        <button type="button" onClick={() => router.push('/onboarding/creator/C6')}
          style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: 'rgba(240,239,248,0.35)', cursor: 'pointer', padding: 0 }}>
          ← Back
        </button>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button type="button" onClick={handleSkip}
            style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'rgba(240,239,248,0.35)', cursor: 'pointer', padding: 0, textDecoration: 'underline', textDecorationStyle: 'dashed', textUnderlineOffset: 3 }}>
            Skip for now
          </button>
          <button type="button" onClick={handleContinue}
            style={{ background: accent, color: '#ffffff', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 15, padding: '12px 32px', border: 'none', cursor: 'pointer' }}>
            Continue
          </button>
        </div>
      </footer>
    </>
  )
}
