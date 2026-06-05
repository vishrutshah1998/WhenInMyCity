'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SK } from '@/lib/onboarding/session-keys'
import { getCategoryColour, getCategoryWarmBg } from '@/lib/onboarding/design-tokens'
import { CREATOR_CATEGORIES } from '@/lib/constants/categories'

export default function C3Page() {
  const router = useRouter()

  const [displayName, setDisplayName] = useState('')
  const [username,    setUsername]    = useState('')
  const [selected,    setSelected]    = useState<string | null>(null)
  const [advancing,   setAdvancing]   = useState(false)

  // Derive live accent + bg from selection
  const accent  = selected ? getCategoryColour(selected) : '#E8705A'
  const warmBg  = selected ? getCategoryWarmBg(selected) : '#FFF8F5'

  useEffect(() => {
    if (sessionStorage.getItem(SK.persona) !== 'creator') { router.replace('/onboarding'); return }
    const name = sessionStorage.getItem(SK.c_name)
    if (!name) { router.replace('/onboarding/creator/C2'); return }
    setDisplayName(name)
    setUsername(sessionStorage.getItem(SK.c_username) || '')
    const saved = sessionStorage.getItem(SK.c_category)
    if (saved) setSelected(saved)
  }, [router])

  function handleSelect(id: string) {
    if (advancing) return
    setSelected(id)
    setAdvancing(true)
    setTimeout(() => {
      try { sessionStorage.setItem(SK.c_category, id) } catch {}
      router.push('/onboarding/creator/C4')
    }, 500)
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
          What best describes you?
        </h1>
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize:   15,
          color:      'rgba(240,239,248,0.5)',
          margin:     '0 0 40px',
          maxWidth:   400,
        }}>
          Shapes your page colour and who discovers your work
        </p>

        {/* Single-select tiles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 480 }}>
          {CREATOR_CATEGORIES.map(cat => {
            const catAccent  = cat.primaryColor
            const isSelected = selected === cat.id
            const isOther    = selected !== null && !isSelected
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleSelect(cat.id)}
                disabled={advancing}
                style={{
                  width:        '100%',
                  textAlign:    'left',
                  padding:      '14px 18px',
                  border:       `1px solid ${isSelected ? `${catAccent}40` : 'rgba(255,255,255,0.09)'}`,
                  borderLeft:   `4px solid ${isSelected ? catAccent : 'rgba(255,255,255,0.08)'}`,
                  background:   isSelected ? `${catAccent}14` : 'rgba(9,9,14,0.45)',
                  opacity:      isOther ? 0.30 : 1,
                  cursor:       advancing ? 'default' : 'pointer',
                  transition:   'all 200ms',
                  display:      'flex',
                  alignItems:   'center',
                  gap:          14,
                }}
              >
                <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>{cat.emoji}</span>
                <div>
                  <div style={{
                    fontFamily:  "'Outfit', sans-serif",
                    fontWeight:  900,
                    fontSize:    17,
                    color:       isSelected ? catAccent : '#F0EFF8',
                    lineHeight:  1.1,
                    marginBottom: 3,
                    transition:  'color 200ms',
                  }}>
                    {cat.label}
                  </div>
                  <div style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize:   12,
                    color:      isSelected ? `${catAccent}99` : 'rgba(240,239,248,0.38)',
                    transition: 'color 200ms',
                  }}>
                    {cat.subTypes.slice(0, 3).map(s => s.label).join(' · ')}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize:   12,
          color:      'rgba(240,239,248,0.30)',
          fontStyle:  'italic',
          margin:     '14px 0 0',
        }}>
          Tap once to select — advances automatically
        </p>
      </div>

      {/* Footer */}
      <footer style={{
        position:    'fixed',
        bottom:      0,
        left:        0,
        right:       0,
        height:      72,
        zIndex:      50,
        display:     'flex',
        alignItems:  'center',
        padding:     '0 24px',
        background:  'linear-gradient(to top, #1A2744 60%, transparent 100%)',
      }}>
        <button
          type="button"
          onClick={() => router.push('/onboarding/creator/C2')}
          style={{
            background: 'none',
            border:     'none',
            fontFamily: "'DM Sans', sans-serif",
            fontSize:   15,
            color:      'rgba(240,239,248,0.35)',
            cursor:     'pointer',
            padding:    0,
          }}
        >
          ← Back
        </button>
      </footer>
    </>
  )
}
