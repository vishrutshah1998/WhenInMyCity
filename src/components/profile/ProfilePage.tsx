'use client'

import Image from 'next/image'
import type { UserProfile, PageBlock } from '@/types/database'
import type { ProfileTheme } from '@/types/theme'
import BlockRenderer from './BlockRenderer'

// ---------------------------------------------------------------------------
// Theme presets — map colorScheme → CSS variable values
// ---------------------------------------------------------------------------

interface ThemeTokens {
  bg: string
  primary: string
  text: string
  textMuted: string
  surface: string
}

const THEME_PRESETS: Record<ProfileTheme['colorScheme'], ThemeTokens> = {
  default:  { bg: '#121212', primary: '#E8572A', text: '#F2F0EF', textMuted: 'rgba(242,240,239,0.55)', surface: 'rgba(255,255,255,0.06)' },
  midnight: { bg: '#080812', primary: '#818CF8', text: '#E8E8FF', textMuted: 'rgba(232,232,255,0.50)', surface: 'rgba(255,255,255,0.06)' },
  ocean:    { bg: '#071724', primary: '#22D3EE', text: '#D0EEFF', textMuted: 'rgba(208,238,255,0.55)', surface: 'rgba(255,255,255,0.06)' },
  forest:   { bg: '#0F231A', primary: '#6EE7B7', text: '#D1FAE5', textMuted: 'rgba(209,250,229,0.55)', surface: 'rgba(255,255,255,0.06)' },
  blush:    { bg: '#FFF1F3', primary: '#E11D48', text: '#1C0714', textMuted: 'rgba(28,7,20,0.55)',     surface: 'rgba(0,0,0,0.04)'       },
  sand:     { bg: '#FDFAF5', primary: '#B45309', text: '#1C150A', textMuted: 'rgba(28,21,10,0.55)',    surface: 'rgba(0,0,0,0.04)'       },
  pista:    { bg: '#1A1108', primary: '#2D7A4F', text: '#F7F2E8', textMuted: 'rgba(247,242,232,0.55)', surface: 'rgba(255,255,255,0.06)' },
  gulaal:   { bg: '#1A1108', primary: '#E8342A', text: '#F7F2E8', textMuted: 'rgba(247,242,232,0.55)', surface: 'rgba(255,255,255,0.06)' },
  neel:     { bg: '#0B1420', primary: '#F5A800', text: '#F7F2E8', textMuted: 'rgba(247,242,232,0.55)', surface: 'rgba(255,255,255,0.06)' },
  turmeric: { bg: '#1A1108', primary: '#F5A800', text: '#F7F2E8', textMuted: 'rgba(247,242,232,0.55)', surface: 'rgba(255,255,255,0.06)' },
  steel:    { bg: '#14130E', primary: '#5B8DEF', text: '#E7E2D8', textMuted: 'rgba(231,226,216,0.55)', surface: 'rgba(255,255,255,0.06)' },
  sienna:   { bg: '#1A1108', primary: '#C04A00', text: '#F7F2E8', textMuted: 'rgba(247,242,232,0.55)', surface: 'rgba(255,255,255,0.06)' },
  indigo:   { bg: '#1A1108', primary: '#818CF8', text: '#F7F2E8', textMuted: 'rgba(247,242,232,0.55)', surface: 'rgba(255,255,255,0.06)' },
  aurora:      { bg: '#0F0B1A', primary: '#D946EF', text: '#f5eeff', textMuted: 'rgba(245,238,255,0.55)', surface: 'rgba(255,255,255,0.06)' },
  sage:        { bg: '#F4F7F2', primary: '#3D7F53', text: '#1a2e1d', textMuted: 'rgba(26,46,29,0.55)',    surface: 'rgba(0,0,0,0.04)'       },
  mint:        { bg: '#EFF9F6', primary: '#0C8B6B', text: '#0d2b24', textMuted: 'rgba(13,43,36,0.55)',    surface: 'rgba(0,0,0,0.04)'       },
  electric:    { bg: '#080C10', primary: '#00E5FF', text: '#E0FAFF', textMuted: 'rgba(224,250,255,0.55)', surface: 'rgba(255,255,255,0.06)' },
  velvet:      { bg: '#0C0508', primary: '#8B2340', text: '#F5E8EC', textMuted: 'rgba(245,232,236,0.55)', surface: 'rgba(255,255,255,0.06)' },
  nightforest: { bg: '#060E08', primary: '#7EC8A0', text: '#D4F5E2', textMuted: 'rgba(212,245,226,0.55)', surface: 'rgba(255,255,255,0.06)' },
  parchment:   { bg: '#F7F3E9', primary: '#4A3728', text: '#2E1F14', textMuted: 'rgba(46,31,20,0.55)',    surface: 'rgba(0,0,0,0.04)'       },
  gallery:     { bg: '#FAFAFA', primary: '#1A1A1A', text: '#0A0A0A', textMuted: 'rgba(10,10,10,0.55)',    surface: 'rgba(0,0,0,0.04)'       },
  terracotta:  { bg: '#FAF0E6', primary: '#C4552A', text: '#2C1A0E', textMuted: 'rgba(44,26,14,0.55)',    surface: 'rgba(0,0,0,0.04)'       },
}

// ---------------------------------------------------------------------------
// Background resolver
// ---------------------------------------------------------------------------

function resolveBackground(theme: ProfileTheme): string {
  const { bg } = THEME_PRESETS[theme.colorScheme]

  switch (theme.backgroundStyle) {
    case 'solid':
      return theme.solidColor ?? bg
    default:
      return bg
  }
}

// ---------------------------------------------------------------------------
// Font class resolver
// ---------------------------------------------------------------------------

