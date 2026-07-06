'use client'

import { useState, useCallback, useTransition, useRef } from 'react'
import { updateExplorerStudioProfile, updateExplorerPublicProfile } from '@/app/actions/explorer'
import { updateProfileTheme } from '@/app/actions/profile'
import { reorderBlocks } from '@/app/actions/blocks'
import BlockEditor from '@/components/dashboard/BlockEditor'
import ThemeEditor from '@/components/dashboard/ThemeEditor'
import ExplorerPagePreview from './ExplorerPagePreview'
import StudioShell, { type StudioTab } from '@/components/dashboard/StudioShell'
import { INTEREST_TAGS } from '@/lib/constants/interests'
import type { PageBlock } from '@/types/database'
import type { ProfileTheme } from '@/types/theme'

// ── Design tokens ──────────────────────────────────────────────────────────────

const S = {
  bg:       '#0F1629',
  panel:    '#141D35',
  header:   '#0B1020',
  border:   'rgba(155,143,255,0.12)',
  text:     'rgba(255,255,255,0.90)',
  textSub:  'rgba(255,255,255,0.50)',
  muted:    'rgba(255,255,255,0.28)',
  lav:      '#9B8FFF',
  lavTint:  'rgba(155,143,255,0.12)',
  success:  '#4CAF7D',
  danger:   '#E05555',
} as const

const MONO  = "'JetBrains Mono', monospace"
const INTER = "'Inter', system-ui, sans-serif"

type TabKey = 'content' | 'blocks' | 'theme'

const EXPLORER_TABS: StudioTab[] = [
  { key: 'content', label: 'Content', icon: 'edit'    },
  { key: 'blocks',  label: 'Blocks',  icon: 'add_box' },
  { key: 'theme',   label: 'Theme',   icon: 'palette' },
]

// ── Sub-components ─────────────────────────────────────────────────────────────

