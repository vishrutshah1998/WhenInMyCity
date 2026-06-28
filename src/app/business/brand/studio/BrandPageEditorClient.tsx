'use client'

import { useState, useCallback, useTransition, useRef } from 'react'
import { updateBrandProfile } from '@/app/actions/business'
import { updateProfileTheme } from '@/app/actions/profile'
import { reorderBlocks } from '@/app/actions/blocks'
import BlockEditor from '@/components/dashboard/BlockEditor'
import ThemeEditor from '@/components/dashboard/ThemeEditor'
import BrandPagePreview from './BrandPagePreview'
import BrandPublicPage from '@/app/brand/[slug]/BrandPublicPage'
import type { UserProfile, PageBlock, Event } from '@/types/database'
import type { ProfileTheme } from '@/types/theme'

type Device = 'mobile' | 'desktop'

// ── Design tokens ──────────────────────────────────────────────────────────────

const S = {
  bg:        '#1A2744',
  panel:     '#243156',
  header:    '#14203A',
  border:    'rgba(255,255,255,0.10)',
  text:      'rgba(255,255,255,0.90)',
  textSub:   'rgba(255,255,255,0.50)',
  muted:     'rgba(255,255,255,0.28)',
  amber:     '#F5A800',
  amberTint: 'rgba(245,168,0,0.12)',
  success:   '#4CAF7D',
  danger:    '#E05555',
} as const

const MONO  = "'JetBrains Mono', monospace"
const INTER = "'Inter', system-ui, sans-serif"

// ── Tab type ──────────────────────────────────────────────────────────────────

type Tab = 'content' | 'blocks' | 'theme'

// ── Goal/audience options ─────────────────────────────────────────────────────

const WIMC_GOAL_OPTIONS = [
  { id: 'reach_creators',  label: 'Reach Creators' },
  { id: 'host_collabs',    label: 'Host Collabs' },
  { id: 'sponsor_events',  label: 'Sponsor Events' },
  { id: 'build_community', label: 'Build Community' },
  { id: 'grow_brand',      label: 'Grow Brand' },
]

const AUDIENCE_OPTIONS = [
  'GEN Z CREATORS', 'LOCAL ARTISTS', 'EVENT GOERS', 'VENUE OWNERS', 'CULTURE FANS',
]

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  profile:      UserProfile
  initialBlocks: PageBlock[]
  upcomingEvents: Event[]
  theme:        ProfileTheme
  brandPageUrl: string
}

// ── Sub-component: field label ────────────────────────────────────────────────

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

// ── Tab button ────────────────────────────────────────────────────────────────

