'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { SK } from '@/lib/onboarding/session-keys'
import { getCategoryColour, getCategoryWarmBg } from '@/lib/onboarding/design-tokens'
import { getCategoryConfig } from '@/lib/constants/categories'
import type { CreatorType } from '@/types/database'

export default function C5bPage() {
  const router = useRouter()
  const [selected,    setSelected]    = useState<string[]>([])
  const [category,    setCategory]    = useState('')
  const [holderName,  setHolderName]  = useState('')
  const [city,        setCity]        = useState('')
  const [accent,      setAccent]      = useState('#E8705A')
  const [warmBg,      setWarmBg]      = useState('#FFF8F5')
  const [advancing,   setAdvancing]   = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const subtypes = sessionStorage.getItem(SK.c_subtypes)
    if (!subtypes) { router.replace('/onboarding/creator/C5'); return }
    const cat  = sessionStorage.getItem(SK.c_category) || ''
    const name = sessionStorage.getItem(SK.c_name) || ''
    const c    = sessionStorage.getItem(SK.c_city) || ''
    setCategory(cat)
    setHolderName(name)
    setCity(c)
    setAccent(getCategoryColour(cat))
    setWarmBg(getCategoryWarmBg(cat))
    try {
      const saved = JSON.parse(sessionStorage.getItem(SK.c_offline_acts) || '[]') as string[]
      if (saved.length > 0) setSelected(saved)
    } catch {}
  }, [router])

  const options = useMemo(
    () => getCategoryConfig(category as CreatorType)?.offlineActivities ?? [],
    [category],
  )

  // Auto-advance if this category has no offline activities defined
  useEffect(() => {
    if (category && options.length === 0) {
      try { sessionStorage.setItem(SK.c_offline_acts, '[]') } catch {}
      router.replace('/onboarding/creator/C6')
    }
  }, [category, options.length, router])

  function toggle(val: string) {
    if (val === 'not_right_now') {
      setSelected(['not_right_now'])
      return
    }
    setSelected(prev => {
      const without = prev.filter(x => x !== 'not_right_now')
      return without.includes(val) ? without.filter(x => x !== val) : [...without, val]
    })
  }

  function handleContinue() {
    if (advancing) return
    setAdvancing(true)
    try { sessionStorage.setItem(SK.c_offline_acts, JSON.stringify(selected)) } catch {}
    router.push('/onboarding/creator/C6')
  }

  function handleSkip() {
    if (advancing) return
    setAdvancing(true)
    try { sessionStorage.setItem(SK.c_offline_acts, '[]') } catch {}
    router.push('/onboarding/creator/C6')
  }

  if (options.length === 0) return null

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
          How do you show up?
        </h1>
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize:   15,
          color:      'rgba(240,239,248,0.5)',
          margin:     '0 0 8px',
          maxWidth:   400,
        }}>
          What kinds of offline events or experiences do you do?
        </p>
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize:   13,
          color:      'rgba(240,239,248,0.30)',
          margin:     '0 0 40px',
          maxWidth:   400,
          fontStyle:  'italic',
        }}>
          Pick all that apply — helps us match you with the right venues and explorers
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, maxWidth: 520 }}>
          {options.map(opt => {
            const isSel   = selected.includes(opt.id)
            const isNone  = opt.id === 'not_right_now'
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => toggle(opt.id)}
                style={{
                  padding:      '10px 18px',
                  borderRadius: 999,
                  fontFamily:   "'DM Sans', sans-serif",
                  fontWeight:   600,
                  fontSize:     15,
                  cursor:       'pointer',
                  transition:   'all 150ms',
                  border:       isSel ? `1px solid ${isNone ? 'rgba(255,255,255,0.18)' : accent}` : '1px solid rgba(255,255,255,0.14)',
                  background:   isSel
                    ? isNone ? 'rgba(255,255,255,0.06)' : accent
                    : 'rgba(255,255,255,0.06)',
                  color:        isSel
                    ? isNone ? 'rgba(240,239,248,0.50)' : '#ffffff'
                    : 'rgba(240,239,248,0.75)',
                }}
              >
                {opt.label}
              </button>
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
        <button type="button" onClick={() => router.push('/onboarding/creator/C5')}
          style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: 'rgba(240,239,248,0.35)', cursor: 'pointer', padding: 0 }}>
          ← Back
        </button>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button type="button" onClick={handleSkip}
            style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'rgba(240,239,248,0.35)', cursor: 'pointer', padding: 0, textDecoration: 'underline', textDecorationStyle: 'dashed', textUnderlineOffset: 3 }}>
            Skip
          </button>
          <button type="button" onClick={handleContinue} disabled={advancing}
            style={{
              background: accent,
              color:      '#ffffff',
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 600,
              fontSize:   15,
              padding:    '12px 32px',
              border:     'none',
              cursor:     advancing ? 'default' : 'pointer',
              opacity:    advancing ? 0.6 : 1,
              transition: 'opacity 200ms',
            }}>
            {advancing ? 'Saving...' : `Continue${selected.length > 0 && !selected.includes('not_right_now') ? ` (${selected.length})` : ''}`}
          </button>
        </div>
      </footer>
    </>
  )
}
