'use client'

import { useState, useTransition, useRef, useMemo, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { updateProfile, uploadAvatar, deleteAccount } from '@/app/actions/profile'
import { checkUsernameAvailable } from '@/app/actions/onboarding'
import { signOut } from '@/app/actions/auth'
import type { CreatorType } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { CITIES } from '@/lib/constants/interests'
import {
  CREATOR_CATEGORIES,
  EXPLORING_OPTION,
  getCategoryColors,
  getCategoryConfig,
} from '@/lib/constants/categories'
import type { SocialPlatformConfig } from '@/lib/constants/categories'
import { V2_CREATOR_TYPES } from '@/types/onboarding'

type V2CreatorType = typeof V2_CREATOR_TYPES[number]

// Platform label lookup for any platform not in the category's suggested list
const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram', youtube: 'YouTube', spotify: 'Spotify',
  soundcloud: 'SoundCloud', jiosaavn: 'JioSaavn', twitter: 'Twitter',
  x: 'X (Twitter)', tiktok: 'TikTok', twitch: 'Twitch', podcast: 'Podcast',
  linkedin: 'LinkedIn', behance: 'Behance', dribbble: 'Dribbble',
  github: 'GitHub', website: 'Website', whatsapp: 'WhatsApp',
  googlemaps: 'Google Maps', zomato: 'Zomato / Swiggy', shopify: 'Shopify',
  telegram: 'Telegram', meetup: 'Meetup', substack: 'Substack', other: 'Link',
}

// ---------------------------------------------------------------------------
// Shared UI primitives
// ---------------------------------------------------------------------------

const inputCls = [
  'w-full bg-surface-container-low text-on-surface placeholder:text-on-surface-variant/40',
  'rounded-xl px-4 py-3 text-sm border-2 border-transparent',
  'focus:outline-none focus:border-primary/30 focus:bg-surface-container transition-all',
].join(' ')

const labelCls = 'block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-5 bg-surface-container-lowest rounded-2xl p-6 border border-white/5">
      <h2 className="font-headline font-bold text-base text-on-surface">{title}</h2>
      {children}
    </section>
  )
}

// ---------------------------------------------------------------------------
// ProfileForm — fetches its own data client-side
// ---------------------------------------------------------------------------

