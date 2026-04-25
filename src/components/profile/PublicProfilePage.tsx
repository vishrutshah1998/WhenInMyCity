import Image from 'next/image'
import Link from 'next/link'
import type {
  UserProfile,
  PageBlock,
  Event,
} from '@/types/database'
import { CREATOR_CATEGORIES, EXPLORING_OPTION } from '@/lib/constants/categories'

export interface PublicTestimonial {
  rating:        number
  review:        string
  reviewer_name: string
}
import { ClickTracker } from './ClickTracker'
import type {
  SocialLinkConfig,
  YoutubeEmbedConfig,
  ImageGalleryConfig,
  CustomLinkConfig,
  TextBioConfig,
  InstagramEmbedConfig,
  QuoteBlockConfig,
  MarqueeTextConfig,
  StatsGridConfig,
} from '@/types/database'
import { type ProfileTheme, schemeToStyle, DEFAULT_PROFILE_THEME } from '@/types/theme'
import FollowButton from './FollowButton'

// Per-scheme aurora blob colours — 5 vivid, fully-saturated hues used with
// mix-blend-mode:screen for Luma-style additive color glow
const AURORA_COLORS: Record<ProfileTheme['colorScheme'], [string, string, string, string, string]> = {
  default:  ['#FF4500', '#FF1B6B', '#FF8C00', '#E8572A', '#FF6B9D'],
  midnight: ['#7C3AED', '#2563EB', '#06B6D4', '#A855F7', '#818CF8'],
  ocean:    ['#0EA5E9', '#06B6D4', '#7C3AED', '#38BDF8', '#22D3EE'],
  forest:   ['#10B981', '#059669', '#22D3EE', '#34D399', '#6EE7B7'],
  blush:    ['#E11D48', '#F43F5E', '#EC4899', '#FB7185', '#FF1B6B'],
  sand:     ['#D97706', '#F59E0B', '#EF4444', '#FBBF24', '#FF8C00'],
  pista:    ['#22C55E', '#16A34A', '#06B6D4', '#4ADE80', '#2D7A4F'],
  gulaal:   ['#E8342A', '#F97316', '#EF4444', '#FF1B6B', '#DC2626'],
  neel:     ['#F5A800', '#F59E0B', '#FB923C', '#FBBF24', '#FF6B2B'],
  turmeric: ['#F5A800', '#FB923C', '#FF6B2B', '#FBBF24', '#EF4444'],
  steel:    ['#F5A800', '#94A3B8', '#CBD5E1', '#FBBF24', '#64748B'],
  sienna:   ['#C04A00', '#FF6B2B', '#DC6B19', '#F97316', '#FF4500'],
  indigo:   ['#818CF8', '#6366F1', '#7C3AED', '#A5B4FC', '#4F46E5'],
}

// Per-scheme + combo pattern colours
const PATTERN_COMBO_COLORS: Record<NonNullable<ProfileTheme['patternColorCombo']>, Record<ProfileTheme['colorScheme'], string>> = {
  default: {
    default:  'rgba(232,87,42,0.18)',
    midnight: 'rgba(129,140,248,0.18)',
    ocean:    'rgba(34,211,238,0.18)',
    forest:   'rgba(110,231,183,0.18)',
    blush:    'rgba(225,29,72,0.14)',
    sand:     'rgba(180,83,9,0.14)',
    pista:    'rgba(45,122,79,0.20)',
    gulaal:   'rgba(232,52,42,0.20)',
    neel:     'rgba(245,168,0,0.20)',
    turmeric: 'rgba(245,168,0,0.20)',
    steel:    'rgba(245,168,0,0.18)',
    sienna:   'rgba(192,74,0,0.20)',
    indigo:   'rgba(129,140,248,0.18)',
  },
  warm: {
    default: 'rgba(220,120,60,0.18)', midnight: 'rgba(220,120,60,0.18)', ocean: 'rgba(220,120,60,0.18)',
    forest:  'rgba(220,120,60,0.18)', blush:    'rgba(220,100,50,0.14)', sand:  'rgba(180,100,30,0.14)',
    pista:   'rgba(220,120,60,0.18)', gulaal:   'rgba(220,120,60,0.18)', neel:  'rgba(220,120,60,0.18)',
    turmeric:'rgba(220,120,60,0.18)', steel:    'rgba(220,120,60,0.18)', sienna:'rgba(180,80,20,0.18)',
    indigo:  'rgba(220,120,60,0.18)',
  },
  cool: {
    default: 'rgba(60,180,220,0.18)', midnight: 'rgba(60,180,220,0.18)', ocean: 'rgba(34,211,238,0.22)',
    forest:  'rgba(60,180,220,0.18)', blush:    'rgba(60,130,200,0.14)', sand:  'rgba(60,140,200,0.14)',
    pista:   'rgba(60,180,220,0.18)', gulaal:   'rgba(60,180,220,0.18)', neel:  'rgba(60,180,220,0.18)',
    turmeric:'rgba(60,180,220,0.18)', steel:    'rgba(60,180,220,0.18)', sienna:'rgba(60,180,220,0.18)',
    indigo:  'rgba(100,110,240,0.22)',
  },
  mono: {
    default: 'rgba(255,255,255,0.10)', midnight: 'rgba(255,255,255,0.09)', ocean: 'rgba(255,255,255,0.10)',
    forest:  'rgba(255,255,255,0.10)', blush:    'rgba(0,0,0,0.08)',        sand:  'rgba(0,0,0,0.07)',
    pista:   'rgba(255,255,255,0.10)', gulaal:   'rgba(255,255,255,0.10)', neel:  'rgba(255,255,255,0.10)',
    turmeric:'rgba(255,255,255,0.10)', steel:    'rgba(255,255,255,0.10)', sienna:'rgba(255,255,255,0.10)',
    indigo:  'rgba(255,255,255,0.10)',
  },
}