function FieldLabel({ label, icon }: { label: string; icon: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
      <span className="material-symbols-outlined" style={{ fontSize: 14, color: S.muted }}>{icon}</span>
      <span style={{ fontFamily: MONO, fontSize: 10, color: S.muted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        {label}
      </span>
    </div>
  )
}

function TabBtn({ label, icon, active, onClick }: { label: string; icon: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '7px 16px',
        background: active ? S.lav : 'transparent',
        border: 'none', borderRadius: 6, cursor: 'pointer',
        color: active ? '#0F1629' : S.textSub,
        fontFamily: MONO, fontSize: 11, fontWeight: active ? 700 : 500,
        letterSpacing: '0.6px', transition: 'all 160ms ease',
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 15, color: active ? '#0F1629' : S.muted }}>
        {icon}
      </span>
      {label}
    </button>
  )
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface ExplorerProfileData {
  display_name: string
  avatar_url:   string | null
  city:         string
  interest_tags: string[] | null
}

interface UserProfileData {
  page_theme:       unknown
  bio:              string | null
  instagram_handle: string | null
  username:         string | null
}

interface Props {
  explorerProfile: ExplorerProfileData
  userProfile:     UserProfileData | null
  initialBlocks:   PageBlock[]
  theme:           ProfileTheme
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ExplorerStudioClient({ explorerProfile, userProfile, initialBlocks, theme: initialTheme }: Props) {
  const [tab, setTab] = useState<TabKey>('content')

  // ── Content state ──────────────────────────────────────────────────────────
  const [displayName,      setDisplayName]      = useState(explorerProfile.display_name ?? '')
  const [bio,              setBio]              = useState(userProfile?.bio ?? '')
  const [city,             setCity]             = useState(explorerProfile.city ?? '')
  const [interestTags,     setInterestTags]     = useState<string[]>((explorerProfile.interest_tags as string[] | null) ?? [])
  const [instagramHandle,  setInstagramHandle]  = useState(userProfile?.instagram_handle ?? '')
  const [contentDirty,     setContentDirty]     = useState(false)
  const [contentSaving,    setContentSaving]    = useState(false)
  const [contentStatus,    setContentStatus]    = useState<'idle' | 'saved' | 'error'>('idle')

  // ── Blocks state ───────────────────────────────────────────────────────────
  const [blocks,       setBlocks]       = useState<PageBlock[]>(initialBlocks)
  const [blocksDirty,  setBlocksDirty]  = useState(false)
  const [isPending,    startTransition] = useTransition()
  const [blocksSaving, setBlocksSaving] = useState(false)
  const [blocksStatus, setBlocksStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  // ── Theme state ────────────────────────────────────────────────────────────
  const [theme,       setTheme]       = useState<ProfileTheme>(initialTheme)
  const [themeDirty,  setThemeDirty]  = useState(false)
  const [themeSaving, setThemeSaving] = useState(false)
  const [themeStatus, setThemeStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  // ── Originals for discard ──────────────────────────────────────────────────
  const origContent = useRef({
    displayName:     explorerProfile.display_name ?? '',
    bio:             userProfile?.bio ?? '',
    city:            explorerProfile.city ?? '',
    interestTags:    [...((explorerProfile.interest_tags as string[] | null) ?? [])],
    instagramHandle: userProfile?.instagram_handle ?? '',
  })
  const origBlocks = useRef<PageBlock[]>([...initialBlocks])
  const origTheme  = useRef<ProfileTheme>({ ...initialTheme })

  // ── Derived ────────────────────────────────────────────────────────────────
  const isDirty  = tab === 'content' ? contentDirty : tab === 'blocks' ? blocksDirty : themeDirty
  const isSaving = tab === 'content' ? contentSaving : tab === 'blocks' ? blocksSaving : themeSaving
  const status   = tab === 'content' ? contentStatus : tab === 'blocks' ? blocksStatus : themeStatus

  // ── Content handlers ───────────────────────────────────────────────────────

  function markContentDirty() { setContentDirty(true); setContentStatus('idle') }

  function toggleInterestTag(id: string) {
    setInterestTags((prev) => {
      if (prev.includes(id)) return prev.filter((t) => t !== id)
      if (prev.length >= 5) return prev
      return [...prev, id]
    })
    markContentDirty()
  }

  async function handleContentSave() {
    setContentSaving(true)

    const [profileResult, publicResult] = await Promise.all([
      updateExplorerStudioProfile({ display_name: displayName, city, interest_tags: interestTags }),
      updateExplorerPublicProfile({ bio: bio || undefined, instagram_handle: instagramHandle || undefined }),
    ])

    setContentSaving(false)
    const err = profileResult.error ?? publicResult.error
    if (err) {
      setContentStatus('error')
    } else {
      setContentStatus('saved')
      setContentDirty(false)
      origContent.current = { displayName, bio, city, interestTags: [...interestTags], instagramHandle }
      setTimeout(() => setContentStatus('idle'), 3000)
    }
  }

  // ── Blocks handlers ────────────────────────────────────────────────────────

  const handleBlocksChange = useCallback((updated: PageBlock[]) => {
    setBlocks(updated)
    setBlocksDirty(true)
    setBlocksStatus('idle')
  }, [])

  async function handleBlocksSave() {
    setBlocksSaving(true)
    startTransition(async () => {
      await reorderBlocks(blocks.map((b) => b.id))
      setBlocksSaving(false)
      setBlocksDirty(false)
      origBlocks.current = [...blocks]
      setBlocksStatus('saved')
      setTimeout(() => setBlocksStatus('idle'), 3000)
    })
  }

  // ── Theme handlers ─────────────────────────────────────────────────────────

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
      setTimeout(() => setThemeStatus('idle'), 3000)
    }
  }

  function discardTab(key: string) {
    if (!window.confirm('Discard unsaved changes?')) return
    if (key === 'content') {
      setDisplayName(origContent.current.displayName)
      setBio(origContent.current.bio)
      setCity(origContent.current.city)
      setInterestTags([...origContent.current.interestTags])
      setInstagramHandle(origContent.current.instagramHandle)
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

  function handleSave() {
    if (tab === 'content') handleContentSave()
    else if (tab === 'blocks') handleBlocksSave()
    else handleThemeSave()
  }

  // ── Shared input style ─────────────────────────────────────────────────────

  const inputBase: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: 'rgba(155,143,255,0.05)',
    border: '1px solid rgba(155,143,255,0.15)',
    borderRadius: 4, padding: '10px 12px',
    fontFamily: INTER, fontSize: 13.5,
    color: S.text, outline: 'none',
  }

  // ── ContentPanel: render function (not a component) for the content tab ────
  // Called as ContentPanel() so inputs never lose focus on re-render.
  // Rendered in both the desktop left panel and the mobile StudioShell drawer.
  function ContentPanel() {
    return (
      <div style={{ padding: '20px 20px 36px', display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14, color: S.muted }}>edit</span>
          <span style={{ fontFamily: MONO, fontSize: 10, color: S.muted, letterSpacing: '1.2px', textTransform: 'uppercase' }}>Public Profile</span>
        </div>

        {/* Display name */}
        <div>
          <FieldLabel label="Display Name" icon="badge" />
          <input
            type="text"
            value={displayName}
            onChange={(e) => { setDisplayName(e.target.value); markContentDirty() }}
            maxLength={50}
            placeholder="Your name…"
            style={inputBase}
          />
        </div>

        {/* Bio */}
        <div>
          <FieldLabel label="Bio" icon="notes" />
          <textarea
            value={bio}
            onChange={(e) => { setBio(e.target.value); markContentDirty() }}
            maxLength={300}
            rows={4}
            placeholder="Tell people about yourself and what kinds of events you love…"
            style={{ ...inputBase, resize: 'vertical', lineHeight: 1.6 }}
          />
          <div style={{ textAlign: 'right', fontFamily: MONO, fontSize: 10, color: S.muted, marginTop: 4 }}>
            {bio.length}/300
          </div>
        </div>

        {/* City */}
        <div>
          <FieldLabel label="City" icon="location_on" />
          <input
            type="text"
            value={city}
            onChange={(e) => { setCity(e.target.value); markContentDirty() }}
            maxLength={50}
            placeholder="Your city…"
            style={inputBase}
          />
        </div>

        {/* Interests */}
        <div>
          <FieldLabel label={`Interests (${interestTags.length}/5)`} icon="interests" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, maxHeight: 240, overflowY: 'auto', padding: '2px 0' }}>
            {INTEREST_TAGS.map((tag) => {
              const active = interestTags.includes(tag.id)
              const maxed  = !active && interestTags.length >= 5
              return (
                <button
                  key={tag.id}
                  onClick={() => !maxed && toggleInterestTag(tag.id)}
                  title={maxed ? 'Remove a tag to select another' : undefined}
                  style={{
                    padding: '4px 9px', fontSize: 11, border: '1px solid',
                    borderColor: active ? S.lav : 'rgba(155,143,255,0.2)',
                    background: active ? S.lavTint : 'transparent',
                    color: active ? S.lav : maxed ? S.muted : S.textSub,
                    borderRadius: 4, cursor: maxed ? 'not-allowed' : 'pointer',
                    fontFamily: INTER, transition: 'all 160ms ease',
                    opacity: maxed ? 0.45 : 1,
                  }}
                >
                  {tag.emoji} {tag.label}
                </button>
              )
            })}
          </div>
          <p style={{ fontFamily: MONO, fontSize: 9, color: S.muted, marginTop: 6 }}>
            Pick up to 5. These appear as pills on your public page.
          </p>
        </div>

        {/* Instagram */}
        <div>
          <FieldLabel label="Instagram" icon="alternate_email" />
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontFamily: INTER, fontSize: 13, color: S.muted }}>@</span>
            <input
              type="text"
              value={instagramHandle}
              onChange={(e) => { setInstagramHandle(e.target.value.replace(/^@/, '')); markContentDirty() }}
              placeholder="yourhandle"
              style={{ ...inputBase, paddingLeft: 28 }}
            />
          </div>
        </div>

        {/* Locked note */}
        <div style={{ borderTop: `1px solid ${S.border}`, paddingTop: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14, color: S.muted }}>lock</span>
          <span style={{ fontFamily: MONO, fontSize: 10, color: S.muted, letterSpacing: '0.04em' }}>
            Avatar is set via your profile photo.&nbsp;
            <a href="/explore/dashboard" style={{ color: S.lav, textDecoration: 'none' }}>Edit profile →</a>
          </span>
        </div>
      </div>
    )
  }

  // ── renderExplorerPanel: per-tab drawer content for the mobile StudioShell ──
  // BlockEditor and ThemeEditor render their own save controls; only the
  // content tab needs a save bar added here.
  function renderExplorerPanel(key: string): React.ReactNode {
    if (key === 'content') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Mobile save bar */}
          <div style={{
            padding: '8px 16px', flexShrink: 0,
            borderBottom: `1px solid ${S.border}`,
            display: 'flex', alignItems: 'center', gap: 8,
            background: S.panel,
          }}>
            <div style={{ flex: 1, fontFamily: MONO, fontSize: 11 }}>
              {contentSaving && <span style={{ color: S.muted }}>Saving…</span>}
              {!contentSaving && contentStatus === 'saved'  && <span style={{ color: S.success }}>✓ Saved</span>}
              {!contentSaving && contentStatus === 'error'  && <span style={{ color: S.danger  }}>Save failed</span>}
              {!contentSaving && contentStatus === 'idle' && contentDirty && <span style={{ color: S.muted }}>Unsaved changes</span>}
            </div>
            {contentDirty && !contentSaving && (
              <button
                onClick={() => discardTab('content')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: MONO, fontSize: 11, color: S.danger, padding: 0, textDecoration: 'underline' }}
              >
                Discard
              </button>
            )}
            <button
              onClick={handleContentSave}
              disabled={contentSaving || !contentDirty}
              style={{
                background: contentSaving || !contentDirty ? 'rgba(155,143,255,0.25)' : S.lav,
                border: 'none', borderRadius: 4, padding: '5px 14px',
                color: contentSaving || !contentDirty ? 'rgba(0,0,0,0.4)' : '#0F1629',
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
            persona="explorer"
            blocks={blocks}
            events={[]}
            onBlocksChange={handleBlocksChange}
            isDirty={blocksDirty}
            isSaving={blocksSaving || isPending}
            onSave={handleBlocksSave}
          />
        </div>
      )
    }
    if (key === 'theme') {
      return (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <ThemeEditor
            persona="explorer"
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
        <ExplorerPagePreview
          displayName={displayName}
          bio={bio}
          city={city}
          interestTags={interestTags}
          instagramHandle={instagramHandle}
          avatarUrl={explorerProfile.avatar_url}
          username={userProfile?.username}
          blocks={blocks}
          pageTheme={theme}
        />
      }
      tabs={EXPLORER_TABS}
      renderPanel={renderExplorerPanel}
      accentColor={S.lav}
      panelBg={S.panel}
    >
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: S.bg }}>

      {/* ── Topbar ──────────────────────────────────────────────────────────── */}
      <header style={{
        height: 52, flexShrink: 0, background: S.header,
        borderBottom: `1px solid ${S.border}`,
        display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px', background: 'rgba(0,0,0,0.3)', borderRadius: 8 }}>
          <TabBtn label="Content" icon="edit"    active={tab === 'content'} onClick={() => setTab('content')} />
          <TabBtn label="Blocks"  icon="add_box" active={tab === 'blocks'}  onClick={() => setTab('blocks')}  />
          <TabBtn label="Theme"   icon="palette" active={tab === 'theme'}   onClick={() => setTab('theme')}   />
        </div>

        <div style={{ flex: 1 }} />

        {/* Save status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isSaving && <span style={{ fontFamily: MONO, fontSize: 11, color: S.muted }}>Saving…</span>}
          {!isSaving && status === 'saved' && (
            <><span className="material-symbols-outlined" style={{ fontSize: 14, color: S.success, fontVariationSettings: "'FILL' 1" }}>check_circle</span><span style={{ fontFamily: MONO, fontSize: 11, color: S.success }}>Saved</span></>
          )}
          {!isSaving && status === 'error' && (
            <><span className="material-symbols-outlined" style={{ fontSize: 14, color: S.danger }}>error</span><span style={{ fontFamily: MONO, fontSize: 11, color: S.danger }}>Failed to save</span></>
          )}
          {!isSaving && status === 'idle' && isDirty && (
            <>
              <span style={{ fontFamily: MONO, fontSize: 11, color: S.muted }}>Unsaved changes</span>
              <span style={{ color: S.muted, fontSize: 11 }}>·</span>
              <button
                onClick={handleDiscard}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: MONO, fontSize: 11, color: S.danger, padding: 0, textDecoration: 'underline', lineHeight: 1 }}
              >
                Discard
              </button>
            </>
          )}
        </div>

        {userProfile?.username && (
          <a
            href={`/${userProfile.username}`}
            target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 5, border: `1px solid ${S.lav}`, borderRadius: 6, padding: '5px 14px', color: S.lav, textDecoration: 'none', fontFamily: MONO, fontSize: 11, letterSpacing: '0.4px' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span>
            Live Page
          </a>
        )}

        <button
          onClick={handleSave}
          disabled={isSaving || !isDirty}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: isSaving || !isDirty ? 'rgba(155,143,255,0.25)' : S.lav,
            border: 'none', borderRadius: 6, padding: '7px 18px',
            color: isSaving || !isDirty ? 'rgba(0,0,0,0.4)' : '#0F1629',
            cursor: isSaving || !isDirty ? 'not-allowed' : 'pointer',
            fontFamily: MONO, fontSize: 11, fontWeight: 700,
            letterSpacing: '0.8px', textTransform: 'uppercase',
          }}
        >
          {isSaving ? 'Saving…' : 'Save'}
        </button>
      </header>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Left panel ──────────────────────────────────────────────────── */}
        <div style={{ width: 380, flexShrink: 0, background: S.panel, borderRight: `1px solid ${S.border}`, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

          {/* ── Content tab ───────────────────────────────────────────────── */}
          {tab === 'content' && ContentPanel()}

          {/* ── Blocks tab ────────────────────────────────────────────────── */}
          {tab === 'blocks' && (
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <BlockEditor
                persona="explorer"
                blocks={blocks}
                events={[]}
                onBlocksChange={handleBlocksChange}
                isDirty={blocksDirty}
                isSaving={blocksSaving || isPending}
                onSave={handleBlocksSave}
              />
            </div>
          )}

          {/* ── Theme tab ─────────────────────────────────────────────────── */}
          {tab === 'theme' && (
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <ThemeEditor
                persona="explorer"
                theme={theme}
                onThemeChange={handleThemeChange}
                onThemeReplace={handleThemeReplace}
                isDirty={themeDirty}
                isSaving={themeSaving}
                onSave={handleThemeSave}
              />
            </div>
          )}
        </div>

        {/* ── Right: live preview ──────────────────────────────────────────── */}
        <div style={{ flex: 1, background: '#09101E', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ height: 36, flexShrink: 0, borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: S.lav }} />
            <span style={{ fontFamily: MONO, fontSize: 10, color: S.muted, letterSpacing: '0.10em' }}>
              LIVE PREVIEW — updates instantly as you edit
            </span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', justifyContent: 'center' }}>
            <ExplorerPagePreview
              displayName={displayName}
              bio={bio}
              city={city}
              interestTags={interestTags}
              instagramHandle={instagramHandle}
              avatarUrl={explorerProfile.avatar_url}
              username={userProfile?.username}
              blocks={blocks}
              pageTheme={theme}
            />
          </div>
        </div>
      </div>
    </div>
    </StudioShell>
  )
}