export default function ProfileForm() {
  const router = useRouter()
  const [loading, setLoading]     = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Core fields
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio]                 = useState('')
  const [avatarUrl, setAvatarUrl]     = useState<string | null>(null)
  const [username, setUsername]       = useState('')

  // Category
  const [creatorType, setCreatorType] = useState<V2CreatorType | null>(null)
  const [subTypes, setSubTypes]       = useState<string[]>([])

  // City + neighbourhood
  const [city, setCity]               = useState('')
  const [citySearch, setCitySearch]   = useState('')
  const [neighbourhood, setNeighbourhood] = useState('')

  // Offline activities / vibes
  const [offlineActivities, setOfflineActivities] = useState<string[]>([])

  // Username editing + availability
  const [savedUsername, setSavedUsername]         = useState('')
  const [usernameStatus, setUsernameStatus]       = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle')
  const [usernameError, setUsernameError]         = useState<string | null>(null)
  const [usernameCheckTimer, setUsernameCheckTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

  // Social links — keyed by platform id
  const [socialInputs, setSocialInputs]           = useState<Record<string, string>>({})
  const [expandedPlatforms, setExpandedPlatforms] = useState<Set<string>>(new Set())

  // Privacy
  const [showCityMastery, setShowCityMastery] = useState(false)

  // Avatar upload
  const fileInputRef                              = useRef<HTMLInputElement>(null)
  const [avatarFile, setAvatarFile]               = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview]         = useState<string | null>(null)

  useEffect(() => {
    return () => { if (avatarPreview) URL.revokeObjectURL(avatarPreview) }
  }, [avatarPreview])

  // ── Derived from selected category ────────────────────────────────────────
  const colors        = getCategoryColors(creatorType)
  const categoryConfig = useMemo(
    () => creatorType && creatorType !== 'exploring'
      ? getCategoryConfig(creatorType as CreatorType)
      : null,
    [creatorType],
  )

  // Platforms to show: category's suggested + any stored extras with values
  const displayPlatforms = useMemo((): SocialPlatformConfig[] => {
    const suggested = categoryConfig?.suggestedPlatforms ?? []
    const suggestedIds = new Set(suggested.map((p) => p.id))
    const extras: SocialPlatformConfig[] = []
    for (const [key, val] of Object.entries(socialInputs)) {
      if (!suggestedIds.has(key as never) && val.trim()) {
        extras.push({ id: key as never, label: PLATFORM_LABELS[key] ?? key, placeholder: '' })
      }
    }
    return [...suggested, ...extras]
  }, [categoryConfig, socialInputs])

  // City search results — only show when there's a query
  const filteredCities = useMemo(() => {
    const q = citySearch.trim().toLowerCase()
    if (!q || city === citySearch) return []
    return CITIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.state.toLowerCase().includes(q),
    ).slice(0, 12)
  }, [citySearch, city])

  // ── Fetch profile on mount ────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setFetchError('Not signed in.'); setLoading(false); return }
      supabase
        .from('user_profiles')
        .select('display_name, bio, avatar_url, username, creator_type, city, neighbourhood, sub_types, offline_activities, social_links, show_city_mastery')
        .eq('id', user.id)
        .single()
        .then(({ data, error }) => {
          if (error || !data) { setFetchError('Failed to load profile.'); setLoading(false); return }

          setDisplayName(data.display_name)
          setBio(data.bio ?? '')
          setAvatarUrl(data.avatar_url ?? null)
          setUsername(data.username)
          setSavedUsername(data.username)

          // Only pre-select if it's a V2 type
          const ct = data.creator_type as string
          if ((V2_CREATOR_TYPES as readonly string[]).includes(ct)) {
            setCreatorType(ct as V2CreatorType)
          }

          // City + neighbourhood
          setCity(data.city ?? '')
          setCitySearch(data.city ?? '')
          setNeighbourhood((data as { neighbourhood?: string | null }).neighbourhood ?? '')

          // v2 profile fields
          setSubTypes((data.sub_types as string[]) ?? [])
          setOfflineActivities((data.offline_activities as string[]) ?? [])

          // Social links — stored JSONB
          setSocialInputs((data.social_links as Record<string, string>) ?? {})

          setShowCityMastery(data.show_city_mastery ?? false)

          setLoading(false)
        })
    })
  }, [])

  // ── Category handlers ──────────────────────────────────────────────────────
  function handleCategorySelect(ct: V2CreatorType) {
    if (ct !== creatorType) {
      setSubTypes([])
      setOfflineActivities([])
    }
    setCreatorType(ct)
  }

  function toggleSubType(id: string) {
    setSubTypes((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  function toggleOfflineActivity(id: string) {
    if (id === 'not_right_now') {
      setOfflineActivities(['not_right_now'])
      return
    }
    setOfflineActivities((prev) => {
      const without = prev.filter((x) => x !== 'not_right_now')
      return without.includes(id) ? without.filter((x) => x !== id) : [...without, id]
    })
  }

  // ── City handlers ──────────────────────────────────────────────────────────
  function handleCitySelect(name: string) {
    setCity(name)
    setCitySearch(name)
  }

  // ── Username handlers ─────────────────────────────────────────────────────
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
      setUsernameError('That username is already taken.')
    }
  }, [])

  function handleUsernameChange(value: string) {
    const n = value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30)
    setUsername(n)
    setUsernameStatus('idle')
    setUsernameError(null)
    if (usernameCheckTimer) clearTimeout(usernameCheckTimer)
    // Only check availability if actually changed from saved value
    if (n !== savedUsername && n.length >= 3) {
      setUsernameCheckTimer(setTimeout(() => checkUsername(n), 600))
    }
  }

  // ── Social link handlers ───────────────────────────────────────────────────
  function togglePlatform(id: string) {
    setExpandedPlatforms((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  // ── Avatar handlers ────────────────────────────────────────────────────────
  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  const [saveStatus, setSaveStatus]   = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [errorMsg, setErrorMsg]       = useState<string | null>(null)
  const [isPending, startTransition]  = useTransition()

  function handleSave() {
    if (!city.trim()) { setErrorMsg('Please select your city.'); return }
    if (usernameStatus === 'taken' || usernameStatus === 'invalid') {
      setErrorMsg(usernameError || 'Please fix your username before saving.')
      return
    }
    setSaveStatus('saving')
    setErrorMsg(null)

    startTransition(async () => {
      let newAvatarUrl: string | undefined
      if (avatarFile) {
        const fd = new FormData()
        fd.append('file', avatarFile)
        const { url, error: upErr } = await uploadAvatar(fd)
        if (upErr) { setSaveStatus('error'); setErrorMsg(upErr); return }
        newAvatarUrl = url ?? undefined
        if (newAvatarUrl) setAvatarUrl(newAvatarUrl)
      }

      const result = await updateProfile({
        display_name:       displayName,
        bio,
        city,
        username:           username !== savedUsername ? username : undefined,
        creator_type:       creatorType ?? undefined,
        sub_types:          subTypes,
        offline_activities: offlineActivities,
        social_links:       socialInputs,
        avatar_url:         newAvatarUrl,
        neighbourhood,
        show_city_mastery:  showCityMastery,
      })

      if (result.error) {
        setSaveStatus('error')
        setErrorMsg(result.error)
      } else {
        setSaveStatus('saved')
        setAvatarFile(null)
        setSavedUsername(username)
        setUsernameStatus('idle')
        router.refresh()
        setTimeout(() => setSaveStatus('idle'), 3000)
      }
    })
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, startDeleting] = useTransition()
  function handleDelete() { startDeleting(async () => { await deleteAccount() }) }

  // ── Loading / error ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 rounded-2xl bg-surface-container-lowest border border-white/5 animate-pulse" />
        ))}
      </div>
    )
  }

  if (fetchError) {
    return <p className="text-sm text-error">{fetchError}</p>
  }

  return (
    <div className="flex flex-col gap-6">

      {/* ── Photo & name ───────────────────────────────────────────────── */}
      <Section title="Profile photo & name">
        {/* Avatar */}
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative w-20 h-20 rounded-full bg-surface-container-high overflow-hidden shrink-0 border-2 border-white/10 hover:opacity-80 transition-opacity active:scale-95 group"
          >
            {(avatarPreview || avatarUrl) ? (
              <Image
                src={avatarPreview ?? avatarUrl!}
                alt="Avatar"
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-3xl font-bold"
                style={{ backgroundColor: `${colors.primary}20`, color: colors.primary }}
              >
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>photo_camera</span>
            </div>
          </button>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-on-surface">
              {avatarFile ? avatarFile.name : 'Upload a photo'}
            </p>
            <p className="text-xs text-on-surface-variant">JPG, PNG or WebP · max 5 MB</p>
            {avatarFile && (
              <button type="button" onClick={() => { setAvatarFile(null); setAvatarPreview(null) }}
                className="text-xs text-error hover:underline text-left mt-1">
                Remove
              </button>
            )}
          </div>
        </div>

        {/* Display name */}
        <div>
          <label className={labelCls}>Display name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={60}
            className={inputCls}
            placeholder="Your name or stage name"
          />
        </div>

        {/* Username */}
        <div>
          <label className={labelCls}>Username</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-on-surface-variant">@</span>
            <input
              type="text"
              value={username}
              onChange={(e) => handleUsernameChange(e.target.value)}
              maxLength={30}
              className={`${inputCls} pl-8 pr-28`}
              placeholder="yourhandle"
            />
            {usernameStatus !== 'idle' && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {usernameStatus === 'checking' && (
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Checking…</span>
                )}
                {usernameStatus === 'available' && (
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.primary }}>Available ✓</span>
                )}
                {(usernameStatus === 'taken' || usernameStatus === 'invalid') && (
                  <span className="text-[10px] font-bold text-error uppercase tracking-wider">Taken</span>
                )}
              </div>
            )}
          </div>
          {usernameError && <p className="text-xs text-error mt-1">{usernameError}</p>}
          <p className="text-xs text-on-surface-variant mt-1">wheninmycity.com/{username || '…'}</p>
        </div>

        {/* Bio */}
        <div>
          <label className={labelCls}>Bio <span className="normal-case font-normal">(max 160 chars)</span></label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={160}
            rows={3}
            className={`${inputCls} resize-none leading-relaxed`}
            placeholder="Tell your audience about yourself…"
          />
          <p className="text-right text-xs text-on-surface-variant mt-1">{bio.length}/160</p>
        </div>
      </Section>

      {/* ── Category ───────────────────────────────────────────────────── */}
      <Section title="What best describes you?">
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
        <button
          type="button"
          onClick={() => handleCategorySelect('exploring')}
          className="w-full text-center text-sm text-on-surface-variant underline underline-offset-2 py-1 transition-colors hover:text-on-surface"
          style={creatorType === 'exploring' ? { color: EXPLORING_OPTION.primaryColor } : undefined}
        >
          {creatorType === 'exploring' ? '✓ ' : ''}Just exploring
        </button>
      </Section>

      {/* ── What you create (sub-types) ────────────────────────────────── */}
      {categoryConfig && categoryConfig.subTypes.length > 0 && (
        <Section title="What do you create?">
          <p className="text-xs text-on-surface-variant -mt-2">
            As someone in{' '}
            <span
              className="px-1.5 py-0.5 rounded-md font-bold"
              style={{ backgroundColor: colors.secondary, color: '#1a1a1a' }}
            >
              {categoryConfig.label}
            </span>
            , pick all that apply.
          </p>
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
        </Section>
      )}

      {/* ── City ───────────────────────────────────────────────────────── */}
      <Section title="Where are you based?">
        {/* Selected city pill */}
        {city && (
          <div
            className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium"
            style={{ borderColor: colors.primary, backgroundColor: `${colors.secondary}50` }}
          >
            <span className="material-symbols-outlined text-base" style={{ color: colors.primary, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            <span className="text-on-surface">{city}</span>
            <button
              type="button"
              onClick={() => { setCity(''); setCitySearch('') }}
              className="ml-auto text-on-surface-variant hover:text-on-surface"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        )}
        {/* Search input */}
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-xl pointer-events-none">location_on</span>
          <input
            type="text"
            placeholder="Search city…"
            value={citySearch}
            onChange={(e) => { setCitySearch(e.target.value); setCity('') }}
            className={`${inputCls} pl-11`}
          />
        </div>
        {/* Dropdown results */}
        {filteredCities.length > 0 && (
          <div className="bg-surface-container rounded-xl border border-outline-variant/20 overflow-hidden max-h-48 overflow-y-auto shadow-sm -mt-2">
            {filteredCities.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleCitySelect(c.name)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-container-high transition-colors text-sm border-b border-outline-variant/10 last:border-0"
              >
                <span className="text-base">{c.emoji}</span>
                <span className="font-medium text-on-surface">{c.name}</span>
                <span className="text-on-surface-variant text-xs ml-auto">{c.state}</span>
              </button>
            ))}
          </div>
        )}

        {/* Neighbourhood — shown once city is confirmed */}
        {city && (
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
              Neighbourhood <span className="normal-case font-normal opacity-60">(optional)</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-xl pointer-events-none">
                near_me
              </span>
              <input
                type="text"
                placeholder="e.g. Koramangala, Bandra, Karol Bagh"
                value={neighbourhood}
                onChange={(e) => setNeighbourhood(e.target.value)}
                maxLength={80}
                className={`${inputCls} pl-11`}
              />
            </div>
            <p className="text-xs text-on-surface-variant mt-1.5 opacity-60">
              Used for micro-local leaderboards and city discovery.
            </p>
          </div>
        )}
      </Section>

      {/* ── Vibes / offline activities ─────────────────────────────────── */}
      {categoryConfig?.offlineActivities && categoryConfig.offlineActivities.length > 0 && (
        <Section title="What makes you step out?">
          <p className="text-xs text-on-surface-variant -mt-2">Pick everything that fits how you show up offline.</p>
          <div className="flex flex-wrap gap-2">
            {categoryConfig.offlineActivities.map((act) => {
              const isSelected = offlineActivities.includes(act.id)
              const isNone     = act.id === 'not_right_now'
              return (
                <button
                  key={act.id}
                  type="button"
                  onClick={() => toggleOfflineActivity(act.id)}
                  className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 active:scale-95 border-2"
                  style={
                    isSelected
                      ? {
                          backgroundColor: isNone ? '#e9ecef' : colors.primary,
                          borderColor:     isNone ? '#adb5bd' : colors.primary,
                          color:           isNone ? '#495057' : '#ffffff',
                        }
                      : { backgroundColor: 'transparent', borderColor: 'rgba(255, 255, 255, 0.2)' }
                  }
                >
                  {act.label}
                </button>
              )
            })}
          </div>
        </Section>
      )}

      {/* ── Social links ───────────────────────────────────────────────── */}
      <Section title="Where can people find you?">
        {displayPlatforms.length === 0 ? (
          <p className="text-sm text-on-surface-variant">Select a category above to see relevant platforms.</p>
        ) : (
          <div className="space-y-2">
            {displayPlatforms.map((p) => {
              const isExpanded = expandedPlatforms.has(p.id)
              const value      = socialInputs[p.id] ?? ''
              const hasValue   = value.trim().length > 0
              return (
                <div
                  key={p.id}
                  className={`rounded-xl overflow-hidden border-2 transition-all duration-200 ${!(isExpanded || hasValue) ? 'bg-surface-container-low' : ''}`}
                  style={{
                    borderColor:     isExpanded || hasValue ? colors.primary : 'transparent',
                    backgroundColor: isExpanded || hasValue ? `${colors.secondary}40` : undefined,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => togglePlatform(p.id)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left"
                  >
                    <span className="font-medium text-sm">{p.label}</span>
                    <div className="flex items-center gap-2">
                      {hasValue && (
                        <span className="material-symbols-outlined text-sm" style={{ color: colors.primary, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      )}
                      <span className="material-symbols-outlined text-on-surface-variant text-sm">
                        {isExpanded ? 'expand_less' : 'expand_more'}
                      </span>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-3">
                      <input
                        type="text"
                        placeholder={p.placeholder || `Your ${p.label} link`}
                        value={value}
                        onChange={(e) => setSocialInputs((prev) => ({ ...prev, [p.id]: e.target.value }))}
                        className="w-full px-4 py-3 rounded-lg bg-background border border-outline-variant/20 text-sm text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:border-primary/30 transition-colors"
                        autoFocus
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Section>

      {/* ── Privacy ───────────────────────────────────────────────────── */}
      <Section title="Privacy">
        <button
          type="button"
          onClick={() => setShowCityMastery((v) => !v)}
          className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-surface-container-low hover:bg-surface-container-high transition-colors"
        >
          <div className="flex flex-col items-start gap-0.5">
            <span className="text-sm font-semibold text-on-surface">Share city mastery map</span>
            <span className="text-xs text-on-surface-variant">Show your explored neighbourhoods on your public profile</span>
          </div>
          <div
            className="relative flex-shrink-0 ml-4 w-11 h-6 rounded-full transition-colors duration-200"
            style={{ background: showCityMastery ? 'var(--color-primary)' : 'var(--color-outline-variant)' }}
          >
            <div
              className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
              style={{ transform: showCityMastery ? 'translateX(20px)' : 'translateX(0)' }}
            />
          </div>
        </button>
      </Section>

      {/* ── Save button ────────────────────────────────────────────────── */}
      {errorMsg && (
        <p className="text-sm text-error bg-error/10 rounded-lg px-3 py-2">{errorMsg}</p>
      )}
      <button
        onClick={handleSave}
        disabled={isPending}
        className={[
          'w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.98]',
          saveStatus === 'saved'
            ? 'bg-tertiary text-on-tertiary'
            : 'bg-primary text-on-primary hover:brightness-110 disabled:opacity-50',
        ].join(' ')}
      >
        {isPending ? 'Saving…' : saveStatus === 'saved' ? '✓ Saved' : 'Save changes'}
      </button>

      {/* ── Account ────────────────────────────────────────────────────── */}
      <Section title="Account">
        <button
          onClick={() => signOut()}
          className="flex items-center gap-2 w-full px-4 py-3 rounded-xl bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all text-sm font-semibold"
        >
          <span className="material-symbols-outlined text-base">logout</span>
          Sign out
        </button>
      </Section>

      {/* ── Danger zone ────────────────────────────────────────────────── */}
      <Section title="Danger zone">
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 w-full px-4 py-3 rounded-xl border border-error/30 text-error hover:bg-error/10 transition-all text-sm font-semibold"
          >
            <span className="material-symbols-outlined text-base">delete_forever</span>
            Delete account
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-on-surface-variant leading-relaxed">
              This permanently deletes your profile, all blocks, and all events. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-surface-container-low text-on-surface-variant text-sm font-semibold hover:bg-surface-container-high transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-error text-on-error text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50"
              >
                {isDeleting ? 'Deleting…' : 'Yes, delete'}
              </button>
            </div>
          </div>
        )}
      </Section>

    </div>
  )
}
