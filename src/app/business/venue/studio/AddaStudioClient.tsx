'use client'

import { useState, useCallback, useTransition, useRef } from 'react'
import { updateAddaStudioContent } from '@/app/actions/adda'
import { updateProfileTheme } from '@/app/actions/profile'
import { reorderBlocks } from '@/app/actions/blocks'
import BlockEditor from '@/components/dashboard/BlockEditor'
import ThemeEditor from '@/components/dashboard/ThemeEditor'
import StudioShell, { type StudioTab } from '@/components/dashboard/StudioShell'
import AddaPagePreview from './AddaPagePreview'
import AddaPublicPage from '@/app/adda/[slug]/AddaPublicPage'
import type { AddaProfile, PageBlock } from '@/types/database'
import type { ProfileTheme } from '@/types/theme'

type Device = 'mobile' | 'desktop'

// ── Design tokens ──────────────────────────────────────────────────────────────

const S = {
  bg:        '#060D11',
  panel:     '#0A1520',
  header:    '#04090D',
  border:    'rgba(93,217,208,0.12)',
  text:      'rgba(232,244,248,0.90)',
  textSub:   'rgba(232,244,248,0.50)',
  muted:     'rgba(232,244,248,0.28)',
  teal:      '#5DD9D0',
  tealTint:  'rgba(93,217,208,0.12)',
  success:   '#4CAF7D',
  danger:    '#E05555',
} as const

const MONO  = "'JetBrains Mono', monospace"
const INTER = "'Inter', system-ui, sans-serif"

type Tab = 'content' | 'blocks' | 'theme'

const ADDA_TABS: StudioTab[] = [
  { key: 'content', label: 'Content', icon: 'edit'    },
  { key: 'blocks',  label: 'Blocks',  icon: 'add_box' },
  { key: 'theme',   label: 'Theme',   icon: 'palette' },
]

