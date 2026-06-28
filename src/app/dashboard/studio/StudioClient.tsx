'use client'

import { useState, useCallback, useTransition, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { UserProfile, PageBlock, Event } from '@/types/database'
import type { ProfileTheme } from '@/types/theme'
import BlockEditor from '@/components/dashboard/BlockEditor'
import ThemeEditor from '@/components/dashboard/ThemeEditor'
import PreviewPanel from '@/components/dashboard/PreviewPanel'
import { reorderBlocks, toggleBlockVisibility } from '@/app/actions/blocks'
import { updateProfileTheme } from '@/app/actions/profile'

// ── Types ─────────────────────────────────────────────────────────────────────

type StudioTab = 'blocks' | 'theme'
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
  const [tab, setTab] = useState<StudioTab>('blocks')
  const [device, setDevice] = useState<Device>('mobile')
  const [blocks, setBlocks] = useState<PageBlock[]>(initialBlocks)
  const [theme, setTheme] = useState<ProfileTheme>(initialTheme)
  const [highlightedBlockId, setHighlightedBlockId] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [isDirty, setIsDirty] = useState(false)
  const [isPending, startTransition] = useTransition()
  const origBlocks = useRef<PageBlock[]>([...initialBlocks])
  const origTheme  = useRef<ProfileTheme>({ ...initialTheme })
  const [revealBanner, setRevealBanner] = useState(showRevealBanner)

  useEffect(() => {
    if (!showRevealBanner) return
    const t = setTimeout(() => {
      setRevealBanner(false)
      router.replace('/dashboard/studio', { scroll: false })
    }, 6000)
    return () => clearTimeout(t)
  }, [showRevealBanner, router])

  const handleBlocksChange = useCallback((updated: PageBlock[]) => {
    setBlocks(updated)
    setIsDirty(true)
  }, [])

  const handleThemeChange = useCallback((partial: Partial<ProfileTheme>) => {
    setTheme((prev) => ({ ...prev, ...partial }))
    setIsDirty(true)
  }, [])

  const handleThemeReplace = useCallback((newTheme: ProfileTheme) => {
    setTheme(newTheme)
    setIsDirty(true)
  }, [])

  async function handleSave() {
    if (!isDirty) return
    setSaveStatus('saving')
    startTransition(async () => {
      try {
        if (tab === 'blocks') {
          const orderedIds = blocks.map((b) => b.id)
          await reorderBlocks(orderedIds)
          for (const b of blocks) {
            await toggleBlockVisibility(b.id, b.is_visible)
          }
          origBlocks.current = [...blocks]
        } else {
          await updateProfileTheme(theme)
          origTheme.current = { ...theme }
        }
        setSaveStatus('saved')
        setIsDirty(false)
        setTimeout(() => setSaveStatus('idle'), 2000)
      } catch {
        setSaveStatus('idle')
      }
    })
  }

  function handleDiscard() {
    if (!window.confirm('Discard unsaved changes?')) return
    if (tab === 'blocks') {
      setBlocks([...origBlocks.current])
    } else {
      setTheme({ ...origTheme.current })
    }
    setIsDirty(false)
    setSaveStatus('idle')
  }

  const saveLabel =
    saveStatus === 'saving' ? 'Saving…'
    : saveStatus === 'saved' ? 'Saved ✓'
    : isDirty ? 'Unsaved'
    : 'All saved'

  const saveColor =
    saveStatus === 'saved' ? '#5DD9D0'
    : isDirty ? '#F5A800'
    : S.textMuted

  return (
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
          {(['blocks', 'theme'] as StudioTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '4px 14px', borderRadius: 6, fontSize: 12.5, fontWeight: 600,
                fontFamily: 'var(--font-dm-sans)', cursor: 'pointer', border: 'none',
                background: tab === t ? S.coral : 'transparent',
                color: tab === t ? '#fff' : S.textSub,
                transition: 'all 180ms ease',
              }}
            >
              {t === 'blocks' ? 'Blocks' : 'Theme'}
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
        {isDirty && saveStatus === 'idle' && (
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
          disabled={!isDirty || isPending}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 16px', borderRadius: 7, fontSize: 12, fontWeight: 600,
            fontFamily: 'var(--font-dm-sans)', cursor: isDirty && !isPending ? 'pointer' : 'default',
            border: 'none',
            background: isDirty && !isPending ? S.coral : S.overlay,
            color: isDirty && !isPending ? '#fff' : S.textMuted,
            transition: 'all 180ms ease',
            opacity: !isDirty || isPending ? 0.55 : 1,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
            {saveStatus === 'saving' ? 'sync' : 'save'}
          </span>
          {saveStatus === 'saving' ? 'Saving…' : 'Save'}
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
          {tab === 'blocks' ? (
            <BlockEditor
              blocks={blocks}
              events={upcomingEvents}
              onBlocksChange={handleBlocksChange}
              onEditBlock={(id) => setHighlightedBlockId(id)}
              isDirty={isDirty}
              isSaving={isPending}
              onSave={handleSave}
              userTier={profile.user_tier}
            />
          ) : (
            <ThemeEditor
              theme={theme}
              onThemeChange={handleThemeChange}
              onThemeReplace={handleThemeReplace}
              isDirty={isDirty}
              isSaving={isPending}
              onSave={handleSave}
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
              saveStatus={saveStatus}
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
                  saveStatus={saveStatus}
                  isDirty={isDirty}
                  device="desktop"
                />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Mobile fallback — studio preview requires tablet/desktop ────── */}
        <div
          className="flex-1 flex md:hidden flex-col items-center justify-center gap-5 px-6 text-center"
          style={{ background: S.preview }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 40, color: 'rgba(26,39,68,0.2)' }}>
            desktop_mac
          </span>
          <p style={{ color: 'rgba(26,39,68,0.45)', fontSize: 13, lineHeight: 1.65, maxWidth: 240 }}>
            Live preview works best on a tablet or desktop screen.
          </p>
          <a
            href={profilePath}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              color: S.coral, fontSize: 13, fontWeight: 600,
              fontFamily: 'var(--font-dm-sans)', textDecoration: 'none',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span>
            View live page
          </a>
        </div>
      </div>
    </div>
  )
}
