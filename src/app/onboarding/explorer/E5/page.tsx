'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SK } from '@/lib/onboarding/session-keys'
import { INTEREST_TAGS, INTEREST_CATEGORY_ORDER } from '@/lib/constants/interests'
import { ONBOARDING_CTA } from '@/lib/constants/onboarding-cta-copy'
import InterestTagPicker from '@/components/shared/InterestTagPicker'

const ACCENT = '#9B8FFF'
const MIN_TAGS = 3

const CATEGORY_ORDER: string[] = INTEREST_CATEGORY_ORDER
const CATEGORY_LABELS: Record<string, string> = {
  performance:  'Performance',
  arts:         'Arts & Craft',
  education:    'Education',
  lifestyle:    'Lifestyle',
  tech:         'Tech & Business',
  food_culture: 'Food & Culture',
  outdoors:     'Outdoors',
}
const CATEGORY_ICONS: Record<string, string> = {
  performance:  'theater_comedy',
  arts:         'palette',
  education:    'school',
  lifestyle:    'self_improvement',
  tech:         'business_center',
  food_culture: 'restaurant',
  outdoors:     'park',
}

export default function E5Page() {
  const router = useRouter()
  const [selected,       setSelected]       = useState<string[]>([])
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set([CATEGORY_ORDER[0]]))
  const [isAdvancing,    setIsAdvancing]    = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem(SK.persona) !== 'explorer') { router.replace('/onboarding'); return }
    const cityVal = sessionStorage.getItem(SK.e_city)
    if (!cityVal) { router.replace('/onboarding/explorer/E4'); return }
    try {
      const saved = JSON.parse(sessionStorage.getItem(SK.e_interests) || '[]') as string[]
      if (saved.length > 0) {
        setSelected(saved)
        const autoOpen = CATEGORY_ORDER.filter(cat =>
          INTEREST_TAGS.some(tag => tag.category === cat && saved.includes(tag.id))
        )
        if (autoOpen.length > 0) setOpenCategories(new Set(autoOpen))
      }
    } catch {}
  }, [router])

  function toggle(id: string) {
    const next = selected.includes(id) ? selected.filter(t => t !== id) : [...selected, id]
    setSelected(next)
    try { sessionStorage.setItem(SK.e_interests, JSON.stringify(next)) } catch {}
    window.dispatchEvent(new Event('ob-snap-update'))
  }

  function toggleCategory(id: string) {
    setOpenCategories(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleContinue() {
    if (isAdvancing || selected.length < MIN_TAGS) return
    setIsAdvancing(true)
    try { sessionStorage.setItem(SK.e_interests, JSON.stringify(selected)) } catch {}
    router.push('/onboarding/explorer/E5b')
  }

  const canProceed = selected.length >= MIN_TAGS

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
          What do you want to discover?
        </h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: '#9896B0', margin: '0 0 4px', maxWidth: 400 }}>
          Pick at least 3 things that pull you in.
        </p>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#9896B0', margin: '0 0 32px' }}>
          {selected.length} selected
        </p>

        <InterestTagPicker
          selected={selected}
          onToggle={toggle}
          categories={CATEGORY_ORDER.map(key => ({ key, label: CATEGORY_LABELS[key] ?? key, icon: CATEGORY_ICONS[key] }))}
          openCategories={openCategories}
          onToggleCategory={toggleCategory}
          wrapperStyle={{ maxWidth: 560 }}
          sectionWrapperStyle={() => ({ background: 'rgba(255,255,255,0.02)', border: `1px dashed ${ACCENT}20` })}
          renderCategoryHeader={({ category, isOpen, count, toggle: toggleCat }) => (
            <button
              type="button"
              onClick={toggleCat}
              style={{
                width:        '100%',
                display:      'flex', alignItems: 'center', gap: 10,
                padding:      '10px 14px',
                background:   isOpen ? `${ACCENT}08` : 'transparent',
                border:       'none', cursor: 'pointer',
                borderBottom: isOpen ? `1px solid ${ACCENT}20` : 'none',
                transition:   'background 150ms',
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize:             16, lineHeight: 1,
                  color:                count > 0 ? ACCENT : 'rgba(255,255,255,0.28)',
                  fontVariationSettings: count > 0 ? "'FILL' 1" : "'FILL' 0",
                  transition:           'all 150ms',
                }}
              >
                {category.icon ?? 'category'}
              </span>
              <span style={{
                fontFamily:    "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
                fontSize:      9,
                fontWeight:    700,
                color:         count > 0 ? '#F0EFF8' : ACCENT,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                flex:          1, textAlign: 'left',
                transition:    'color 150ms',
              }}>
                {category.label}
              </span>
              {count > 0 && (
                <span style={{
                  fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
                  fontSize:   9,
                  color:      ACCENT,
                  background: `${ACCENT}20`,
                  padding:    '2px 8px', borderRadius: 999,
                  flexShrink: 0,
                }}>
                  {count}
                </span>
              )}
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize:   16, lineHeight: 1,
                  color:      'rgba(255,255,255,0.22)',
                  transform:  isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 200ms',
                  flexShrink: 0,
                }}
              >
                expand_more
              </span>
            </button>
          )}
          chipsRowStyle={{ padding: '12px 14px' }}
          chipStyle={(tag, isSel) => ({
            padding:      '8px 14px',
            borderRadius: 9999,
            border:       `1px solid ${isSel ? ACCENT : 'rgba(155,143,255,0.25)'}`,
            background:   isSel ? 'rgba(155,143,255,0.15)' : 'transparent',
            color:        isSel ? ACCENT : 'rgba(255,255,255,0.60)',
            fontFamily:   "'DM Sans', sans-serif",
            fontWeight:   500,
            fontSize:     13,
            cursor:       'pointer',
            transition:   'all 150ms',
            display:      'flex',
            alignItems:   'center',
            gap:          5,
          })}
        />
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
          {canProceed ? ONBOARDING_CTA.E5.withCount(selected.length) : `Pick ${MIN_TAGS - selected.length} more`}
        </button>
      </footer>
    </>
  )
}