const FONT_CLASSES: Record<ProfileTheme['fontFamily'], string> = {
  'inter':          'font-inter',
  'playfair':       'font-playfair',
  'space-grotesk':  'font-space-grotesk',
  'archivo-black':  'font-archivo-black',
}

// ---------------------------------------------------------------------------
// Creator type labels
// ---------------------------------------------------------------------------

const CREATOR_LABELS: Record<string, string> = {
  music_performance:   '🎵 Musician',
  comedy_open_mic:     '🎤 Comedian',
  art_design:          '🎨 Artist',
  workshops_teaching:  '📚 Educator',
  food_lifestyle:      '🍽️ Food Creator',
  content_creation:    '📹 Content Creator',
}

// ---------------------------------------------------------------------------
// Avatar shape styles
// ---------------------------------------------------------------------------

const AVATAR_RADIUS: Record<ProfileTheme['colorScheme'], string> = {
  default:  '50%',
  midnight: '50%',
  ocean:    '50%',
  forest:   '20px',
  blush:    '50%',
  sand:     '12px',
  pista:    '8px',
  gulaal:   '50%',
  neel:     '50%',
  turmeric: '8px',
  steel:    '4px',
  sienna:   '8px',
  indigo:   '50%',
  aurora:      '50%',
  sage:        '16px',
  mint:        '16px',
  electric:    '4px',
  velvet:      '8px',
  nightforest: '16px',
  parchment:   '12px',
  gallery:     '4px',
  terracotta:  '12px',
}

// ---------------------------------------------------------------------------
// ProfilePage
// ---------------------------------------------------------------------------

interface ProfilePageProps {
  profile: UserProfile
  blocks: PageBlock[]
  theme: ProfileTheme
  isPreview?: boolean
  highlightedBlockId?: string | null
}

export default function ProfilePage({
  profile,
  blocks,
  theme,
  isPreview = false,
  highlightedBlockId = null,
}: ProfilePageProps) {
  const tokens = THEME_PRESETS[theme.colorScheme]
  const background = resolveBackground(theme)
  const fontClass = FONT_CLASSES[theme.fontFamily]
  const avatarRadius = AVATAR_RADIUS[theme.colorScheme]

  const visibleBlocks = blocks.filter((b) => b.is_visible)

  return (
    <div
      className={`min-h-full w-full ${fontClass}`}
      style={{
        background,
        transition: 'background 300ms ease, color 300ms ease',
        // Expose as CSS variables so child components can consume them
        '--pp-bg':         tokens.bg,
        '--pp-primary':    tokens.primary,
        '--pp-text':       tokens.text,
        '--pp-text-muted': tokens.textMuted,
        '--pp-surface':    tokens.surface,
      } as React.CSSProperties}
    >
      {/*
       * Centring column — constrains content to phone-width on any viewport.
       * On the public /@username page this prevents the layout from stretching
       * edge-to-edge on wide screens. Inside the phone-frame preview the phone
       * is already 375 px wide so the max-width has no visual effect there.
       */}
      <div className="max-w-[430px] mx-auto w-full flex flex-col min-h-full">

        {/* Profile header */}
        <div className="flex flex-col items-center pt-10 pb-6 px-6">
          {/* Avatar */}
          <div
            className="relative mb-4 shrink-0"
            style={{
              width: 88,
              height: 88,
              borderRadius: avatarRadius,
              overflow: 'hidden',
              border: `3px solid ${tokens.primary}`,
              boxShadow: `0 0 0 3px ${tokens.bg}, 0 0 0 6px ${tokens.primary}40`,
            }}
          >
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.display_name}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-3xl font-bold"
                style={{ background: `${tokens.primary}30`, color: tokens.primary }}
              >
                {profile.display_name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Name */}
          <h1
            className="text-xl font-bold text-center leading-tight"
            style={{ color: tokens.text }}
          >
            {profile.display_name}
          </h1>

          {/* Username */}
          <p className="text-sm mt-0.5 font-medium" style={{ color: tokens.primary }}>
            @{profile.username}
          </p>

          {/* City + creator type */}
          <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
            <span
              className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{ background: `${tokens.primary}20`, color: tokens.primary }}
            >
              {CREATOR_LABELS[profile.creator_type] ?? profile.creator_type}
            </span>
            <span className="text-xs" style={{ color: tokens.textMuted }}>
              📍 {profile.city}
            </span>
          </div>

          {/* Bio */}
          {profile.bio && (
            <p
              className="text-sm mt-4 text-center leading-relaxed max-w-[280px]"
              style={{ color: tokens.textMuted }}
            >
              {profile.bio}
            </p>
          )}
        </div>

        {/* Divider */}
        <div
          className="mx-6 mb-6"
          style={{ height: 1, background: `${tokens.primary}20` }}
        />

        {/* Blocks */}
        <div className="px-5 pb-12 flex flex-col items-center gap-3">
          {visibleBlocks.length === 0 ? (
            <div className="text-center py-8 w-full" style={{ color: tokens.textMuted }}>
              <p className="text-sm">No blocks yet</p>
            </div>
          ) : (
            visibleBlocks.map((block) => (
              <BlockRenderer
                key={block.id}
                block={block}
                theme={theme}
                isPreview={isPreview}
                isHighlighted={highlightedBlockId === block.id}
              />
            ))
          )}
        </div>

        {/* Footer — pushed to bottom */}
        <div className="mt-auto pb-6 text-center">
          <p className="text-[10px] font-medium tracking-widest uppercase" style={{ color: tokens.textMuted }}>
            Made with WIMC
          </p>
        </div>

      </div>
    </div>
  )
}
