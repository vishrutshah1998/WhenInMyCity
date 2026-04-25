'use client'

import { useState, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  checkUsernameAvailable,
  generateUsernameFromName,
  saveOnboardingScreen,
} from '@/app/actions/onboarding'
import { CREATOR_CATEGORIES, EXPLORING_OPTION, getCategoryColors } from '@/lib/constants/categories'
import type { V2_CREATOR_TYPES } from '@/types/onboarding'

type V2CreatorType = typeof V2_CREATOR_TYPES[number]

const ALL_CATEGORIES = [
  ...CREATOR_CATEGORIES,
  {
    ...EXPLORING_OPTION,
    subTypes: [],
    suggestedPlatforms: [],
    offlineActivities: null,
    bioSuggestion: '',
    nextLabel: 'Continue',
  },
]

export default function Screen1Page() {
  const router = useRouter()

  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [creatorType, setCreatorType] = useState<V2CreatorType | null>(null)
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle')
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const [nameSuggestTimer, setNameSuggestTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  const [usernameCheckTimer, setUsernameCheckTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

  const colors = getCategoryColors(creatorType)
  const selectedCategory = ALL_CATEGORIES.find((c) => c.id === (creatorType as string))

  const checkUsername = useCallback(async (value: string) => {
    if (!value || value.length < 3) { setUsernameStatus('idle'); return }
    setUsernameStatus('checking')
    const result = await checkUsernameAvailable(value)
    if (!result.available && result.error) {
      setUsernameStatus('invalid')
      setUsernameError(result.error)
    } else if (result.available) {
      setUsernameStatus('available')
      setUsernameError(null)
    } else {
      setUsernameStatus('taken')
      setUsernameError('This username is already taken.')
    }
  }, [])

  function handleUsernameChange(value: string) {
    const n = value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30)
    setUsername(n)
    setUsernameStatus('idle')
    setUsernameError(null)
    if (usernameCheckTimer) clearTimeout(usernameCheckTimer)
    if (n.length >= 3) {
      setUsernameCheckTimer(setTimeout(() => checkUsername(n), 600))
    }
  }

  function handleNameChange(value: string) {
    setDisplayName(value)
    if (nameSuggestTimer) clearTimeout(nameSuggestTimer)
    if (value.trim().length >= 2) {
      setNameSuggestTimer(
        setTimeout(async () => {
          const suggested = await generateUsernameFromName(value)
          setUsername(suggested)
          setUsernameStatus('available')
          setUsernameError(null)
        }, 800),
      )
    }
  }

  function handleCategorySelect(id: V2CreatorType) {
    setCreatorType(id)
    setError(null)
  }

  function handleContinue() {
    if (!displayName.trim()) { setError('Please enter your name.'); return }
    if (!username || username.length < 3) { setError('Please choose a username (at least 3 characters).'); return }
    if (usernameStatus === 'taken' || usernameStatus === 'invalid') { setError(usernameError || 'Please choose a different username.'); return }
    if (!creatorType) { setError('Please select a category.'); return }

    setError(null)
    startTransition(async () => {
      const result = await saveOnboardingScreen(1, {
        displayName: displayName.trim(),
        username,
        creatorType,
      })
      if (result.error) { setError(result.error); return }
      sessionStorage.setItem('wimc_s1', JSON.stringify({ displayName: displayName.trim(), username, creatorType }))
      router.push('/onboarding/screen-2')
    })
  }

  const usernameStatusIcon =
    usernameStatus === 'checking' ? (
      <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Checking…</span>
    ) : usernameStatus === 'available' ? (
      <div className="flex items-center gap-1 px-2 py-1 rounded-full border" style={{ borderColor: `${colors.primary}40`, backgroundColor: `${colors.primary}15` }}>
        <span className="material-symbols-outlined text-sm" style={{ color: colors.primary, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.primary }}>Available</span>
      </div>
    ) : usernameStatus === 'taken' || usernameStatus === 'invalid' ? (
      <div className="flex items-center gap-1 bg-error/10 px-2 py-1 rounded-full border border-error/20">
        <span className="material-symbols-outlined text-error text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>cancel</span>
        <span className="text-[10px] font-bold text-error uppercase tracking-wider">Taken</span>
      </div>
    ) : null

  const ctaLabel = selectedCategory?.nextLabel ?? 'Continue →'
  const isValid =
    displayName.trim().length > 0 &&
    username.length >= 3 &&
    usernameStatus !== 'taken' &&
    usernameStatus !== 'invalid' &&
    creatorType !== null

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
        </section>

        {/* Q2 — Handle */}
        <section className="space-y-3">
          <label className="block text-base font-semibold text-on-surface" htmlFor="username">
            Pick your page link.
            <span className="text-sm font-normal text-on-surface-variant ml-2">You can change this later.</span>
          </label>
          <div className="relative">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 font-headline font-bold" style={{ color: colors.primary }}>@</span>
            <input
              id="username"
              type="text"
              placeholder="yourname"
              value={username}
              onChange={(e) => handleUsernameChange(e.target.value)}
              maxLength={30}
              className="w-full pl-10 pr-32 py-4 rounded-xl bg-surface-container-low border-2 border-transparent focus:border-primary/30 focus:bg-surface-container transition-all text-on-surface placeholder:text-on-surface-variant/40 outline-none"
            />
            {usernameStatusIcon && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">{usernameStatusIcon}</div>
            )}
          </div>
          {usernameError && <p className="text-error text-xs font-medium px-1">{usernameError}</p>}
          {username && usernameStatus !== 'taken' && usernameStatus !== 'invalid' && (
            <p className="text-xs text-on-surface-variant px-1">
              wimcity.in/<span className="font-semibold text-on-surface">{username}</span>
            </p>
          )}
        </section>

        {/* Q3 — Category */}
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
          {/* "Just exploring" link */}
          <button
            type="button"
            onClick={() => handleCategorySelect('exploring')}
            className="w-full text-center text-sm text-on-surface-variant underline underline-offset-2 py-2 transition-colors hover:text-on-surface"
            style={creatorType === 'exploring' ? { color: colors.primary, textDecorationColor: colors.primary } : undefined}
          >
            {creatorType === 'exploring' ? '✓ ' : ''}Just exploring
          </button>
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