function buildPatternUrl(style: NonNullable<ProfileTheme['patternStyle']>, color: string): string {
  const c = encodeURIComponent(color)
  switch (style) {
    case 'dots':
      return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Ccircle cx='10' cy='10' r='1.5' fill='${c}'/%3E%3C/svg%3E")`
    case 'grid':
      return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Cpath d='M20 0H0v20' fill='none' stroke='${c}' stroke-width='0.6'/%3E%3C/svg%3E")`
    case 'waves':
      // Single cubic that starts and ends at y=12 with matching tangents — tiles seamlessly
      return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='24'%3E%3Cpath d='M0 12 C25 2,75 22,100 12' fill='none' stroke='${c}' stroke-width='1'/%3E%3C/svg%3E")`
    case 'hex':
      // Pointy-top hex (R≈30) where every vertex lands on a tile boundary edge,
      // plus a stem connecting the hex bottom to the top of the next row's hex.
      // Tile 52×90 = R√3 × 3R — the mathematically correct repeat unit.
      return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='52' height='90'%3E%3Cpath d='M26,0 L52,15 L52,45 L26,60 L0,45 L0,15 Z M26,60 L26,90' fill='none' stroke='${c}' stroke-width='0.9'/%3E%3C/svg%3E")`
  }
}

const FONT_FAMILY_CLASS: Record<ProfileTheme['fontFamily'], string> = {
  'inter':          'font-inter',
  'playfair':       'font-playfair',
  'space-grotesk':  'font-space-grotesk',
  'archivo-black':  'font-archivo-black',
}

function hexToSpaceRgb(hex: string): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `${r} ${g} ${b}`
}

function buildThemeStyle(theme: ProfileTheme): React.CSSProperties {
  const cssVarProps = schemeToStyle(theme.colorScheme)

  let bgProps: React.CSSProperties = {}

  if (theme.backgroundStyle === 'solid') {
    if (theme.solidColor) {
      bgProps = { backgroundColor: theme.solidColor }
    }
  } else if (theme.backgroundStyle === 'pattern') {
    const patStyle = theme.patternStyle ?? 'dots'
    const comboKey = theme.patternColorCombo ?? 'default'
    const patColor = PATTERN_COMBO_COLORS[comboKey][theme.colorScheme]
    const patternUrl = buildPatternUrl(patStyle, patColor)
    const patSize: Record<NonNullable<ProfileTheme['patternStyle']>, string> = {
      dots: '20px 20px', grid: '20px 20px', waves: '100px 24px', hex: '52px 90px',
    }
    bgProps = { backgroundImage: patternUrl, backgroundSize: patSize[patStyle] }
  }

  // Card shadow — propagated to .card-surface descendants via CSS inheritance.
  // 'off' (Flat) intentionally sets nothing so blocks render with no shadow or border.
  const shadowVars: Record<string, string> = {}
  if (theme.dropShadow === 'natural') {
    shadowVars['--wimc-card-shadow'] = '0 0 4px 1px rgb(var(--color-on-background) / 0.12), 0 0 20px 3px rgb(var(--color-on-background) / 0.18)'
  } else if (theme.dropShadow === 'thicc') {
    shadowVars['--wimc-card-shadow'] = '4px 4px 0 rgb(var(--color-on-background))'
  }

  const fontColorVars: Record<string, string> = {}
  if (theme.fontColor) {
    const rgb = hexToSpaceRgb(theme.fontColor)
    fontColorVars['--color-on-surface']   = rgb
    fontColorVars['--color-on-background'] = rgb
  }

  return { ...cssVarProps, ...bgProps, ...(shadowVars as React.CSSProperties), ...(fontColorVars as React.CSSProperties) }
}

