'use client'

import { useEffect, useState, useRef, useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { SK, clearNewOnboardingKeys, LEGACY_KEYS } from '@/lib/onboarding/session-keys'
import { updatePersonas } from '@/lib/onboarding/update-personas'
import { completeOnboarding, uploadOnboardingAvatar, getOnboardingStudioBootstrap } from '@/app/actions/onboarding'
import { updateCreatorStudioContent, updateProfileTheme } from '@/app/actions/profile'
import { reorderBlocks, toggleBlockVisibility, addBlock, updateBlock } from '@/app/actions/blocks'
import { INTEREST_TAGS } from '@/lib/constants/interests'
import { PLATFORM_REGISTRY } from '@/lib/platforms'
import { V2_CREATOR_TYPES } from '@/types/onboarding'
import { getCategoryColour, PAPER } from '@/lib/onboarding/design-tokens'
import { ArtifactStyles, ScaledStage, CreatorPoster } from '@/components/onboarding/artifacts'
import BlockEditor from '@/components/dashboard/BlockEditor'
import ThemeEditor from '@/components/dashboard/ThemeEditor'
import PreviewPanel from '@/components/dashboard/PreviewPanel'
import StudioShell, { type StudioTab } from '@/components/dashboard/StudioShell'
import type { UserProfile, PageBlock, Event } from '@/types/database'
import type { ProfileTheme } from '@/types/theme'

type CreatorTypeV2 = typeof V2_CREATOR_TYPES[number]

function isValidCreatorType(v: string): v is CreatorTypeV2 {
  return (V2_CREATOR_TYPES as readonly string[]).includes(v)
}

// ── Reveal constants (shared with the "complete" phase below) ────────────────
const CORAL  = '#E8705A'
const NAVY   = '#1A2744'
const MONO   = "var(--font-jetbrains-mono), 'JetBrains Mono', monospace"
const BARLOW = "var(--font-barlow), 'Barlow Condensed', sans-serif"
const ABRIL  = "var(--font-abril), 'Abril Fatface', serif"

const REVEAL_KEYFRAMES = `
@keyframes c8-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
@keyframes ticket-fade-up { 0%{opacity:0;transform:translateY(20px)} 100%{opacity:1;transform:translateY(0)} }
@keyframes ticket-reveal  { 0%{opacity:0} 100%{opacity:1} }
@keyframes ticket-pulse   { 0%,100%{opacity:1} 50%{opacity:0.4} }
`

const STUDIO_TABS: StudioTab[] = [
  { key: 'content', label: 'Content', icon: 'edit' },
  { key: 'blocks',  label: 'Blocks',  icon: 'add_box' },
  { key: 'theme',   label: 'Theme',   icon: 'palette' },
]

type TabKey = 'content' | 'blocks' | 'theme'

function normalizeSocialUrl(platform: string, raw: string): string {
  const trimmed = raw.trim()
  if (platform === 'whatsapp') {
    const digits = trimmed.replace(/\s+/g, '')
    if (/^\d{10}$/.test(digits)) return `+91${digits}`
    if (/^91\d{10}$/.test(digits)) return `+${digits}`
    return digits
  }
  if (trimmed && !trimmed.startsWith('http')) return `https://${trimmed.replace(/^@/, '')}`
  return trimmed
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function C8CombinedPage() {
  const router       = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [phase,      setPhase]      = useState<'stamping' | 'editing' | 'complete' | 'error'>('stamping')
  const [retryError, setRetryError] = useState('')

  // Identity data (loaded from sessionStorage — carried across the wizard)
  const [displayName,    setDisplayName]    = useState('')
  const [city,            setCity]           = useState('')
  const [category,        setCategory]       = useState('')
  const [interestTagIds,  setInterestTagIds] = useState<string[]>([])
  const [isAddMode,       setIsAddMode]      = useState(false)
  const [pendingRedirect, setPendingRedirect] = useState<string | null>(null)

  // Platforms selected back in C6 — the user must fill in a handle/link for
  // each one before they can claim their page (Instagram uses the dedicated
  // field in the Content tab; the rest live in "Link your socials" below).
  const [platforms,   setPlatforms]   = useState<string[]>([])
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({})

  // Studio bootstrap data — fetched once completeOnboarding() has created the
  // real profile + seeded default blocks
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [tab,     setTab]     = useState<TabKey>('content')

  // Content tab (deferred — only persisted at "Claim my page")
  const [bio,              setBio]             = useState('')
  const [contactEmail,     setContactEmail]    = useState('')
  const [websiteUrl,       setWebsiteUrl]      = useState('')
  const [instagramHandle,  setInstagramHandle] = useState('')
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null)
  const [avatarUploading,  setAvatarUploading] = useState(false)
  const [avatarError,      setAvatarError]     = useState<string | null>(null)

  // Blocks tab — BlockEditor persists add/edit internally; reorder + visibility
  // are batched through onSave, same as the real dashboard Studio
  const [blocks,             setBlocks]             = useState<PageBlock[]>([])
  const [events,             setEvents]             = useState<Event[]>([])
  const [highlightedBlockId, setHighlightedBlockId] = useState<string | null>(null)
  const [blocksDirty,        setBlocksDirty]        = useState(false)
  const [blocksSaving,       setBlocksSaving]       = useState(false)
  const [isPending,          startTransition]       = useTransition()

  // Theme tab (deferred — only persisted at "Claim my page")
  const [theme,      setTheme]      = useState<ProfileTheme | null>(null)
  const [themeDirty, setThemeDirty] = useState(false)

  const [isClaiming, setIsClaiming] = useState(false)
  const [claimError, setClaimError] = useState<string | null>(null)
  const [isLeaving,   setIsLeaving]  = useState(false)

  const accent = getCategoryColour(category)

  // BlockEditor's "Add a block" modal centers itself with
  // `paddingLeft: calc(var(--wimc-sidebar-w, var(--venue-sidebar-w, 0px)) + 40px)`
  // so it doesn't land under the persistent dashboard sidebar. globals.css
  // defaults those vars to 60px/64px for the real dashboard — but onboarding
  // has no sidebar, so left uncorrected the modal renders visibly off-centre
  // here. Same fix VenueSidebarClient.tsx already uses for its own context:
  // override the vars on :root for as long as this page is mounted.
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--wimc-sidebar-w', '0px')
    root.style.setProperty('--venue-sidebar-w', '0px')
    return () => {
      root.style.removeProperty('--wimc-sidebar-w')
      root.style.removeProperty('--venue-sidebar-w')
    }
  }, [])

  // ── Bootstrap: create the profile (mount-time, as before) then fetch the
  // real profile/blocks/theme rows for the embedded Studio editor ───────────
  useEffect(() => {
    async function doBootstrap() {
      const dn         = sessionStorage.getItem(SK.c_name)     || ''
      const storedUser = sessionStorage.getItem(SK.c_username) || ''
      const rawCat     = sessionStorage.getItem(SK.c_category) || ''
      const cityVal    = sessionStorage.getItem(SK.c_city)     || ''

      if (!dn) { router.replace('/onboarding/creator/C2'); return }

      let subTypesArr: string[] = []
      try { subTypesArr = JSON.parse(sessionStorage.getItem(SK.c_subtypes) || '[]') } catch {}

      let offlineActsArr: string[] = []
      try { offlineActsArr = JSON.parse(sessionStorage.getItem(SK.c_offline_acts) || '[]') } catch {}

      let tagsArr: string[] = []
      try {
        const raw: unknown[] = JSON.parse(sessionStorage.getItem(SK.c_interests) || '[]')
        tagsArr = raw.map(i =>
          typeof i === 'string' ? i : (typeof i === 'object' && i !== null && 'tag' in i ? String((i as { tag: unknown }).tag) : '')
        ).filter(Boolean)
      } catch {}

      let platsArr: string[] = []
      try { platsArr = JSON.parse(sessionStorage.getItem(SK.c_platforms) || '[]') } catch {}

      let savedHandles: Record<string, string> = {}
      try { savedHandles = JSON.parse(sessionStorage.getItem(SK.c_social_handles) || '{}') } catch {}

      setDisplayName(dn)
      setCity(cityVal)
      setCategory(rawCat)
      setInterestTagIds(tagsArr)
      setPlatforms(platsArr)
      setIsAddMode(sessionStorage.getItem('wimc_ob_mode') === 'add')
      setPendingRedirect(sessionStorage.getItem('wimc_post_onboarding_redirect'))

      const paddedTags = tagsArr.length >= 3
        ? tagsArr
        : [...tagsArr, ...INTEREST_TAGS.filter(t => !tagsArr.includes(t.id)).slice(0, 3 - tagsArr.length).map(t => t.id)]

      const creatorType: CreatorTypeV2 = isValidCreatorType(rawCat) ? rawCat : 'exploring'

      try {
        // Create the profile and seed the default blocks for this creator
        // type (undefined selectedBlocks → completeOnboarding falls back to
        // its own default block map) so the Studio editor below has real,
        // persisted rows to work with the moment it mounts.
        const result = await completeOnboarding({
          displayName: dn, username: storedUser, creatorType,
          city: cityVal, subTypes: subTypesArr, offlineActivities: offlineActsArr,
          interestTags: paddedTags, socialLinks: [],
          bio: undefined, colorScheme: undefined,
        }, undefined)
        if (result.error) { setRetryError(result.error); setPhase('error'); return }
        if (result.username) {
          try { sessionStorage.setItem(SK.c_final_username, result.username) } catch {}
        }
      } catch {
        setRetryError('Something went wrong. Please try again.')
        setPhase('error')
        return
      }

      const boot = await getOnboardingStudioBootstrap()
      if (boot.error || !boot.profile) {
        setRetryError(boot.error || 'Could not load your page. Please try again.')
        setPhase('error')
        return
      }

      // Pre-fill from an existing social_links_row block (e.g. the user went
      // Back then Forward and blocks already persisted in the DB).
      const existingSocialBlock = boot.blocks.find(b => b.block_type === 'social_links_row')
      if (existingSocialBlock) {
        const cfgLinks = (existingSocialBlock.config as { links?: Array<{ platform: string; url: string }> } | null)?.links ?? []
        for (const l of cfgLinks) if (!savedHandles[l.platform]) savedHandles = { ...savedHandles, [l.platform]: l.url }
      }

      // Pre-fill WhatsApp from the phone number the user actually signed up
      // with, if they selected WhatsApp back in C6 and haven't typed one in yet.
      if (platsArr.includes('whatsapp') && !savedHandles.whatsapp && boot.authPhone) {
        savedHandles = { ...savedHandles, whatsapp: boot.authPhone }
      }

      setSocialLinks(savedHandles)
      try { sessionStorage.setItem(SK.c_social_handles, JSON.stringify(savedHandles)) } catch {}

      setProfile(boot.profile)
      setBlocks(boot.blocks)
      setEvents(boot.events)
      setTheme(boot.theme)
      setBio(boot.profile.bio ?? sessionStorage.getItem(SK.c_bio) ?? '')
      // Pre-fill contact email from the auth email if the user signed up that
      // way and hasn't set one yet.
      setContactEmail(boot.profile.contact_email ?? boot.authEmail ?? '')
      setWebsiteUrl(boot.profile.website_url ?? '')
      setInstagramHandle(boot.profile.instagram_handle ?? savedHandles.instagram ?? '')
      setAvatarPreviewUrl(boot.profile.avatar_url)

      setPhase('editing')
    }

    doBootstrap()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  // ── Content handlers ─────────────────────────────────────────────────────

  function writeBioDraft(v: string) {
    setBio(v)
    try { sessionStorage.setItem(SK.c_bio, v) } catch {}
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarPreviewUrl(URL.createObjectURL(file))
    setAvatarUploading(true)
    setAvatarError(null)
    const fd = new FormData()
    fd.append('file', file)
    const result = await uploadOnboardingAvatar(fd)
    setAvatarUploading(false)
    if (result.error) {
      setAvatarError(result.error)
    } else if (result.url) {
      setAvatarPreviewUrl(result.url)
      setProfile(prev => prev ? { ...prev, avatar_url: result.url } : prev)
    }
  }

  // ── Blocks handlers — mirrors the real /dashboard/studio Studio exactly ──

  const handleBlocksChange = useCallback((updated: PageBlock[]) => {
    setBlocks(updated)
    setBlocksDirty(true)
  }, [])

  function handleBlocksSave() {
    setBlocksSaving(true)
    startTransition(async () => {
      try {
        const orderedIds = blocks.map(b => b.id)
        await reorderBlocks(orderedIds)
        for (const b of blocks) {
          await toggleBlockVisibility(b.id, b.is_visible)
        }
        setBlocksSaving(false)
        setBlocksDirty(false)
      } catch {
        setBlocksSaving(false)
      }
    })
  }

  // ── Theme handlers — fully deferred to "Claim my page" below ────────────

  const handleThemeChange = useCallback((partial: Partial<ProfileTheme>) => {
    setTheme(prev => (prev ? { ...prev, ...partial } : prev))
    setThemeDirty(true)
  }, [])

  const handleThemeReplace = useCallback((newTheme: ProfileTheme) => {
    setTheme(newTheme)
    setThemeDirty(true)
  }, [])

  function handleThemeSoftSave() {
    // Real persistence happens once, in handleClaim() below — this just
    // clears ThemeEditor's own "unsaved" indicator while the user keeps working.
    setThemeDirty(false)
  }

  // ── Social links validation — every platform picked in C6 needs a value ──

  function missingPlatforms(): string[] {
    return platforms.filter(p => {
      const val = p === 'instagram' ? instagramHandle : (socialLinks[p] ?? '')
      return !val.trim()
    })
  }

  function platformLabel(id: string): string {
    return PLATFORM_REGISTRY.find(p => p.id === id)?.label ?? id
  }

  // Creates or updates the social_links_row block from whatever the user
  // filled in for the (non-Instagram) platforms picked back in C6.
  async function persistSocialLinksBlock(): Promise<{ error: string | null }> {
    const links = platforms
      .filter(p => p !== 'instagram')
      .map(p => ({ platform: p, url: normalizeSocialUrl(p, socialLinks[p] ?? '') }))
      .filter(l => l.url)

    if (links.length === 0) return { error: null }

    const existing = blocks.find(b => b.block_type === 'social_links_row')
    if (existing) {
      return updateBlock(existing.id, { links })
    }

    const { block: newBlock, error } = await addBlock('social_links_row')
    if (error || !newBlock) return { error: error ?? 'Failed to save your social links.' }
    const updateResult = await updateBlock(newBlock.id, { links })
    if (updateResult.error) return updateResult
    setBlocks(prev => [...prev, { ...newBlock, config: { links } as unknown as PageBlock['config'] }])
    return { error: null }
  }

  // ── Claim my page — single deferred write for bio/content + theme ───────

  async function handleClaim() {
    if (isClaiming || !theme) return

    const missing = missingPlatforms()
    if (missing.length > 0) {
      setClaimError(`Add your ${missing.map(platformLabel).join(', ')} link${missing.length > 1 ? 's' : ''} to continue.`)
      setTab('content')
      return
    }

    setIsClaiming(true)
    setClaimError(null)

    const tasks: Promise<{ error: string | null }>[] = [
      updateCreatorStudioContent({
        bio,
        instagram_handle: instagramHandle,
        website_url:      websiteUrl,
        contact_email:    contactEmail,
      }),
      updateProfileTheme(theme),
      persistSocialLinksBlock(),
    ]

    // Flush any pending block reorder/visibility changes so nothing is lost
    // if the user never clicked BlockEditor's own Save button.
    if (blocksDirty) {
      tasks.push((async () => {
        const orderedIds = blocks.map(b => b.id)
        await reorderBlocks(orderedIds)
        for (const b of blocks) {
          await toggleBlockVisibility(b.id, b.is_visible)
        }
        return { error: null }
      })())
    }

    const results = await Promise.all(tasks)
    const failed = results.find(r => r.error)
    if (failed) {
      setClaimError(failed.error ?? 'Something went wrong. Please try again.')
      setIsClaiming(false)
      return
    }

    setBlocksDirty(false)
    setPhase('complete')
    setIsClaiming(false)
  }

  async function handleContinueTo(dest: string) {
    if (isLeaving) return
    setIsLeaving(true)
    if (isAddMode) {
      try { await updatePersonas('creator') } catch {}
    }
    try { sessionStorage.removeItem('wimc_post_onboarding_redirect') } catch {}
    clearNewOnboardingKeys()
    LEGACY_KEYS.forEach(k => { try { sessionStorage.removeItem(k) } catch {} })
    router.replace(dest)
  }

  // ── Content tab panel — called as ContentPanel(), never as <ContentPanel/>,
  // so inputs never lose focus on re-render (same pattern as StudioClient). ──

  function ContentPanel() {
    const inputBase: React.CSSProperties = {
      width: '100%', boxSizing: 'border-box',
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      padding: '10px 12px',
      fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#ffffff',
      outline: 'none',
    }
    const labelStyle: React.CSSProperties = {
      fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 11,
      color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase',
      letterSpacing: '0.1em', margin: '0 0 10px',
    }

    return (
      <div style={{ padding: '20px 20px 36px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Profile photo */}
        <div>
          <p style={labelStyle}>Profile photo</p>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleAvatarChange} style={{ display: 'none' }} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarUploading}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              padding: '12px 16px', cursor: 'pointer', width: '100%', boxSizing: 'border-box',
            }}
          >
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: `${accent}25`, display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', flexShrink: 0,
            }}>
              {avatarPreviewUrl
                ? <img src={avatarPreviewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span className="material-symbols-outlined" style={{ fontSize: 22, color: accent }}>
                    {avatarUploading ? 'hourglass_empty' : 'photo_camera'}
                  </span>
              }
            </div>
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14, color: '#ffffff', margin: 0 }}>
                {avatarUploading ? 'Uploading...' : avatarPreviewUrl ? 'Change photo' : 'Upload a photo'}
              </p>
              {avatarError && <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#FF6B6B', margin: '2px 0 0' }}>{avatarError}</p>}
            </div>
          </button>
        </div>

        {/* Bio */}
        <div>
          <p style={labelStyle}>Your bio</p>
          <textarea
            value={bio}
            maxLength={160}
            onChange={e => writeBioDraft(e.target.value)}
            placeholder="Tell the city who you are..."
            rows={3}
            style={{ ...inputBase, resize: 'none', caretColor: accent, lineHeight: 1.5 }}
          />
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.20)', textAlign: 'right', margin: '4px 0 0' }}>
            {bio.length}/160
          </p>
        </div>

        {/* Contact email + Website */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <p style={labelStyle}>Contact email</p>
            <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="you@email.com" style={inputBase} />
          </div>
          <div>
            <p style={labelStyle}>Website</p>
            <input type="url" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="https://yoursite.com" style={inputBase} />
          </div>
        </div>

        {/* Instagram */}
        <div>
          <p style={{ ...labelStyle, color: platforms.includes('instagram') && !instagramHandle.trim() ? '#F59E0B' : labelStyle.color }}>
            Instagram{platforms.includes('instagram') && !instagramHandle.trim() ? ' · required' : ''}
          </p>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'rgba(255,255,255,0.35)' }}>@</span>
            <input
              type="text"
              value={instagramHandle}
              onChange={e => setInstagramHandle(e.target.value.replace(/^@/, ''))}
              placeholder="yourhandle"
              style={{
                ...inputBase, paddingLeft: 26,
                border: `1px solid ${platforms.includes('instagram') && !instagramHandle.trim() ? '#F59E0B60' : 'rgba(255,255,255,0.08)'}`,
              }}
            />
          </div>
        </div>

        {/* Link your socials — one field per (non-Instagram) platform picked
            back in C6; each is required before the page can be claimed. */}
        {platforms.filter(p => p !== 'instagram').length > 0 && (
          <div>
            <p style={labelStyle}>Link your socials</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {platforms.filter(p => p !== 'instagram').map(pid => {
                const plat = PLATFORM_REGISTRY.find(p => p.id === pid)
                const val = socialLinks[pid] ?? ''
                const isMissing = !val.trim()
                return (
                  <div key={pid}>
                    <p style={{ ...labelStyle, margin: '0 0 4px', color: isMissing ? '#F59E0B' : labelStyle.color }}>
                      {plat?.label ?? pid}{isMissing ? ' · required' : ''}
                    </p>
                    <input
                      type="text"
                      placeholder={plat?.placeholder ?? '@handle'}
                      value={val}
                      onChange={e => {
                        const next = { ...socialLinks, [pid]: e.target.value }
                        setSocialLinks(next)
                        try { sessionStorage.setItem(SK.c_social_handles, JSON.stringify(next)) } catch {}
                      }}
                      style={{ ...inputBase, border: `1px solid ${isMissing ? '#F59E0B60' : 'rgba(255,255,255,0.08)'}` }}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    )
  }

  // ── Mobile drawer panel content (StudioShell renders this on mobile only) ─

  function renderPanel(key: string): React.ReactNode {
    if (key === 'content') {
      return <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 110 }}>{ContentPanel()}</div>
    }
    if (key === 'blocks') {
      return (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <BlockEditor
            blocks={blocks}
            events={events}
            onBlocksChange={handleBlocksChange}
            onEditBlock={id => setHighlightedBlockId(id)}
            isDirty={blocksDirty}
            isSaving={blocksSaving || isPending}
            onSave={handleBlocksSave}
            userTier={profile?.user_tier}
          />
        </div>
      )
    }
    if (key === 'theme' && theme) {
      return (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <ThemeEditor
            theme={theme}
            onThemeChange={handleThemeChange}
            onThemeReplace={handleThemeReplace}
            isDirty={themeDirty}
            isSaving={false}
            onSave={handleThemeSoftSave}
          />
        </div>
      )
    }
    return null
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (phase === 'stamping') {
    return (
      <>
        <style>{`@keyframes c8-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
        <div style={{
          position: 'fixed', inset: 0, background: '#1A2744',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 16,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            border: `2px solid ${accent}`, borderTopColor: 'transparent',
            animation: 'c8-spin 1s linear infinite',
          }} />
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'rgba(255,255,255,0.40)' }}>
            Building your page...
          </span>
        </div>
      </>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: '#1A2744',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center',
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 40, color: accent }}>error</span>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'rgba(255,255,255,0.45)', maxWidth: 320, margin: 0 }}>
          {retryError || 'Could not create your profile. Please try again.'}
        </p>
        <button onClick={() => router.replace('/onboarding/creator/C2')}
          style={{ background: accent, color: '#ffffff', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14, padding: '12px 24px', border: 'none', cursor: 'pointer' }}>
          Start over
        </button>
      </div>
    )
  }

  // ── Complete — "page is live" reveal with 3 destinations ─────────────────────
  if (phase === 'complete') {
    const tagLabels = interestTagIds
      .map(id => INTEREST_TAGS.find(t => t.id === id)?.label)
      .filter((v): v is string => Boolean(v))
      .slice(0, 3)

    const username   = profile?.username ?? ''
    const citySlug    = (profile?.city ?? city).toLowerCase().replace(/\s+/g, '-')
    const profilePath = profile?.creator_type === 'business_brand' ? `/${citySlug}/${username}` : `/${username}`

    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: REVEAL_KEYFRAMES }} />
        <div style={{
          position: 'fixed', inset: 0, background: NAVY,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '24px 24px 40px', overflowY: 'auto',
          animation: 'ticket-reveal 0.6s ease both',
        }}>
          <div style={{ position: 'absolute', top: 24, left: 28, animation: 'ticket-fade-up 0.5s ease 0.2s both' }}>
            <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 14, color: `${accent}80`, letterSpacing: '0.15em' }}>
              WHEN IN MY CITY
            </span>
          </div>

          <div style={{ position: 'absolute', top: 24, right: 28, display: 'flex', alignItems: 'center', gap: 6, animation: 'ticket-fade-up 0.5s ease 0.2s both' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22C55E', animation: 'ticket-pulse 2s ease-in-out infinite' }} />
            <span style={{ fontFamily: MONO, fontSize: 9, color: '#22C55E', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
              PAGE LIVE
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 440, width: '100%' }}>
            <p style={{ fontFamily: MONO, fontSize: 9, color: `${CORAL}99`, letterSpacing: '0.35em', textTransform: 'uppercase', margin: '0 0 12px', animation: 'ticket-fade-up 0.5s ease 0.3s both' }}>
              — YOUR PAGE IS LIVE —
            </p>

            <h1 style={{ fontFamily: ABRIL, fontSize: 'clamp(36px, 10vw, 64px)', color: '#F0EFF8', lineHeight: 1.0, margin: '0 0 8px', textAlign: 'center', animation: 'ticket-fade-up 0.6s ease 0.4s both', textTransform: 'uppercase' }}>
              {displayName}
            </h1>

            {(city || category) && (
              <p style={{ fontFamily: BARLOW, fontWeight: 600, fontSize: 13, color: `${accent}90`, letterSpacing: '0.25em', textTransform: 'uppercase', margin: '0 0 36px', animation: 'ticket-fade-up 0.5s ease 0.5s both' }}>
                {[category, city].filter(Boolean).join(' · ')}
              </p>
            )}

            <div style={{ width: '100%', marginBottom: 40 }}>
              <ArtifactStyles />
              <ScaledStage width={480} height={720} maxWidth={300}>
                <CreatorPoster displayName={displayName} city={city} tags={tagLabels} photoUrl={avatarPreviewUrl} handle={username} />
              </ScaledStage>
            </div>

            <div style={{ width: '100%', maxWidth: 360, marginBottom: 20, animation: 'ticket-fade-up 0.4s ease 1.3s both' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, height: 1, background: `${accent}20` }} />
                <span style={{ fontFamily: MONO, fontSize: 9, color: `${accent}50`, letterSpacing: '0.25em' }}>WHAT&apos;S NEXT</span>
                <div style={{ flex: 1, height: 1, background: `${accent}20` }} />
              </div>
            </div>

            {/* Three destinations */}
            <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 10, animation: 'ticket-fade-up 0.5s ease 1.4s both' }}>
              <button
                type="button"
                onClick={() => handleContinueTo(profilePath)}
                disabled={isLeaving}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', background: accent, color: NAVY,
                  fontFamily: MONO, fontWeight: 700, fontSize: 13,
                  letterSpacing: '0.10em', textTransform: 'uppercase',
                  padding: '16px 20px', border: `1px solid ${NAVY}`,
                  boxShadow: '6px 6px 0px 0px rgba(0,0,0,0.9)',
                  cursor: isLeaving ? 'default' : 'pointer',
                  opacity: isLeaving ? 0.6 : 1,
                }}
              >
                <span>Go to my page</span>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
              </button>

              <button
                type="button"
                onClick={() => handleContinueTo('/dashboard/studio')}
                disabled={isLeaving}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', background: 'transparent', color: '#F0EFF8',
                  fontFamily: MONO, fontWeight: 700, fontSize: 13,
                  letterSpacing: '0.10em', textTransform: 'uppercase',
                  padding: '16px 20px', border: `1px solid ${accent}60`,
                  cursor: isLeaving ? 'default' : 'pointer',
                  opacity: isLeaving ? 0.6 : 1,
                }}
              >
                <span>Edit my page</span>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span>
              </button>

              <button
                type="button"
                onClick={() => handleContinueTo('/dashboard')}
                disabled={isLeaving}
                style={{
                  background: 'none', border: 'none', textAlign: 'center',
                  fontFamily: "'DM Sans', sans-serif", fontSize: 13,
                  color: 'rgba(255,255,255,0.40)', cursor: isLeaving ? 'default' : 'pointer',
                  padding: '8px 0 0', textDecoration: 'underline', textUnderlineOffset: 3,
                }}
              >
                Go to my dashboard
              </button>
            </div>
          </div>

          <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', animation: 'ticket-fade-up 0.4s ease 1.6s both', whiteSpace: 'nowrap' }}>
            <span style={{ fontFamily: MONO, fontSize: 9, color: `${accent}25`, letterSpacing: '0.20em' }}>
              NODE_ID: C008-CREATOR · PAGE: LIVE
            </span>
          </div>
        </div>
      </>
    )
  }

  // ── Editing — embedded Studio (Content / Blocks / Theme) + live preview ─────
  if (!profile || !theme) return null

  return (
    <>
    <StudioShell
      preview={
        <PreviewPanel
          profile={profile}
          blocks={blocks}
          events={events}
          theme={theme}
          highlightedBlockId={highlightedBlockId}
          saveStatus={blocksSaving ? 'saving' : 'idle'}
          isDirty={blocksDirty || themeDirty}
          device="mobile"
        />
      }
      tabs={STUDIO_TABS}
      renderPanel={renderPanel}
      accentColor={accent}
      panelBg="#243156"
    >
      <div style={{ height: '100dvh', background: NAVY, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '32px 24px 0', flexShrink: 0 }}>
          <h1 style={{ fontFamily: "var(--font-abril), 'Abril Fatface', serif", fontSize: 'clamp(26px, 6vw, 38px)', color: '#F0EFF8', lineHeight: 1.05, margin: '0 0 8px' }}>
            {isAddMode ? '✦ Creator added' : 'Polish your page.'}
          </h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'rgba(255,255,255,0.35)', margin: '0 0 20px', fontStyle: 'italic' }}>
            {isAddMode ? 'Switch personas from your dashboard.' : 'Optional — your page is already live'}
          </p>

          {/* Tab switcher */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
            {STUDIO_TABS.map(t => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key as TabKey)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 8,
                  background: tab === t.key ? accent : 'rgba(255,255,255,0.06)',
                  color: tab === t.key ? '#ffffff' : 'rgba(255,255,255,0.55)',
                  border: 'none', cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body — two-pane; StudioShell only renders this branch on desktop */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ width: '42%', minWidth: 340, flexShrink: 0, overflowY: 'auto', paddingBottom: 110, borderRight: '1px solid rgba(255,255,255,0.08)' }}>
            {tab === 'content' && ContentPanel()}
            {tab === 'blocks' && (
              <BlockEditor
                blocks={blocks}
                events={events}
                onBlocksChange={handleBlocksChange}
                onEditBlock={id => setHighlightedBlockId(id)}
                isDirty={blocksDirty}
                isSaving={blocksSaving || isPending}
                onSave={handleBlocksSave}
                userTier={profile.user_tier}
              />
            )}
            {tab === 'theme' && (
              <ThemeEditor
                theme={theme}
                onThemeChange={handleThemeChange}
                onThemeReplace={handleThemeReplace}
                isDirty={themeDirty}
                isSaving={false}
                onSave={handleThemeSoftSave}
              />
            )}
          </div>
          <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: PAPER.bg }}>
            <PreviewPanel
              profile={profile}
              blocks={blocks}
              events={events}
              theme={theme}
              highlightedBlockId={highlightedBlockId}
              saveStatus={blocksSaving ? 'saving' : 'idle'}
              isDirty={blocksDirty || themeDirty}
              device="mobile"
            />
          </div>
        </div>
      </div>
    </StudioShell>

    {/* Persistent Claim bar — a sibling of StudioShell (not inside its
        `children`), so it survives on mobile too. StudioShell replaces
        `children` entirely with its own drawer UI when isMobile is true.
        On desktop this bar spans both the navy 42%-wide tab column (same
        width as every other onboarding screen's left panel) AND the cream
        (PAPER.bg, matching the preview pane's own background and every other
        screen's right panel) area beside it, so its background is split into
        two fading zones instead of one navy gradient smeared across the
        cream side. On mobile there's no cream zone (StudioShell's drawer is
        single-column), so it collapses to a single navy fade via the media
        query below. */}
    <footer className="ob-c8-claimbar" style={{
      // 60: above StudioShell's own drawer content (tops out at z-45) and its
      // referenced MobileBottomNav (z-55), but below BlockEditor's "Add a
      // block" modal (z-70/z-80) so that modal correctly floats on top of
      // this bar instead of being covered by it.
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 60,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', height: 72,
    }}>
      <div className="ob-c8-claimbar-bg-left" aria-hidden style={{
        position: 'absolute', left: 0, bottom: 0, top: 0, width: 'max(42%, 340px)', zIndex: 0,
        background: 'linear-gradient(to top, var(--ob-panel-bg, #1A2744) 60%, transparent 100%)',
      }} />
      <div className="ob-c8-claimbar-bg-right" aria-hidden style={{
        position: 'absolute', left: 'max(42%, 340px)', right: 0, bottom: 0, top: 0, zIndex: 0,
        background: `linear-gradient(to top, ${PAPER.bg} 60%, transparent 100%)`,
      }} />
      <button type="button" onClick={() => router.push('/onboarding/creator/C7')}
        style={{ position: 'relative', zIndex: 1, background: 'none', border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: 'rgba(255,255,255,0.30)', cursor: 'pointer', padding: 0 }}>
        ← Back
      </button>
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
        {claimError && (
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#FF6B6B', margin: 0, maxWidth: 220, textAlign: 'right' }}>
            {claimError}
          </p>
        )}
        <button
          type="button"
          onClick={handleClaim}
          disabled={isClaiming}
          style={{
            background: accent, color: '#ffffff',
            fontFamily: "var(--font-barlow), 'Barlow Condensed', sans-serif",
            fontWeight: 700, fontSize: 15,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            padding: '12px 32px', border: 'none',
            boxShadow: isClaiming ? 'none' : '8px 8px 0px 0px #000000',
            cursor: isClaiming ? 'default' : 'pointer',
            opacity: isClaiming ? 0.7 : 1,
            transition: 'all 150ms',
          }}
        >
          {isClaiming ? 'Saving...' : 'Claim my page →'}
        </button>
      </div>
      <style>{`
        @media (max-width: 767px) {
          .ob-c8-claimbar-bg-right { display: none !important; }
          .ob-c8-claimbar-bg-left { width: 100% !important; }
        }
      `}</style>
    </footer>
    </>
  )
}
