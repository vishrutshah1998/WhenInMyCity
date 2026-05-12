'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  generateUsernameFromName,
  saveOnboardingScreen,
} from '@/app/actions/onboarding'
import { WimcLogo } from '@/components/WimcLogo'
import { CREATOR_CATEGORIES, EXPLORING_OPTION, getCategoryColors } from '@/lib/constants/categories'
import type { V2_CREATOR_TYPES } from '@/types/onboarding'

type V2CreatorType = typeof V2_CREATOR_TYPES[number]
type PersonaType = 'creator' | 'business' | 'personal'

const PERSONA_LIST = [
  {
    id: 'creator' as PersonaType,
    label: 'Creator',
    emoji: '🎨',
    description: 'Musicians, artists, comedians & educators',
    accent: '#E8572A',
    bg: 'rgba(232, 87, 42, 0.12)',
    border: 'rgba(232, 87, 42, 0.40)',
  },
  {
    id: 'business' as PersonaType,
    label: 'Business',
    emoji: '🏢',
    description: 'Brands, local shops & professional services',
    accent: '#5B8DEF',
    bg: 'rgba(91, 141, 239, 0.12)',
    border: 'rgba(91, 141, 239, 0.40)',
  },
  {
    id: 'personal' as PersonaType,
    label: 'Personal',
    emoji: '✨',
    description: 'Lifestyle, wellness & community builders',
    accent: '#3D7F53',
    bg: 'rgba(61, 127, 83, 0.12)',
    border: 'rgba(61, 127, 83, 0.40)',
  },
]

interface MinCategory {
  id: string
  emoji: string
  label: string
  primaryColor: string
  secondaryColor: string
  nextLabel?: string
}

const ALL_CATEGORIES: MinCategory[] = [
  ...CREATOR_CATEGORIES,
  { ...EXPLORING_OPTION, nextLabel: undefined },
]

// Grouped for section headers — accents aligned to PERSONA_LIST and corresponding theme families
const GROUPED_CATEGORIES = [
  {
    label:   'Creator',
    persona: 'creator' as PersonaType,
    accent:  '#E8572A',
    ids: ['music', 'comedy_theatre', 'art_design', 'video_content', 'teaching_coaching'],
  },
  {
    label:   'Business',
    persona: 'business' as PersonaType,
    accent:  '#5B8DEF',
    ids: ['business_brand', 'professional_portfolio'],
  },
  {
    label:   'Personal',
    persona: 'personal' as PersonaType,
    accent:  '#3D7F53',
    ids: ['lifestyle_wellness', 'community_impact', 'exploring'],
  },
].map((s) => ({
  ...s,
  categories: s.ids.map((id) => ALL_CATEGORIES.find((c) => c.id === id)!).filter(Boolean),
}))