const EVENT_PREF_OPTIONS = [
  { id: 'music_live',  label: '🎵 Live Music' },
  { id: 'comedy',      label: '😂 Comedy & Open Mic' },
  { id: 'art',         label: '🎨 Art & Exhibition' },
  { id: 'workshops',   label: '🛠 Workshops' },
  { id: 'talks',       label: '🎤 Talks & Panels' },
  { id: 'photography', label: '📷 Photography' },
  { id: 'networking',  label: '🤝 Networking' },
  { id: 'corporate',   label: '💼 Corporate Events' },
  { id: 'film',        label: '🎬 Film & Screenings' },
  { id: 'dance',       label: '💃 Dance Events' },
  { id: 'wellness',    label: '🧘 Wellness' },
  { id: 'food_drink',  label: '🍸 Food & Drink' },
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

function SectionDivider({ label, icon }: { label: string; icon: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderTop: `1px dashed rgba(93,217,208,0.15)`, paddingTop: 18, marginTop: 4 }}>
      <span className="material-symbols-outlined" style={{ fontSize: 13, color: 'rgba(93,217,208,0.5)' }}>{icon}</span>
      <span style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(93,217,208,0.5)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>{label}</span>
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
        background: active ? S.teal : 'transparent',
        border: 'none', borderRadius: 6, cursor: 'pointer',
        color: active ? '#060D11' : S.textSub,
        fontFamily: MONO, fontSize: 11, fontWeight: active ? 700 : 500,
        letterSpacing: '0.6px', transition: 'all 160ms ease',
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 15, color: active ? '#060D11' : S.muted }}>
        {icon}
      </span>
      {label}
    </button>
  )
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  adda:           AddaProfile
  initialBlocks:  PageBlock[]
  upcomingEvents: { id: string; title: string; starts_at: string }[]
  theme:          ProfileTheme
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function AddaStudioClient({ adda, initialBlocks, upcomingEvents, theme: initialTheme }: Props) {
  const [tab, setTab]       = useState<Tab>('content')
  const [device, setDevice] = useState<Device>('mobile')

  // ── Content state ──────────────────────────────────────────────────────────
  const existingConfig = (adda.pricing_config as Record<string, unknown>) ?? {}
  const existingHighlights = (existingConfig.studio_highlights as string[] | undefined) ?? ['', '', '']

  const [tagline,          setTagline]           = useState((existingConfig.tagline as string | undefined) ?? '')
  const [eventPrefs,       setEventPrefs]        = useState<string[]>((adda.event_preferences as string[] | null) ?? [])
  const [highlights,       setHighlights]        = useState<string[]>(existingHighlights.length >= 3 ? existingHighlights : [...existingHighlights, ...['', '', '']].slice(0, 3))
  const [contactWhatsapp,  setContactWhatsapp]   = useState(adda.contact_whatsapp ?? '')
  const [instagramHandle,  setInstagramHandle]   = useState(adda.instagram_handle ?? '')
  const [contentDirty,     setContentDirty]      = useState(false)
  const [contentSaving,    setContentSaving]      = useState(false)
  const [contentStatus,    setContentStatus]      = useState<'idle' | 'saved' | 'error'>('idle')

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
    tagline:         (existingConfig.tagline as string | undefined) ?? '',
    eventPrefs:      [...((adda.event_preferences as string[] | null) ?? [])],
    highlights:      [...(existingHighlights.length >= 3 ? existingHighlights : [...existingHighlights, ...['', '', '']].slice(0, 3))],
    contactWhatsapp: adda.contact_whatsapp ?? '',
    instagramHandle: adda.instagram_handle ?? '',
  })
  const origBlocks = useRef<PageBlock[]>([...initialBlocks])
  const origTheme  = useRef<ProfileTheme>({ ...initialTheme })

  // ── Derived ────────────────────────────────────────────────────────────────
  const isDirty  = tab === 'content' ? contentDirty : tab === 'blocks' ? blocksDirty : themeDirty
  const isSaving = tab === 'content' ? contentSaving : tab === 'blocks' ? blocksSaving : themeSaving
  const status   = tab === 'content' ? contentStatus : tab === 'blocks' ? blocksStatus : themeStatus

  // ── Content handlers ───────────────────────────────────────────────────────

  function markContentDirty() { setContentDirty(true); setContentStatus('idle') }

  function toggleEventPref(id: string) {
    setEventPrefs((prev) => prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id])
    markContentDirty()
  }

  function setHighlight(index: number, value: string) {
    setHighlights((prev) => { const next = [...prev]; next[index] = value; return next })
    markContentDirty()
  }

  async function handleContentSave() {
    setContentSaving(true)
    const result = await updateAddaStudioContent(adda.id, {
      tagline:           tagline,
      event_preferences: eventPrefs,
      studio_highlights: highlights,
      contact_whatsapp:  contactWhatsapp,
      instagram_handle:  instagramHandle,
    })
    setContentSaving(false)
    if (result.error) {
      setContentStatus('error')
    } else {
      setContentStatus('saved')
      setContentDirty(false)
      origContent.current = { tagline, eventPrefs: [...eventPrefs], highlights: [...highlights], contactWhatsapp, instagramHandle }
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
      setTagline(origContent.current.tagline)
      setEventPrefs([...origContent.current.eventPrefs])
      setHighlights([...origContent.current.highlights])
      setContactWhatsapp(origContent.current.contactWhatsapp)
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
    background: 'rgba(93,217,208,0.05)',
    border: '1px solid rgba(93,217,208,0.15)',
    borderRadius: 4, padding: '10px 12px',
    fontFamily: INTER, fontSize: 13.5,
    color: S.text, outline: 'none',
  }

  // ── liveAdda: DB record with in-progress edits applied ────────────────────
  // Used in both the desktop browser-mockup preview and the mobile shell preview
  // so the merge logic is defined once.
  const liveAdda = {
    ...adda,
    contact_whatsapp: contactWhatsapp || adda.contact_whatsapp,
    instagram_handle: instagramHandle || adda.instagram_handle,
    event_preferences: eventPrefs as unknown as typeof adda.event_preferences,
    pricing_config: {
      ...(typeof adda.pricing_config === 'object' && adda.pricing_config !== null
        ? adda.pricing_config as Record<string, unknown>
        : {}),
      tagline,
      studio_highlights: highlights,
    } as unknown as typeof adda.pricing_config,
  }

  // ── ContentPanel: render function (not a component) for the content tab ────
  // Called as ContentPanel() — not as <ContentPanel /> — so React never creates
  // a component instance boundary and inputs never lose focus on re-render.
  // Rendered in both the desktop left panel and the mobile StudioShell drawer.
  function ContentPanel() {
    return (
      <div style={{ padding: '20px 20px 40px', display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* ─── Section: PAGE VOICE ──────────────────────────────────── */}
        <SectionDivider label="Page Voice" icon="record_voice_over" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '18px 0 24px' }}>

          {/* Tagline */}
          <div>
            <FieldLabel label="Tagline" icon="format_quote" />
            <input
              type="text"
              value={tagline}
              onChange={(e) => { setTagline(e.target.value); markContentDirty() }}
              maxLength={100}
              placeholder="One punchy line about your space…"
              style={inputBase}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontFamily: MONO, fontSize: 9, color: S.muted }}>Shown below your venue name on the public page</span>
              <span style={{ fontFamily: MONO, fontSize: 9, color: S.muted }}>{tagline.length}/100</span>
            </div>
          </div>

          {/* Key highlights */}
          <div>
            <FieldLabel label="Key Highlights" icon="star" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {highlights.map((h, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: S.teal, fontSize: 10, flexShrink: 0, fontFamily: MONO }}>✦</span>
                  <input
                    type="text"
                    value={h}
                    onChange={(e) => setHighlight(i, e.target.value)}
                    maxLength={100}
                    placeholder={['Natural light & open layout', 'PA system included', 'Easy parking'][i] + '…'}
                    style={inputBase}
                  />
                </div>
              ))}
            </div>
            <p style={{ fontFamily: MONO, fontSize: 9, color: S.muted, marginTop: 6 }}>Three selling points shown as bullet callouts on your page.</p>
          </div>
        </div>

        {/* ─── Section: WHAT WE HOST ────────────────────────────────── */}
        <SectionDivider label="What We Host" icon="event" />
        <div style={{ padding: '18px 0 24px' }}>
          <FieldLabel label="Event types you welcome" icon="category" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
            {EVENT_PREF_OPTIONS.map((opt) => {
              const active = eventPrefs.includes(opt.id)
              return (
                <button
                  key={opt.id}
                  onClick={() => toggleEventPref(opt.id)}
                  style={{
                    padding: '5px 11px', fontSize: 11.5, border: '1px solid',
                    borderColor: active ? S.teal : 'rgba(93,217,208,0.18)',
                    background: active ? S.tealTint : 'transparent',
                    color: active ? S.teal : S.textSub,
                    borderRadius: 4, cursor: 'pointer', fontFamily: INTER,
                    transition: 'all 160ms ease',
                  }}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
          <p style={{ fontFamily: MONO, fontSize: 9, color: S.muted, marginTop: 8 }}>Shown as "Best for" tags on your listing.</p>
        </div>

        {/* ─── Section: SOCIAL & CONTACT ────────────────────────────── */}
        <SectionDivider label="Social & Contact" icon="link" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '18px 0 24px' }}>
          <div>
            <FieldLabel label="WhatsApp (booking enquiries)" icon="chat" />
            <input
              type="tel"
              value={contactWhatsapp}
              onChange={(e) => { setContactWhatsapp(e.target.value); markContentDirty() }}
              placeholder="+91 98765 43210"
              style={inputBase}
            />
            <p style={{ fontFamily: MONO, fontSize: 9, color: S.muted, marginTop: 4 }}>Appears as the primary "Book this space" CTA on your page.</p>
          </div>
          <div>
            <FieldLabel label="Instagram Handle" icon="alternate_email" />
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontFamily: INTER, fontSize: 13, color: S.muted }}>@</span>
              <input
                type="text"
                value={instagramHandle}
                onChange={(e) => { setInstagramHandle(e.target.value.replace(/^@/, '')); markContentDirty() }}
                placeholder="yourvenue"
                style={{ ...inputBase, paddingLeft: 28 }}
              />
            </div>
          </div>
        </div>

        {/* Locked fields note */}
        <div style={{ borderTop: `1px solid ${S.border}`, paddingTop: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 13, color: S.muted }}>info</span>
          <span style={{ fontFamily: MONO, fontSize: 9.5, color: S.muted, lineHeight: 1.5 }}>
            Venue name, type & location are managed in&nbsp;
            <a href="/business/venue/venue" style={{ color: S.teal, textDecoration: 'none' }}>My Venue →</a>
          </span>
        </div>
      </div>
    )
  }

  // ── renderAddaPanel: per-tab drawer content for the mobile StudioShell ─────
  // BlockEditor and ThemeEditor render their own save controls; only the
  // content tab needs a save bar added here.
  function renderAddaPanel(key: string): React.ReactNode {
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
              onClick={() => { handleContentSave() }}
              disabled={contentSaving || !contentDirty}
              style={{
                background: contentSaving || !contentDirty ? 'rgba(93,217,208,0.25)' : S.teal,
                border: 'none', borderRadius: 4, padding: '5px 14px',
                color: contentSaving || !contentDirty ? 'rgba(0,0,0,0.4)' : '#060D11',
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
            persona="adda"
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
            persona="adda"
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
        <AddaPublicPage
          adda={liveAdda}
          upcomingEvents={[]}
          pastEvents={[]}
          stats={{ total_events: 0, average_rating: 0 }}
          theme={theme}
          isPreview
        />
      }
      tabs={ADDA_TABS}
      renderPanel={renderAddaPanel}
      accentColor={S.teal}
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

        {/* Device toggle */}
        <div style={{ display: 'flex', gap: 2, padding: 3, background: 'rgba(0,0,0,0.3)', borderRadius: 8 }}>
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
                background: device === key ? S.teal : 'transparent',
                border: 'none',
                color: device === key ? S.bg : S.textSub,
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

        <a
          href={`/adda/${adda.slug}`}
          target="_blank" rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: 5, border: `1px solid ${S.teal}`, borderRadius: 6, padding: '5px 14px', color: S.teal, textDecoration: 'none', fontFamily: MONO, fontSize: 11, letterSpacing: '0.4px' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span>
          Live Page
        </a>

        <button
          onClick={handleSave}
          disabled={isSaving || !isDirty}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: isSaving || !isDirty ? 'rgba(93,217,208,0.25)' : S.teal,
            border: 'none', borderRadius: 6, padding: '7px 18px',
            color: isSaving || !isDirty ? 'rgba(0,0,0,0.4)' : '#060D11',
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
                persona="adda"
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
                persona="adda"
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
        <div style={{ flex: 1, background: '#04090D', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ height: 36, flexShrink: 0, borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: S.teal }} />
            <span style={{ fontFamily: MONO, fontSize: 10, color: S.muted, letterSpacing: '0.10em' }}>
              LIVE PREVIEW — updates instantly as you edit
            </span>
          </div>

          {device === 'mobile' ? (
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', justifyContent: 'center' }}>
              <AddaPagePreview
                adda={adda}
                tagline={tagline}
                eventPreferences={eventPrefs}
                highlights={highlights}
                contactWhatsapp={contactWhatsapp}
                instagramHandle={instagramHandle}
                blocks={blocks}
                pageTheme={theme}
                upcomingEvents={upcomingEvents}
              />
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              {/* Browser mockup */}
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
                  display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', flexShrink: 0,
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
                    wheninmycity.com/adda/{adda.slug}
                  </div>
                </div>
                {/* Page content — zoomed to fit preview panel */}
                <div style={{ overflowY: 'auto', overflowX: 'hidden', maxHeight: 'calc(100vh - 162px)' }}>
                  <div style={{ width: 1280, zoom: 0.65, transformOrigin: 'top left' }}>
                  <AddaPublicPage
                    adda={liveAdda}
                    upcomingEvents={[]}
                    pastEvents={[]}
                    stats={{ total_events: 0, average_rating: 0 }}
                    theme={theme}
                    isPreview
                  />
                  </div>
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
