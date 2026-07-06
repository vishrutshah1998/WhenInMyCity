'use client'

import { useState, useEffect } from 'react'
import { Drawer } from 'vaul'
import { useIsMobile } from '@/hooks/useIsMobile'

// ── Layout constants ───────────────────────────────────────────────────────────

const BOTTOM_NAV_H = 56   // MobileBottomNav: height = h-14, z-index = z-[55]
const TOOL_STRIP_H = 52   // height of the tool-tab strip
const HANDLE_ZONE  = 18   // vaul drag handle area (marginTop + element + marginBottom)

// SNAP_PEEK reveals exactly (HANDLE_ZONE + TOOL_STRIP_H) of visible content above
// the MobileBottomNav. The BottomNav (z-[55]) sits on top of the bottom BOTTOM_NAV_H
// pixels of the drawer, so:
//   visible at peek = SNAP_PEEK − BOTTOM_NAV_H = HANDLE_ZONE + TOOL_STRIP_H = 70px
const SNAP_PEEK = `${BOTTOM_NAV_H + HANDLE_ZONE + TOOL_STRIP_H}px`   // '126px'
const SNAP_MID  = '55%'
const SNAP_FULL = '92%'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface StudioTab {
  key:   string
  label: string
  icon:  string   // material-symbols icon name
}

interface Props {
  /** Desktop passthrough — the complete existing studio layout, rendered unchanged */
  children:     React.ReactNode
  /** Mobile only — the live preview node (persona-specific, shell is agnostic) */
  preview:      React.ReactNode
  /** Ordered tabs for the horizontal tool-strip */
  tabs:         StudioTab[]
  /** Returns the control-panel content for the given active tab key */
  renderPanel:  (tab: string) => React.ReactNode
  /** Accent color for active tab highlight (default: teal) */
  accentColor?: string
  /** Background for the drawer panel and tab strip (default: dark panel) */
  panelBg?:     string
}

// ── StudioTabStrip ─────────────────────────────────────────────────────────────
// Exported as a standalone component so other callers can embed it independently.

