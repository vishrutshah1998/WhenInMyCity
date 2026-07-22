'use client'

import { useState, useTransition, useRef, useMemo, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { updateProfile, uploadAvatar, deleteAccount, updateColorScheme } from '@/app/actions/profile'
import { checkUsernameAvailable } from '@/app/actions/onboarding'
import { initiateInstagramConnect, disconnectInstagram } from '@/app/actions/instagram'
import { signOut } from '@/app/actions/auth'
import type { CreatorType } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { CITIES, INTEREST_TAGS } from '@/lib/constants/interests'
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

const INSTAGRAM_ERROR_MESSAGES: Record<string, string> = {
  instagram_not_configured:  'Instagram connect isn’t set up yet. Try again later.',
  instagram_denied:          'Instagram access was declined.',
  instagram_invalid:         'That connection attempt expired or was invalid. Please try again.',
  instagram_personal_account: 'That’s a Personal Instagram account. Switch it to a Business or Creator account in the Instagram app, then try connecting again.',
  instagram_token_failed:    'Couldn’t complete the Instagram connection. Please try again.',
  instagram_save_failed:     'Connected, but saving the connection failed. Please try again.',
}

// ---------------------------------------------------------------------------
// Shared UI primitives
// ---------------------------------------------------------------------------

const inputCls = [
  'w-full px-4 py-3 text-sm transition-all focus:outline-none',
  'bg-[#1C1C24] text-[#F0EFF8] placeholder:text-white/20',
  'border border-white/10 focus:border-[#E8705A]',
].join(' ')

const labelCls = [
  'block text-[10px] font-semibold text-white/40 uppercase tracking-[0.15em] mb-2 font-mono',
].join(' ')

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{
      display: 'flex', flexDirection: 'column', gap: 20,
      background: 'var(--wimc-bg-elevated)',
      border: '1px solid var(--wimc-border-default)',
      padding: 24,
    }}>
      <h2 style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 14, color: 'var(--wimc-text-primary)', letterSpacing: '0.03em' }}>
        {title}
      </h2>
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

  // Auth identity
  const [authPhone, setAuthPhone] = useState<string | null>(null)

  // Core fields
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio]                 = useState('')
  const [avatarUrl, setAvatarUrl]     = useState<string | null>(null)
  const [username, setUsername]       = useState('')

  // Category
  const [creatorType, setCreatorType] = useState<V2CreatorType | null>(null)
  const [subTypes, setSubTypes]       = useState<string[]>([])
  const [personas, setPersonas]       = useState<string[]>([])

  // City + neighbourhood
  const [city, setCity]               = useState('')
  const [citySearch, setCitySearch]   = useState('')
  const [neighbourhood, setNeighbourhood] = useState('')

  // Offline activities / vibes
  const [offlineActivities, setOfflineActivities] = useState<string[]>([])

  // Interest tags
  const [interestTags, setInterestTags] = useState<string[]>([])

  // Username editing + availability
  const [savedUsername, setSavedUsername]         = useState('')
  const [usernameStatus, setUsernameStatus]       = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle')
  const [usernameError, setUsernameError]         = useState<string | null>(null)
  const [usernameCheckTimer, setUsernameCheckTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

  // Social links — keyed by platform id
  const [socialInputs, setSocialInputs]           = useState<Record<string, string>>({})
  const [expandedPlatforms, setExpandedPlatforms] = useState<Set<string>>(new Set())

  // Instagram Connect (OAuth, distinct from the plain social_links.instagram URL)
  const [instagramConnected, setInstagramConnected] = useState(false)
  const [instagramError, setInstagramError]         = useState<string | null>(null)
  const [instagramPending, startInstagramTransition] = useTransition()
  const searchParams = useSearchParams()

  // Color scheme
  const [colorScheme, setColorScheme]         = useState('default')
  const [schemeApplying, setSchemeApplying]   = useState(false)

  // Interest tag accordion open state — first category open by default
  const [openInterestCategories, setOpenInterestCategories] = useState<Set<string>>(new Set(['performance']))

  // Privacy
  const [showCityMastery, setShowCityMastery] = useState(false)

  // Contact & reach
  const [contactEmail, setContactEmail] = useState('')
  const [websiteUrl, setWebsiteUrl]     = useState('')

  // Journey / role
  const [userRole, setUserRole] = useState<'maker' | 'explorer'>('maker')

  // Explorer-specific
  const [explorerScene, setExplorerScene]               = useState('')
  const [explorerCreatorIntent, setExplorerCreatorIntent] = useState<string[]>([])

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
  // When no category is selected, fall back to a universal default set
  const DEFAULT_PLATFORMS: SocialPlatformConfig[] = [
    { id: 'instagram' as never, label: 'Instagram',  placeholder: 'instagram.com/yourhandle' },
    { id: 'youtube'   as never, label: 'YouTube',    placeholder: 'youtube.com/@yourchannel' },
    { id: 'whatsapp'  as never, label: 'WhatsApp',   placeholder: '91XXXXXXXXXX' },
    { id: 'website'   as never, label: 'Website',    placeholder: 'yourwebsite.com' },
    { id: 'linkedin'  as never, label: 'LinkedIn',   placeholder: 'linkedin.com/in/yourhandle' },
  ]

  const displayPlatforms = useMemo((): SocialPlatformConfig[] => {
    const suggested = categoryConfig?.suggestedPlatforms ?? DEFAULT_PLATFORMS
    const suggestedIds = new Set(suggested.map((p) => p.id))
    const extras: SocialPlatformConfig[] = []
    for (const [key, val] of Object.entries(socialInputs)) {
      if (!suggestedIds.has(key as never) && val.trim()) {
        extras.push({ id: key as never, label: PLATFORM_LABELS[key] ?? key, placeholder: '' })
      }
    }
    return [...suggested, ...extras]
  }, [categoryConfig, socialInputs]) // eslint-disable-line react-hooks/exhaustive-deps

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
      if (user.phone) setAuthPhone(user.phone)
      supabase
        .from('user_profiles')
        .select('display_name, bio, avatar_url, username, creator_type, city, neighbourhood, sub_types, offline_activities, interest_tags, social_links, show_city_mastery, page_theme, user_role, contact_email, website_url, explorer_scene, explorer_creator_intent, personas, instagram_connected')
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
          setInterestTags((data.interest_tags as string[]) ?? [])

          // Color scheme
          const theme = data.page_theme as { colorScheme?: string } | null
          if (theme?.colorScheme) setColorScheme(theme.colorScheme)

          // Social links — stored JSONB
          setSocialInputs((data.social_links as Record<string, string>) ?? {})

          setInstagramConnected((data as { instagram_connected?: boolean }).instagram_connected ?? false)

          setShowCityMastery(data.show_city_mastery ?? false)

          // Contact & reach — fall back to Google OAuth email when empty
          setContactEmail(
            (data as { contact_email?: string | null }).contact_email
              ?? user.email
              ?? ''
          )
          setWebsiteUrl((data as { website_url?: string | null }).website_url ?? '')

          // Role + explorer-specific
          setUserRole(((data as { user_role?: string }).user_role as 'maker' | 'explorer') ?? 'maker')
          setExplorerScene((data as { explorer_scene?: string | null }).explorer_scene ?? '')
          setExplorerCreatorIntent(((data as { explorer_creator_intent?: string[] }).explorer_creator_intent) ?? [])
          setPersonas((data as { personas?: string[] }).personas ?? [])

          setLoading(false)
        })
    })
  }, [])

  // ── Instagram Connect — OAuth result from the callback redirect ──────────
  useEffect(() => {
    const err = searchParams.get('error')
    if (err) setInstagramError(err)
    if (searchParams.get('instagram') === 'connected') setInstagramConnected(true)
  }, [searchParams])

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

  function toggleInterestTag(id: string) {
    setInterestTags((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  function toggleInterestCategory(key: string) {
    setOpenInterestCategories(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function toggleExplorerIntent(id: string) {
    setExplorerCreatorIntent((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
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

  // ── Instagram Connect handlers ─────────────────────────────────────────────
  function handleInstagramDisconnect() {
    setInstagramError(null)
    startInstagramTransition(async () => {
      const result = await disconnectInstagram()
      if (result.error) {
        setInstagramError(result.error)
      } else {
        setInstagramConnected(false)
      }
    })
  }

  // ── Social link handlers ───────────────────────────────────────────────────
  function togglePlatform(id: string) {
    setExpandedPlatforms((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  // ── Color scheme handler ──────────────────────────────────────────────────
  async function handleColorScheme(scheme: string) {
    if (schemeApplying || scheme === colorScheme) return
    setColorScheme(scheme)
    setSchemeApplying(true)
    await updateColorScheme(scheme)
    setSchemeApplying(false)
    router.refresh()
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
        display_name:             displayName,
        bio,
        city,
        username:                 username !== savedUsername ? username : undefined,
        creator_type:             creatorType ?? undefined,
        sub_types:                subTypes,
        offline_activities:       offlineActivities,
        interest_tags:            interestTags,
        social_links:             socialInputs,
        avatar_url:               newAvatarUrl,
        neighbourhood,
        show_city_mastery:        showCityMastery,
        contact_email:            contactEmail,
        website_url:              websiteUrl,
        explorer_scene:           explorerScene,
        explorer_creator_intent:  explorerCreatorIntent,
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
          <div key={i} className="h-32 animate-pulse" style={{ background: 'var(--wimc-bg-elevated)', border: '1px solid var(--wimc-border-subtle)' }} />
        ))}
      </div>
    )
  }

  if (fetchError) {
    return <p style={{ fontSize: 13, color: '#E8342A', fontFamily: 'var(--font-dm-sans)' }}>{fetchError}</p>
  }

  // Journey metadata — use personas array as the canonical source.
  // creator_type may have been overwritten to 'business_brand' by brand
  // onboarding, so we don't rely on it for the creator/business distinction.
  const isExplorer     = userRole === 'explorer'
  const isCreatorPersona = personas.includes('creator')
  // Only treat as business-only if they have brand persona but NOT creator persona
  const isBusiness     = !isExplorer && !isCreatorPersona && creatorType === 'business_brand'
  const journeyLabel   = isExplorer ? 'Explorer' : isBusiness ? 'Venue / Brand' : 'Creator'
  const journeyAccent  = isExplorer ? '#9B8FFF' : colors.primary

  // Explorer intent options (things they want to discover / attend)
  const EXPLORER_INTENT_OPTIONS = [
    { id: 'live_music',       label: '🎵 Live music' },
    { id: 'comedy_shows',     label: '🎤 Comedy shows' },
    { id: 'art_exhibitions',  label: '🎨 Art & exhibitions' },
    { id: 'workshops',        label: '📚 Workshops & learning' },
    { id: 'fitness_wellness', label: '✨ Fitness & wellness' },
    { id: 'food_culture',     label: '🍽️ Food & culture' },
    { id: 'networking',       label: '🤝 Networking events' },
    { id: 'outdoor_treks',    label: '🌿 Outdoor & treks' },
    { id: 'tech_startups',    label: '💡 Tech & startups' },
    { id: 'theatre_dance',    label: '💃 Theatre & dance' },
    { id: 'film_screenings',  label: '🎬 Film screenings' },
    { id: 'community',        label: '🏘️ Community & social causes' },
  ]

  return (
    <div className="flex flex-col gap-6">

      {/* ── Journey badge ──────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 16px',
        background: `${journeyAccent}12`,
        border: `1px solid ${journeyAccent}30`,
      }}>
        <span className="material-symbols-outlined text-base" style={{ color: journeyAccent, fontVariationSettings: "'FILL' 1" }}>
          {isExplorer ? 'explore' : creatorType === 'business_brand' ? 'storefront' : 'mic'}
        </span>
        <div>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: journeyAccent, fontFamily: 'var(--font-jetbrains-mono)' }}>
            {journeyLabel}
          </span>
          <span style={{ fontSize: 11, color: 'var(--wimc-text-muted)', marginLeft: 8, fontFamily: 'var(--font-dm-sans)' }}>
            {isExplorer
              ? 'Showing explorer profile settings'
              : creatorType === 'business_brand'
              ? 'Showing Venue & brand settings'
              : 'Showing creator profile settings'}
          </span>
        </div>
      </div>

      {/* ── Photo & name ───────────────────────────────────────────────── */}
      <Section title={isExplorer ? "What's your name?" : isBusiness ? "Tell us about your space" : "What should we call you?"}>
        {/* Avatar */}
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative w-20 h-20 rounded-full overflow-hidden shrink-0 border-2 border-white/10 hover:opacity-80 transition-opacity active:scale-95 group" style={{ background: 'var(--wimc-bg-overlay)' }}
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
            <p className="text-sm font-semibold" style={{ color: 'var(--wimc-text-primary)', fontFamily: 'var(--font-dm-sans)' }}>
              {avatarFile ? avatarFile.name : 'Upload a photo'}
            </p>
            <p className="text-xs" style={{ color: 'var(--wimc-text-muted)', fontFamily: 'var(--font-dm-sans)' }}>JPG, PNG or WebP · max 5 MB</p>
            {avatarFile && (
              <button type="button" onClick={() => { setAvatarFile(null); setAvatarPreview(null) }}
                className="text-xs hover:underline text-left mt-1" style={{ color: '#E8342A', fontFamily: 'var(--font-dm-sans)' }}>
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
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold" style={{ color: 'var(--wimc-text-muted)' }}>@</span>
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
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--wimc-text-muted)', fontFamily: 'var(--font-jetbrains-mono)' }}>Checking…</span>
                )}
                {usernameStatus === 'available' && (
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.primary }}>Available ✓</span>
                )}
                {(usernameStatus === 'taken' || usernameStatus === 'invalid') && (
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#E8342A', fontFamily: 'var(--font-jetbrains-mono)' }}>Taken</span>
                )}
              </div>
            )}
          </div>
          {usernameError && <p style={{ fontSize: 11, color: '#E8342A', marginTop: 4, fontFamily: 'var(--font-jetbrains-mono)' }}>{usernameError}</p>}
          <p style={{ fontSize: 11, color: 'var(--wimc-text-muted)', marginTop: 4, fontFamily: 'var(--font-jetbrains-mono)' }}>wheninmycity.com/{city ? `${city.toLowerCase().replace(/\s+/g, '-')}/` : ''}{username || '…'}</p>
        </div>

        {/* Bio */}
        <div>
          <label className={labelCls}>Bio <span style={{ textTransform: 'none', fontWeight: 400 }}>(max 160 chars)</span></label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={160}
            rows={3}
            className={`${inputCls} resize-none leading-relaxed`}
            placeholder="Tell your audience about yourself…"
          />
          <p style={{ textAlign: 'right', fontSize: 11, color: 'var(--wimc-text-muted)', marginTop: 4, fontFamily: 'var(--font-jetbrains-mono)' }}>{bio.length}/160</p>
        </div>
      </Section>

      {/* ── Category — only shown for creators / makers ───────────────── */}
      {!isExplorer && <Section title={isBusiness ? "How do you show up to culture?" : "What best describes you?"}>
        <div className="grid grid-cols-2 gap-3">
          {CREATOR_CATEGORIES.map((cat) => {
            const isSelected = creatorType === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategorySelect(cat.id as V2CreatorType)}
                className="relative flex flex-col items-start p-4 text-left transition-all duration-200 active:scale-95 border-2"
                style={{
                  backgroundColor: isSelected ? cat.secondaryColor : 'var(--wimc-bg-overlay)',
                  borderColor: isSelected ? cat.primaryColor : 'var(--wimc-border-default)',
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
                  className="font-bold text-sm leading-tight"
                  style={{ color: isSelected ? '#1a1a1a' : 'var(--wimc-text-secondary)', fontFamily: 'var(--font-dm-sans)' }}
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
          className="w-full text-center text-sm underline underline-offset-2 py-1 transition-colors"
          style={{ color: creatorType === 'exploring' ? EXPLORING_OPTION.primaryColor : 'var(--wimc-text-secondary)', fontFamily: 'var(--font-dm-sans)' }}
        >
          {creatorType === 'exploring' ? '✓ ' : ''}Just exploring
        </button>
      </Section>}

      {/* ── What you create (sub-types) ────────────────────────────────── */}
      {!isExplorer && categoryConfig && categoryConfig.subTypes.length > 0 && (
        <Section title="What do you create?">
          <p style={{ fontSize: 12, color: 'var(--wimc-text-secondary)', marginTop: -8, fontFamily: 'var(--font-dm-sans)' }}>
            As someone in{' '}
            <span
              style={{ padding: '2px 8px', fontWeight: 700, backgroundColor: colors.secondary, color: '#1a1a1a' }}
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
                  className="px-4 py-1.5 text-sm font-medium transition-all duration-150 active:scale-95 border"
                  style={{
                    backgroundColor: isSelected ? colors.primary : 'var(--wimc-bg-overlay)',
                    borderColor: isSelected ? colors.primary : 'var(--wimc-border-default)',
                    color: isSelected ? '#ffffff' : 'var(--wimc-text-secondary)',
                    fontFamily: 'var(--font-dm-sans)',
                  }}
                >
                  {st.label}
                </button>
              )
            })}
          </div>
        </Section>
      )}

      {/* ── What makes you step out? (interest tags accordion) ──────── */}
      {!isExplorer && (
        <Section title="What makes you step out?">
          <p style={{ fontSize: 12, color: 'var(--wimc-text-secondary)', marginTop: -8, fontFamily: 'var(--font-dm-sans)' }}>
            Pick all that apply — helps us match you with the right Venues and audiences.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(
              [
                { key: 'performance',  label: 'Performance',          icon: 'mic'             },
                { key: 'arts',         label: 'Arts',                  icon: 'palette'         },
                { key: 'education',    label: 'Education & Wellness',  icon: 'school'          },
                { key: 'lifestyle',    label: 'Lifestyle',             icon: 'self_improvement'},
                { key: 'tech',         label: 'Tech',                  icon: 'laptop'          },
                { key: 'food_culture', label: 'Food & Culture',        icon: 'restaurant'      },
                { key: 'outdoors',     label: 'Outdoors & Adventure',  icon: 'forest'          },
              ] as const
            ).map(({ key, label, icon }) => {
              const isOpen   = openInterestCategories.has(key)
              const tags     = INTEREST_TAGS.filter(t => t.category === key)
              const catCount = tags.filter(t => interestTags.includes(t.id)).length
              return (
                <div key={key} style={{ background: 'var(--wimc-bg-overlay)', border: `1px dashed ${catCount > 0 ? colors.primary + '50' : 'var(--wimc-border-default)'}` }}>
                  <button
                    type="button"
                    onClick={() => toggleInterestCategory(key)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px', background: isOpen ? `${colors.primary}08` : 'transparent',
                      border: 'none', cursor: 'pointer',
                      borderBottom: isOpen ? `1px solid ${colors.primary}20` : 'none',
                      transition: 'background 150ms',
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: 16, lineHeight: 1,
                        color: catCount > 0 ? colors.primary : 'var(--wimc-text-muted)',
                        fontVariationSettings: catCount > 0 ? "'FILL' 1" : "'FILL' 0",
                        transition: 'all 150ms',
                      }}
                    >
                      {icon}
                    </span>
                    <span style={{
                      fontFamily: 'var(--font-jetbrains-mono)', fontWeight: 700, fontSize: 11,
                      letterSpacing: '0.12em', textTransform: 'uppercase',
                      color: catCount > 0 ? 'var(--wimc-text-primary)' : 'var(--wimc-text-secondary)',
                      flex: 1, textAlign: 'left', transition: 'color 150ms',
                    }}>
                      {label}
                    </span>
                    {catCount > 0 && (
                      <span style={{
                        fontFamily: 'var(--font-jetbrains-mono)', fontSize: 9,
                        color: colors.primary, background: `${colors.primary}20`,
                        padding: '2px 8px', borderRadius: 999, flexShrink: 0,
                      }}>
                        {catCount}
                      </span>
                    )}
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: 16, lineHeight: 1, color: 'var(--wimc-text-muted)',
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 200ms', flexShrink: 0,
                      }}
                    >
                      expand_more
                    </span>
                  </button>

                  {isOpen && (
                    <div style={{ padding: '12px 14px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {tags.map(tag => {
                        const isSel = interestTags.includes(tag.id)
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => toggleInterestTag(tag.id)}
                            style={{
                              padding: '6px 14px', borderRadius: 999, cursor: 'pointer',
                              background: isSel ? colors.primary : 'transparent',
                              border: `1px dashed ${isSel ? 'transparent' : 'var(--wimc-border-strong)'}`,
                              fontFamily: 'var(--font-dm-sans)', fontWeight: isSel ? 700 : 400,
                              fontSize: 13, color: isSel ? '#ffffff' : 'var(--wimc-text-secondary)',
                              transition: 'all 150ms', whiteSpace: 'nowrap',
                              display: 'flex', alignItems: 'center', gap: 6,
                            }}
                          >
                            <span>{tag.emoji}</span>
                            {tag.label}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {/* ── City ───────────────────────────────────────────────────────── */}
      <Section title={isExplorer ? "Which city are you exploring?" : "Where are you based?"}>
        {/* Selected city pill */}
        {city && (
          <div
            className="flex items-center gap-2 px-4 py-3 border text-sm font-medium"
            style={{ borderColor: colors.primary, backgroundColor: `${colors.secondary}50` }}
          >
            <span className="material-symbols-outlined text-base" style={{ color: colors.primary, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            <span style={{ color: 'var(--wimc-text-primary)', fontFamily: 'var(--font-dm-sans)' }}>{city}</span>
            <button
              type="button"
              onClick={() => { setCity(''); setCitySearch('') }}
              className="ml-auto transition-colors"
              style={{ color: 'var(--wimc-text-muted)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--wimc-text-primary)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--wimc-text-muted)' }}
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        )}
        {/* Search input */}
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-xl pointer-events-none" style={{ color: 'var(--wimc-text-muted)' }}>location_on</span>
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
          <div className="overflow-hidden max-h-48 overflow-y-auto -mt-2" style={{ background: 'var(--wimc-bg-overlay)', border: '1px solid var(--wimc-border-default)' }}>
            {filteredCities.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleCitySelect(c.name)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors"
                style={{ borderBottom: '1px solid var(--wimc-border-subtle)', color: 'var(--wimc-text-primary)', fontFamily: 'var(--font-dm-sans)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--wimc-bg-hover)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <span className="text-base">{c.emoji}</span>
                <span className="font-medium" style={{ color: 'var(--wimc-text-primary)' }}>{c.name}</span>
                <span className="text-xs ml-auto" style={{ color: 'var(--wimc-text-muted)', fontFamily: 'var(--font-jetbrains-mono)' }}>{c.state}</span>
              </button>
            ))}
          </div>
        )}

        {/* Neighbourhood — shown once city is confirmed */}
        {city && (
          <div>
            <label className={labelCls}>
              Neighbourhood <span style={{ textTransform: 'none', fontWeight: 400, opacity: 0.6 }}>(optional)</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-xl pointer-events-none" style={{ color: 'var(--wimc-text-muted)' }}>
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
            <p style={{ fontSize: 11, color: 'var(--wimc-text-muted)', marginTop: 6, fontFamily: 'var(--font-dm-sans)' }}>
              Used for micro-local leaderboards and city discovery.
            </p>
          </div>
        )}
      </Section>

      {/* ── Explorer: scene + discovery intent ─────────────────────────── */}
      {isExplorer && (
        <>
          <Section title="What do you want to discover?">
            <p style={{ fontSize: 12, color: 'var(--wimc-text-secondary)', marginTop: -8, fontFamily: 'var(--font-dm-sans)' }}>
              Pick everything you want to find more of in your city.
            </p>
            <div className="flex flex-wrap gap-2">
              {EXPLORER_INTENT_OPTIONS.map((opt) => {
                const isSelected = explorerCreatorIntent.includes(opt.id)
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleExplorerIntent(opt.id)}
                    className="px-4 py-1.5 text-sm font-medium transition-all duration-150 active:scale-95 border"
                    style={{
                      backgroundColor: isSelected ? '#9B8FFF' : 'var(--wimc-bg-overlay)',
                      borderColor: isSelected ? '#9B8FFF' : 'var(--wimc-border-default)',
                      color: isSelected ? '#ffffff' : 'var(--wimc-text-secondary)',
                      fontFamily: 'var(--font-dm-sans)',
                    }}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </Section>

          <Section title="What's your scene?">
            <p style={{ fontSize: 12, color: 'var(--wimc-text-secondary)', marginTop: -8, fontFamily: 'var(--font-dm-sans)' }}>
              We&apos;ll fill your feed with events that match your vibe.
            </p>
            <input
              type="text"
              value={explorerScene}
              onChange={(e) => setExplorerScene(e.target.value)}
              maxLength={80}
              className={inputCls}
              placeholder="e.g. Jazz nights, Sunday markets, underground comedy…"
            />
          </Section>
        </>
      )}


      {/* ── Social links ───────────────────────────────────────────────── */}
      <Section title="Where else can people find you?">
        {/* Instagram Connect — powers the live Instagram Feed block. Distinct
            from the plain "Instagram" link below, which is just a profile URL. */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 10,
          padding: '14px 16px',
          border: `1px solid ${instagramConnected ? 'rgba(16,185,129,0.3)' : 'var(--wimc-border-default)'}`,
          backgroundColor: instagramConnected ? 'rgba(16,185,129,0.08)' : 'var(--wimc-bg-overlay)',
        }}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-sm" style={{ color: 'var(--wimc-text-primary)', fontFamily: 'var(--font-dm-sans)' }}>
                Connect Instagram
              </p>
              <p style={{ fontSize: 12, color: 'var(--wimc-text-secondary)', marginTop: 2 }}>
                Powers your live Instagram Feed block. We only read your own recent posts — we never post on your behalf.
              </p>
            </div>
            {instagramConnected ? (
              <button
                type="button"
                onClick={handleInstagramDisconnect}
                disabled={instagramPending}
                style={{
                  flexShrink: 0,
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--wimc-text-muted)',
                  fontSize: 11,
                  cursor: instagramPending ? 'not-allowed' : 'pointer',
                  opacity: instagramPending ? 0.6 : 1,
                  textDecoration: 'underline',
                }}
              >
                {instagramPending ? 'Disconnecting…' : 'Disconnect'}
              </button>
            ) : (
              <form action={initiateInstagramConnect}>
                <button
                  type="submit"
                  style={{
                    flexShrink: 0,
                    background: 'var(--wimc-coral, #E8572A)',
                    color: 'white',
                    border: 'none',
                    fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                    padding: '8px 14px', cursor: 'pointer',
                  }}
                >
                  Connect
                </button>
              </form>
            )}
          </div>
          {instagramConnected && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>Connected</span>
            </div>
          )}
          {instagramError && (
            <p style={{ fontSize: 12, color: '#E8342A' }}>
              {INSTAGRAM_ERROR_MESSAGES[instagramError] ?? instagramError}
            </p>
          )}
        </div>

        {displayPlatforms.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-dm-sans)' }}>Add your links below.</p>
        ) : (
          <div className="space-y-2">
            {displayPlatforms.map((p) => {
              const isExpanded = expandedPlatforms.has(p.id)
              const value      = socialInputs[p.id] ?? ''
              const hasValue   = value.trim().length > 0
              return (
                <div
                  key={p.id}
                  className="overflow-hidden transition-all duration-200"
                  style={{
                    border: `1px solid ${isExpanded || hasValue ? colors.primary : 'var(--wimc-border-default)'}`,
                    backgroundColor: isExpanded || hasValue ? `${colors.secondary}30` : 'var(--wimc-bg-overlay)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => togglePlatform(p.id)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left"
                  >
                    <span className="font-medium text-sm" style={{ color: 'var(--wimc-text-primary)', fontFamily: 'var(--font-dm-sans)' }}>{p.label}</span>
                    <div className="flex items-center gap-2">
                      {hasValue && (
                        <span className="material-symbols-outlined text-sm" style={{ color: colors.primary, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      )}
                      <span className="material-symbols-outlined text-sm" style={{ color: 'var(--wimc-text-muted)' }}>
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
                        className={inputCls}
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

      {/* ── Contact & reach ───────────────────────────────────────────── */}
      <Section title="Contact & reach">
        <p style={{ fontSize: 12, color: 'var(--wimc-text-secondary)', marginTop: -8, fontFamily: 'var(--font-dm-sans)' }}>
          How people can reach you directly — not shown publicly unless you choose to add them to your page.
        </p>
        {/* Verified phone — read-only, from auth */}
        {authPhone && (
          <div>
            <label className={labelCls}>Mobile number <span style={{ textTransform: 'none', fontWeight: 400 }}>(verified · login identity)</span></label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-xl pointer-events-none" style={{ color: 'var(--wimc-text-muted)' }}>phone</span>
              <input
                type="text"
                value={authPhone}
                readOnly
                className={`${inputCls} pl-11`}
                style={{ opacity: 0.6, cursor: 'not-allowed' }}
              />
            </div>
            <p style={{ fontSize: 11, color: 'var(--wimc-text-muted)', marginTop: 4, fontFamily: 'var(--font-jetbrains-mono)' }}>
              Shared across all your WIMC personas. Contact support to change.
            </p>
          </div>
        )}
        {/* Email */}
        <div>
          <label className={labelCls}>Email</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-xl pointer-events-none" style={{ color: 'var(--wimc-text-muted)' }}>mail</span>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className={`${inputCls} pl-11`}
              placeholder="you@example.com"
            />
          </div>
        </div>
        {/* Website */}
        <div>
          <label className={labelCls}>Website</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-xl pointer-events-none" style={{ color: 'var(--wimc-text-muted)' }}>language</span>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              className={`${inputCls} pl-11`}
              placeholder="https://yourwebsite.com"
            />
          </div>
        </div>
      </Section>

      {/* ── Colour scheme ─────────────────────────────────────────────── */}
      <Section title="Page colour">
        <p style={{ fontSize: 12, color: 'var(--wimc-text-secondary)', marginTop: -8, fontFamily: 'var(--font-dm-sans)' }}>Changes how your public profile page looks.</p>
        <div className="flex flex-wrap gap-3">
          {([
            { hex: '#E8705A', scheme: 'default',  label: 'Default'   },
            { hex: '#9B8FFF', scheme: 'indigo',   label: 'Indigo'    },
            { hex: '#F5A800', scheme: 'neel',     label: 'Neel'      },
            { hex: '#5DD9D0', scheme: 'ocean',    label: 'Ocean'     },
            { hex: '#4ADE80', scheme: 'forest',   label: 'Forest'    },
            { hex: '#F472B6', scheme: 'blush',    label: 'Blush'     },
            { hex: '#60A5FA', scheme: 'midnight', label: 'Midnight'  },
            { hex: '#FCD34D', scheme: 'turmeric', label: 'Turmeric'  },
            { hex: '#D4A574', scheme: 'sienna',   label: 'Sienna'    },
            { hex: '#A8C5A0', scheme: 'sage',     label: 'Sage'      },
            { hex: '#6EE7B7', scheme: 'mint',     label: 'Mint'      },
            { hex: '#C8B69A', scheme: 'sand',     label: 'Sand'      },
          ] as const).map(sw => {
            const isSel = colorScheme === sw.scheme
            return (
              <button
                key={sw.scheme}
                type="button"
                title={sw.label}
                onClick={() => handleColorScheme(sw.scheme)}
                disabled={schemeApplying}
                className="relative flex flex-col items-center gap-1 group"
              >
                <div
                  className="w-10 h-10 rounded-full transition-all duration-150 group-active:scale-95"
                  style={{
                    background: sw.hex,
                    outline: isSel ? `2px solid ${sw.hex}` : 'none',
                    outlineOffset: 2,
                    border: isSel ? '2px solid white' : '2px solid transparent',
                    transform: isSel ? 'scale(1.1)' : 'scale(1)',
                  }}
                >
                  {isSel && (
                    <div className="w-full h-full rounded-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-white text-sm" style={{ fontVariationSettings: "'FILL' 1, 'wght' 700" }}>check</span>
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-medium" style={{ color: isSel ? 'var(--wimc-text-primary)' : 'var(--wimc-text-muted)', fontFamily: 'var(--font-jetbrains-mono)' }}>
                  {sw.label}
                </span>
              </button>
            )
          })}
        </div>
        {schemeApplying && (
          <p style={{ fontSize: 11, color: 'var(--wimc-text-muted)', fontFamily: 'var(--font-jetbrains-mono)' }}>Applying…</p>
        )}
      </Section>

      {/* ── Privacy ───────────────────────────────────────────────────── */}
      <Section title="Privacy">
        <button
          type="button"
          onClick={() => setShowCityMastery((v) => !v)}
          className="flex items-center justify-between w-full px-4 py-3 transition-colors"
          style={{ background: 'var(--wimc-bg-overlay)', border: '1px solid var(--wimc-border-default)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--wimc-bg-hover)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--wimc-bg-overlay)' }}
        >
          <div className="flex flex-col items-start gap-0.5">
            <span className="text-sm font-semibold" style={{ color: 'var(--wimc-text-primary)', fontFamily: 'var(--font-dm-sans)' }}>Share city mastery map</span>
            <span className="text-xs" style={{ color: 'var(--wimc-text-secondary)', fontFamily: 'var(--font-dm-sans)' }}>Show your explored neighbourhoods on your public profile</span>
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
        <p style={{ fontSize: 13, color: '#E8342A', background: 'rgba(232,52,42,0.1)', border: '1px solid rgba(232,52,42,0.3)', padding: '8px 12px', fontFamily: 'var(--font-dm-sans)' }}>{errorMsg}</p>
      )}
      <button
        onClick={handleSave}
        disabled={isPending}
        style={{
          width: '100%', padding: '14px 0', fontSize: 13, fontWeight: 700,
          fontFamily: 'var(--font-jetbrains-mono)', letterSpacing: '0.1em', textTransform: 'uppercase',
          border: 'none', cursor: isPending ? 'default' : 'pointer', opacity: isPending ? 0.6 : 1,
          background: saveStatus === 'saved' ? 'var(--wimc-teal)' : 'var(--wimc-coral)',
          color: saveStatus === 'saved' ? '#07070A' : '#fff',
          transition: 'all 180ms ease',
        }}
      >
        {isPending ? 'SAVING...' : saveStatus === 'saved' ? '✓ SAVED' : 'SAVE CHANGES'}
      </button>

      {/* ── Account ────────────────────────────────────────────────────── */}
      <Section title="Account">
        <button
          onClick={() => signOut()}
          className="flex items-center gap-2 w-full px-4 py-3 transition-all text-sm font-semibold"
          style={{ background: 'var(--wimc-bg-overlay)', color: 'var(--wimc-text-secondary)', border: '1px solid var(--wimc-border-default)', fontFamily: 'var(--font-dm-sans)' }}
          onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = 'var(--wimc-bg-hover)'; el.style.color = 'var(--wimc-text-primary)' }}
          onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = 'var(--wimc-bg-overlay)'; el.style.color = 'var(--wimc-text-secondary)' }}
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
            className="flex items-center gap-2 w-full px-4 py-3 transition-all text-sm font-semibold"
            style={{ border: '1px solid rgba(232,52,42,0.3)', color: '#E8342A', background: 'transparent', fontFamily: 'var(--font-dm-sans)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(232,52,42,0.08)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            <span className="material-symbols-outlined text-base">delete_forever</span>
            Delete account
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            <p style={{ fontSize: 13, color: 'var(--wimc-text-secondary)', lineHeight: 1.6, fontFamily: 'var(--font-dm-sans)' }}>
              This permanently deletes your profile, all blocks, and all events. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 text-sm font-semibold transition-all"
                style={{ background: 'var(--wimc-bg-overlay)', color: 'var(--wimc-text-secondary)', border: '1px solid var(--wimc-border-default)', fontFamily: 'var(--font-dm-sans)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 text-sm font-bold transition-all disabled:opacity-50"
                style={{ background: '#E8342A', color: '#fff', border: 'none', cursor: isDeleting ? 'default' : 'pointer', fontFamily: 'var(--font-dm-sans)' }}
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