// Aurora background element (rendered inside page root for 'aurora' mode)
// All styles use vivid hues + mix-blend-mode:screen for Luma-style additive glow.
function AuroraBackground({ scheme, style: auroraStyle = 'nebula' }: { scheme: ProfileTheme['colorScheme'], style?: ProfileTheme['auroraStyle'] }) {
  const [c1, c2, c3, c4, c5] = AURORA_COLORS[scheme]

  // Shared blob style factory
  const blob = (
    color: string,
    w: string, h: string,
    top: string, left: string,
    anim: string,
    blur = 80,
    opacity = 0.80,
  ) => ({
    position: 'absolute' as const,
    borderRadius: '50%',
    filter: `blur(${blur}px)`,
    pointerEvents: 'none' as const,
    willChange: 'transform',
    mixBlendMode: 'screen' as const,
    width: w, height: h, top, left,
    opacity,
    background: `radial-gradient(circle at 40% 40%, ${color} 0%, transparent 68%)`,
    animation: anim,
  })

  if (auroraStyle === 'mesh') {
    // 6 vivid blobs on tight figure-8 paths — dense, fast colour weave
    return (
      <div aria-hidden="true" className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        <div style={blob(c1, '55%', '55%', '-15%',  '-10%', 'wimc-mesh-a 14s ease-in-out infinite', 70)} />
        <div style={blob(c2, '50%', '50%', '-10%',  '55%',  'wimc-mesh-b 18s ease-in-out infinite', 70)} />
        <div style={blob(c3, '45%', '45%',  '25%',  '15%',  'wimc-mesh-c 11s ease-in-out infinite', 65)} />
        <div style={blob(c4, '42%', '42%',  '50%',  '58%',  'wimc-mesh-d 15s ease-in-out infinite', 65)} />
        <div style={blob(c5, '48%', '48%',  '60%',  '-8%',  'wimc-mesh-e 20s ease-in-out infinite', 70)} />
        <div style={blob(c1, '40%', '40%',  '18%',  '72%',  'wimc-mesh-f 17s ease-in-out infinite', 60)} />
      </div>
    )
  }

  if (auroraStyle === 'rays') {
    // Vivid conic wheel slowly spinning — each arc is a saturated scheme colour
    return (
      <div aria-hidden="true" className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        <div style={{
          position: 'absolute',
          width: '200%', height: '200%',
          top: '-50%', left: '-50%',
          background: `conic-gradient(from 0deg at 50% 65%, ${c1}, ${c2}, ${c3}, ${c4}, ${c5}, ${c1}, ${c2}, ${c3})`,
          opacity: 0.55,
          filter: 'blur(50px)',
          animation: 'wimc-rays-spin 28s linear infinite',
          transformOrigin: '50% 50%',
          mixBlendMode: 'screen',
        }} />
        {/* Second counter-rotating layer for depth */}
        <div style={{
          position: 'absolute',
          width: '150%', height: '150%',
          top: '-25%', left: '-25%',
          background: `conic-gradient(from 180deg at 50% 65%, ${c3}, ${c5}, ${c1}, ${c4}, ${c2}, ${c3})`,
          opacity: 0.30,
          filter: 'blur(70px)',
          animation: 'wimc-rays-spin 44s linear infinite reverse',
          transformOrigin: '50% 50%',
          mixBlendMode: 'screen',
        }} />
      </div>
    )
  }

  if (auroraStyle === 'ripple') {
    // Concentric vivid rings pulsing outward from center
    const rings = [
      { color: c1, size: '150%', anim: 'wimc-ripple-a 5s ease-in-out infinite',       blur: 60 },
      { color: c3, size: '115%', anim: 'wimc-ripple-b 7s ease-in-out infinite 0.8s',  blur: 55 },
      { color: c2, size:  '85%', anim: 'wimc-ripple-c 9s ease-in-out infinite 1.6s',  blur: 50 },
      { color: c5, size:  '55%', anim: 'wimc-ripple-a 6s ease-in-out infinite 2.4s',  blur: 40 },
    ]
    return (
      <div aria-hidden="true" className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {rings.map((r, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: r.size, height: r.size,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${r.color} 0%, transparent 65%)`,
            filter: `blur(${r.blur}px)`,
            animation: r.anim,
            willChange: 'transform, opacity',
            mixBlendMode: 'screen',
            opacity: 0.80,
          }} />
        ))}
      </div>
    )
  }

  // Default: nebula — 5 vivid large drifting blobs, Luma-style
  return (
    <div aria-hidden="true" className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {/* Anchored blobs at corners + center for maximum coverage */}
      <div style={blob(c1, '85%', '85%', '-30%', '-25%', 'wimc-luma-a 22s ease-in-out infinite', 100, 0.82)} />
      <div style={blob(c2, '80%', '80%',  '45%',  '35%', 'wimc-luma-b 28s ease-in-out infinite', 100, 0.78)} />
      <div style={blob(c3, '70%', '70%', '-15%',  '50%', 'wimc-luma-c 18s ease-in-out infinite',  90, 0.72)} />
      <div style={blob(c4, '65%', '65%',  '40%', '-20%', 'wimc-luma-d 32s ease-in-out infinite',  90, 0.70)} />
      <div style={blob(c5, '55%', '55%',  '15%',  '20%', 'wimc-luma-e 25s ease-in-out infinite',  80, 0.65)} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Creator type labels + pill styles — derived from V2 category config
// ---------------------------------------------------------------------------

function contrastColor(hex: string): string {
  const n = parseInt(hex.replace('#', ''), 16)
  const lum = (0.299 * ((n >> 16) & 0xff) + 0.587 * ((n >> 8) & 0xff) + 0.114 * (n & 0xff)) / 255
  return lum > 0.55 ? '#1a1a1a' : '#ffffff'
}

type PillData = { emoji: string; label: string; background: string; color: string }

const CATEGORY_PILL_MAP: Record<string, PillData> = Object.fromEntries([
  ...CREATOR_CATEGORIES.map((c) => [
    c.id,
    { emoji: c.emoji, label: c.label, background: c.primaryColor, color: contrastColor(c.primaryColor) },
  ]),
  [
    EXPLORING_OPTION.id,
    { emoji: EXPLORING_OPTION.emoji, label: EXPLORING_OPTION.label, background: EXPLORING_OPTION.primaryColor, color: contrastColor(EXPLORING_OPTION.primaryColor) },
  ],
])

// ---------------------------------------------------------------------------
// Platform SVG icons (Phosphor-style filled paths, viewBox 0 0 256 256)
// ---------------------------------------------------------------------------

// viewBox="0 0 24 24" paths (some platforms use 24×24, others 256×256)
// We use two sets: 24px paths for the profile SVG icons (smaller, cleaner)
const SOCIAL_SVGS_24: Record<string, string> = {
  instagram: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z',
  youtube:   'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
  twitter:   'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z',
  tiktok:    'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z',
  spotify:   'M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z',
  linkedin:  'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  other:     'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatEventDate(startsAt: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    month:   'long',
    day:     'numeric',
    hour:    '2-digit',
    minute:  '2-digit',
    hour12:  true,
  }).format(new Date(startsAt))
}

function PlatformIcon({ platform }: { platform: string }) {
  const path = SOCIAL_SVGS_24[platform] ?? SOCIAL_SVGS_24.other
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6" aria-hidden>
      <path d={path} />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Block renderers
// ---------------------------------------------------------------------------

// Platform → URL builder for handle-style inputs
function buildSocialUrl(platform: string, value: string): string {
  if (!value) return '#'
  if (value.startsWith('http')) return value
  switch (platform) {
    case 'instagram': return `https://instagram.com/${value}`
    case 'twitter':   return `https://x.com/${value}`
    case 'youtube':   return `https://youtube.com/@${value}`
    case 'tiktok':    return `https://tiktok.com/@${value}`
    case 'linkedin':  return `https://linkedin.com/in/${value}`
    default:          return `https://${value}`
  }
}

function ProfileSocialLinks({ socialLinks }: { socialLinks: Record<string, string> }) {
  const entries = Object.entries(socialLinks).filter(([, v]) => v)
  if (entries.length === 0) return null
  return (
    <section className="w-full overflow-x-auto">
      <div className="flex justify-center gap-5 min-w-max mx-auto px-4">
        {entries.map(([platform, value]) => (
          <a
            key={platform}
            href={buildSocialUrl(platform, value)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={platform}
            className="h-14 w-14 flex items-center justify-center rounded-full bg-surface-container-highest text-on-surface hover:scale-110 hover:text-primary transition-all duration-200 active:scale-95 shrink-0"
          >
            <PlatformIcon platform={platform} />
          </a>
        ))}
      </div>
    </section>
  )
}

function SocialLinkButton({ block }: { block: PageBlock }) {
  const cfg = block.config as unknown as SocialLinkConfig
  if (!cfg.url && !cfg.title) return null
  const platform = cfg.platform ?? 'other'
  return (
    <section>
      <a
        href={cfg.url || '#'}
        target="_blank"
        rel="noopener noreferrer"
        className="card-surface group relative flex items-center w-full py-4 px-5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest transition-all duration-200 active:scale-[0.98]"
      >
        <PlatformIcon platform={platform} />
        <span className="flex-1 text-center font-semibold text-sm text-on-surface">
          {cfg.title || platform.charAt(0).toUpperCase() + platform.slice(1)}
        </span>
        <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors text-lg">
          open_in_new
        </span>
      </a>
    </section>
  )
}

function CustomLinkBlock({ block }: { block: PageBlock }) {
  const cfg = block.config as unknown as CustomLinkConfig
  if (!cfg.url && !cfg.title) return null
  return (
    <section>
      <a
        href={cfg.url || '#'}
        target="_blank"
        rel="noopener noreferrer"
        className="card-surface group relative flex items-center justify-center w-full py-4 px-8 rounded-xl bg-surface-container-high border-2 border-primary text-primary font-bold text-lg hover:bg-surface-container-highest transition-all duration-300 active:scale-[0.98]"
      >
        {cfg.description && (
          <span className="absolute left-6 text-sm font-normal text-on-surface-variant hidden sm:block">
            {cfg.description}
          </span>
        )}
        <span>{cfg.title || 'View'}</span>
        <span className="material-symbols-outlined absolute right-6 group-hover:translate-x-1 transition-transform text-xl">
          arrow_forward
        </span>
      </a>
    </section>
  )
}

function YoutubeBlock({ block }: { block: PageBlock }) {
  const cfg = block.config as unknown as YoutubeEmbedConfig
  if (!cfg.video_id) return null
  const thumb = `https://img.youtube.com/vi/${cfg.video_id}/maxresdefault.jpg`
  const url   = `https://www.youtube.com/watch?v=${cfg.video_id}`
  return (
    <section>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="card-surface relative aspect-video w-full overflow-hidden rounded-xl bg-surface-container-high group block"
      >
        <Image
          src={thumb}
          alt={cfg.title ?? 'YouTube video'}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white transition-transform group-hover:scale-110">
            <span
              className="material-symbols-outlined text-4xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              play_arrow
            </span>
          </div>
        </div>
        {cfg.title && (
          <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/60 to-transparent">
            <p className="text-white text-sm font-medium">{cfg.title}</p>
          </div>
        )}
      </a>
    </section>
  )
}

function ImageGalleryBlock({ block }: { block: PageBlock }) {
  const cfg = block.config as unknown as ImageGalleryConfig
  const images = cfg.images ?? []
  if (images.length === 0) return null

  const isCarousel = cfg.layout === 'carousel'

  return (
    <section className="card-surface bg-surface-container-high flex flex-col gap-4 rounded-2xl p-4">
      <h2 className="font-headline text-xl font-bold text-on-surface">Gallery</h2>

      {isCarousel ? (
        <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-hide">
          {images.map((img, i) => (
            <div
              key={i}
              className="snap-start shrink-0 w-56 aspect-[3/4] rounded-xl overflow-hidden relative shadow-md bg-surface-container-highest"
            >
              <Image
                src={img.url}
                alt={img.caption ?? ''}
                fill
                className="object-cover"
              />
              {img.caption && (
                <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-black/50 backdrop-blur-sm">
                  <p className="text-white text-[11px] font-medium truncate">{img.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {images.map((img, i) => (
            <div
              key={i}
              className="aspect-square rounded-xl overflow-hidden relative shadow-md bg-surface-container-highest"
            >
              <Image
                src={img.url}
                alt={img.caption ?? ''}
                fill
                className="object-cover"
              />
              {img.caption && (
                <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-black/50 backdrop-blur-sm">
                  <p className="text-white text-[11px] font-medium truncate">{img.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function TextBioBlock({ block }: { block: PageBlock }) {
  const cfg = block.config as unknown as TextBioConfig
  if (!cfg.body) return null
  return (
    <section className="card-surface bg-surface-container-high rounded-xl px-5 py-4">
      <p className="text-on-surface/80 text-sm sm:text-base leading-relaxed text-center">
        {cfg.body}
      </p>
    </section>
  )
}

// Instagram gradient as SVG data URI for the badge
const INSTAGRAM_GRADIENT_ICON = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='100%25' x2='100%25' y2='0%25'%3E%3Cstop offset='0%25' stop-color='%23f09433'/%3E%3Cstop offset='25%25' stop-color='%23e6683c'/%3E%3Cstop offset='50%25' stop-color='%23dc2743'/%3E%3Cstop offset='75%25' stop-color='%23cc2366'/%3E%3Cstop offset='100%25' stop-color='%23bc1888'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='24' height='24' rx='6' fill='url(%23g)'/%3E%3Cpath fill='white' d='M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z'/%3E%3C/svg%3E`

function InstagramBlock({ block, thumbnail }: { block: PageBlock; thumbnail?: string | null }) {
  const cfg = block.config as unknown as InstagramEmbedConfig
  if (!cfg.post_url) return null

  return (
    <section>
      <a
        href={cfg.post_url}
        target="_blank"
        rel="noopener noreferrer"
        className="card-surface group relative block w-full rounded-2xl overflow-hidden bg-surface-container-high"
      >
        {thumbnail ? (
          <div className="relative w-full aspect-square">
            <Image
              src={thumbnail}
              alt="Instagram post"
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/20" />
          </div>
        ) : (
          <div className="w-full aspect-square flex flex-col items-center justify-center gap-3 bg-surface-container-high">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={INSTAGRAM_GRADIENT_ICON} alt="" className="w-12 h-12" />
            <p className="text-sm font-semibold text-on-surface-variant">View on Instagram</p>
          </div>
        )}

        {/* Instagram badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={INSTAGRAM_GRADIENT_ICON} alt="Instagram" className="w-4 h-4 rounded-sm" />
          <span className="text-white text-[11px] font-semibold">Instagram</span>
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/20">
          <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
            <span className="text-white text-sm font-semibold">View post</span>
          </div>
        </div>
      </a>
    </section>
  )
}

function QuoteBlock({ block }: { block: PageBlock }) {
  const cfg = block.config as unknown as QuoteBlockConfig
  if (!cfg.text) return null
  return (
    <section className="card-surface bg-surface-container-high rounded-2xl px-6 py-8 flex flex-col items-center gap-3 text-center">
      <span className="material-symbols-outlined text-primary text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
        format_quote
      </span>
      <blockquote className="font-headline text-xl sm:text-2xl font-bold text-on-surface leading-snug italic">
        &ldquo;{cfg.text}&rdquo;
      </blockquote>
      {cfg.author && (
        <cite className="text-sm font-semibold text-on-surface-variant not-italic">
          — {cfg.author}
        </cite>
      )}
    </section>
  )
}

function MarqueeBlock({ block }: { block: PageBlock }) {
  const cfg = block.config as unknown as MarqueeTextConfig
  if (!cfg.text) return null

  const speed = cfg.speed ?? 'normal'
  const bg = cfg.bg ?? 'primary'
  const speedClass = speed === 'slow' ? 'marquee-slow' : speed === 'fast' ? 'marquee-fast' : 'marquee-normal'

  const bgColor: React.CSSProperties = bg === 'ink'
    ? { background: 'rgb(var(--color-surface-container-lowest))' }
    : bg === 'chalk'
    ? { background: 'rgb(var(--color-on-background))' }
    : { background: 'rgb(var(--color-primary))' }

  const textColor: React.CSSProperties = bg === 'chalk'
    ? { color: 'rgb(var(--color-background))' }
    : bg === 'ink'
    ? { color: 'rgb(var(--color-on-surface-variant))' }
    : { color: 'rgb(var(--color-on-primary))' }

  // Repeat text enough times to fill double the container width for seamless looping
  const repeated = `${cfg.text} · `.repeat(12)

  return (
    <section>
      <div
        className="card-surface w-full overflow-hidden py-3 rounded-xl"
        style={bgColor}
      >
        <div
          className={`whitespace-nowrap font-headline font-bold text-sm tracking-widest uppercase ${speedClass}`}
          style={textColor}
        >
          {repeated}{repeated}
        </div>
      </div>
    </section>
  )
}

function StatsGridBlock({ block }: { block: PageBlock }) {
  const cfg = block.config as unknown as StatsGridConfig
  if (!cfg.stats?.length) return null

  const colClass = cfg.stats.length <= 2 ? 'grid-cols-2' : cfg.stats.length === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'

  return (
    <section className="card-surface bg-surface-container-high rounded-2xl p-5">
      <div className={`grid ${colClass} gap-4`}>
        {cfg.stats.map((stat, i) => (
          <div key={i} className="flex flex-col items-center gap-1 text-center">
            <span className="font-headline text-3xl font-bold text-primary leading-none">{stat.value}</span>
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">{stat.label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function EventCard({ event }: { event: Event }) {
  const isFree   = event.ticket_price === 0
  const priceStr = isFree ? 'Free' : `₹${(event.ticket_price / 100).toLocaleString('en-IN')}`
  return (
    <div className="card-surface bg-surface-container-high rounded-2xl p-6 flex flex-col gap-5 border border-outline-variant/10">
      <div className="flex flex-col gap-2">
        <div className="inline-flex w-fit px-2 py-0.5 rounded bg-tertiary-container/20 text-tertiary text-[10px] font-bold uppercase tracking-widest">
          Upcoming Event
        </div>
        <h3 className="font-headline text-2xl font-bold text-on-surface leading-snug">
          {event.title}
        </h3>
        {event.description && (
          <p className="text-on-surface-variant text-sm leading-relaxed line-clamp-2">
            {event.description}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 text-on-surface-variant">
          <span className="material-symbols-outlined text-primary">calendar_today</span>
          <span className="text-sm font-medium" suppressHydrationWarning>{formatEventDate(event.starts_at)}</span>
        </div>
        <div className="flex items-center gap-3 text-on-surface-variant">
          <span className="material-symbols-outlined text-primary">map</span>
          <span className="text-sm font-medium">{event.venue_name}, {event.venue_address}</span>
        </div>
        <div className="flex items-center gap-3 text-on-surface-variant">
          <span className="material-symbols-outlined text-primary">confirmation_number</span>
          <span className="text-sm font-medium">{priceStr}</span>
        </div>
      </div>
      <a
        href={`/events/${event.slug}`}
        className="w-full block bg-primary text-on-primary py-3 rounded-xl font-bold text-center hover:opacity-90 active:scale-[0.98] transition-all"
      >
        {isFree ? 'RSVP Now' : 'Register Now'}
      </a>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface PublicProfilePageProps {
  profile:             UserProfile
  blocks:              PageBlock[]
  upcomingEvents:      Event[]
  instagramThumbnails?: Record<string, string>
  testimonials?:       PublicTestimonial[]
  theme?:              ProfileTheme
  isFollowing?:        boolean
  viewerIsExplorer?:   boolean
}

export default function PublicProfilePage({
  profile,
  blocks,
  upcomingEvents,
  instagramThumbnails = {},
  testimonials = [],
  theme,
  isFollowing = false,
  viewerIsExplorer = false,
}: PublicProfilePageProps) {
  const contentBlocks = blocks.filter((b) => b.is_visible)
  const profileSocial = (profile.social_links ?? {}) as Record<string, string>

  const pillData = CATEGORY_PILL_MAP[profile.creator_type]

  const resolvedTheme: ProfileTheme = theme ?? DEFAULT_PROFILE_THEME

  const fontClass = FONT_FAMILY_CLASS[resolvedTheme.fontFamily]
  const themeStyle = buildThemeStyle(resolvedTheme)

  return (
    <div
      className={`relative flex min-h-full w-full flex-col items-center bg-background text-on-background selection:bg-primary-container selection:text-white ${fontClass}`}
      style={themeStyle}
      data-glass={resolvedTheme.glassEffects ? 'true' : undefined}
      data-shadow={resolvedTheme.dropShadow || undefined}
      data-noise={resolvedTheme.noiseBg ? 'true' : undefined}
      data-heavy-borders={resolvedTheme.heavyBorders ? 'true' : undefined}
    >
      {resolvedTheme.backgroundStyle === 'aurora' && (
        <AuroraBackground scheme={resolvedTheme.colorScheme} style={resolvedTheme.auroraStyle} />
      )}
      <main className="w-full max-w-2xl px-4 py-8 flex flex-col gap-8 relative z-10">

        {/* ── Profile header ───────────────────────────────────────────── */}
        <header className="flex flex-col items-center text-center gap-4">

          {/* Avatar */}
          <div className="relative">
            <div className="h-28 w-28 rounded-full border-4 border-surface-container-high bg-surface-container-highest overflow-hidden relative">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.display_name}
                  fill
                  className="object-cover"
                  />  
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-primary bg-primary/10">
                  {profile.display_name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            {profile.is_verified && (
              <div className="absolute -bottom-1 -right-1 bg-tertiary-container text-on-tertiary-container p-1.5 rounded-full flex items-center justify-center shadow-md">
                <span
                  className="material-symbols-outlined text-base"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  verified
                </span>
              </div>
            )}
          </div>

          {/* Name */}
          <h1 className="font-headline text-4xl sm:text-5xl font-bold text-on-surface tracking-tight text-center">
            {profile.display_name}
          </h1>

          {/* City */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high text-on-surface-variant text-xs font-semibold">
            <span className="material-symbols-outlined text-sm">location_on</span>
            {profile.city}
          </span>

          {/* Category pill — colored per creator type */}
          {pillData && (
            <span
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold"
              style={{ background: pillData.background, color: pillData.color }}
            >
              {pillData.emoji} {pillData.label}
            </span>
          )}

          {/* Bio */}
          {profile.bio && (
            <p className="max-w-md text-on-surface/90 text-sm md:text-base leading-relaxed mt-1">
              {profile.bio}
            </p>
          )}

          {/* Follow button — only shown to authenticated explorers */}
          {viewerIsExplorer && (
            <FollowButton makerId={profile.id} initialIsFollowing={isFollowing} />
          )}
        </header>

        {/* ── Profile-level social links (inline icons) ────────────────── */}
        <ProfileSocialLinks socialLinks={profileSocial} />

        {/* ── Content blocks in position order ────────────────────────── */}
        {contentBlocks.map((block) => {
          // Blocks with external links or interactive embeds are wrapped in
          // ClickTracker so every tap is recorded in link_clicks.
          // Non-interactive blocks (text_bio, stats_grid, etc.) skip tracking.
          switch (block.block_type) {
            case 'social_link':
              return (
                <ClickTracker key={block.id} blockId={block.id} creatorId={profile.id}>
                  <SocialLinkButton block={block} />
                </ClickTracker>
              )
            case 'custom_link':
              return (
                <ClickTracker key={block.id} blockId={block.id} creatorId={profile.id}>
                  <CustomLinkBlock block={block} />
                </ClickTracker>
              )
            case 'youtube_embed':
              return (
                <ClickTracker key={block.id} blockId={block.id} creatorId={profile.id}>
                  <YoutubeBlock block={block} />
                </ClickTracker>
              )
            case 'instagram_embed': {
              const cfg = block.config as unknown as InstagramEmbedConfig
              return (
                <ClickTracker key={block.id} blockId={block.id} creatorId={profile.id}>
                  <InstagramBlock block={block} thumbnail={instagramThumbnails[cfg.post_url ?? '']} />
                </ClickTracker>
              )
            }
            case 'event_listing':
              return upcomingEvents.length > 0 ? (
                <ClickTracker key={block.id} blockId={block.id} creatorId={profile.id}>
                  <section className="flex flex-col gap-4">
                    {upcomingEvents.map((ev) => (
                      <EventCard key={ev.id} event={ev} />
                    ))}
                  </section>
                </ClickTracker>
              ) : null
            // Non-interactive blocks — no tracking needed
            case 'image_gallery':
              return <ImageGalleryBlock key={block.id} block={block} />
            case 'text_bio':
              return <TextBioBlock key={block.id} block={block} />
            case 'quote_block':
              return <QuoteBlock key={block.id} block={block} />
            case 'marquee_text':
              return <MarqueeBlock key={block.id} block={block} />
            case 'stats_grid':
              return <StatsGridBlock key={block.id} block={block} />
            case 'testimonial':
              return testimonials.length > 0 ? (
                <section key={block.id} className="flex flex-col gap-4">
                  <h3 className="font-headline font-bold text-lg text-on-surface px-1">What attendees say</h3>
                  {testimonials.slice(0, 3).map((t, i) => (
                    <div key={i} className="bg-surface-container-low rounded-xl p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                          {t.reviewer_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-sm text-on-surface">{t.reviewer_name}</span>
                        <div className="ml-auto flex">
                          {[1,2,3,4,5].map((s) => (
                            <span
                              key={s}
                              className="material-symbols-outlined text-sm"
                              style={{ fontVariationSettings: `'FILL' ${s <= t.rating ? 1 : 0}`, color: '#F59E0B' }}
                            >star</span>
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-on-surface-variant leading-relaxed italic">&ldquo;{t.review}&rdquo;</p>
                    </div>
                  ))}
                </section>
              ) : null
            default:
              return null
          }
        })}

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <footer className="flex flex-col items-center gap-4 pt-12 pb-8">
          <div className="flex items-center gap-2 grayscale opacity-50">
            <div className="h-6 w-6 rounded bg-on-background" />
            <span className="font-headline font-bold text-sm tracking-tighter">WIMC</span>
          </div>
          <Link
            href="/signin"
            className="text-on-surface-variant text-sm hover:text-primary transition-colors flex items-center gap-1"
          >
            Create your own page
            <span className="material-symbols-outlined text-sm">arrow_right_alt</span>
          </Link>
        </footer>

      </main>

      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
      />
      <style>{`.material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }`}</style>
    </div>
  )
}
