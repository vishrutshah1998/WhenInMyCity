'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { SK } from '@/lib/onboarding/session-keys'
import { savePersonaScreen } from '@/app/actions/persona-complete'
import { getCategoryColour, getCategoryWarmBg } from '@/lib/onboarding/design-tokens'
import { INTEREST_TAGS } from '@/lib/constants/interests'
import { getCategoryConfig } from '@/lib/constants/categories'
import type { CreatorType } from '@/types/database'

export default function C6Page() {
  const router = useRouter()

  const [selected,    setSelected]    = useState<string[]>([])
  const [accent,      setAccent]      = useState('#E8705A')
  const [warmBg,      setWarmBg]      = useState('#FFF8F5')
  const [holderName,  setHolderName]  = useState('')
  const [city,        setCity]        = useState('')
  const [category,    setCategory]    = useState('')
  const [isAdvancing, setIsAdvancing] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const subtypes = sessionStorage.getItem(SK.c_subtypes)
    if (!subtypes) { router.replace('/onboarding/creator/C5'); return }
    const name = sessionStorage.getItem(SK.c_name) || ''
    const c    = sessionStorage.getItem(SK.c_city) || ''
    const cat  = sessionStorage.getItem(SK.c_category) || ''
    setHolderName(name)
    setCity(c)
    setCategory(cat)
    setAccent(getCategoryColour(cat))
    setWarmBg(getCategoryWarmBg(cat))
    try {
      const saved = JSON.parse(sessionStorage.getItem(SK.c_interests) || '[]') as string[]
      if (saved.length > 0) setSelected(saved)
    } catch {}
  }, [router])

  const prevScreen = useMemo(() => {
    if (typeof window === 'undefined') return '/onboarding/creator/C5'
    const cat = sessionStorage.getItem(SK.c_category) || ''
    const config = getCategoryConfig(cat as CreatorType)
    const hasOfflineActs = config?.offlineActivities && config.offlineActivities.length > 0
    return hasOfflineActs ? '/onboarding/creator/C5b' : '/onboarding/creator/C5'
  }, [])

  function toggle(val: string) {
    setSelected(prev => prev.includes(val) ? prev.filter(t => t !== val) : [...prev, val])
  }

  async function handleContinue() {
    if (isAdvancing) return
    setIsAdvancing(true)
    try { sessionStorage.setItem(SK.c_interests, JSON.stringify(selected)) } catch {}
    await savePersonaScreen({ persona: 'creator', screen: 'C6', data: { interests: selected } })
    router.push('/onboarding/creator/C7')
  }

  function handleSkip() {
    try { sessionStorage.setItem(SK.c_interests, '[]') } catch {}
    router.push('/onboarding/creator/C7')
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
          What does your audience care about?
        </h1>
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize:   15,
          color:      'rgba(240,239,248,0.5)',
          margin:     '0 0 8px',
          maxWidth:   400,
        }}>
          Helps us match you with the right events and venues
        </p>
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize:   13,
          color:      'rgba(240,239,248,0.30)',
          margin:     '0 0 40px',
          maxWidth:   400,
          fontStyle:  'italic',
        }}>
          These won&apos;t show on your page — they help us find your crowd
        </p>

        {/* Interest pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, maxWidth: 520 }}>
          {INTEREST_TAGS.map(tag => {
            const isSel = selected.includes(tag.id)
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggle(tag.id)}
                style={{
                  padding:      '10px 18px',
                  borderRadius: 999,
                  fontFamily:   "'DM Sans', sans-serif",
                  fontWeight:   600,
                  fontSize:     15,
                  cursor:       'pointer',
                  transition:   'all 150ms',
                  border:       isSel ? `1px solid ${accent}` : '1px solid rgba(255,255,255,0.14)',
                  background:   isSel ? accent : 'rgba(255,255,255,0.06)',
                  color:        isSel ? '#ffffff' : 'rgba(240,239,248,0.75)',
                  display:      'flex',
                  alignItems:   'center',
                  gap:          6,
                }}
              >
                <span>{tag.emoji}</span>
                {tag.label}
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
        <button type="button" onClick={() => router.push(prevScreen)}
          style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: 'rgba(240,239,248,0.35)', cursor: 'pointer', padding: 0 }}>
          ← Back
        </button>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button type="button" onClick={handleSkip}
            style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'rgba(240,239,248,0.35)', cursor: 'pointer', padding: 0, textDecoration: 'underline', textDecorationStyle: 'dashed', textUnderlineOffset: 3 }}>
            Skip
          </button>
          <button type="button" onClick={handleContinue} disabled={isAdvancing}
            style={{
              background: accent,
              color:      '#ffffff',
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 600,
              fontSize:   15,
              padding:    '12px 32px',
              border:     'none',
              cursor:     'pointer',
              opacity:    isAdvancing ? 0.6 : 1,
              transition: 'opacity 200ms',
            }}>
            {isAdvancing ? 'Saving...' : `Continue${selected.length > 0 ? ` (${selected.length})` : ''}`}
          </button>
        </div>
      </footer>
    </>
  )
}
