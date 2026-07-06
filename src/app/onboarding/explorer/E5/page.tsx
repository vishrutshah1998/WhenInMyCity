'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { SK } from '@/lib/onboarding/session-keys'
import { INTEREST_TAGS } from '@/lib/constants/interests'

const ACCENT = '#9B8FFF'
const MIN_TAGS = 3
const MAX_TAGS = 5

const CATEGORY_ORDER = ['performance', 'arts', 'education', 'lifestyle', 'tech', 'food_culture', 'outdoors']
const CATEGORY_LABELS: Record<string, string> = {
  performance:  'Performance',
  arts:         'Arts & Craft',
  education:    'Education',
  lifestyle:    'Lifestyle',
  tech:         'Tech & Business',
  food_culture: 'Food & Culture',
  outdoors:     'Outdoors',
}

export default function E5Page() {
  const router = useRouter()
  const [selected,    setSelected]    = useState<string[]>([])
  const [isAdvancing, setIsAdvancing] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem(SK.persona) !== 'explorer') { router.replace('/onboarding'); return }
    const cityVal = sessionStorage.getItem(SK.e_city)
    if (!cityVal) { router.replace('/onboarding/explorer/E4'); return }
    try {
      const saved = JSON.parse(sessionStorage.getItem(SK.e_interests) || '[]') as string[]
      if (saved.length > 0) setSelected(saved)
    } catch {}
  }, [router])

  const grouped = useMemo(() =>
    INTEREST_TAGS.reduce<Record<string, typeof INTEREST_TAGS>>((acc, tag) => {
      if (!acc[tag.category]) acc[tag.category] = []
      acc[tag.category].push(tag)
      return acc
    }, {})
  , [])

  function toggle(id: string) {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(t => t !== id)
      if (prev.length >= MAX_TAGS) return prev
      return [...prev, id]
    })
  }

  function handleContinue() {
    if (isAdvancing || selected.length < MIN_TAGS) return
    setIsAdvancing(true)
    try { sessionStorage.setItem(SK.e_interests, JSON.stringify(selected)) } catch {}
    router.push('/onboarding/explorer/E5b')
  }

  const canProceed = selected.length >= MIN_TAGS
  const atLimit    = selected.length >= MAX_TAGS

  return (
    <>
      <div style={{ minHeight: '100%', overflowY: 'auto', paddingTop: 20, paddingBottom: 96, paddingLeft: 24, paddingRight: 24 }}>
        <h1 style={{
          fontFamily: "var(--font-abril), 'Abril Fatface', serif",
          fontSize:   'clamp(28px, 7vw, 40px)',
          color:      '#F0EFF8',
          lineHeight: 1.05,
          margin:     '0 0 8px',
          maxWidth:   480,
        }}>
          What do you<br />want to discover?
        </h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: '#9896B0', margin: '0 0 4px', maxWidth: 400 }}>
          Pick 3–5 things that pull you in.
        </p>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: atLimit ? '#F59E0B' : '#9896B0', margin: '0 0 32px' }}>
          {selected.length}/{MAX_TAGS} selected{atLimit ? ' — limit reached' : ''}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 560 }}>
          {CATEGORY_ORDER.filter(cat => grouped[cat]).map(cat => (
            <div key={cat}>
              <div style={{
                fontFamily:    "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
                fontSize:      9,
                fontWeight:    700,
                color:         ACCENT,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                marginBottom:  10,
              }}>
                {CATEGORY_LABELS[cat] ?? cat}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {grouped[cat].map(tag => {
                  const isSel     = selected.includes(tag.id)
                  const isDisabled = !isSel && atLimit
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggle(tag.id)}
                      disabled={isDisabled}
                      style={{
                        padding:      '8px 14px',
                        borderRadius: 9999,
                        border:       `1px solid ${isSel ? ACCENT : 'rgba(155,143,255,0.25)'}`,
                        background:   isSel ? 'rgba(155,143,255,0.15)' : 'transparent',
                        color:        isSel ? ACCENT : isDisabled ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.60)',
                        fontFamily:   "'DM Sans', sans-serif",
                        fontWeight:   500,
                        fontSize:     13,
                        cursor:       isDisabled ? 'not-allowed' : 'pointer',
                        transition:   'all 150ms',
                        display:      'flex',
                        alignItems:   'center',
                        gap:          5,
                      }}
                    >
                      <span>{tag.emoji}</span>
                      {tag.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <footer style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, height: 72, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px',
        background: 'linear-gradient(to top, var(--ob-panel-bg, #1A2744) 60%, transparent 100%)',
      }}>
        <button type="button" onClick={() => router.push('/onboarding/explorer/E4')}
          style={{ background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: 'rgba(255,255,255,0.25)', cursor: 'pointer', padding: 0 }}>
          ← Back
        </button>
        <button type="button" onClick={handleContinue} disabled={!canProceed || isAdvancing}
          style={{
            background:    canProceed ? ACCENT : 'rgba(255,255,255,0.08)',
            color:         canProceed ? '#1A2744' : 'rgba(255,255,255,0.22)',
            fontFamily:    "var(--font-barlow), 'Barlow Condensed', sans-serif",
            fontWeight:    700,
            fontSize:      15,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding:       '12px 32px',
            border:        'none',
            boxShadow:     canProceed ? '8px 8px 0px 0px #000000' : 'none',
            cursor:        canProceed ? 'pointer' : 'not-allowed',
            transition:    'all 150ms',
          }}>
          {canProceed ? `Continue (${selected.length})` : `Pick ${MIN_TAGS - selected.length} more`}
        </button>
      </footer>
    </>
  )
}