function TabBtn({ label, icon, active, onClick }: { label: string; icon: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '7px 16px',
        background: active ? S.amber : 'transparent',
        border: 'none',
        borderRadius: 6,
        cursor: 'pointer',
        color: active ? '#000' : S.textSub,
        fontFamily: MONO, fontSize: 11, fontWeight: active ? 700 : 500,
        letterSpacing: '0.6px',
        transition: 'all 160ms ease',
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 15, color: active ? '#000' : S.muted }}>
        {icon}
      </span>
      {label}
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function BrandPageEditorClient({
  profile,
  initialBlocks,
  upcomingEvents,
  theme: initialTheme,
  brandPageUrl,
}: Props) {
  const [tab, setTab]       = useState<Tab>('content')
  const [device, setDevice] = useState<Device>('mobile')

  // ── Content tab state ──────────────────────────────────────────────────────
  const [bio,             setBio]             = useState(profile.bio ?? '')
  const [contactEmail,    setContactEmail]    = useState(profile.contact_email ?? '')
  const [instagramHandle, setInstagramHandle] = useState(profile.instagram_handle ?? '')
  const [websiteUrl,      setWebsiteUrl]      = useState(profile.website_url ?? '')
  const [wimcGoals,       setWimcGoals]       = useState<string[]>(profile.wimc_goals ?? [])
  const [targetAudience,  setTargetAudience]  = useState<string[]>(profile.target_audience ?? [])
  const [contentDirty,    setContentDirty]    = useState(false)
  const [contentSaving,   setContentSaving]   = useState(false)
  const [contentStatus,   setContentStatus]   = useState<'idle' | 'saved' | 'error'>('idle')
  const [contentError,    setContentError]    = useState<string | null>(null)

  // ── Blocks tab state ───────────────────────────────────────────────────────
  const [blocks,        setBlocks]       = useState<PageBlock[]>(initialBlocks)
  const [blocksDirty,   setBlocksDirty]  = useState(false)
  const [isPending,     startTransition] = useTransition()
  const [blocksSaving,  setBlocksSaving] = useState(false)
  const [blocksStatus,  setBlocksStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  // ── Theme tab state ────────────────────────────────────────────────────────
  const [theme,       setTheme]       = useState<ProfileTheme>(initialTheme)
  const [themeDirty,  setThemeDirty]  = useState(false)
  const [themeSaving, setThemeSaving] = useState(false)
  const [themeStatus, setThemeStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  // ── Originals for discard ──────────────────────────────────────────────────
  const origContent = useRef({
    bio:             profile.bio ?? '',
    contactEmail:    profile.contact_email ?? '',
    instagramHandle: profile.instagram_handle ?? '',
    websiteUrl:      profile.website_url ?? '',
    wimcGoals:       [...(profile.wimc_goals ?? [])],
    targetAudience:  [...(profile.target_audience ?? [])],
  })
  const origBlocks = useRef<PageBlock[]>([...initialBlocks])
  const origTheme  = useRef<ProfileTheme>({ ...initialTheme })

  // ── Derived ────────────────────────────────────────────────────────────────
  const isDirty  = tab === 'content' ? contentDirty : tab === 'blocks' ? blocksDirty : themeDirty
  const isSaving = tab === 'content' ? contentSaving : tab === 'blocks' ? blocksSaving : themeSaving
  const status   = tab === 'content' ? contentStatus : tab === 'blocks' ? blocksStatus : themeStatus

  // ── Content handlers ───────────────────────────────────────────────────────

  function markContentDirty() { setContentDirty(true); setContentStatus('idle') }

  function toggleGoal(id: string) {
    setWimcGoals(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id])
    markContentDirty()
  }

  function toggleAudience(label: string) {
    setTargetAudience(prev => prev.includes(label) ? prev.filter(a => a !== label) : [...prev, label])
    markContentDirty()
  }

  async function handleContentSave() {
    setContentSaving(true)
    setContentError(null)
    const result = await updateBrandProfile({
      bio:              bio || undefined,
      contact_email:    contactEmail,
      instagram_handle: instagramHandle,
      website_url:      websiteUrl,
      wimc_goals:       wimcGoals,
      target_audience:  targetAudience,
    })
    setContentSaving(false)
    if (result.error) {
      setContentStatus('error'); setContentError(result.error)
    } else {
      setContentStatus('saved'); setContentDirty(false)
      origContent.current = { bio, contactEmail, instagramHandle, websiteUrl, wimcGoals: [...wimcGoals], targetAudience: [...targetAudience] }
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
    const ordered = blocks.map(b => b.id)
    startTransition(async () => {
      await reorderBlocks(ordered)
      setBlocksSaving(false)
      setBlocksDirty(false)
      origBlocks.current = [...blocks]
      setBlocksStatus('saved')
      setTimeout(() => setBlocksStatus('idle'), 3000)
    })
  }

  // ── Theme handlers ─────────────────────────────────────────────────────────

  const handleThemeChange = useCallback((partial: Partial<ProfileTheme>) => {
    setTheme(prev => ({ ...prev, ...partial }))
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

  function handleDiscard() {
    if (!window.confirm('Discard unsaved changes?')) return
    if (tab === 'content') {
      setBio(origContent.current.bio)
      setContactEmail(origContent.current.contactEmail)
      setInstagramHandle(origContent.current.instagramHandle)
      setWebsiteUrl(origContent.current.websiteUrl)
      setWimcGoals([...origContent.current.wimcGoals])
      setTargetAudience([...origContent.current.targetAudience])
      setContentDirty(false)
      setContentStatus('idle')
    } else if (tab === 'blocks') {
      setBlocks([...origBlocks.current])
      setBlocksDirty(false)
      setBlocksStatus('idle')
    } else {
      setTheme({ ...origTheme.current })
      setThemeDirty(false)
      setThemeStatus('idle')
    }
  }

  // ── Unified save dispatcher ────────────────────────────────────────────────

  function handleSave() {
    if (tab === 'content') handleContentSave()
    else if (tab === 'blocks') handleBlocksSave()
    else handleThemeSave()
  }

  // ── Shared input style ─────────────────────────────────────────────────────

  const inputBase: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 4, padding: '10px 12px',
    fontFamily: INTER, fontSize: 13.5,
    color: S.text, outline: 'none',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: S.bg }}>

      {/* ── Topbar ──────────────────────────────────────────────────────────── */}
      <header style={{
        height: 52, flexShrink: 0,
        background: S.header,
        borderBottom: `1px solid ${S.border}`,
        display: 'flex', alignItems: 'center',
        padding: '0 16px', gap: 10,
      }}>
        {/* Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px', background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
          <TabBtn label="Content" icon="edit"     active={tab === 'content'} onClick={() => setTab('content')} />
          <TabBtn label="Blocks"  icon="add_box"  active={tab === 'blocks'}  onClick={() => setTab('blocks')}  />
          <TabBtn label="Theme"   icon="palette"  active={tab === 'theme'}   onClick={() => setTab('theme')}   />
        </div>

        {/* Device toggle */}
        <div style={{ display: 'flex', gap: 2, padding: 3, background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
          {([
            { key: 'mobile',  icon: 'smartphone'  },
            { key: 'desktop', icon: 'desktop_mac'  },
          ] as { key: Device; icon: string }[]).map(({ key, icon }) => (
            <button
              key={key}
              onClick={() => setDevice(key)}
              style={{
                width: 32, height: 28, borderRadius: 6,
                display: 'grid', placeItems: 'center',
                background: device === key ? S.amber : 'transparent',
                border: 'none',
                color: device === key ? '#000' : S.textSub,
                cursor: 'pointer',
                transition: 'all 160ms ease',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{icon}</span>
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* Save status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isSaving && (
            <span style={{ fontFamily: MONO, fontSize: 11, color: S.muted }}>Saving…</span>
          )}
          {!isSaving && status === 'saved' && (
            <>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: S.success, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              <span style={{ fontFamily: MONO, fontSize: 11, color: S.success }}>All saved</span>
            </>
          )}
          {!isSaving && status === 'error' && (
            <>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: S.danger }}>error</span>
              <span style={{ fontFamily: MONO, fontSize: 11, color: S.danger }}>
                {tab === 'content' ? contentError : 'Failed to save'}
              </span>
            </>
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

        {/* Live page */}
        <a
          href={brandPageUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            border: `1px solid ${S.amber}`,
            borderRadius: 6, padding: '5px 14px',
            color: S.amber, textDecoration: 'none',
            fontFamily: MONO, fontSize: 11, letterSpacing: '0.4px',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span>
          Live Page
        </a>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={isSaving || !isDirty}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: isSaving || !isDirty ? 'rgba(245,168,0,0.35)' : S.amber,
            border: 'none', borderRadius: 6, padding: '7px 18px',
            color: isSaving || !isDirty ? 'rgba(0,0,0,0.5)' : '#000',
            cursor: isSaving || !isDirty ? 'not-allowed' : 'pointer',
            fontFamily: MONO, fontSize: 11, fontWeight: 700,
            letterSpacing: '0.8px', textTransform: 'uppercase',
            transition: 'background 160ms ease',
          }}
        >
          {isSaving ? 'Saving…' : 'Save'}
        </button>
      </header>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Left: editor panel ──────────────────────────────────────────── */}
        <div style={{
          width: 380, flexShrink: 0,
          background: S.panel,
          borderRight: `1px solid ${S.border}`,
          overflowY: 'auto',
          display: 'flex', flexDirection: 'column',
        }}>

          {/* ── Content tab ─────────────────────────────────────────────────── */}
          {tab === 'content' && (
            <div style={{ padding: '20px 20px 36px', display: 'flex', flexDirection: 'column', gap: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14, color: S.muted }}>edit</span>
                <span style={{ fontFamily: MONO, fontSize: 10, color: S.muted, letterSpacing: '1.2px', textTransform: 'uppercase' }}>
                  Page Content
                </span>
              </div>

              {/* Bio */}
              <div>
                <FieldLabel label="Brand Bio" icon="description" />
                <textarea
                  value={bio}
                  onChange={e => { setBio(e.target.value); markContentDirty() }}
                  maxLength={500}
                  rows={4}
                  placeholder="Describe your brand — mission, values, what you stand for…"
                  style={{ ...inputBase, resize: 'vertical', lineHeight: 1.6 }}
                />
                <div style={{ textAlign: 'right', fontFamily: MONO, fontSize: 10, color: S.muted, marginTop: 4 }}>
                  {bio.length}/500
                </div>
              </div>

              {/* Contact */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <FieldLabel label="Contact Email" icon="mail" />
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={e => { setContactEmail(e.target.value); markContentDirty() }}
                    placeholder="hello@yourbrand.com"
                    style={inputBase}
                  />
                </div>
                <div>
                  <FieldLabel label="Website" icon="language" />
                  <input
                    type="url"
                    value={websiteUrl}
                    onChange={e => { setWebsiteUrl(e.target.value); markContentDirty() }}
                    placeholder="https://yourbrand.com"
                    style={inputBase}
                  />
                </div>
              </div>

              {/* Instagram */}
              <div>
                <FieldLabel label="Instagram" icon="alternate_email" />
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                    fontFamily: INTER, fontSize: 13, color: S.muted, userSelect: 'none',
                  }}>@</span>
                  <input
                    type="text"
                    value={instagramHandle}
                    onChange={e => { setInstagramHandle(e.target.value.replace(/^@/, '')); markContentDirty() }}
                    placeholder="yourbrand"
                    style={{ ...inputBase, paddingLeft: 28 }}
                  />
                </div>
              </div>

              {/* Goals */}
              <div>
                <FieldLabel label="Goals on WIMC" icon="flag" />
                <p style={{ fontFamily: INTER, fontSize: 12, color: S.muted, margin: '0 0 10px' }}>
                  What do you want to achieve on the platform?
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {WIMC_GOAL_OPTIONS.map(goal => {
                    const active = wimcGoals.includes(goal.id)
                    return (
                      <button
                        key={goal.id}
                        type="button"
                        onClick={() => toggleGoal(goal.id)}
                        style={{
                          padding: '5px 12px', fontFamily: INTER, fontSize: 12,
                          border: '1px solid',
                          borderColor: active ? S.amber : 'rgba(255,255,255,0.18)',
                          background: active ? S.amberTint : 'transparent',
                          color: active ? S.amber : S.textSub,
                          cursor: 'pointer', borderRadius: 9999,
                          transition: 'all 160ms ease',
                        }}
                      >
                        {goal.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Target audience */}
              <div>
                <FieldLabel label="Target Audience" icon="people" />
                <p style={{ fontFamily: INTER, fontSize: 12, color: S.muted, margin: '0 0 10px' }}>
                  Who are you trying to reach through WIMC?
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {AUDIENCE_OPTIONS.map(label => {
                    const active = targetAudience.includes(label)
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => toggleAudience(label)}
                        style={{
                          padding: '5px 10px', fontFamily: MONO, fontSize: 10,
                          letterSpacing: '0.08em',
                          border: '1px solid',
                          borderColor: active ? S.amber : 'rgba(255,255,255,0.18)',
                          background: active ? S.amberTint : 'transparent',
                          color: active ? S.amber : S.textSub,
                          cursor: 'pointer', borderRadius: 2,
                          transition: 'all 160ms ease',
                        }}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Locked note */}
              <div style={{ borderTop: `1px solid ${S.border}`, paddingTop: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14, color: S.muted }}>lock</span>
                <span style={{ fontFamily: MONO, fontSize: 10, color: S.muted, letterSpacing: '0.04em' }}>
                  Brand name, city &amp; category are fixed.&nbsp;
                  <a href="/business/brand/profile" style={{ color: S.amber, textDecoration: 'none' }}>
                    View full profile →
                  </a>
                </span>
              </div>
            </div>
          )}

          {/* ── Blocks tab ──────────────────────────────────────────────────── */}
          {tab === 'blocks' && (
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <BlockEditor
                persona="brand"
                blocks={blocks}
                events={upcomingEvents}
                onBlocksChange={handleBlocksChange}
                isDirty={blocksDirty}
                isSaving={blocksSaving || isPending}
                onSave={handleBlocksSave}
              />
            </div>
          )}

          {/* ── Theme tab ───────────────────────────────────────────────────── */}
          {tab === 'theme' && (
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <ThemeEditor
                persona="brand"
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
        <div style={{ flex: 1, background: '#0C0C0E', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Preview bar */}
          <div style={{
            height: 36, flexShrink: 0,
            borderBottom: `1px solid ${S.border}`,
            display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8,
          }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: S.amber }} />
            <span style={{ fontFamily: MONO, fontSize: 10, color: S.muted, letterSpacing: '0.10em' }}>
              LIVE PREVIEW — updates instantly as you edit
            </span>
          </div>

          {device === 'mobile' ? (
            /* ── Phone frame ─────────────────────────────────────────── */
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', justifyContent: 'center' }}>
              <BrandPagePreview
                displayName={profile.display_name ?? ''}
                username={profile.username ?? ''}
                city={profile.city ?? ''}
                businessCategories={profile.business_categories ?? []}
                avatarUrl={profile.avatar_url}
                contactWhatsapp={profile.contact_whatsapp}
                bio={bio}
                wimcGoals={wimcGoals}
                targetAudience={targetAudience}
                contactEmail={contactEmail}
                websiteUrl={websiteUrl}
                instagramHandle={instagramHandle}
                blocks={blocks}
                pageTheme={theme}
              />
            </div>
          ) : (
            /* ── Desktop browser mockup ───────────────────────────────── */
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              <div style={{
                width: '100%', borderRadius: 10, overflow: 'hidden',
                border: `1px solid ${S.border}`,
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                transform: 'translateZ(0)',
              }}>
                {/* Browser chrome */}
                <div style={{
                  height: 38, background: S.header,
                  borderBottom: `1px solid ${S.border}`,
                  display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px',
                }}>
                  <div style={{ display: 'flex', gap: 5 }}>
                    {(['#E8342A', '#F5A800', '#4ADE80'] as const).map(c => (
                      <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
                    ))}
                  </div>
                  <div style={{
                    flex: 1, height: 22, background: 'rgba(0,0,0,0.3)', borderRadius: 5,
                    display: 'flex', alignItems: 'center', padding: '0 10px', gap: 6,
                    fontSize: 11, fontFamily: MONO, color: S.muted, border: `1px solid ${S.border}`,
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 12, color: S.muted }}>lock</span>
                    {brandPageUrl}
                  </div>
                </div>
                {/* Page content — zoomed to fit preview panel */}
                <div style={{ overflowY: 'auto', overflowX: 'hidden', maxHeight: 'calc(100vh - 162px)' }}>
                  <div style={{ width: 1280, zoom: 0.65 }}>
                  <BrandPublicPage
                    brand={{
                      id:                  profile.id,
                      display_name:        profile.display_name ?? '',
                      username:            profile.username ?? '',
                      city:                profile.city ?? '',
                      bio,
                      business_categories: (profile.business_categories as string[]) ?? [],
                      wimc_goals:          wimcGoals,
                      target_audience:     targetAudience,
                      contact_whatsapp:    profile.contact_whatsapp,
                      contact_email:       contactEmail,
                      instagram_handle:    instagramHandle,
                      website_url:         websiteUrl,
                      created_at:          profile.created_at,
                    }}
                    creators={[]}
                    theme={theme}
                  />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
