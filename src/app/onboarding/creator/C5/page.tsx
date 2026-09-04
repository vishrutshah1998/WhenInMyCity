'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { SK } from '@/lib/onboarding/session-keys'
import { getCategoryConfig } from '@/lib/constants/categories'
import { getCategoryColour } from '@/lib/onboarding/design-tokens'
import { getSubtypePopularity } from '@/app/actions/onboarding'
import type { CreatorType } from '@/types/database'
import { CreatorEventTicket } from '@/components/onboarding/BoardingPassArtifact'
import { ONBOARDING_CTA } from '@/lib/constants/onboarding-cta-copy'
import { OnboardingFooter } from '@/components/onboarding/OnboardingFooter'

const NOT_YET = 'not_yet'

export default function C5Page() {
  const router = useRouter()
  const [selected,   setSelected]   = useState<string[]>([])
  const [category,   setCategory]   = useState('')
  const [accent,     setAccent]     = useState('#F5A800')
  const [advancing,  setAdvancing]  = useState(false)
  const [name,       setName]       = useState('')
  const [city,       setCity]       = useState('')
  const [popularity, setPopularity] = useState<Record<string, number>>({})

  useEffect(() => {
    if (typeof window === 'undefined') return
    const cityVal = sessionStorage.getItem(SK.c_city)
    if (!cityVal) { router.replace('/onboarding/creator/C4'); return }
    setCity(cityVal)
    const cat = sessionStorage.getItem(SK.c_category) || ''
    setCategory(cat)
    setAccent(getCategoryColour(cat))
    const n = sessionStorage.getItem(SK.c_name)
    if (n) setName(n)
    try {
      const saved = JSON.parse(sessionStorage.getItem(SK.c_subtypes) || '[]') as string[]
      if (saved.length > 0) setSelected(saved)
    } catch {}
    if (cat) {
      getSubtypePopularity(cat).then(setPopularity).catch(() => {})
    }
  }, [router])

  const categoryLabel = useMemo(
    () => getCategoryConfig(category as CreatorType)?.label,
    [category],
  )

  // Real pick-frequency ranking (from getSubtypePopularity) — most-picked
  // first. "Not hosting events yet" is a meta opt-out, not a genre, so it's
  // always pinned last regardless of popularity. Falls back to definition
  // order (all-zero counts) before the popularity fetch resolves or when
  // user_profiles has no data yet for this category.
  const options = useMemo(() => {
    const base = getCategoryConfig(category as CreatorType)?.subTypes ?? []
    const real = base.filter(o => o.id !== NOT_YET)
    const meta = base.filter(o => o.id === NOT_YET)
    const ranked = [...real].sort((a, b) => (popularity[b.id] ?? 0) - (popularity[a.id] ?? 0))
    return [...ranked, ...meta]
  }, [category, popularity])

  // Mirror the ranked order into sessionStorage so C5RightPanel's bubble
  // field can size the most-picked subtype as the biggest bubble too.
  useEffect(() => {
    if (options.length === 0) return
    try { sessionStorage.setItem(SK.c_subtype_rank, JSON.stringify(options.map(o => o.id))) } catch {}
    window.dispatchEvent(new Event('ob-snap-update'))
  }, [options])

  function toggle(val: string) {
    setSelected(prev => {
      let next: string[]
      if (val === NOT_YET) {
        next = prev.includes(NOT_YET) ? [] : [NOT_YET]
      } else {
        const without = prev.filter(s => s !== NOT_YET)
        next = without.includes(val) ? without.filter(s => s !== val) : [...without, val]
      }
      try { sessionStorage.setItem(SK.c_subtypes, JSON.stringify(next)) } catch {}
      return next
    })
  }

  function handleContinue() {
    if (advancing) return
    setAdvancing(true)
    try { sessionStorage.setItem(SK.c_subtypes, JSON.stringify(selected)) } catch {}
    router.push('/onboarding/creator/C6')
  }

  function handleSkip() {
    if (advancing) return
    setAdvancing(true)
    try { sessionStorage.setItem(SK.c_subtypes, '[]') } catch {}
    router.push('/onboarding/creator/C6')
  }

  const canProceed = selected.length > 0

  return (
    <>
      <div style={{ minHeight: '100%', overflowY: 'auto', paddingTop: 20, paddingBottom: 96, paddingLeft: 24, paddingRight: 24 }}>
        <CreatorEventTicket
          name={name || undefined}
          category={category || undefined}
          city={city || undefined}
          accent={accent}
        />

        <h1 style={{
          fontFamily: "var(--font-abril), 'Abril Fatface', serif",
          fontSize:   'clamp(28px, 7vw, 42px)',
          color:      '#F0EFF8',
          lineHeight: 1.05,
          margin:     '0 0 8px',
        }}>
          {categoryLabel ? `What kind of ${categoryLabel} are you into?` : 'What do you specialise in?'}
        </h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: '#9896B0', margin: '0 0 32px', maxWidth: 400 }}>
          Pick everything that applies
        </p>

        {/* TYPE C multi-select chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, maxWidth: 520 }}>
          {options.map(opt => {
            const isSel = selected.includes(opt.id)
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
                  fontSize:     14,
                  cursor:       'pointer',
                  transition:   'all 150ms',
                  border:       isSel ? `1px solid ${accent}` : `1px solid ${accent}30`,
                  background:   isSel ? accent : 'transparent',
                  color:        isSel ? '#1A2744' : 'rgba(255,255,255,0.60)',
                  display:      'flex',
                  alignItems:   'center',
                  gap:          6,
                }}
              >
                {opt.emoji && <span>{opt.emoji}</span>}
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      <OnboardingFooter
        onBack={() => router.push('/onboarding/creator/C4')}
        cta={canProceed ? ONBOARDING_CTA.C5.withCount(selected.length) : ONBOARDING_CTA.C5.base}
        onContinue={handleContinue}
        ctaDisabled={!canProceed || advancing}
        ctaAccent={accent}
        secondaryAction={{ label: 'Skip', onClick: handleSkip }}
      />
    </>
  )
}
