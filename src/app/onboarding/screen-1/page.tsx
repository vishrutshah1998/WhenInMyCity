'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  generateUsernameFromName,
  saveOnboardingScreen,
} from '@/app/actions/onboarding'
import { CREATOR_CATEGORIES, getCategoryColors } from '@/lib/constants/categories'
import type { V2_CREATOR_TYPES } from '@/types/onboarding'

type V2CreatorType = typeof V2_CREATOR_TYPES[number]

export default function Screen1Page() {
  const router = useRouter()

  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [creatorType, setCreatorType] = useState<V2CreatorType | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const [nameSuggestTimer, setNameSuggestTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

  const colors = getCategoryColors(creatorType)
  const selectedCategory = CREATOR_CATEGORIES.find((c) => c.id === (creatorType as string))

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
  }

  function handleContinue() {
    if (!displayName.trim()) { setError('Please enter your name.'); return }
    if (!creatorType) { setError('Please select a category.'); return }
    setError(null)

    startTransition(async () => {
      // Generate username now if the debounce timer hasn't fired yet
      const finalUsername = username || await generateUsernameFromName(displayName)

      const result = await saveOnboardingScreen(1, {
        displayName: displayName.trim(),
        username: finalUsername,
        creatorType,
      })
      if (result.error) { setError(result.error); return }
      sessionStorage.setItem('wimc_s1', JSON.stringify({ displayName: displayName.trim(), username: finalUsername, creatorType }))
      router.push('/onboarding/screen-2')
    })
  }

  const ctaLabel = selectedCategory?.nextLabel ?? 'Continue →'
  const isValid = displayName.trim().length > 0 && creatorType !== null

  return (
    <div className="flex flex-col min-h-screen bg-background text-on-surface font-body transition-colors duration-500">
      {/* Ambient color glow from selected category */}
      <div
        className="fixed inset-0 -z-10 pointer-events-none transition-opacity duration-700"
        style={{ background: `radial-gradient(ellipse 60% 40% at 70% 10%, ${colors.secondary}80, transparent)` }}
      />

      {/* Header */}
      <header className="w-full flex items-center justify-between px-6 py-4">
        <span className="brand-text text-primary text-xl font-bold">WIMCity</span>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-32 bg-surface-container-high rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: '33%', backgroundColor: colors.primary }}
            />
          </div>
          <span className="text-xs text-on-surface-variant font-medium">1 / 3</span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-6 pt-6 pb-40 max-w-xl mx-auto w-full space-y-10">
        {/* Greeting */}
        <div>
          <p className="text-sm font-medium text-on-surface-variant mb-1">Hey there 👋</p>
          <h1 className="text-3xl font-headline font-extrabold text-on-surface tracking-tight leading-tight">
            Let&rsquo;s set up<br />your page.
          </h1>
        </div>

        {/* Q1 — Name */}
        <section className="space-y-3">
          <label className="block text-base font-semibold text-on-surface" htmlFor="display-name">
            What should we call you?
          </label>
          <input
            id="display-name"
            type="text"
            placeholder="Your name or stage name"
            value={displayName}
            onChange={(e) => handleNameChange(e.target.value)}
            maxLength={80}
            className="w-full px-5 py-4 rounded-xl bg-surface-container-low border-2 border-transparent focus:border-primary/30 focus:bg-surface-container transition-all text-on-surface placeholder:text-on-surface-variant/40 outline-none text-base"
          />
          {/* Auto-generated handle preview */}
          {username && (
            <p className="text-xs text-on-surface-variant px-1">
              Your page:{' '}
              <span className="font-semibold" style={{ color: colors.primary }}>
                wimcity.in/{username}
              </span>
              <span className="ml-2 text-on-surface-variant/60">· you can change this later</span>
            </p>
          )}
        </section>

        {/* Q2 — Category */}
        <section className="space-y-4">
          <label className="block text-base font-semibold text-on-surface">
            What best describes you?
          </label>
          <div className="grid grid-cols-2 gap-3">
            {CREATOR_CATEGORIES.map((cat) => {
              const isSelected = creatorType === cat.id
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategorySelect(cat.id as V2CreatorType)}
                  className="relative flex flex-col items-start p-4 rounded-xl text-left transition-all duration-200 active:scale-95 border-2"
                  style={{
                    backgroundColor: isSelected ? cat.secondaryColor : undefined,
                    borderColor: isSelected ? cat.primaryColor : 'transparent',
                  }}
                >
                  {isSelected && (
                    <div
                      className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: cat.primaryColor }}
                    >
                      <span className="material-symbols-outlined text-white text-xs" style={{ fontVariationSettings: "'wght' 700, 'FILL' 1" }}>check</span>
                    </div>
                  )}
                  <span className="text-2xl mb-2">{cat.emoji}</span>
                  <span
                    className={`font-headline font-bold text-sm leading-tight ${!isSelected ? 'text-on-surface-variant' : ''}`}
                    style={isSelected ? { color: '#1a1a1a' } : undefined}
                  >
                    {cat.label}
                  </span>
                </button>
              )
            })}
          </div>

        </section>

        {error && <p className="text-error text-sm font-medium">{error}</p>}
      </main>

      {/* Fixed CTA */}
      <footer className="fixed bottom-0 left-0 w-full z-50 px-6 py-5 bg-background/90 backdrop-blur-sm border-t border-outline-variant/10">
        <div className="max-w-xl mx-auto">
          <button
            type="button"
            onClick={handleContinue}
            disabled={!isValid || isPending}
            className="w-full py-4 px-6 font-headline font-bold rounded-xl shadow-lg active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed text-white"
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
