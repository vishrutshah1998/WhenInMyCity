'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SK } from '@/lib/onboarding/session-keys'
import { INTEREST_TAGS, INTEREST_CATEGORY_COLORS, INTEREST_CATEGORY_ORDER, type InterestCategory } from '@/lib/constants/interests'
import { getCategoryColour } from '@/lib/onboarding/design-tokens'
import { ONBOARDING_CTA } from '@/lib/constants/onboarding-cta-copy'
import InterestTagPicker from '@/components/shared/InterestTagPicker'
import { OnboardingFooter } from '@/components/onboarding/OnboardingFooter'

const MIN_TAGS = 3
const SCENE_BLUE = '#5EC8F2'

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

export default function C7Page() {
  const router = useRouter()
  const [selected,       setSelected]       = useState<string[]>([])
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set([CATEGORY_ORDER[0]]))
  const [accent,         setAccent]         = useState('#F5A800')
  const [isAdvancing,    setIsAdvancing]    = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem(SK.persona) !== 'creator') { router.replace('/onboarding'); return }
    const plats = sessionStorage.getItem(SK.c_platforms)
    if (plats === null) { router.replace('/onboarding/creator/C6'); return }
    const cat = sessionStorage.getItem(SK.c_category) || ''
    setAccent(getCategoryColour(cat))
    try {
      const saved = JSON.parse(sessionStorage.getItem(SK.c_interests) || '[]') as string[]
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
    try { sessionStorage.setItem(SK.c_interests, JSON.stringify(next)) } catch {}
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
    try { sessionStorage.setItem(SK.c_interests, JSON.stringify(selected)) } catch {}
    router.push('/onboarding/creator/C8')
  }

  function handleSkip() {
    if (isAdvancing) return
    setIsAdvancing(true)
    try { sessionStorage.setItem(SK.c_interests, '[]') } catch {}
    router.push('/onboarding/creator/C8')
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
          What makes you <span style={{ color: SCENE_BLUE }}>step out</span>?
        </h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: '#9896B0', margin: '0 0 4px', maxWidth: 400 }}>
          Pick at least 3 things that get you out the door.
        </p>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#9896B0', margin: '0 0 16px' }}>
          {selected.length} selected
        </p>

        {/* My picks — pinned, horizontally-scrollable summary of current selections */}
        {selected.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8, padding: '10px 12px', marginBottom: 20, maxWidth: 560,
          }}>
            <span style={{
              fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
              fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', color: accent,
              textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              MY PICKS [{selected.length}]
            </span>
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
              {selected.map(id => {
                const tag = INTEREST_TAGS.find(t => t.id === id)
                if (!tag) return null
                const catColor = INTEREST_CATEGORY_COLORS[tag.category as InterestCategory]
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggle(id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      border: `1px solid ${catColor}`, color: catColor,
                      borderRadius: 999, padding: '4px 10px',
                      fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600,
                      whiteSpace: 'nowrap', cursor: 'pointer', background: 'transparent', flexShrink: 0,
                    }}
                  >
                    <span>{tag.emoji}</span>
                    {tag.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <InterestTagPicker
          selected={selected}
          onToggle={toggle}
          categories={CATEGORY_ORDER.map(key => ({ key, label: CATEGORY_LABELS[key] ?? key, icon: CATEGORY_ICONS[key] }))}
          openCategories={openCategories}
          onToggleCategory={toggleCategory}
          wrapperStyle={{ maxWidth: 560 }}
          sectionWrapperStyle={({ category, isOpen }) => {
            const catColor = INTEREST_CATEGORY_COLORS[category.key as InterestCategory]
            return {
              background: 'rgba(255,255,255,0.02)', border: `1px dashed ${catColor}30`,
              opacity: isOpen ? 1 : 0.7, transition: 'opacity 150ms',
            }
          }}
          renderCategoryHeader={({ category, isOpen, count, toggle: toggleCat }) => {
            const catColor = INTEREST_CATEGORY_COLORS[category.key as InterestCategory]
            return (
              <button
                type="button"
                onClick={toggleCat}
                style={{
                  width:        '100%',
                  display:      'flex', alignItems: 'center', gap: 10,
                  padding:      '10px 14px',
                  background:   isOpen ? `${catColor}0D` : 'transparent',
                  border:       'none', cursor: 'pointer',
                  borderBottom: isOpen ? `1px solid ${catColor}25` : 'none',
                  transition:   'background 150ms',
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize:             16, lineHeight: 1,
                    color:                count > 0 ? catColor : 'rgba(255,255,255,0.28)',
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
                  color:         count > 0 ? '#F0EFF8' : catColor,
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
                    color:      catColor,
                    background: `${catColor}25`,
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
            )
          }}
          chipsRowStyle={{ padding: '12px 14px' }}
          chipStyle={(tag, isSel) => {
            const catColor = INTEREST_CATEGORY_COLORS[tag.category as InterestCategory]
            return {
              padding:      '8px 14px',
              borderRadius: 9999,
              border:       `1px solid ${isSel ? catColor : `${catColor}40`}`,
              background:   isSel ? catColor : 'transparent',
              color:        isSel ? '#1A2744' : 'rgba(255,255,255,0.60)',
              fontFamily:   "'DM Sans', sans-serif",
              fontWeight:   isSel ? 700 : 500,
              fontSize:     13,
              cursor:       'pointer',
              transition:   'all 150ms',
              display:      'flex',
              alignItems:   'center',
              gap:          5,
            }
          }}
        />
      </div>

      <OnboardingFooter
        onBack={() => router.push('/onboarding/creator/C6')}
        cta={canProceed ? ONBOARDING_CTA.C7.withCount(selected.length) : `Pick ${MIN_TAGS - selected.length} more`}
        onContinue={handleContinue}
        ctaDisabled={!canProceed || isAdvancing}
        ctaAccent={accent}
        secondaryAction={{ label: 'Skip', onClick: handleSkip, disabled: isAdvancing }}
      />
    </>
  )
}
