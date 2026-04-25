'use client'

import { useState, useCallback, useTransition } from 'react'
import type { UserProfile, PageBlock, Event } from '@/types/database'
import type { ProfileTheme } from '@/types/theme'
import BlockEditor from '@/components/dashboard/BlockEditor'
import ThemeEditor from '@/components/dashboard/ThemeEditor'
import PreviewPanel from '@/components/dashboard/PreviewPanel'
import { reorderBlocks, toggleBlockVisibility, deleteBlock } from '@/app/actions/blocks'
import { updateProfileTheme } from '@/app/actions/profile'

// ── Types ─────────────────────────────────────────────────────────────────────

type StudioTab = 'blocks' | 'theme'
type Device = 'mobile' | 'desktop'

interface StudioClientProps {
  profile: UserProfile
  initialBlocks: PageBlock[]
  upcomingEvents: Event[]
  theme: ProfileTheme
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function StudioClient({
  profile,
  initialBlocks,
  upcomingEvents,
  theme: initialTheme,
}: StudioClientProps) {
  const [tab, setTab] = useState<StudioTab>('blocks')
  const [device, setDevice] = useState<Device>('mobile')
  const [blocks, setBlocks] = useState<PageBlock[]>(initialBlocks)
  const [theme, setTheme] = useState<ProfileTheme>(initialTheme)
  const [highlightedBlockId, setHighlightedBlockId] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [isDirty, setIsDirty] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleBlocksChange = useCallback((updated: PageBlock[]) => {
    setBlocks(updated)
    setIsDirty(true)
  }, [])

  const handleThemeChange = useCallback((partial: Partial<ProfileTheme>) => {
    setTheme((prev) => ({ ...prev, ...partial }))
    setIsDirty(true)
  }, [])

  async function handleSave() {
    if (!isDirty) return
    setSaveStatus('saving')
    startTransition(async () => {
      try {
        if (tab === 'blocks') {
          // Persist reorder + visibility in one pass
          const orderedIds = blocks.map((b) => b.id)
          await reorderBlocks(orderedIds)
          for (const b of blocks) {
            await toggleBlockVisibility(b.id, b.is_visible)
          }
        } else {
          await updateProfileTheme(theme)
        }
        setSaveStatus('saved')
        setIsDirty(false)
        setTimeout(() => setSaveStatus('idle'), 2000)
      } catch {
        setSaveStatus('idle')
      }
    })
  }

  const saveLabel =
    saveStatus === 'saving' ? 'Saving…'
    : saveStatus === 'saved' ? 'Saved ✓'
    : isDirty ? 'Unsaved changes'
    : 'All saved'

  const saveColor =
    saveStatus === 'saved' ? 'var(--wimc-teal)'
    : isDirty ? 'var(--wimc-amber)'
    : 'var(--wimc-text-muted, #6b7280)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--wimc-bg-base)' }}>

      {/* ── Topbar ─────────────────────────────────────────────────────────── */}
      <header style={{
        height: 60, flexShrink: 0,
        borderBottom: '1px solid var(--wimc-border-subtle)',
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '0 24px',
        background: 'rgba(10,10,11,0.92)', backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        {/* Tab switcher */}
        <div style={{
          display: 'flex', gap: 2, padding: 4,
          background: 'var(--wimc-bg-overlay)', borderRadius: 10,
          border: '1px solid var(--wimc-border-default)',
        }}>
          {(['blocks', 'theme'] as StudioTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '5px 14px', borderRadius: 7, fontSize: 12.5, fontWeight: 600,
                fontFamily: 'var(--font-dm-sans)', cursor: 'pointer', border: 'none',
                background: tab === t ? 'var(--wimc-coral)' : 'transparent',
                color: tab === t ? '#fff' : 'var(--wimc-text-secondary)',
                transition: 'all 180ms ease',
              }}
            >
              {t === 'blocks' ? 'Blocks' : 'Theme'}
            </button>
          ))}
        </div>

        {/* Device toggle */}
        <div style={{
          display: 'flex', gap: 2, padding: 4,
          background: 'var(--wimc-bg-overlay)', borderRadius: 10,
          border: '1px solid var(--wimc-border-default)',
        }}>
          {([
            { key: 'mobile', icon: 'smartphone' },
            { key: 'desktop', icon: 'desktop_mac' },
          ] as { key: Device; icon: string }[]).map(({ key, icon }) => (
            <button
              key={key}
              onClick={() => setDevice(key)}
              style={{
                width: 32, height: 30, borderRadius: 7,
                display: 'grid', placeItems: 'center',
                background: device === key ? 'var(--wimc-bg-elevated)' : 'transparent',
                border: device === key ? '1px solid var(--wimc-border-default)' : 'none',
                color: device === key ? 'var(--wimc-coral)' : 'var(--wimc-text-secondary)',
                cursor: 'pointer',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{icon}</span>
            </button>
          ))}
        </div>

        {/* Autosave status */}
        <span style={{
          fontSize: 12, fontFamily: 'var(--font-jetbrains-mono)',
          color: saveColor, marginLeft: 4,
          transition: 'color 300ms ease',
        }}>
          {saveLabel}
        </span>

        <div style={{ flex: 1 }} />

        {/* Preview link */}
        <a
          href={`/${profile.username}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 600,
            fontFamily: 'var(--font-dm-sans)', cursor: 'pointer',
            border: '1px solid var(--wimc-border-default)',
            color: 'var(--wimc-text-secondary)', background: 'transparent',
            textDecoration: 'none', transition: 'all 180ms ease',
          }}
          onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--wimc-coral)'; el.style.color = 'var(--wimc-coral)' }}
          onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--wimc-border-default)'; el.style.color = 'var(--wimc-text-secondary)' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span>
          Preview
        </a>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={!isDirty || isPending}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 16px', borderRadius: 8, fontSize: 12.5, fontWeight: 600,
            fontFamily: 'var(--font-dm-sans)', cursor: isDirty && !isPending ? 'pointer' : 'default',
            border: 'none',
            background: isDirty && !isPending ? 'var(--wimc-coral)' : 'var(--wimc-bg-overlay)',
            color: isDirty && !isPending ? '#fff' : 'var(--wimc-text-secondary)',
            transition: 'all 180ms ease',
            opacity: !isDirty || isPending ? 0.5 : 1,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
            {saveStatus === 'saving' ? 'sync' : 'save'}
          </span>
          {saveStatus === 'saving' ? 'Saving…' : 'Save'}
        </button>
      </header>

      {/* ── Body ──────────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left panel */}
        <div style={{
          width: 380, flexShrink: 0,
          borderRight: '1px solid var(--wimc-border-subtle)',
          overflowY: 'auto',
          background: 'var(--wimc-bg-raised)',
        }}>
          {tab === 'blocks' ? (
            <BlockEditor
              blocks={blocks}
              events={upcomingEvents}
              onBlocksChange={handleBlocksChange}
              onEditBlock={(id) => setHighlightedBlockId(id)}
              isDirty={isDirty}
              isSaving={isPending}
              onSave={handleSave}
            />
          ) : (
            <ThemeEditor
              theme={theme}
              onThemeChange={handleThemeChange}
              isDirty={isDirty}
              isSaving={isPending}
              onSave={handleSave}
            />
          )}
        </div>

        {/* Right panel — preview */}
        <div style={{
          flex: 1,
          background: device === 'desktop' ? 'var(--wimc-bg-overlay)' : 'var(--wimc-bg-base)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          overflow: 'auto', padding: 24,
        }}>
          {device === 'mobile' ? (
            <PreviewPanel
              profile={profile}
              blocks={blocks}
              events={upcomingEvents}
              theme={theme}
              highlightedBlockId={highlightedBlockId}
              saveStatus={saveStatus}
              isDirty={isDirty}
            />
          ) : (
            <div style={{
              width: '100%', maxWidth: 900,
              border: '1px solid var(--wimc-border-default)',
              borderRadius: 16, overflow: 'hidden',
              background: 'var(--wimc-bg-base)',
            }}>
              {/* Browser chrome */}
              <div style={{
                height: 40, background: 'var(--wimc-bg-elevated)',
                borderBottom: '1px solid var(--wimc-border-subtle)',
                display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px',
              }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['#E8342A', '#F5A800', '#4ADE80'].map((c) => (
                    <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
                  ))}
                </div>
                <div style={{
                  flex: 1, height: 24, background: 'var(--wimc-bg-overlay)',
                  borderRadius: 6, display: 'flex', alignItems: 'center',
                  padding: '0 10px',
                  fontSize: 11, fontFamily: 'var(--font-jetbrains-mono)',
                  color: 'var(--wimc-text-secondary)',
                }}>
                  wheninmycity.com/{profile.username}
                </div>
              </div>
              {/* Page content */}
              <div style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                <PreviewPanel
                  profile={profile}
                  blocks={blocks}
                  events={upcomingEvents}
                  theme={theme}
                  highlightedBlockId={highlightedBlockId}
                  saveStatus={saveStatus}
                  isDirty={isDirty}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
