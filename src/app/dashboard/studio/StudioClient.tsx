'use client'

import { useState, useCallback, useTransition, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { UserProfile, PageBlock, Event } from '@/types/database'
import type { ProfileTheme } from '@/types/theme'
import BlockEditor from '@/components/dashboard/BlockEditor'
import ThemeEditor from '@/components/dashboard/ThemeEditor'
import PreviewPanel from '@/components/dashboard/PreviewPanel'
import PublicProfilePage from '@/components/profile/PublicProfilePage'
import StudioShell, { type StudioTab } from '@/components/dashboard/StudioShell'
import { reorderBlocks, toggleBlockVisibility } from '@/app/actions/blocks'
import { updateProfileTheme, updateCreatorStudioContent } from '@/app/actions/profile'

// ── Types ─────────────────────────────────────────────────────────────────────

type TabKey = 'content' | 'blocks' | 'theme'
type Device = 'mobile' | 'desktop'

interface StudioClientProps {
  profile: UserProfile
  initialBlocks: PageBlock[]
  upcomingEvents: Event[]
  theme: ProfileTheme
  showRevealBanner?: boolean
}

// ── Studio colour tokens (always dark, creation-tool aesthetic) ───────────────
// The studio is intentionally dark regardless of the cream dashboard theme.
// BlockEditor + ThemeEditor were built for dark backgrounds.

const MONO  = "'JetBrains Mono', monospace"
const INTER = "'Inter', system-ui, sans-serif"

const S = {
  bg:         '#1A2744',   // deep navy — studio identity
  panel:      '#243156',   // middle panel: visibly distinct from sidebar (#1A2744)
  panelBorder:'rgba(255,255,255,0.09)',
  header:     '#14203A',   // topbar: slightly darker navy
  elevated:   '#2B3A68',   // raised elements inside panel
  overlay:    'rgba(255,255,255,0.06)',
  text:       'rgba(255,255,255,0.90)',
  textSub:    'rgba(255,255,255,0.50)',
  textMuted:  'rgba(255,255,255,0.28)',
  coral:      '#E8705A',
  border:     'rgba(255,255,255,0.10)',
  borderHover:'rgba(232,112,90,0.55)',
  preview:    '#F2EDE3',   // right panel: warm cream canvas
}

const CREATOR_TABS: StudioTab[] = [
  { key: 'content', label: 'Content', icon: 'edit'    },
  { key: 'blocks',  label: 'Blocks',  icon: 'add_box' },
  { key: 'theme',   label: 'Theme',   icon: 'palette' },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function StudioClient({
  profile,
  initialBlocks,
  upcomingEvents,
  theme: initialTheme,
  showRevealBanner = false,
}: StudioClientProps) {
  const citySlug = profile.city.toLowerCase().replace(/\s+/g, '-')
  const profilePath = profile.creator_type === 'business_brand'
    ? `/${citySlug}/${profile.username}`
    : `/${profile.username}`

  const router = useRouter()
  const [tab, setTab] = useState<TabKey>('content')
  const [device, setDevice] = useState<Device>('mobile')

  // ── Content tab state ────────────────────────────────────────────────────
  const [bio,             setBio]             = useState(profile.bio             ?? '')
  const [instagramHandle, setInstagramHandle] = useState(profile.instagram_handle ?? '')
  const [websiteUrl,      setWebsiteUrl]      = useState(profile.website_url      ?? '')
  const [contactEmail,    setContactEmail]    = useState(profile.contact_email    ?? '')
  const [contentDirty,    setContentDirty]    = useState(false)
  const [contentSaving,   setContentSaving]   = useState(false)
  const [contentStatus,   setContentStatus]   = useState<'idle' | 'saved' | 'error'>('idle')

  const origContent = useRef({
    bio:             profile.bio             ?? '',
    instagramHandle: profile.instagram_handle ?? '',
    websiteUrl:      profile.website_url      ?? '',
    contactEmail:    profile.contact_email    ?? '',
  })

  // ── Blocks tab state ─────────────────────────────────────────────────────
  const [blocks, setBlocks] = useState<PageBlock[]>(initialBlocks)
  const [highlightedBlockId, setHighlightedBlockId] = useState<string | null>(null)
  const [blocksDirty,  setBlocksDirty]  = useState(false)
  const [blocksSaving, setBlocksSaving] = useState(false)
  const [blocksStatus, setBlocksStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  // ── Theme tab state ──────────────────────────────────────────────────────
  const [theme, setTheme] = useState<ProfileTheme>(initialTheme)
  const [themeDirty,  setThemeDirty]  = useState(false)
  const [themeSaving, setThemeSaving] = useState(false)
  const [themeStatus, setThemeStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  const [isPending, startTransition] = useTransition()
  const origBlocks = useRef<PageBlock[]>([...initialBlocks])
  const origTheme  = useRef<ProfileTheme>({ ...initialTheme })
  const [revealBanner, setRevealBanner] = useState(showRevealBanner)

  // ── Derived per-tab dirty / saving / status ──────────────────────────────
  const isDirty  = tab === 'content' ? contentDirty  : tab === 'blocks' ? blocksDirty  : themeDirty
  const isSaving = tab === 'content' ? contentSaving : tab === 'blocks' ? blocksSaving : themeSaving
  const status   = tab === 'content' ? contentStatus : tab === 'blocks' ? blocksStatus : themeStatus

  useEffect(() => {
    if (!showRevealBanner) return
    const t = setTimeout(() => {
      setRevealBanner(false)
      router.replace('/dashboard/studio', { scroll: false })
    }, 6000)
    return () => clearTimeout(t)
  }, [showRevealBanner, router])

  // ── Content handlers ────────────────────────────────────────────────────────

  function markContentDirty() { setContentDirty(true); setContentStatus('idle') }

  async function handleContentSave() {
    setContentSaving(true)
    const result = await updateCreatorStudioContent({
      bio,
      instagram_handle: instagramHandle,
      website_url:      websiteUrl,
      contact_email:    contactEmail,
    })
    setContentSaving(false)
    if (result.error) {
      setContentStatus('error')
    } else {
      setContentStatus('saved')
      setContentDirty(false)
      origContent.current = { bio, instagramHandle, websiteUrl, contactEmail }
      setTimeout(() => setContentStatus('idle'), 2000)
    }
  }

  // ── Blocks handlers ─────────────────────────────────────────────────────────

  const handleBlocksChange = useCallback((updated: PageBlock[]) => {
    setBlocks(updated)
    setBlocksDirty(true)
    setBlocksStatus('idle')
  }, [])

  async function handleBlocksSave() {
    setBlocksSaving(true)
    startTransition(async () => {
      try {
        const orderedIds = blocks.map((b) => b.id)
        await reorderBlocks(orderedIds)
        for (const b of blocks) {
          await toggleBlockVisibility(b.id, b.is_visible)
        }
        origBlocks.current = [...blocks]
        setBlocksSaving(false)
        setBlocksDirty(false)
        setBlocksStatus('saved')
        setTimeout(() => setBlocksStatus('idle'), 2000)
      } catch {
        setBlocksSaving(false)
      }
    })
  }

  // ── Theme handlers ───────────────────────────────────────────────────────────

  const handleThemeChange = useCallback((partial: Partial<ProfileTheme>) => {
    setTheme((prev) => ({ ...prev, ...partial }))
    setThemeDirty(true)
    setThemeStatus('idle')
  }, [])

  const handleThemeReplace = useCallback((newTheme: ProfileTheme) => {
    setTheme(newTheme)
    setThemeDirty(true)
    setThemeStatus('idle')
  }, [])

  async function handleThemeSave() {
    setThemeSaving(true)
    const result = await updateProfileTheme(theme)
    setThemeSaving(false)
    if (result.error) {
      setThemeStatus('error')
    } else {
      setThemeStatus('saved')
      setThemeDirty(false)
      origTheme.current = { ...theme }
      setTimeout(() => setThemeStatus('idle'), 2000)
    }
  }

  // ── Unified save / discard for desktop topbar ────────────────────────────────

  function handleSave() {
    if (tab === 'content') handleContentSave()
    else if (tab === 'blocks') handleBlocksSave()
    else handleThemeSave()
  }

  function discardTab(key: string) {
    if (!window.confirm('Discard unsaved changes?')) return
    if (key === 'content') {
      setBio(origContent.current.bio)
      setInstagramHandle(origContent.current.instagramHandle)
      setWebsiteUrl(origContent.current.websiteUrl)
      setContactEmail(origContent.current.contactEmail)
      setContentDirty(false)
      setContentStatus('idle')
    } else if (key === 'blocks') {
      setBlocks([...origBlocks.current])
      setBlocksDirty(false)
      setBlocksStatus('idle')
    } else {
      setTheme({ ...origTheme.current })
      setThemeDirty(false)
      setThemeStatus('idle')
    }
  }

  function handleDiscard() { discardTab(tab) }

  const saveLabel =
    isSaving           ? 'Saving…'
    : status === 'saved' ? 'Saved ✓'
    : isDirty            ? 'Unsaved'
    : 'All saved'

  const saveColor =
    status === 'saved' ? '#5DD9D0'
    : isDirty          ? '#F5A800'
    : S.textMuted

  // ── Shared input style ────────────────────────────────────────────────────────

  const inputBase: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 4, padding: '10px 12px',
    fontFamily: INTER, fontSize: 13.5,
    color: S.text, outline: 'none',
  }

  // ── ContentPanel: render function (not a component) for the content tab ───────
  // Called as ContentPanel() — not as <ContentPanel /> — so inputs never lose
  // focus on re-render. Rendered in both the desktop left panel and the mobile
  // StudioShell drawer.
  function ContentPanel() {
    return (
      <div style={{ padding: '20px 20px 36px', display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14, color: S.textMuted }}>edit</span>
          <span style={{ fontFamily: MONO, fontSize: 10, color: S.textMuted, letterSpacing: '1.2px', textTransform: 'uppercase' }}>
            Page Content
          </span>
        </div>

        {/* Bio */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14, color: S.textMuted }}>description</span>
            <span style={{ fontFamily: MONO, fontSize: 10, color: S.textMuted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Bio</span>
          </div>
          <textarea
            value={bio}
            onChange={e => { setBio(e.target.value); markContentDirty() }}
            maxLength={160}
            rows={4}
            placeholder="Describe yourself — what you make, what you care about…"
            style={{ ...inputBase, resize: 'vertical', lineHeight: 1.6 }}
          />
          <div style={{ textAlign: 'right', fontFamily: MONO, fontSize: 10, color: S.textMuted, marginTop: 4 }}>
            {bio.length}/160
          </div>
        </div>

        {/* Contact email + Website */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: S.textMuted }}>mail</span>
              <span style={{ fontFamily: MONO, fontSize: 10, color: S.textMuted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Contact Email</span>
            </div>
            <input
              type="email"
              value={contactEmail}
              onChange={e => { setContactEmail(e.target.value); markContentDirty() }}
              placeholder="you@email.com"
              style={inputBase}
            />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: S.textMuted }}>language</span>
              <span style={{ fontFamily: MONO, fontSize: 10, color: S.textMuted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Website</span>
            </div>
            <input
              type="url"
              value={websiteUrl}
              onChange={e => { setWebsiteUrl(e.target.value); markContentDirty() }}
              placeholder="https://yoursite.com"
              style={inputBase}
            />
          </div>
        </div>

        {/* Instagram */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14, color: S.textMuted }}>alternate_email</span>
            <span style={{ fontFamily: MONO, fontSize: 10, color: S.textMuted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Instagram</span>
          </div>
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              fontFamily: INTER, fontSize: 13, color: S.textMuted, userSelect: 'none',
            }}>@</span>
            <input
              type="text"
              value={instagramHandle}
              onChange={e => { setInstagramHandle(e.target.value.replace(/^@/, '')); markContentDirty() }}
              placeholder="yourhandle"
              style={{ ...inputBase, paddingLeft: 28 }}
            />
          </div>
        </div>

        {/* Locked note */}
        <div style={{ borderTop: `1px solid ${S.border}`, paddingTop: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14, color: S.textMuted }}>lock</span>
          <span style={{ fontFamily: MONO, fontSize: 10, color: S.textMuted, letterSpacing: '0.04em' }}>
            Username, city &amp; creator type are fixed.&nbsp;
            <a href="/dashboard/profile/settings" style={{ color: S.coral, textDecoration: 'none' }}>
              Full profile settings →
            </a>
          </span>
        </div>
      </div>
    )
  }

  // ── renderCreatorPanel: per-tab drawer content for the mobile StudioShell ─────
  function renderCreatorPanel(key: string): React.ReactNode {
    if (key === 'content') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Mobile save bar */}
          <div style={{
            padding: '8px 16px', flexShrink: 0,
            borderBottom: `1px solid ${S.panelBorder}`,
            display: 'flex', alignItems: 'center', gap: 8,
            background: S.panel,
          }}>
            <div style={{ flex: 1, fontFamily: MONO, fontSize: 11 }}>
              {contentSaving && <span style={{ color: S.textMuted }}>Saving…</span>}
              {!contentSaving && contentStatus === 'saved'  && <span style={{ color: '#5DD9D0' }}>✓ Saved</span>}
              {!contentSaving && contentStatus === 'error'  && <span style={{ color: '#E05555' }}>Save failed</span>}
              {!contentSaving && contentStatus === 'idle' && contentDirty && <span style={{ color: S.textMuted }}>Unsaved changes</span>}
            </div>
            {contentDirty && !contentSaving && (
              <button
                onClick={() => discardTab('content')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: MONO, fontSize: 11, color: '#E05555', padding: 0, textDecoration: 'underline' }}
              >
                Discard
              </button>
            )}
            <button
              onClick={handleContentSave}
              disabled={contentSaving || !contentDirty}
              style={{
                background: contentSaving || !contentDirty ? 'rgba(232,112,90,0.25)' : S.coral,
                border: 'none', borderRadius: 4, padding: '5px 14px',
                color: contentSaving || !contentDirty ? 'rgba(0,0,0,0.4)' : '#fff',
                cursor: contentSaving || !contentDirty ? 'not-allowed' : 'pointer',
                fontFamily: MONO, fontSize: 10, fontWeight: 700,
                letterSpacing: '0.8px', textTransform: 'uppercase',
              }}
            >
              Save
            </button>
          </div>
          {/* Content form — scrollable within its own container */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {ContentPanel()}
          </div>
        </div>
      )
    }
    if (key === 'blocks') {
      return (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <BlockEditor
            blocks={blocks}
            events={upcomingEvents}
            onBlocksChange={handleBlocksChange}
            onEditBlock={(id) => setHighlightedBlockId(id)}
            isDirty={blocksDirty}
            isSaving={blocksSaving || isPending}
            onSave={handleBlocksSave}
            userTier={profile.user_tier}
          />
        </div>
      )
    }
    if (key === 'theme') {
      return (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <ThemeEditor
            theme={theme}
            onThemeChange={handleThemeChange}
            onThemeReplace={handleThemeReplace}
            isDirty={themeDirty}
            isSaving={themeSaving}
            onSave={handleThemeSave}
          />
        </div>
      )
    }
    return null
  }

  return (
    <StudioShell
      preview={
        <PublicProfilePage
          profile={profile}
          blocks={blocks}
          upcomingEvents={upcomingEvents}
          theme={theme}
          isPreview
        />
      }
      tabs={CREATOR_TABS}
      renderPanel={renderCreatorPanel}
      accentColor={S.coral}
      panelBg={S.panel}
    >
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: S.bg }}>

      {/* ── Reveal banner ──────────────────────────────────────────────────── */}
      {revealBanner && (
        <div style={{
          background: 'linear-gradient(90deg, #1B4332, #2D6A4F)',
          borderBottom: '1px solid rgba(74,222,128,0.2)',
          padding: '10px 20px',
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#4ADE80', fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          <span style={{ flex: 1, fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>
            <strong style={{ color: '#4ADE80' }}>Your page is live!</strong>
            {' '}We&apos;ve built your starter page from your profile. Edit blocks below, or add more sections.
          </span>
          <button
            onClick={() => { setRevealBanner(false); router.replace('/dashboard/studio', { scroll: false }) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 4, display: 'flex' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
          </button>
        </div>
      )}

      {/* ── Topbar ─────────────────────────────────────────────────────────── */}
      <header style={{
        height: 52, flexShrink: 0,
        background: S.header,
        borderBottom: `1px solid ${S.panelBorder}`,
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '0 20px',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        {/* Tab switcher */}
        <div style={{
          display: 'flex', gap: 2, padding: 3,
          background: S.overlay,
          borderRadius: 8,
          border: `1px solid ${S.border}`,
        }}>
          {([
            { key: 'content', label: 'Content', icon: 'edit'    },
            { key: 'blocks',  label: 'Blocks',  icon: 'add_box' },
            { key: 'theme',   label: 'Theme',   icon: 'palette' },
          ] as { key: TabKey; label: string; icon: string }[]).map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                fontFamily: 'var(--font-dm-sans)', cursor: 'pointer', border: 'none',
                background: tab === key ? S.coral : 'transparent',
                color: tab === key ? '#fff' : S.textSub,
                transition: 'all 180ms ease',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: tab === key ? '#fff' : S.textMuted }}>
                {icon}
              </span>
              {label}
            </button>
          ))}
        </div>

        {/* Device toggle — hidden on mobile, studio preview is desktop/tablet only */}
        <div
          className="hidden md:flex"
          style={{
            gap: 2, padding: 3,
            background: S.overlay,
            borderRadius: 8,
            border: `1px solid ${S.border}`,
          }}
        >
          {([
            { key: 'mobile',  icon: 'smartphone' },
            { key: 'desktop', icon: 'desktop_mac' },
          ] as { key: Device; icon: string }[]).map(({ key, icon }) => (
            <button
              key={key}
              onClick={() => setDevice(key)}
              style={{
                width: 32, height: 28, borderRadius: 6,
                display: 'grid', placeItems: 'center',
                background: device === key ? S.elevated : 'transparent',
                border: device === key ? `1px solid ${S.border}` : 'none',
                color: device === key ? S.coral : S.textSub,
                cursor: 'pointer',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{icon}</span>
            </button>
          ))}
        </div>

        {/* Save status — hidden on mobile to keep topbar uncluttered */}
        <span
          className="hidden md:inline"
          style={{
            fontSize: 11, fontFamily: 'var(--font-jetbrains-mono)',
            color: saveColor, marginLeft: 4,
            transition: 'color 300ms ease',
          }}
        >
          {saveLabel}
        </span>
        {isDirty && !isSaving && (
          <>
            <span className="hidden md:inline" style={{ fontSize: 11, color: S.textMuted }}>·</span>
            <button
              onClick={handleDiscard}
              className="hidden md:inline"
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11, color: '#E05555', padding: 0, textDecoration: 'underline', lineHeight: 1 }}
            >
              Discard
            </button>
          </>
        )}

        <div style={{ flex: 1 }} />

        {/* Preview link */}
        <a
          href={profilePath}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
            fontFamily: 'var(--font-dm-sans)', cursor: 'pointer',
            border: `1px solid ${S.border}`,
            color: S.textSub, background: 'transparent',
            textDecoration: 'none', transition: 'all 180ms ease',
          }}
          onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = S.coral; el.style.color = S.coral }}
          onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = S.border; el.style.color = S.textSub }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>open_in_new</span>
          Preview
        </a>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 16px', borderRadius: 7, fontSize: 12, fontWeight: 600,
            fontFamily: 'var(--font-dm-sans)', cursor: isDirty && !isSaving ? 'pointer' : 'default',
            border: 'none',
            background: isDirty && !isSaving ? S.coral : S.overlay,
            color: isDirty && !isSaving ? '#fff' : S.textMuted,
            transition: 'all 180ms ease',
            opacity: !isDirty || isSaving ? 0.55 : 1,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
            {isSaving ? 'sync' : 'save'}
          </span>
          {isSaving ? 'Saving…' : 'Save'}
        </button>
      </header>

      {/* ── Body ──────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Left panel — full-width on mobile, 40% on tablet/desktop ──── */}
        <div
          className="w-full md:w-2/5 md:min-w-[280px] md:max-w-[560px] flex-shrink-0"
          style={{
            borderRight: `1px solid ${S.panelBorder}`,
            overflowY: 'auto',
            background: S.panel,
            /* Override WIMC CSS variables inside this panel so sub-components
               see a dark palette even though the page root is cream.           */
            '--wimc-bg-base':     S.panel,
            '--wimc-bg-raised':   '#1E2B4A',
            '--wimc-bg-elevated': S.elevated,
            '--wimc-bg-overlay':  S.overlay,
            '--wimc-bg-hover':    'rgba(255,255,255,0.05)',
            '--wimc-border-subtle':  'rgba(255,255,255,0.07)',
            '--wimc-border-default': 'rgba(255,255,255,0.13)',
            '--wimc-border-strong':  'rgba(255,255,255,0.22)',
            '--wimc-text-primary':   S.text,
            '--wimc-text-secondary': S.textSub,
            '--wimc-text-muted':     S.textMuted,
          } as React.CSSProperties}>
          {tab === 'content' && ContentPanel()}

          {tab === 'blocks' && (
            <BlockEditor
              blocks={blocks}
              events={upcomingEvents}
              onBlocksChange={handleBlocksChange}
              onEditBlock={(id) => setHighlightedBlockId(id)}
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
              isSaving={themeSaving}
              onSave={handleThemeSave}
            />
          )}
        </div>

        {/* ── Right panel — preview canvas (tablet/desktop only) ─────────── */}
        <div
          className="hidden md:flex flex-1 flex-col items-center justify-center overflow-auto"
          style={{
            background: S.preview,
            padding: device === 'desktop' ? '24px 32px' : 24,
          }}
        >
          {device === 'mobile' ? (

            /* ── Phone frame ─────────────────────────────────────────── */
            <PreviewPanel
              profile={profile}
              blocks={blocks}
              events={upcomingEvents}
              theme={theme}
              highlightedBlockId={highlightedBlockId}
              saveStatus={isSaving ? 'saving' : status === 'error' ? 'idle' : status}
              isDirty={isDirty}
              device="mobile"
            />

          ) : (

            /* ── Desktop browser mockup ───────────────────────────────── */
            <div style={{
              width: '100%',
              border: `1px solid ${S.panelBorder}`,
              borderRadius: 10,
              overflow: 'hidden',
              background: S.bg,
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              transform: 'translateZ(0)',
            }}>
              {/* Browser chrome */}
              <div style={{
                height: 38, background: S.elevated,
                borderBottom: `1px solid ${S.panelBorder}`,
                display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px',
              }}>
                {/* Traffic lights */}
                <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                  {['#E8342A', '#F5A800', '#4ADE80'].map((c) => (
                    <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
                  ))}
                </div>
                {/* URL bar */}
                <div style={{
                  flex: 1, height: 22, background: S.overlay,
                  borderRadius: 5, display: 'flex', alignItems: 'center',
                  padding: '0 10px', gap: 6,
                  fontSize: 11, fontFamily: 'var(--font-jetbrains-mono)',
                  color: S.textSub,
                  border: `1px solid ${S.border}`,
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 12, color: S.textMuted }}>lock</span>
                  wheninmycity.com{profilePath}
                </div>
              </div>

              {/* Page content — zoomed to fit preview panel */}
              <div style={{ overflowY: 'auto', overflowX: 'hidden', maxHeight: 'calc(100vh - 160px)' }}>
                <div style={{ width: 1280, zoom: 0.65 }}>
                <PreviewPanel
                  profile={profile}
                  blocks={blocks}
                  events={upcomingEvents}
                  theme={theme}
                  highlightedBlockId={highlightedBlockId}
                  saveStatus={isSaving ? 'saving' : status === 'error' ? 'idle' : status}
                  isDirty={isDirty}
                  device="desktop"
                />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </StudioShell>
  )
}