export function StudioTabStrip({
  tabs,
  activeTab,
  onTabSelect,
  accentColor = '#5DD9D0',
  bg          = '#0A1520',
}: {
  tabs:         StudioTab[]
  activeTab:    string | null
  onTabSelect:  (key: string) => void
  accentColor?: string
  bg?:          string
}) {
  return (
    <div
      style={{
        display:        'flex',
        overflowX:      'auto',
        scrollbarWidth: 'none',
        flexShrink:     0,
        background:     bg,
        borderTop:      `1px solid ${accentColor}28`,
        height:         TOOL_STRIP_H,
      }}
    >
      {tabs.map(tab => {
        const active = activeTab === tab.key
        return (
          <button
            key={tab.key}
            onClick={() => onTabSelect(tab.key)}
            style={{
              flex:           1,
              flexShrink:     0,
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'center',
              justifyContent: 'center',
              gap:            3,
              height:         '100%',
              padding:        '0 12px',
              background:     'transparent',
              border:         'none',
              borderTop:      `2px solid ${active ? accentColor : 'transparent'}`,
              cursor:         'pointer',
              color:          active ? accentColor : 'rgba(232,244,248,0.38)',
              transition:     'color 160ms ease, border-color 160ms ease',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: 17,
                fontVariationSettings: active
                  ? "'FILL' 1,'wght' 500,'GRAD' 0,'opsz' 24"
                  : "'FILL' 0,'wght' 300,'GRAD' 0,'opsz' 24",
              }}
            >
              {tab.icon}
            </span>
            <span
              style={{
                fontSize:      9,
                fontFamily:    "'JetBrains Mono', monospace",
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontWeight:    active ? 700 : 500,
                lineHeight:    1,
              }}
            >
              {tab.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ── StudioShell ────────────────────────────────────────────────────────────────

export default function StudioShell({
  children,
  preview,
  tabs,
  renderPanel,
  accentColor = '#5DD9D0',
  panelBg     = '#0A1520',
}: Props) {
  const isMobile = useIsMobile()

  // All hooks must be called unconditionally before the early desktop return.
  const [activeTab, setActiveTab] = useState<string | null>(null)
  const [snap,      setSnap]      = useState<string | number>(SNAP_PEEK)
  const [container, setContainer] = useState<HTMLDivElement | null>(null)
  const [showHint,  setShowHint]  = useState(false)

  // First-use discoverability hint — in-memory only (no browser storage).
  // Shows for 3s on every fresh page load; reappears after a hard refresh, which is fine.
  useEffect(() => {
    if (!isMobile) return
    setShowHint(true)
    const t = setTimeout(() => setShowHint(false), 3000)
    return () => clearTimeout(t)
  }, [isMobile])

  // ── Desktop: pure passthrough — zero layout change ──────────────────────────
  if (!isMobile) return <>{children}</>

  // ── Derived ─────────────────────────────────────────────────────────────────
  // Panel is "open" whenever the drawer is above its peek resting position.
  const isPanelOpen = snap !== SNAP_PEEK

  // ── Handlers ────────────────────────────────────────────────────────────────

  function openTab(key: string) {
    setActiveTab(key)
    setSnap(SNAP_MID)
  }

  function snapToPeek() {
    setActiveTab(null)
    setSnap(SNAP_PEEK)
  }

  // vaul types setActiveSnapPoint as (snap: string | number | null) => void.
  // null is guarded: dismissible={false} means it should never arrive in practice.
  function handleSnapChange(s: string | number | null) {
    if (s === null) return
    setSnap(s)
    if (s === SNAP_PEEK) setActiveTab(null)
  }

  // ── Mobile layout ────────────────────────────────────────────────────────────
  //
  // z-index stack (stacking context = this fixed overlay at z:20):
  //
  //  —   preview           (document order — sits behind everything)
  //  35  tap-to-peek glass (intercepts preview-area taps while panel is expanded)
  //  40  Drawer.Content    (portaled into container ref, not document.body)
  //  55  MobileBottomNav   (set externally in venue/brand layouts; not touched here)
  //
  // Desktop path returns early above — this JSX is never evaluated on desktop,
  // so there is no risk of position:fixed or vaul leakage to the page layout.

  return (
    <div
      style={{
        position:   'fixed',
        inset:      0,
        zIndex:     20,
        overflow:   'hidden',
        background: '#000',
      }}
    >
      {/* ── Live preview ───────────────────────────────────────────────────── */}
      {/* Fills the entire overlay; the peek drawer at the bottom overlays it. */}
      <div style={{ position: 'absolute', inset: 0 }}>
        {preview}
      </div>

      {/* ── Tap-to-peek glass ──────────────────────────────────────────────── */}
      {/* Only rendered while the panel is at mid or full snap (isPanelOpen).
          At z:35 it sits above the preview but below Drawer.Content (z:40).
          Clicking anywhere in the preview area snaps the drawer back to peek. */}
      {isPanelOpen && (
        <div
          onClick={snapToPeek}
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset:    0,
            zIndex:   35,
            cursor:   'pointer',
          }}
        />
      )}

      {/* ── First-use drag hint ────────────────────────────────────────────── */}
      {/* Floats just above the peek strip for 3s on first ever open.
          pointer-events:none so it never blocks preview or glass taps.       */}
      {showHint && (
        <div
          aria-hidden="true"
          style={{
            position:      'absolute',
            bottom:        `calc(${SNAP_PEEK} + 8px)`,
            left:          0,
            right:         0,
            display:       'flex',
            justifyContent:'center',
            zIndex:        45,
            pointerEvents: 'none',
          }}
        >
          <div
            className="animate-bounce"
            style={{
              display:    'inline-flex',
              alignItems: 'center',
              gap:        5,
              background: 'rgba(0,0,0,0.65)',
              border:     `1px solid ${accentColor}40`,
              borderRadius: 99,
              padding:    '5px 14px',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 13, color: accentColor }}
            >
              keyboard_arrow_up
            </span>
            <span
              style={{
                fontFamily:    "'JetBrains Mono', monospace",
                fontSize:      9,
                color:         accentColor,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              drag to edit
            </span>
          </div>
        </div>
      )}

      {/* ── Vaul portal container ──────────────────────────────────────────── */}
      {/* Drawer.Portal renders into this div instead of document.body.
          Because this div is inside the fixed overlay, the drawer is fully
          contained and cannot leak position:fixed to the host page.
          pointerEvents:none so the container itself does not block preview clicks;
          Drawer.Content sets pointerEvents:auto to re-enable its own interaction. */}
      <div
        ref={setContainer}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      />

      {/* ── Bottom drawer ──────────────────────────────────────────────────── */}
      {/* Mount only after the portal container ref is available. */}
      {container && (
        <Drawer.Root
          modal={false}
          defaultOpen
          dismissible={false}
          snapPoints={[SNAP_PEEK, SNAP_MID, SNAP_FULL]}
          activeSnapPoint={snap}
          setActiveSnapPoint={handleSnapChange}
        >
          <Drawer.Portal container={container}>
            <Drawer.Content
              style={{
                position:      'absolute',
                bottom:        0,
                left:          0,
                right:         0,
                zIndex:        40,
                background:    panelBg,
                borderRadius:  '16px 16px 0 0',
                boxShadow:     '0 -4px 32px rgba(0,0,0,0.28)',
                display:       'flex',
                flexDirection: 'column',
                outline:       'none',
                height:        '92dvh',
                // paddingBottom clears MobileBottomNav (56px) + iOS home indicator.
                // The tool-strip lives *inside* the drawer content, so its height
                // does not add to this padding — it is part of the visible peek area.
                paddingBottom: `calc(${BOTTOM_NAV_H}px + env(safe-area-inset-bottom, 0px))`,
                pointerEvents: 'auto',
                overflow:      'hidden',
              }}
            >
              {/* Drag handle */}
              <Drawer.Handle style={{ marginTop: 10, marginBottom: 4 }} />

              {/* Tool-strip — always visible at peek; tapping opens/switches panel */}
              <StudioTabStrip
                tabs={tabs}
                activeTab={activeTab}
                onTabSelect={openTab}
                accentColor={accentColor}
                bg={panelBg}
              />

              {/* Panel content — only visible at mid/full snaps.
                  overflow:hidden so each persona's panel manages its own scroll. */}
              <div
                style={{
                  flex:          1,
                  overflow:      'hidden',
                  display:       'flex',
                  flexDirection: 'column',
                }}
              >
                {activeTab !== null && renderPanel(activeTab)}
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      )}
    </div>
  )
}