export default function Screen1Page() {
  const router = useRouter()

  const [persona, setPersona] = useState<PersonaType | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [creatorType, setCreatorType] = useState<V2CreatorType | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [nameSuggestTimer, setNameSuggestTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    try {
      const savedPersona = sessionStorage.getItem('wimc_persona') as PersonaType | null
      const s1 = JSON.parse(sessionStorage.getItem('wimc_s1') || 'null')
      const claimedUsername = sessionStorage.getItem('wimc_claimed_username')
      if (savedPersona) setPersona(savedPersona)
      if (s1?.displayName) setDisplayName(s1.displayName)
      if (s1?.username)    setUsername(s1.username)
      else if (claimedUsername) setUsername(claimedUsername)
      if (s1?.creatorType) setCreatorType(s1.creatorType)
    } catch { /* ignore */ }
  }, [])

  const colors = getCategoryColors(creatorType)

  function handlePersonaSelect(p: PersonaType) {
    setPersona(p)
    setError(null)
    sessionStorage.setItem('wimc_persona', p)
  }

  function handleNameChange(value: string) {
    setDisplayName(value)
    if (nameSuggestTimer) clearTimeout(nameSuggestTimer)
    if (value.trim().length >= 2) {
      setNameSuggestTimer(
        setTimeout(async () => {
          const suggested = await generateUsernameFromName(value)
          setUsername(suggested)
        }, 800),
      )
    } else {
      setUsername('')
    }
  }

  function handleCategorySelect(id: V2CreatorType) {
    setCreatorType(id)
    setError(null)
    // Auto-set persona when user taps a category tile before picking a persona
    if (!persona) {
      const section = GROUPED_CATEGORIES.find((s) => s.ids.includes(id))
      if (section) {
        setPersona(section.persona)
        sessionStorage.setItem('wimc_persona', section.persona)
      }
    }
  }

  function handleContinue() {
    if (!displayName.trim()) { setError('Please enter your name.'); return }
    if (!creatorType)         { setError('Please select a category.'); return }
    setError(null)

    startTransition(async () => {
      const finalUsername = username || await generateUsernameFromName(displayName)
      const result = await saveOnboardingScreen(1, {
        displayName: displayName.trim(),
        username: finalUsername,
        creatorType,
      })
      if (result.error) { setError(result.error); return }
      sessionStorage.setItem('wimc_s1', JSON.stringify({
        displayName: displayName.trim(), username: finalUsername, creatorType,
      }))
      router.push('/onboarding/screen-2')
    })
  }

  const selectedCat = [...CREATOR_CATEGORIES, EXPLORING_OPTION].find((c) => c.id === creatorType)
  const ctaLabel = (selectedCat as MinCategory | undefined)?.nextLabel ?? 'Continue →'
  const isValid = displayName.trim().length > 0 && creatorType !== null
  const selectedPersona = PERSONA_LIST.find((p) => p.id === persona)

  return (
    <div className="flex flex-col min-h-screen bg-background text-on-surface font-body transition-colors duration-500">
      {/* Ambient glow */}
      <div
        className="fixed inset-0 -z-10 pointer-events-none transition-opacity duration-700"
        style={{ background: `radial-gradient(ellipse 60% 40% at 70% 10%, ${colors.secondary}80, transparent)` }}
      />

      <header className="w-full flex items-center justify-between px-5 py-3">
        <WimcLogo size="xs" />
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-28 bg-surface-container-high rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: '25%', backgroundColor: colors.primary }}
            />
          </div>
          <span className="text-xs text-on-surface-variant font-medium">1 / 4</span>
        </div>
      </header>

      <main className="flex-1 px-5 pt-3 pb-28 max-w-xl mx-auto w-full space-y-5">
        {/* Title */}
        <div>
          <p className="text-xs font-semibold text-on-surface-variant mb-1 tracking-wide uppercase">Hey there 👋</p>
          <h1 className="text-2xl font-headline font-extrabold text-on-surface tracking-tight leading-tight">
            Let&rsquo;s set up your page.
          </h1>
        </div>

        {/* Name */}
        <section className="space-y-1.5">
          <label className="block text-xs font-semibold text-on-surface-variant" htmlFor="display-name">
            Who are you?
          </label>
          <input
            id="display-name"
            type="text"
            placeholder="Your name or brand name"
            value={displayName}
            onChange={(e) => handleNameChange(e.target.value)}
            maxLength={80}
            className="w-full px-4 py-3 rounded-xl bg-surface-container-low border-2 border-transparent focus:border-primary/30 focus:bg-surface-container transition-all text-on-surface placeholder:text-on-surface-variant/40 outline-none text-base"
          />
          {username && (
            <p className="text-xs text-on-surface-variant/55 px-0.5">
              wimcity.in/<span className="font-semibold" style={{ color: colors.primary }}>{username}</span>
              {' '}· change later
            </p>
          )}
        </section>

        {/* Persona / type selection */}
        <section className="space-y-2">
          <label className="block text-xs font-semibold text-on-surface-variant">
            What do you do?
          </label>
          <div className="flex gap-2">
            {PERSONA_LIST.map((p) => {
              const isSelected = persona === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePersonaSelect(p.id)}
                  className="flex-1 flex flex-col items-center justify-center gap-1 py-3 px-1 rounded-xl border-2 transition-all duration-200 active:scale-95"
                  style={{
                    backgroundColor: isSelected ? p.bg : 'transparent',
                    borderColor: isSelected ? p.border : 'rgba(255,255,255,0.08)',
                  }}
                >
                  <span className="text-xl leading-none">{p.emoji}</span>
                  <span
                    className="text-[11px] font-bold leading-none"
                    style={{ color: isSelected ? p.accent : 'rgba(255,255,255,0.45)' }}
                  >
                    {p.label}
                  </span>
                </button>
              )
            })}
          </div>
          {selectedPersona && (
            <p
              key={selectedPersona.id}
              className="text-xs px-0.5 transition-all duration-300"
              style={{ color: selectedPersona.accent + 'BB' }}
            >
              {selectedPersona.description}
            </p>
          )}
        </section>

        {/* Category grid — always visible, persona selection focuses the matching section */}
        <section className="space-y-2">
          <label className="block text-xs font-semibold text-on-surface-variant">
            How do you do what you do?
          </label>
          <div className="space-y-3">
            {GROUPED_CATEGORIES.map((section) => {
              return (
                <div key={section.label}>
                  {/* Section divider */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="h-px flex-1 rounded-full" style={{ backgroundColor: `${section.accent}22` }} />
                    <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: `${section.accent}66` }}>
                      {section.label}
                    </span>
                    <div className="h-px flex-1 rounded-full" style={{ backgroundColor: `${section.accent}22` }} />
                  </div>
                  {/* 2-col grid within section */}
                  <div className="grid grid-cols-2 gap-2">
                    {section.categories.map((cat, i) => {
                      const isSelected = creatorType === cat.id
                      // Use this section's own accent so each group previews its colour family
                      const tileAccent = section.accent
                      const isLastOdd = i === section.categories.length - 1 && section.categories.length % 2 !== 0
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleCategorySelect(cat.id as V2CreatorType)}
                          className={`relative flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200 active:scale-95 border-2${isLastOdd ? ' col-span-2' : ''}`}
                          style={{
                            backgroundColor: isSelected ? `${tileAccent}18` : 'rgba(255,255,255,0.04)',
                            borderColor: isSelected ? tileAccent : 'transparent',
                          }}
                        >
                          {isSelected && (
                            <div
                              className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: tileAccent }}
                            >
                              <span
                                className="material-symbols-outlined text-white"
                                style={{ fontSize: 11, fontVariationSettings: "'wght' 700, 'FILL' 1", lineHeight: 1 }}
                              >
                                check
                              </span>
                            </div>
                          )}
                          <span className="text-xl flex-shrink-0 leading-none">{cat.emoji}</span>
                          <span
                            className="font-headline font-bold text-xs leading-tight"
                            style={{ color: isSelected ? tileAccent : 'rgba(255,255,255,0.65)' }}
                          >
                            {cat.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {error && <p className="text-error text-xs font-medium">{error}</p>}
      </main>

      {/* Sticky CTA */}
      <footer className="fixed bottom-0 left-0 w-full z-50 px-5 py-4 bg-background/90 backdrop-blur-sm border-t border-outline-variant/10">
        <div className="max-w-xl mx-auto">
          <button
            type="button"
            onClick={handleContinue}
            disabled={!isValid || isPending}
            className="w-full py-4 px-6 font-headline font-bold rounded-xl shadow-lg active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-35 disabled:cursor-not-allowed text-white"
            style={{ backgroundColor: colors.primary }}
          >
            {isPending ? 'Saving…' : ctaLabel}
            {!isPending && <span className="material-symbols-outlined text-lg">arrow_forward</span>}
          </button>
        </div>
      </footer>

      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
      <style>{`.material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }`}</style>
    </div>
  )
}
