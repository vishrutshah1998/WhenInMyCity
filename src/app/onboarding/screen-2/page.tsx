'use client'

import { useState, useTransition, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { saveOnboardingScreen } from '@/app/actions/onboarding'
import { getCategoryConfig, getCategoryColors, CREATOR_CATEGORIES, EXPLORING_OPTION } from '@/lib/constants/categories'
import { CITIES, INTEREST_TAGS } from '@/lib/constants/interests'
import type { CreatorType } from '@/types/database'
import type { Screen1Data } from '@/types/onboarding'

function loadScreen1(): Screen1Data | null {
  if (typeof window === 'undefined') return null
  try {
    return JSON.parse(sessionStorage.getItem('wimc_s1') || 'null')
  } catch {
    return null
  }
}

const INTEREST_CATEGORIES = [
  { id: 'performance', label: '🎭 Performance' },
  { id: 'arts',        label: '🎨 Arts' },
  { id: 'education',  label: '📚 Education' },
  { id: 'lifestyle',  label: '🌿 Lifestyle' },
  { id: 'tech',       label: '💡 Tech' },
] as const

export default function Screen2Page() {
  const router = useRouter()

  const [s1, setS1] = useState<Screen1Data | null>(null)
  const [subTypes, setSubTypes] = useState<string[]>([])
  const [city, setCity] = useState('')
  const [citySearch, setCitySearch] = useState('')
  const [cityFocused, setCityFocused] = useState(false)
  const [interestTags, setInterestTags] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const data = loadScreen1()
    if (!data) {
      router.replace('/onboarding/screen-1')
      return
    }
    setS1(data)
    try {
      const s2 = JSON.parse(sessionStorage.getItem('wimc_s2') || 'null')
      if (s2) {
        if (s2.subTypes) setSubTypes(s2.subTypes)
        if (s2.city) { setCity(s2.city); setCitySearch(s2.city) }
        if (s2.interestTags) setInterestTags(s2.interestTags)
      }
    } catch { /* ignore */ }
  }, [router])

  const categoryConfig = useMemo(() => {
    if (!s1?.creatorType) return null
    if (s1.creatorType === 'exploring') return null
    return getCategoryConfig(s1.creatorType as CreatorType)
  }, [s1])

  const colors = useMemo(() => getCategoryColors(s1?.creatorType ?? null), [s1])

  const categoryLabel = useMemo(() => {
    if (!s1?.creatorType) return ''
    if (s1.creatorType === 'exploring') return EXPLORING_OPTION.label
    return CREATOR_CATEGORIES.find((c) => c.id === s1.creatorType)?.label ?? ''
  }, [s1])

  const filteredCities = useMemo(() => {
    const q = citySearch.trim().toLowerCase()
    if (!q) {
      const tier2 = new Set([
        'jaipur', 'ahmedabad', 'surat', 'vadodara', 'lucknow', 'kanpur',
        'nagpur', 'indore', 'bhopal', 'chandigarh', 'patna', 'visakhapatnam',
        'kochi', 'coimbatore', 'madurai', 'nashik', 'ludhiana', 'agra',
        'varanasi', 'ranchi', 'bhubaneswar', 'amritsar', 'rajkot', 'mysuru',
        'guwahati', 'dehradun', 'udaipur', 'jodhpur',
      ])
      return [...CITIES].sort((a, b) => {
        const aT = tier2.has(a.id) ? 0 : 1
        const bT = tier2.has(b.id) ? 0 : 1
        if (aT !== bT) return aT - bT
        return a.name.localeCompare(b.name)
      })
    }
    return CITIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.state.toLowerCase().includes(q),
    )
  }, [citySearch])

  function toggleSubType(id: string) {
    setSubTypes((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  function toggleInterestTag(id: string) {
    setInterestTags((prev) =>
      prev.includes(id)
        ? prev.filter((t) => t !== id)
        : prev.length < 5 ? [...prev, id] : prev,
    )
  }

  function handleCitySelect(name: string) {
    setCity(name)
    setCitySearch(name)
  }

  function handleContinue() {
    if (categoryConfig && subTypes.length === 0) {
      setError('Please select at least one event type.')
      return
    }
    if (!city) {
      setError('Please select your city.')
      return
    }
    if (interestTags.length < 3) {
      setError('Pick at least 3 interests to continue.')
      return
    }
    setError(null)

    startTransition(async () => {
      const result = await saveOnboardingScreen(2, { subTypes, city, interestTags })
      if (result.error) { setError(result.error); return }
      sessionStorage.setItem('wimc_s2', JSON.stringify({ subTypes, city, interestTags }))
      router.push('/onboarding/screen-3')
    })
  }

  if (!s1) return null

  return (
    <div className="flex flex-col min-h-screen bg-background text-on-surface font-body">
      {/* Ambient glow */}
      <div
        className="fixed inset-0 -z-10 pointer-events-none transition-opacity duration-700"
        style={{ background: `radial-gradient(ellipse 60% 40% at 30% 5%, ${colors.secondary}70, transparent)` }}
      />

      {/* Header */}
      <header className="w-full flex items-center justify-between px-6 py-4">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors active:scale-95"
        >
          <span className="material-symbols-outlined" style={{ color: colors.primary }}>arrow_back</span>
        </button>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-32 bg-surface-container-high rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: '50%', backgroundColor: colors.primary }}
            />
          </div>
          <span className="text-xs text-on-surface-variant font-medium">2 / 4</span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-6 pt-4 pb-44 max-w-xl mx-auto w-full space-y-10">
        {/* Greeting */}
        <div>
          <p className="text-sm font-medium text-on-surface-variant mb-1">
            Nice,{' '}
            <span className="font-semibold text-on-surface">{s1.displayName.split(' ')[0]}</span>
            {categoryLabel ? ` · ${categoryLabel}` : ''}
          </p>
          <h1 className="text-2xl font-headline font-extrabold text-on-surface tracking-tight leading-snug">
            What do you actually do?
          </h1>
        </div>

        {/* 2A — Sub-types (only if category has them) */}
        {categoryConfig && (
          <section className="space-y-4">
            <label className="block text-base font-semibold text-on-surface">
              What kind of events do you host?
            </label>
            <div className="flex flex-wrap gap-2">
              {categoryConfig.subTypes.map((st) => {
                const isSelected = subTypes.includes(st.id)
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => toggleSubType(st.id)}
                    className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 active:scale-95 border-2"
                    style={{
                      backgroundColor: isSelected ? colors.primary : 'transparent',
                      borderColor: isSelected ? colors.primary : 'rgba(255, 255, 255, 0.2)',
                      color: isSelected ? '#ffffff' : 'inherit',
                    }}
                  >
                    {st.label}
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {/* 2B — City */}
        <section className="space-y-3">
          <label className="block text-base font-semibold text-on-surface" htmlFor="city-search">
            Where are you based out of?
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-xl pointer-events-none">location_on</span>
            <input
              id="city-search"
              type="text"
              placeholder="Search or scroll to pick a city…"
              value={citySearch}
              onChange={(e) => { setCitySearch(e.target.value); setCity('') }}
              onFocus={() => setCityFocused(true)}
              onBlur={() => setCityFocused(false)}
              className="w-full pl-11 pr-5 py-4 rounded-xl bg-surface-container-low border-2 border-transparent focus:border-primary/30 focus:bg-surface-container transition-all text-on-surface placeholder:text-on-surface-variant/40 outline-none"
            />
          </div>

          {cityFocused && !city && (
            <div className="bg-surface-container rounded-xl border border-outline-variant/20 overflow-hidden max-h-52 overflow-y-auto shadow-sm">
              {filteredCities.length === 0 ? (
                <p className="px-4 py-3 text-sm text-on-surface-variant">No cities found.</p>
              ) : (
                filteredCities.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleCitySelect(c.name)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-container-high transition-colors text-sm border-b border-outline-variant/10 last:border-0"
                  >
                    <span className="text-base">{c.emoji}</span>
                    <span className="font-medium text-on-surface">{c.name}</span>
                    <span className="text-on-surface-variant text-xs ml-auto">{c.state}</span>
                  </button>
                ))
              )}
            </div>
          )}

          {city && (
            <div
              className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium"
              style={{ borderColor: colors.primary, backgroundColor: `${colors.secondary}50` }}
            >
              <span className="material-symbols-outlined text-base" style={{ color: colors.primary, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              <span>{city}</span>
              <button
                type="button"
                onClick={() => { setCity(''); setCitySearch('') }}
                className="ml-auto text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>
          )}
        </section>

        {/* 2C — Interests */}
        <section className="space-y-4">
          <div>
            <label className="block text-base font-semibold text-on-surface">
              What do you step out for?{' '}
              <span className="text-on-surface-variant font-normal text-sm">— pick 3 to 5</span>
            </label>
            <p className="text-xs text-on-surface-variant mt-1">{interestTags.length}/5 selected</p>
          </div>

          {INTEREST_CATEGORIES.map((cat) => (
            <div key={cat.id} className="space-y-2">
              <p className="text-xs font-medium text-on-surface-variant tracking-wide">{cat.label}</p>
              <div className="flex flex-wrap gap-2">
                {INTEREST_TAGS.filter((t) => t.category === cat.id).map((tag) => {
                  const isSelected = interestTags.includes(tag.id)
                  const isDisabled = interestTags.length >= 5 && !isSelected
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => !isDisabled && toggleInterestTag(tag.id)}
                      className="px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150 active:scale-95 border-2"
                      style={{
                        backgroundColor: isSelected ? colors.primary : 'transparent',
                        borderColor: isSelected ? colors.primary : 'rgba(255, 255, 255, 0.2)',
                        color: isSelected ? '#ffffff' : 'inherit',
                        opacity: isDisabled ? 0.4 : 1,
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {tag.emoji} {tag.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </section>

        {error && <p className="text-error text-sm font-medium">{error}</p>}
      </main>

      {/* Fixed CTA */}
      <footer className="fixed bottom-0 left-0 w-full z-50 px-6 py-5 bg-background/90 backdrop-blur-sm border-t border-outline-variant/10">
        <div className="max-w-xl mx-auto">
          <button
            type="button"
            onClick={handleContinue}
            disabled={isPending}
            className="w-full py-4 px-6 font-headline font-bold rounded-xl shadow-lg active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed text-white"
            style={{ backgroundColor: colors.primary }}
          >
            {isPending ? 'Saving…' : 'Continue'}
            {!isPending && <span className="material-symbols-outlined text-lg">arrow_forward</span>}
          </button>
        </div>
      </footer>

      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
      <style>{`.material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }`}</style>
    </div>
  )
}
