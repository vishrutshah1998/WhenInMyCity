'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getValueAxis, VALUE_CALLOUT } from '@/lib/theme/hsv'
import { WimcLogo } from '@/components/WimcLogo'

interface CompleteViewProps {
  username: string
  displayName: string
  city: string
  avatarUrl: string | null
  creatorType?: string
  bio?: string | null
  pageTheme?: { colorScheme?: string } | null
  interestTags?: string[]
}

// Scheme → primary colour, used only for button shadow tint and callout
const SCHEME_PRIMARY: Record<string, string> = {
  default: '#E8572A', midnight: '#818CF8', ocean: '#22D3EE', forest: '#6EE7B7',
  blush: '#E11D48', sand: '#B45309', pista: '#2D7A4F', gulaal: '#E8342A',
  neel: '#F5A800', turmeric: '#F5A800', steel: '#5B8DEF', sienna: '#C04A00',
  indigo: '#818CF8', aurora: '#D946EF', sage: '#3D7F53', mint: '#0C8B6B',
  electric: '#00E5FF', velvet: '#8B2340', nightforest: '#7EC8A0',
  parchment: '#4A3728', gallery: '#1A1A1A', terracotta: '#C4552A',
}

// Phone frame: 390 × 844 viewport scaled to fit a 216px-wide frame (scale ≈ 0.554)
const PHONE_W = 216
const VIEWPORT_W = 390
const VIEWPORT_H = 844
const SCALE = PHONE_W / VIEWPORT_W              // 0.5538…
const PHONE_H = Math.round(VIEWPORT_H * SCALE)  // 467px

export default function CompleteView({
  username, displayName, creatorType, pageTheme, interestTags,
}: CompleteViewProps) {
  const firstName = displayName.split(' ')[0]
  const isExplorer = creatorType === 'exploring'

  const scheme = pageTheme?.colorScheme ?? 'default'
  const primary = SCHEME_PRIMARY[scheme] ?? '#E8572A'

  const { cluster } = getValueAxis(interestTags ?? [])
  const hsvCallout = (cluster !== 'mixed' && scheme !== 'default')
    ? VALUE_CALLOUT[cluster]
    : null

  const schemeName = scheme.charAt(0).toUpperCase() + scheme.slice(1)

  // Add a timestamp query param after hydration to bypass Next.js's Data Cache.
  // The profile was just written — without this the iframe gets the pre-onboarding render.
  const [iframeSrc, setIframeSrc] = useState(`/${username}`)
  useEffect(() => {
    setIframeSrc(`/${username}?_t=${Date.now()}`)
  }, [username])

  return (
    <div className="flex flex-col min-h-screen bg-background text-on-surface font-body">
      <div className="flex flex-col min-h-screen max-w-sm mx-auto w-full px-6">

        {/* Progress bar — complete */}
        <header className="pt-6 pb-2 shrink-0">
          <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
            <div className="h-full w-full rounded-full" style={{ backgroundColor: primary }} />
          </div>
        </header>

        {/* Heading */}
        <div className="text-center pt-6 pb-5 shrink-0">
          <div className="flex justify-center mb-4">
            <WimcLogo size="md" />
          </div>
          <h1 className="text-2xl font-headline font-extrabold tracking-tight text-on-surface">
            You&apos;re live, {firstName}! 🎉
          </h1>
          <p className="text-sm text-on-surface-variant mt-1.5 leading-relaxed">
            {isExplorer
              ? 'Your profile is ready — start discovering events.'
              : 'This is exactly how your page looks to visitors.'}
          </p>
        </div>

        {/* Phone frame + iframe */}
        <div className="flex-1 flex flex-col items-center justify-center gap-4 py-2">
          <div className="relative" style={{ width: PHONE_W }}>
            {/* Outer frame */}
            <div
              className="relative overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
              style={{
                width: PHONE_W,
                height: PHONE_H,
                borderRadius: 28,
                border: '4px solid rgba(255,255,255,0.12)',
                backgroundColor: '#000',
              }}
            >
              {/* Dynamic island */}
              <div
                className="absolute top-2 left-1/2 -translate-x-1/2 z-10 rounded-full"
                style={{ width: 72, height: 10, backgroundColor: '#000' }}
              />

              {/* Iframe — scaled down to phone frame size */}
              <iframe
                src={iframeSrc}
                title="Your page preview"
                scrolling="no"
                style={{
                  width: VIEWPORT_W,
                  height: VIEWPORT_H,
                  transform: `scale(${SCALE})`,
                  transformOrigin: 'top left',
                  border: 'none',
                  pointerEvents: 'none',
                  display: 'block',
                }}
              />

              {/* Bottom fade to hide page scroll edge */}
              <div
                className="absolute inset-x-0 bottom-0 h-12 pointer-events-none"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 100%)' }}
              />
            </div>

            {/* Live badge */}
            <div
              className="absolute -top-2 -right-3 flex flex-col items-center justify-center rounded-full border-4 border-background shadow-xl"
              style={{ width: 52, height: 52, backgroundColor: primary }}
            >
              <span className="text-[7px] font-bold uppercase tracking-widest leading-none text-white">LIVE</span>
              <span className="text-xs font-headline font-black text-white leading-tight">NEW</span>
            </div>
          </div>

          {/* HSV callout */}
          {hsvCallout && (
            <div
              className="w-full flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs font-medium"
              style={{ backgroundColor: `${primary}14`, color: primary }}
            >
              <span style={{ fontSize: 13, lineHeight: 1.2, flexShrink: 0 }}>✦</span>
              <span>
                <span className="font-bold">{schemeName} · </span>
                {hsvCallout}
              </span>
            </div>
          )}
        </div>

        {/* CTAs */}
        <div className="shrink-0 pb-10 pt-4 flex flex-col gap-3">
          {isExplorer ? (
            <Link
              href="/explore"
              className="w-full py-4 px-6 font-headline font-bold rounded-xl text-center text-white active:scale-95 transition-all duration-150"
              style={{ backgroundColor: primary }}
            >
              Start exploring →
            </Link>
          ) : (
            <>
              <Link
                href={`/${username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 px-6 font-headline font-bold rounded-xl text-center text-white active:scale-95 transition-all duration-150 flex items-center justify-center gap-2"
                style={{ backgroundColor: primary }}
              >
                Visit my page
                <span className="text-sm opacity-80">↗</span>
              </Link>
              <Link
                href="/dashboard/studio"
                className="w-full py-4 px-6 bg-surface-container-high text-on-surface font-headline font-semibold rounded-xl text-center hover:bg-surface-container-highest transition-colors active:scale-95 border border-white/5"
              >
                Edit my page
              </Link>
            </>
          )}
        </div>
      </div>

      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
    </div>
  )
}
