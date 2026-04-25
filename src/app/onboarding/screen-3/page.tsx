'use client'

import { useState, useTransition, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { completeOnboarding, uploadOnboardingAvatar } from '@/app/actions/onboarding'
import { getCategoryColors, getCategoryConfig, CREATOR_CATEGORIES, EXPLORING_OPTION } from '@/lib/constants/categories'
import type { CreatorType } from '@/types/database'
import type { Screen1Data, Screen2Data } from '@/types/onboarding'

function normalizeUrl(url: string, platform: string): string {
  if (platform === 'whatsapp') return url
  if (url && !url.startsWith('http')) return `https://${url}`
  return url
}

function loadScreenData(): { s1: Screen1Data | null; s2: Screen2Data | null } {
  if (typeof window === 'undefined') return { s1: null, s2: null }
  try {
    const s1 = JSON.parse(sessionStorage.getItem('wimc_s1') || 'null')
    const s2 = JSON.parse(sessionStorage.getItem('wimc_s2') || 'null')
    return { s1, s2 }
  } catch {
    return { s1: null, s2: null }
  }
}

export default function Screen3Page() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [s1, setS1] = useState<Screen1Data | null>(null)
  const [s2, setS2] = useState<Screen2Data | null>(null)
  const [bio, setBio] = useState('')
  const [socialInputs, setSocialInputs] = useState<Record<string, string>>({})
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const { s1: data1, s2: data2 } = loadScreenData()
    if (!data1 || !data2) {
      router.replace('/onboarding/screen-1')
      return
    }
    setS1(data1)
    setS2(data2)
  }, [router])

  useEffect(() => {
    return () => { if (avatarPreview) URL.revokeObjectURL(avatarPreview) }
  }, [avatarPreview])

  const colors = getCategoryColors(s1?.creatorType ?? null)

  const categoryConfig = s1?.creatorType && s1.creatorType !== 'exploring'
    ? getCategoryConfig(s1.creatorType as CreatorType)
    : null

  const categoryLabel = s1?.creatorType === 'exploring'
    ? EXPLORING_OPTION.label
    : CREATOR_CATEGORIES.find((c) => c.id === s1?.creatorType)?.label ?? ''

  const city = s2?.city ?? ''
  const rawBioSuggestion = categoryConfig?.bioSuggestion ?? ''
  const bioSuggestion = city
    ? rawBioSuggestion.replace(/\[city\]/g, city)
    : rawBioSuggestion
  const bioPlaceholder = bioSuggestion
    ? `e.g. ${bioSuggestion}`
    : city
      ? `e.g. Who are you and what do you create in ${city}?`
      : 'e.g. Who are you and what do you create?'
  const platforms = categoryConfig?.suggestedPlatforms ?? []

  function handleSocialInput(platform: string, value: string) {
    setSocialInputs((prev) => ({ ...prev, [platform]: value }))
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleSubmit = useCallback(() => {
    if (!s1 || !s2) return
    setError(null)

    startTransition(async () => {
      const socialLinks = Object.entries(socialInputs)
        .filter(([, url]) => url.trim().length > 0)
        .map(([platform, url]) => ({ platform, url: normalizeUrl(url.trim(), platform) }))

      const result = await completeOnboarding({
        displayName: s1.displayName,
        username: s1.username,
        creatorType: s1.creatorType,
        subTypes: s2.subTypes,
        city: s2.city,
        offlineActivities: s2.offlineActivities ?? [],
        bio: bio.trim() || undefined,
        socialLinks,
        themeVariant: 'soft',
      })

      if (result.error) { setError(result.error); return }

      if (avatarFile) {
        const fd = new FormData()
        fd.append('file', avatarFile)
        const { error: avatarErr } = await uploadOnboardingAvatar(fd)
        if (avatarErr) console.warn('[onboarding] avatar upload skipped:', avatarErr)
      }

      sessionStorage.removeItem('wimc_s1')
      sessionStorage.removeItem('wimc_s2')

      router.push(
        `/onboarding/complete?username=${encodeURIComponent(result.username)}&name=${encodeURIComponent(s1.displayName)}`,
      )
    })
  }, [s1, s2, bio, socialInputs, avatarFile, router])

  if (!s1 || !s2) return null

  return (
    <div className="flex flex-col min-h-screen bg-background text-on-surface font-body">
      {/* Ambient glow */}
      <div
        className="fixed inset-0 -z-10 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 50% 35% at 80% 0%, ${colors.secondary}60, transparent)` }}
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
              style={{ width: '100%', backgroundColor: colors.primary }}
            />
          </div>
          <span className="text-xs text-on-surface-variant font-medium">3 / 3</span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-6 pt-4 pb-44 max-w-xl mx-auto w-full space-y-10">
        {/* Heading */}
        <div>
          <p className="text-sm font-medium text-on-surface-variant mb-1">Almost done ✨</p>
          <h1 className="text-2xl font-headline font-extrabold text-on-surface tracking-tight">
            Add a photo and a quick bio.
          </h1>
        </div>

        {/* Avatar upload */}
        <section className="flex items-center gap-5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative w-20 h-20 rounded-full overflow-hidden flex items-center justify-center bg-surface-container-high border-4 border-surface shrink-0 group transition-transform hover:scale-105 active:scale-95 shadow-sm"
          >
            {avatarPreview ? (
              <Image src={avatarPreview} alt="Avatar" width={80} height={80} className="w-full h-full object-cover" unoptimized />
            ) : (
              <span className="material-symbols-outlined text-3xl text-on-surface-variant" style={{ fontVariationSettings: "'FILL' 1" }}>photo_camera</span>
            )}
            <div
              className="absolute bottom-0.5 right-0.5 w-7 h-7 rounded-full flex items-center justify-center border-2 border-background"
              style={{ backgroundColor: colors.primary }}
            >
              <span className="material-symbols-outlined text-white text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
            </div>
          </button>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} />
          <div>
            <p className="font-headline font-bold text-on-surface text-base">{s1.displayName}</p>
            <p className="text-sm text-on-surface-variant">@{s1.username}</p>
            {categoryLabel && (
              <span
                className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                style={{ backgroundColor: `${colors.primary}20`, color: colors.primary }}
              >
                {categoryLabel}
              </span>
            )}
          </div>
        </section>

        {/* Bio */}
        <section className="space-y-3">
          <label className="block text-base font-semibold text-on-surface" htmlFor="bio">
            Tell people who you are in 1–2 lines.
            <span className="text-sm font-normal text-on-surface-variant ml-2">(optional)</span>
          </label>
          <textarea
            id="bio"
            placeholder={bioPlaceholder}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={160}
            rows={3}
            className="w-full px-5 py-4 rounded-xl bg-surface-container-low border-2 border-transparent focus:border-primary/30 focus:bg-surface-container transition-all text-on-surface placeholder:text-on-surface-variant/40 outline-none resize-none text-sm"
          />
          <div className="flex items-center justify-between px-1">
            <p className="text-xs text-on-surface-variant/60">{bio.length}/160</p>
          </div>
          {bioSuggestion && !bio && (
            <button
              type="button"
              onClick={() => setBio(bioSuggestion)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors hover:bg-surface-container"
              style={{ borderColor: `${colors.primary}40`, color: colors.primary }}
            >
              <span className="material-symbols-outlined text-sm">auto_fix_high</span>
              Try a suggestion
            </button>
          )}
        </section>

        {/* Social links — flat, optional */}
        {platforms.length > 0 && (
          <section className="space-y-4">
            <div>
              <p className="text-base font-semibold text-on-surface">
                Add your links
                <span className="text-sm font-normal text-on-surface-variant ml-2">(optional)</span>
              </p>
              <p className="text-sm text-on-surface-variant mt-0.5">Skip for now — you can add these from your profile later.</p>
            </div>
            <div className="space-y-3">
              {platforms.map((p) => (
                <div key={p.id}>
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">
                    {p.label}
                  </label>
                  <input
                    type="text"
                    placeholder={p.placeholder}
                    value={socialInputs[p.id] ?? ''}
                    onChange={(e) => handleSocialInput(p.id, e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-surface-container-low border-2 border-transparent focus:border-primary/30 focus:bg-surface-container transition-all text-on-surface placeholder:text-on-surface-variant/40 outline-none text-sm"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {error && <p className="text-error text-sm font-medium">{error}</p>}
      </main>

      {/* Fixed CTA */}
      <footer className="fixed bottom-0 left-0 w-full z-50 px-6 py-5 bg-background/90 backdrop-blur-sm border-t border-outline-variant/10">
        <div className="max-w-xl mx-auto">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="w-full py-4 px-6 font-headline font-bold rounded-xl shadow-lg active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed text-white"
            style={{ backgroundColor: colors.primary }}
          >
            {isPending ? 'Launching your page…' : 'Launch my page 🚀'}
          </button>
        </div>
      </footer>

      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
      <style>{`.material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }`}</style>
    </div>
  )
}
