'use client'

import { useRef, useEffect, useState } from 'react'
import type { UserProfile, PageBlock, Event } from '@/types/database'
import type { ProfileTheme } from '@/types/theme'
import PublicProfilePage from '@/components/profile/PublicProfilePage'

// ---------------------------------------------------------------------------
// Phone frame chrome
// ---------------------------------------------------------------------------

function PhoneNotch() {
  return (
    <div className="absolute top-0 left-0 right-0 flex justify-center z-10 pt-3 pointer-events-none">
      <div className="w-28 h-7 bg-black rounded-b-2xl" />
    </div>
  )
}

function PhoneStatusBar() {
  return (
    <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 pt-2 z-20 pointer-events-none" style={{ height: 40 }}>
      <span className="text-white text-[11px] font-semibold tracking-tight">9:41</span>
      <div className="flex items-center gap-1.5">
        {/* Signal */}
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white opacity-90">
          <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/>
        </svg>
        {/* Wifi */}
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white opacity-90">
          <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3a4.237 4.237 0 0 0-6 0zm-4-4l2 2a7.074 7.074 0 0 1 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/>
        </svg>
        {/* Battery */}
        <svg viewBox="0 0 24 24" className="w-5 h-4 fill-white opacity-90">
          <path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z"/>
        </svg>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// PreviewPanel
// ---------------------------------------------------------------------------

interface PreviewPanelProps {
  profile: UserProfile
  blocks: PageBlock[]
  events?: Event[]
  theme?: ProfileTheme
  highlightedBlockId?: string | null
  saveStatus: 'idle' | 'saving' | 'saved'
  isDirty: boolean
}

export default function PreviewPanel({
  profile,
  blocks,
  events = [],
  theme,
  saveStatus,
  isDirty,
}: PreviewPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  // Scale the phone frame to fit the container width
  useEffect(() => {
    if (!containerRef.current) return
    const PHONE_W = 375
    const PADDING = 24   // 12px each side — tighter on tablet panel

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0
      setScale(Math.min(1, (width - PADDING) / PHONE_W))
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  const badgeText = saveStatus === 'saved'
    ? '✓ Saved'
    : isDirty
      ? 'Preview · unsaved changes'
      : 'Preview · live'

  const badgeColor = saveStatus === 'saved'
    ? '#16a34a'
    : isDirty
      ? '#d97706'
      : 'rgba(255,255,255,0.35)'

  // Derive the scaled height so we can reserve the right amount of vertical
  // space and correctly position the URL label underneath.
  const PHONE_H = 720
  const scaledH = PHONE_H * scale

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex flex-col items-center justify-center gap-0 overflow-hidden py-4"
    >
      {/* Badge above phone */}
      <div
        className="mb-3 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-300 shrink-0"
        style={{
          background: `${badgeColor}18`,
          color: badgeColor,
          border: `1px solid ${badgeColor}40`,
        }}
      >
        {badgeText}
      </div>

      {/*
       * Phone frame wrapper.
       * We render the phone at its natural 375×720 size, then scale it down
       * uniformly so it fits the container width.  The wrapper div reserves
       * exactly `scaledH` px of height so the URL label sits flush below.
       */}
      <div
        className="relative shrink-0 flex items-start justify-center"
        style={{ width: '100%', height: scaledH }}
      >
        <div
          style={{
            width: 375,
            height: PHONE_H,
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
          }}
        >
          <div
            className="relative overflow-hidden"
            style={{
              width: 375,
              height: PHONE_H,
              borderRadius: 40,
              background: '#000',
              boxShadow: '0 0 0 8px #1a1a1a, 0 0 0 10px #2a2a2a, 0 32px 64px rgba(0,0,0,0.6)',
            }}
          >
            {/* Status bar + notch */}
            <PhoneStatusBar />
            <PhoneNotch />

            {/* Scrollable content area — starts below notch */}
            <div
              className="absolute inset-0 overflow-y-auto overflow-x-hidden"
              style={{ paddingTop: 40 }}
            >
              <PublicProfilePage
                profile={profile}
                blocks={blocks}
                upcomingEvents={events}
                theme={theme}
              />
            </div>

            {/* Bottom home indicator */}
            <div className="absolute bottom-2 left-0 right-0 flex justify-center pointer-events-none">
              <div className="w-32 h-1 bg-white/30 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* URL label below phone */}
      <p
        className="mt-3 text-xs font-medium tracking-wide shrink-0"
        style={{
          color: 'var(--md-sys-color-on-surface-variant)',
          opacity: 0.5,
        }}
      >
        wheninmycity.com/{profile.username}
      </p>
    </div>
  )
}
