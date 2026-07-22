import React, { useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type {
  UserProfile,
  PageBlock,
  Event,
} from '@/types/database'
import type { MasteryNeighbourhood } from '@/app/actions/analytics'
import { CREATOR_CATEGORIES, EXPLORING_OPTION } from '@/lib/constants/categories'

export interface PublicTestimonial {
  rating:        number
  review:        string
  reviewer_name: string
}
import { ClickTracker } from './ClickTracker'
import { InstagramEmbedWidget } from './InstagramEmbedWidget'
import { InstagramFeedPreview } from './InstagramFeedPreview'
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
import PublicPageEmptyState from './PublicPageEmptyState'
import CreatorPostsSection from './CreatorPostsSection'
import type { CreatorPostWithReactions } from '@/app/actions/posts'
import CityMasteryMap from './CityMasteryMap'
import NewsletterSignupBlock from './NewsletterSignupBlock'
import SupportTipBlock from './SupportTipBlock'
import AnnouncementBlockClient from './AnnouncementBlock'
import WhatsAppCommunityBlock from './WhatsAppCommunityBlock'
import MusicPlayerBlock from './MusicPlayerBlock'
import BookingRequestBlock from './BookingRequestBlock'
import PressFeatureBlock from './PressFeatureBlock'
import TwitterEmbedBlock from './TwitterEmbedBlock'
import AwardsBadgesBlock from './AwardsBadgesBlock'
import DigitalProductBlock from './DigitalProductBlock'
import WaitlistBlock from './WaitlistBlock'
import FanMembershipBlock from './FanMembershipBlock'
import ShopTheLookBlock from './ShopTheLookBlock'
import type { SubstackPost } from '@/lib/validators/blocks'
import { WimcWordmark } from '@/components/WimcWordmark'

// ---------------------------------------------------------------------------
// Config shapes for new blocks (inlined to avoid extra imports)
// ---------------------------------------------------------------------------

interface SocialLinksRowConfig {
  links: Array<{ platform: string; url: string; label?: string }>
}
interface AnnouncementConfig {
  text: string; cta_label?: string; cta_url?: string
  show_countdown: boolean; countdown_target?: string
  background_style: 'primary' | 'dark' | 'accent'
}
interface SpotifyNowPlayingConfig {
  spotify_user_id: string; fallback_track_url?: string
  fallback_track_title?: string; fallback_track_artist?: string
}
interface NewsletterSignupConfig {
  label: string; placeholder: string; button_label: string; success_message: string
}
interface EventCalendarConfig { show_past_events: boolean; months_ahead: 1 | 2 | 3 }
interface EventSeriesConfig {
  series_name: string; description?: string
  frequency: 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'irregular'
  episode_count: number; cover_image_url?: string; linked_event_ids: string[]
}
interface PastEventsGalleryConfig {
  layout: 'grid' | 'list'; show_attendee_count: boolean
  show_recap: boolean; max_events: number
}
interface RsvpLinkConfig {
  url: string; label: string; description?: string
  emoji?: string; icon_emoji?: string; platform?: string
}
interface PodcastEpisodeConfig {
  platform: 'spotify' | 'apple_podcasts' | 'anchor' | 'direct'
  episode_url: string; episode_title?: string
  episode_duration?: string; artwork_url?: string; description?: string
}
interface SubstackPreviewConfig {
  publication_url: string; posts_count: 2 | 3; show_subscribe_button: boolean
}
interface CommunityStatsConfig {
  show_events_hosted: boolean; show_total_attendees: boolean
  show_average_rating: boolean; custom_label?: string
}
interface CreatorTypeBadgeConfig {
  creator_type: string; custom_label?: string; show_link_to_city_feed: boolean
}
interface CityCommunityConfig {
  city: string; neighbourhood?: string; show_city_feed_link: boolean
}
interface CollabInviteConfig {
  collab_types: Array<'co_host' | 'workshop_partner' | 'venue_takeover' | 'brand_collab'>
  availability_note: string; message: string
}
interface WhiteLabelEventConfig {
  partner_name: string; partner_logo_url?: string; event_title: string
  event_description?: string; event_date?: string; ticket_url?: string
}
interface SupportTipConfigStored {
  message: string; upi_vpa_encrypted: string
  preset_amounts_paise: number[]; thank_you_message: string
}
interface WhatsAppCommunityConfig {
  label: string; invite_url: string; member_count_label?: string
}
interface MusicPlayerConfig {
  platform: 'soundcloud' | 'bandcamp'; embed_url: string
  track_title?: string; artist?: string
}
interface BookingRequestConfig {
  label: string; description?: string; categories: string[]
  slots_total?: number; status_override?: 'open' | 'closed' | 'waitlist' | null
}
interface PressFeatureConfig {
  features: Array<{ outlet: string; url?: string; logo_url?: string }>
  heading?: string
}
interface TwitterEmbedConfig {
  tweet_url: string; handle?: string; caption?: string
}
interface AwardsBadgesConfig {
  badges: Array<{ label: string; icon_url?: string; year?: number }>
  heading?: string
}
interface DigitalProductConfig {
  title: string; description?: string; price_paise: number; file_url: string; cover_image_url?: string
}
interface WaitlistConfig {
  label: string; description?: string
}
interface FanMembershipConfig {
  tiers: Array<{ name: string; price_label: string; benefits: string[]; is_featured?: boolean }>
  heading?: string
}
interface ShopTheLookConfig {
  title?: string
  items: Array<{
    id: string; image_url: string; name: string
    link_type: 'external' | 'internal_product'
    external_url?: string; price_display?: string; internal_block_id?: string
  }>
}
type ShopTheLookProduct = { title: string; price_paise: number; cover_image_url?: string | null }

// ---------------------------------------------------------------------------
// Aurora, theme, pattern helpers (unchanged)
// ---------------------------------------------------------------------------

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
  steel:    ['#5B8DEF', '#94A3B8', '#CBD5E1', '#3B82F6', '#64748B'],
  sienna:   ['#C04A00', '#FF6B2B', '#DC6B19', '#F97316', '#FF4500'],
  indigo:   ['#818CF8', '#6366F1', '#7C3AED', '#A5B4FC', '#4F46E5'],
  aurora:   ['#D946EF', '#A21CAF', '#7C3AED', '#F0ABFC', '#EC4899'],
  sage:        ['#3D7F53', '#16A34A', '#65A30D', '#4ADE80', '#22C55E'],
  mint:        ['#0C8B6B', '#0D9488', '#059669', '#34D399', '#2DD4BF'],
  electric:    ['#00E5FF', '#22D3EE', '#38BDF8', '#67E8F9', '#06B6D4'],
  velvet:      ['#8B2340', '#BE185D', '#9D174D', '#DB2777', '#A21CAF'],
  nightforest: ['#7EC8A0', '#10B981', '#059669', '#34D399', '#6EE7B7'],
  parchment:   ['#8B6F47', '#A0522D', '#D2691E', '#CD853F', '#B8860B'],
  gallery:     ['#374151', '#4B5563', '#1F2937', '#6B7280', '#111827'],
  terracotta:  ['#C4552A', '#E07B39', '#D2691E', '#CD853F', '#B8522A'],
}

const PATTERN_COMBO_COLORS: Record<NonNullable<ProfileTheme['patternColorCombo']>, Record<ProfileTheme['colorScheme'], string>> = {
  default: {
    default:  'rgba(232,87,42,0.18)',  midnight: 'rgba(129,140,248,0.18)',
    ocean:    'rgba(34,211,238,0.18)', forest:   'rgba(110,231,183,0.18)',
    blush:    'rgba(225,29,72,0.14)',  sand:     'rgba(180,83,9,0.14)',
    pista:    'rgba(45,122,79,0.20)',  gulaal:   'rgba(232,52,42,0.20)',
    neel:     'rgba(245,168,0,0.20)',  turmeric: 'rgba(245,168,0,0.20)',
    steel:    'rgba(91,141,239,0.18)', sienna:   'rgba(192,74,0,0.20)',
    indigo:   'rgba(129,140,248,0.18)',
    aurora:      'rgba(217,70,239,0.20)',  sage:        'rgba(61,127,83,0.18)',
    mint:        'rgba(12,139,107,0.18)',  electric:    'rgba(0,229,255,0.22)',
    velvet:      'rgba(139,35,64,0.22)',   nightforest: 'rgba(126,200,160,0.20)',
    parchment:   'rgba(74,55,40,0.14)',    gallery:     'rgba(26,26,26,0.10)',
    terracotta:  'rgba(196,85,42,0.18)',
  },
  warm: {
    default: 'rgba(220,120,60,0.18)', midnight: 'rgba(220,120,60,0.18)', ocean: 'rgba(220,120,60,0.18)',
    forest:  'rgba(220,120,60,0.18)', blush:    'rgba(220,100,50,0.14)', sand:  'rgba(180,100,30,0.14)',
    pista:   'rgba(220,120,60,0.18)', gulaal:   'rgba(220,120,60,0.18)', neel:  'rgba(220,120,60,0.18)',
    turmeric:'rgba(220,120,60,0.18)', steel:    'rgba(220,120,60,0.18)', sienna:'rgba(180,80,20,0.18)',
    indigo:  'rgba(220,120,60,0.18)', aurora:   'rgba(220,120,60,0.18)', sage:  'rgba(180,100,30,0.14)',
    mint:        'rgba(180,100,30,0.14)', electric:    'rgba(220,120,60,0.18)',
    velvet:      'rgba(180,80,30,0.18)',   nightforest: 'rgba(180,120,60,0.18)',
    parchment:   'rgba(160,100,40,0.14)', gallery:     'rgba(180,100,30,0.10)',
    terracotta:  'rgba(180,80,20,0.18)',
  },
  cool: {
    default: 'rgba(60,180,220,0.18)', midnight: 'rgba(60,180,220,0.18)', ocean: 'rgba(34,211,238,0.22)',
    forest:  'rgba(60,180,220,0.18)', blush:    'rgba(60,130,200,0.14)', sand:  'rgba(60,140,200,0.14)',
    pista:   'rgba(60,180,220,0.18)', gulaal:   'rgba(60,180,220,0.18)', neel:  'rgba(60,180,220,0.18)',
    turmeric:'rgba(60,180,220,0.18)', steel:    'rgba(60,180,220,0.18)', sienna:'rgba(60,180,220,0.18)',
    indigo:  'rgba(100,110,240,0.22)', aurora:  'rgba(150,60,220,0.22)', sage:  'rgba(60,140,200,0.14)',
    mint:        'rgba(12,139,107,0.22)',  electric:    'rgba(0,229,255,0.25)',
    velvet:      'rgba(60,130,200,0.18)',  nightforest: 'rgba(60,180,150,0.20)',
    parchment:   'rgba(60,130,180,0.14)', gallery:     'rgba(60,140,200,0.12)',
    terracotta:  'rgba(60,150,200,0.18)',
  },
  mono: {
    default: 'rgba(255,255,255,0.10)', midnight: 'rgba(255,255,255,0.09)', ocean: 'rgba(255,255,255,0.10)',
    forest:  'rgba(255,255,255,0.10)', blush:    'rgba(0,0,0,0.08)',       sand:  'rgba(0,0,0,0.07)',
    pista:   'rgba(255,255,255,0.10)', gulaal:   'rgba(255,255,255,0.10)', neel:  'rgba(255,255,255,0.10)',
    turmeric:'rgba(255,255,255,0.10)', steel:    'rgba(255,255,255,0.10)', sienna:'rgba(255,255,255,0.10)',
    indigo:  'rgba(255,255,255,0.10)', aurora:   'rgba(255,255,255,0.10)', sage:  'rgba(0,0,0,0.07)',
    mint:        'rgba(0,0,0,0.07)',       electric:    'rgba(255,255,255,0.12)',
    velvet:      'rgba(255,255,255,0.10)', nightforest: 'rgba(255,255,255,0.10)',
    parchment:   'rgba(0,0,0,0.07)',       gallery:     'rgba(0,0,0,0.07)',
    terracotta:  'rgba(0,0,0,0.07)',
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
      return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='24'%3E%3Cpath d='M0 12 C25 2,75 22,100 12' fill='none' stroke='${c}' stroke-width='1'/%3E%3C/svg%3E")`
    case 'hex':
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

function AuroraBackground({ scheme, style: auroraStyle = 'nebula' }: { scheme: ProfileTheme['colorScheme'], style?: ProfileTheme['auroraStyle'] }) {
  const [c1, c2, c3, c4, c5] = AURORA_COLORS[scheme]

  const blob = (
    color: string, w: string, h: string, top: string, left: string,
    anim: string, blur = 80, opacity = 0.80,
  ) => ({
    position: 'absolute' as const, borderRadius: '50%', filter: `blur(${blur}px)`,
    pointerEvents: 'none' as const, willChange: 'transform', mixBlendMode: 'screen' as const,
    width: w, height: h, top, left, opacity,
    background: `radial-gradient(circle at 40% 40%, ${color} 0%, transparent 68%)`,
    animation: anim,
  })

  if (auroraStyle === 'mesh') {
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
    return (
      <div aria-hidden="true" className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        <div style={{
          position: 'absolute', width: '200%', height: '200%', top: '-50%', left: '-50%',
          background: `conic-gradient(from 0deg at 50% 65%, ${c1}, ${c2}, ${c3}, ${c4}, ${c5}, ${c1}, ${c2}, ${c3})`,
          opacity: 0.55, filter: 'blur(50px)', animation: 'wimc-rays-spin 28s linear infinite',
          transformOrigin: '50% 50%', mixBlendMode: 'screen',
        }} />
        <div style={{
          position: 'absolute', width: '150%', height: '150%', top: '-25%', left: '-25%',
          background: `conic-gradient(from 180deg at 50% 65%, ${c3}, ${c5}, ${c1}, ${c4}, ${c2}, ${c3})`,
          opacity: 0.30, filter: 'blur(70px)', animation: 'wimc-rays-spin 44s linear infinite reverse',
          transformOrigin: '50% 50%', mixBlendMode: 'screen',
        }} />
      </div>
    )
  }

  if (auroraStyle === 'ripple') {
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
            position: 'absolute', width: r.size, height: r.size, borderRadius: '50%',
            background: `radial-gradient(circle, ${r.color} 0%, transparent 65%)`,
            filter: `blur(${r.blur}px)`, animation: r.anim, willChange: 'transform, opacity',
            mixBlendMode: 'screen', opacity: 0.80,
          }} />
        ))}
      </div>
    )
  }

  return (
    <div aria-hidden="true" className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      <div style={blob(c1, '85%', '85%', '-30%', '-25%', 'wimc-luma-a 22s ease-in-out infinite', 100, 0.82)} />
      <div style={blob(c2, '80%', '80%',  '45%',  '35%', 'wimc-luma-b 28s ease-in-out infinite', 100, 0.78)} />
      <div style={blob(c3, '70%', '70%', '-15%',  '50%', 'wimc-luma-c 18s ease-in-out infinite',  90, 0.72)} />
      <div style={blob(c4, '65%', '65%',  '40%', '-20%', 'wimc-luma-d 32s ease-in-out infinite',  90, 0.70)} />
      <div style={blob(c5, '55%', '55%',  '15%',  '20%', 'wimc-luma-e 25s ease-in-out infinite',  80, 0.65)} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Creator type labels + pill styles
// ---------------------------------------------------------------------------

export function contrastColor(hex: string): string {
  const n = parseInt(hex.replace('#', ''), 16)
  const lum = (0.299 * ((n >> 16) & 0xff) + 0.587 * ((n >> 8) & 0xff) + 0.114 * (n & 0xff)) / 255
  return lum > 0.55 ? '#1a1a1a' : '#ffffff'
}

export type PillData = { emoji: string; label: string; background: string; color: string }

export const CATEGORY_PILL_MAP: Record<string, PillData> = Object.fromEntries([
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
// Platform SVG icons
// ---------------------------------------------------------------------------

const SOCIAL_SVGS_24: Record<string, string> = {
  instagram: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z',
  youtube:   'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
  twitter:   'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z',
  tiktok:    'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z',
  spotify:   'M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z',
  apple_music: 'M23.994 6.124a9.23 9.23 0 00-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043a5.022 5.022 0 00-1.877-.726a10.496 10.496 0 00-1.564-.15c-.04-.003-.083-.01-.124-.013H5.986c-.152.01-.303.017-.455.026-.747.043-1.49.123-2.193.4-1.336.53-2.3 1.452-2.865 2.78-.192.448-.292.925-.363 1.408-.056.392-.088.785-.1 1.18 0 .032-.007.062-.01.093v12.223c.01.14.017.283.027.424.05.815.154 1.624.497 2.373.65 1.42 1.738 2.353 3.234 2.801.42.127.856.187 1.293.228.555.053 1.11.06 1.667.06h11.03a12.5 12.5 0 001.57-.1c.822-.106 1.596-.35 2.295-.81a5.046 5.046 0 001.88-2.207c.186-.42.293-.87.37-1.324.113-.675.138-1.358.137-2.04-.002-3.8 0-7.595-.003-11.393zm-6.423 3.99v5.712c0 .417-.058.827-.244 1.206-.29.59-.76.962-1.388 1.14-.35.1-.706.157-1.07.173-.95.045-1.773-.6-1.943-1.536a1.88 1.88 0 011.038-2.022c.323-.16.67-.25 1.018-.324.378-.082.758-.153 1.134-.24.274-.063.457-.23.51-.516a.904.904 0 00.02-.193c0-1.815 0-3.63-.002-5.443a.725.725 0 00-.026-.185c-.04-.15-.15-.243-.304-.234-.16.01-.318.035-.475.066-.76.15-1.52.303-2.28.456l-2.325.47-1.374.278c-.016.003-.032.01-.048.013-.277.077-.377.203-.39.49-.002.042 0 .086 0 .13-.002 2.602 0 5.204-.003 7.805 0 .42-.047.836-.215 1.227-.278.64-.77 1.04-1.434 1.233-.35.1-.71.16-1.075.172-.96.036-1.755-.6-1.92-1.544-.14-.812.23-1.685 1.154-2.075.357-.15.73-.232 1.108-.31.287-.06.575-.116.86-.177.383-.083.583-.323.6-.714v-.15c0-2.96 0-5.922.002-8.882 0-.123.013-.25.042-.37.07-.285.273-.448.546-.518.255-.066.515-.112.774-.165.733-.15 1.466-.296 2.2-.444l2.27-.46c.67-.134 1.34-.27 2.01-.403.22-.043.442-.088.663-.106.31-.025.523.17.554.482.008.073.012.148.012.223.002 1.91.002 3.822 0 5.732z',
  youtube_music: 'M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm0 19.104c-3.924 0-7.104-3.18-7.104-7.104S8.076 4.896 12 4.896s7.104 3.18 7.104 7.104-3.18 7.104-7.104 7.104zm0-13.332c-3.432 0-6.228 2.796-6.228 6.228S8.568 18.228 12 18.228s6.228-2.796 6.228-6.228S15.432 5.772 12 5.772zM9.684 15.54V8.46L15.816 12l-6.132 3.54z',
  linkedin:  'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  other:     'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatEventDate(startsAt: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'long', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  }).format(new Date(startsAt))
}

function formatShortDate(startsAt: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    month: 'short', day: 'numeric', year: 'numeric',
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
// Block renderers — original set
// ---------------------------------------------------------------------------

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
            target="_blank" rel="noopener noreferrer" aria-label={platform}
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
        href={cfg.url || '#'} target="_blank" rel="noopener noreferrer"
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
        href={cfg.url || '#'} target="_blank" rel="noopener noreferrer"
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
        href={url} target="_blank" rel="noopener noreferrer"
        className="card-surface relative aspect-video w-full overflow-hidden rounded-xl bg-surface-container-high group block"
      >
        <Image src={thumb} alt={cfg.title ?? 'YouTube video'} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white transition-transform group-hover:scale-110">
            <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
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
            <div key={i} className="snap-start shrink-0 w-56 aspect-[3/4] rounded-xl overflow-hidden relative shadow-md bg-surface-container-highest">
              <Image src={img.url} alt={img.caption ?? ''} fill className="object-cover" />
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
            <div key={i} className="aspect-square rounded-xl overflow-hidden relative shadow-md bg-surface-container-highest">
              <Image src={img.url} alt={img.caption ?? ''} fill className="object-cover" />
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
      <p className="text-on-surface/80 text-sm sm:text-base leading-relaxed text-center">{cfg.body}</p>
    </section>
  )
}

function InstagramBlock({ block }: { block: PageBlock }) {
  const cfg = block.config as unknown as InstagramEmbedConfig
  if (!cfg.post_url) return null
  return (
    <section className="w-full flex justify-center">
      <InstagramEmbedWidget postUrl={cfg.post_url} />
    </section>
  )
}

function InstagramFeedBlock({ block }: { block: PageBlock }) {
  // Self-fetching (via InstagramFeedPreview) rather than prop-threaded: it only
  // ever reads the cache populated by the creator's own on-demand refresh
  // (ProfileForm/getInstagramFeedStatus), never a live Meta call, so this is
  // safe to call from every render surface — public page and all three Studio
  // preview surfaces (CreatorPhonePreview, PreviewPanel desktop, StudioShell
  // mobile fallback) alike — without threading extra props through each one.
  return <InstagramFeedPreview profileId={block.profile_id} />
}

function QuoteBlock({ block }: { block: PageBlock }) {
  const cfg = block.config as unknown as QuoteBlockConfig
  if (!cfg.text) return null
  return (
    <section className="card-surface bg-surface-container-high rounded-2xl px-6 py-8 flex flex-col items-center gap-3 text-center">
      <span className="material-symbols-outlined text-primary text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>format_quote</span>
      <blockquote className="font-headline text-xl sm:text-2xl font-bold text-on-surface leading-snug italic">
        &ldquo;{cfg.text}&rdquo;
      </blockquote>
      {cfg.author && (
        <cite className="text-sm font-semibold text-on-surface-variant not-italic">— {cfg.author}</cite>
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
  const repeated = `${cfg.text} · `.repeat(12)
  return (
    <section>
      <div className="card-surface w-full overflow-hidden py-3 rounded-xl" style={bgColor}>
        <div className={`whitespace-nowrap font-headline font-bold text-sm tracking-widest uppercase ${speedClass}`} style={textColor}>
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

type LayoutPresetId = 'boarding-pass' | 'poster' | 'editorial' | 'minimal' | 'reel' | 'corporate' | 'stage' | 'zine'

function EventCard({ event, layout = 'boarding-pass', discoverySource }: { event: Event; layout?: LayoutPresetId; discoverySource: 'creator_link' | 'platform_discovery' }) {
  const isFree   = event.ticket_price === 0
  const priceStr = isFree ? 'FREE' : `₹${(event.ticket_price / 100).toLocaleString('en-IN')}`

  if (layout === 'poster') {
    return (
      <Link href={`/events/${event.slug}?src=${discoverySource}`}>
        <div
          className="relative border-l-4 border-primary bg-surface-container-high p-4 hover:bg-surface-container-highest transition-colors group"
          style={{ boxShadow: 'var(--wimc-card-shadow, none)' }}
        >
          <div className="flex justify-between items-start gap-3">
            <h3 className="font-display font-black text-xl text-on-surface uppercase leading-tight">
              {event.title}
            </h3>
            <span className="font-mono text-xs font-bold text-primary shrink-0 mt-0.5">{priceStr}</span>
          </div>
          <p className="font-mono text-[11px] text-on-surface/50 mt-1.5">
            {event.venue_name} · <span suppressHydrationWarning>{formatShortDate(event.starts_at)}</span>
          </p>
          <span className="absolute right-4 bottom-4 text-on-surface/20 group-hover:text-primary transition-colors text-sm">→</span>
        </div>
      </Link>
    )
  }

  if (layout === 'editorial') {
    return (
      <Link
        href={`/events/${event.slug}?src=${discoverySource}`}
        className="group flex items-baseline gap-4 py-3 hover:opacity-70 transition-opacity"
      >
        <span className="font-mono text-[10px] text-on-surface/40 shrink-0 w-10 tabular-nums">
          {new Date(event.starts_at).getDate()}/{new Date(event.starts_at).getMonth() + 1}
        </span>
        <span className="flex-1 font-display font-bold text-sm text-on-surface group-hover:text-primary transition-colors leading-snug">
          {event.title}
        </span>
        <span className="font-mono text-[10px] font-bold text-primary shrink-0">{priceStr}</span>
      </Link>
    )
  }

  if (layout === 'minimal') {
    return (
      <Link href={`/events/${event.slug}?src=${discoverySource}`}>
        <div className="card-surface rounded-2xl bg-surface-container-high hover:bg-surface-container-highest transition-colors p-4 group">
          <h3 className="font-semibold text-on-surface text-sm leading-snug">{event.title}</h3>
          <p className="text-xs text-on-surface/50 mt-1">
            {event.venue_name} · <span suppressHydrationWarning>{formatShortDate(event.starts_at)}</span>
          </p>
          <div className="flex justify-between items-center mt-3">
            <span className="text-sm font-bold text-primary">{priceStr}</span>
            <span className="text-xs text-on-surface/30 group-hover:text-primary transition-colors">Get tickets →</span>
          </div>
        </div>
      </Link>
    )
  }

  if (layout === 'reel') {
    return (
      <Link href={`/events/${event.slug}?src=${discoverySource}`}>
        <div className="card-surface rounded-2xl overflow-hidden group">
          <div className="h-1 w-full" style={{ background: 'rgb(var(--color-primary))' }} />
          <div className="p-4 bg-surface-container-high hover:bg-surface-container-highest transition-colors">
            <div className="flex justify-between items-start gap-3">
              <h3 className="font-bold text-base text-on-surface leading-snug">{event.title}</h3>
              <span className="shrink-0 font-bold text-sm text-primary">{priceStr}</span>
            </div>
            <p className="text-xs text-on-surface/50 mt-1">{event.venue_name}</p>
            <div className="flex items-center justify-between mt-3">
              <span className="font-mono text-[11px] text-on-surface/35" suppressHydrationWarning>
                {formatShortDate(event.starts_at)}
              </span>
              <span className="text-xs bg-primary text-on-primary px-3 py-1 rounded-full font-semibold group-hover:opacity-80 transition-opacity">
                Get in →
              </span>
            </div>
          </div>
        </div>
      </Link>
    )
  }

  if (layout === 'corporate') {
    const d = new Date(event.starts_at)
    const day = d.getDate()
    const month = d.toLocaleString('en-IN', { month: 'short' }).toUpperCase()
    return (
      <Link href={`/events/${event.slug}?src=${discoverySource}`}>
        <div className="flex items-center gap-4 py-3.5 px-4 hover:bg-surface-container-high transition-colors group">
          {/* Date column */}
          <div className="shrink-0 text-center w-9">
            <div className="text-xl font-black text-primary leading-none" suppressHydrationWarning>{day}</div>
            <div className="text-[9px] font-mono text-on-surface/40 uppercase tracking-wider" suppressHydrationWarning>{month}</div>
          </div>
          <div className="w-px h-8 bg-on-surface/8 shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-on-surface leading-snug truncate">{event.title}</h3>
            <p className="text-xs text-on-surface/45 mt-0.5 truncate">{event.venue_name}</p>
          </div>
          <div className="shrink-0 flex items-center gap-1.5">
            <span className="text-sm font-bold text-primary">{priceStr}</span>
            <span className="material-symbols-outlined text-lg text-on-surface/20 group-hover:text-primary transition-colors">chevron_right</span>
          </div>
        </div>
      </Link>
    )
  }

  if (layout === 'stage') {
    return (
      <Link href={`/events/${event.slug}?src=${discoverySource}`}>
        <div className="flex flex-col items-center gap-0.5 py-4 px-5 hover:bg-surface-container-high transition-colors group">
          <span className="font-mono text-[9px] text-on-surface/35 uppercase tracking-[0.15em]" suppressHydrationWarning>
            {formatShortDate(event.starts_at)}
          </span>
          <h3 className="font-display font-bold text-lg text-on-surface text-center leading-tight group-hover:text-primary transition-colors">
            {event.title}
          </h3>
          <p className="text-xs text-on-surface/45 text-center">{event.venue_name}</p>
          <span className="mt-1.5 font-mono text-xs text-primary font-bold">{priceStr}</span>
        </div>
      </Link>
    )
  }

  if (layout === 'zine') {
    return (
      <Link href={`/events/${event.slug}?src=${discoverySource}`}>
        <div
          className="py-3 px-4 bg-surface-container-high hover:bg-surface-container-highest transition-colors group"
          style={{
            borderLeft: '3px solid rgb(var(--color-primary))',
            borderRadius: 0,
            boxShadow: 'var(--wimc-card-shadow, none)',
          }}
        >
          <div className="flex justify-between items-baseline gap-3">
            <h3 className="font-display font-black text-base text-on-surface uppercase leading-tight">
              {event.title}
            </h3>
            <span className="font-mono text-xs font-bold text-primary shrink-0">{priceStr}</span>
          </div>
          <p className="font-mono text-[10px] text-on-surface/35 mt-1 uppercase tracking-wider" suppressHydrationWarning>
            {event.venue_name} · {formatShortDate(event.starts_at)}
          </p>
        </div>
      </Link>
    )
  }

  // Default: boarding-pass — original ticket stub
  return (
    <Link href={`/events/${event.slug}?src=${discoverySource}`}>
      <div
        className="card-surface relative bg-[#FAF7F0] border-2 border-dashed border-outline-variant flex overflow-hidden group"
        style={{ ['--color-on-surface' as string]: '26 17 8', ['--color-on-surface-variant' as string]: '90 65 55' }}
      >
        {/* Left accent bar */}
        <div className="w-1 bg-primary flex-shrink-0" />

        {/* Ticket content */}
        <div className="flex-1 p-4">
          {/* Ticket meta header */}
          <div className="flex justify-between items-center mb-2">
            <span className="font-mono text-[9px] text-on-surface/50 uppercase tracking-[0.15em]">
              TKT-{event.id.slice(-4).toUpperCase()} · WHEN IN MY CITY
            </span>
            <span className="font-mono text-[9px] text-on-surface/50">
              CULTURE PASS
            </span>
          </div>

          {/* Dashed separator */}
          <div className="border-t border-dashed border-outline-variant/30 mb-2" />

          {/* Title + meta + ADMIT ONE badge */}
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-black text-[20px] text-on-surface uppercase leading-tight">
                {event.title}
              </h3>
              <p className="font-mono text-[11px] text-on-surface/50 mt-1 truncate">
                {event.venue_name} · <span suppressHydrationWarning>{formatShortDate(event.starts_at)}</span>
              </p>
            </div>
            <span className="font-mono text-[9px] bg-[#07070A] text-[#FAF7F0] px-2 py-1 flex-shrink-0 self-start whitespace-nowrap">
              ADMIT ONE
            </span>
          </div>

          {/* Perforation + barcode stub */}
          <div className="border-t border-dashed border-outline-variant/30 mt-3 pt-2 flex justify-between items-center">
            {/* Barcode dots */}
            <div className="flex gap-[2px] items-end">
              {Array.from({ length: 18 }, (_, i) => (
                <div
                  key={i}
                  className="bg-on-surface/20"
                  style={{
                    width: 2,
                    height: [6, 10, 8, 12, 6, 14, 8, 10, 6, 12, 8, 10, 6, 14, 8, 10, 6, 8][i],
                  }}
                />
              ))}
            </div>
            <span className="font-mono text-[10px] text-primary uppercase group-hover:text-on-surface transition-colors">
              {priceStr} →
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Block renderers — new blocks
// ---------------------------------------------------------------------------

function SocialLinksRowBlock({ block }: { block: PageBlock }) {
  const cfg = block.config as unknown as SocialLinksRowConfig
  const links = cfg.links ?? []
  if (links.length === 0) return null
  return (
    <section>
      <div className="flex flex-wrap justify-center gap-3">
        {links.map((link, i) => (
          <a
            key={i}
            href={link.url}
            target="_blank" rel="noopener noreferrer"
            aria-label={link.label ?? link.platform}
            className="h-12 w-12 flex items-center justify-center rounded-full bg-surface-container-high text-on-surface hover:scale-110 hover:text-primary transition-all duration-200 active:scale-95"
          >
            <PlatformIcon platform={link.platform} />
          </a>
        ))}
      </div>
    </section>
  )
}

function RsvpLinkBlock({ block }: { block: PageBlock }) {
  const cfg = block.config as unknown as RsvpLinkConfig
  if (!cfg.url) return null
  return (
    <section>
      <a
        href={cfg.url} target="_blank" rel="noopener noreferrer"
        className="card-surface group flex items-center gap-4 w-full py-4 px-5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest transition-all duration-200 active:scale-[0.98]"
      >
        <span className="text-2xl shrink-0">{cfg.emoji ?? cfg.icon_emoji ?? '🎟'}</span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-on-surface truncate">{cfg.label}</p>
          {cfg.description && (
            <p className="text-xs text-on-surface-variant truncate">{cfg.description}</p>
          )}
        </div>
        <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors text-lg shrink-0">
          open_in_new
        </span>
      </a>
    </section>
  )
}

function SpotifyNowPlayingBlock({ block }: { block: PageBlock }) {
  const cfg = block.config as unknown as SpotifyNowPlayingConfig
  const spotifyGreen = '#1DB954'

  if (cfg.fallback_track_title && cfg.fallback_track_url) {
    return (
      <section>
        <a
          href={cfg.fallback_track_url} target="_blank" rel="noopener noreferrer"
          className="card-surface group flex items-center gap-4 w-full p-4 rounded-xl bg-surface-container-high hover:bg-surface-container-highest transition-all active:scale-[0.98]"
        >
          <div className="w-12 h-12 rounded-lg shrink-0 flex items-center justify-center" style={{ background: spotifyGreen }}>
            <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6"><path d={SOCIAL_SVGS_24.spotify} /></svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: spotifyGreen }}>Listening to</p>
            <p className="font-bold text-sm text-on-surface truncate">{cfg.fallback_track_title}</p>
            {cfg.fallback_track_artist && (
              <p className="text-xs text-on-surface-variant truncate">{cfg.fallback_track_artist}</p>
            )}
          </div>
          <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors text-lg shrink-0">
            open_in_new
          </span>
        </a>
      </section>
    )
  }

  return (
    <section>
      <a
        href={cfg.spotify_user_id?.startsWith('http') ? cfg.spotify_user_id : `https://open.spotify.com/user/${cfg.spotify_user_id}`}
        target="_blank" rel="noopener noreferrer"
        className="card-surface group flex items-center gap-4 w-full py-4 px-5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest transition-all active:scale-[0.98]"
      >
        <svg viewBox="0 0 24 24" className="w-6 h-6 shrink-0" style={{ fill: spotifyGreen }}><path d={SOCIAL_SVGS_24.spotify} /></svg>
        <span className="flex-1 font-semibold text-sm text-on-surface">Follow on Spotify</span>
        <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors text-lg shrink-0">open_in_new</span>
      </a>
    </section>
  )
}

const PODCAST_PLATFORM_ICONS: Record<string, string> = {
  spotify:       SOCIAL_SVGS_24.spotify,
  apple_podcasts:'M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 3.6c1.988 0 3.6 1.612 3.6 3.6S13.988 12.8 12 12.8 8.4 11.188 8.4 9.2 10.012 5.6 12 5.6zm0 13.6c-2.496 0-4.72-1.12-6.24-2.88.06-2.08 4.16-3.224 6.24-3.224s6.18 1.144 6.24 3.224C16.72 18.08 14.496 19.2 12 19.2z',
  anchor:        'M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.5 14.5c-.3.3-.75.3-1.05 0L12 13.05l-3.45 3.45c-.3.3-.75.3-1.05 0s-.3-.75 0-1.05l4.5-4.5 4.5 4.5c.3.3.3.75 0 1.05z',
  direct:        'M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.92c.04-.3.07-.61.07-.93 0-.32-.03-.62-.07-.93l2.04-1.58c.18-.14.23-.41.12-.61l-1.93-3.34c-.12-.22-.37-.29-.58-.22l-2.4.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.85c-.24 0-.44.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.4-.96c-.22-.08-.46 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.31-.09.63-.09.94 0 .31.04.62.09.94l-2.03 1.58c-.18.14-.23.4-.12.6l1.93 3.34c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.04.24.24.41.47.41h3.85c.24 0 .44-.17.48-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.93-3.34c.12-.21.07-.47-.12-.6l-2.01-1.58z',
}

function PodcastEpisodeBlock({ block }: { block: PageBlock }) {
  const cfg = block.config as unknown as PodcastEpisodeConfig
  if (!cfg.episode_url) return null
  const iconPath = PODCAST_PLATFORM_ICONS[cfg.platform] ?? PODCAST_PLATFORM_ICONS.direct
  const platformLabel: Record<string, string> = {
    spotify: 'Spotify', apple_podcasts: 'Apple Podcasts', anchor: 'Anchor', direct: 'Podcast',
  }
  return (
    <section>
      <a
        href={cfg.episode_url} target="_blank" rel="noopener noreferrer"
        className="card-surface group flex gap-4 w-full p-4 rounded-2xl bg-surface-container-high hover:bg-surface-container-highest transition-all active:scale-[0.98]"
      >
        {cfg.artwork_url ? (
          <div className="w-16 h-16 rounded-lg overflow-hidden relative shrink-0">
            <Image src={cfg.artwork_url} alt="Episode artwork" fill className="object-cover" />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-lg shrink-0 flex items-center justify-center bg-primary/10">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-primary">
              <path d={iconPath} />
            </svg>
          </div>
        )}
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary">{platformLabel[cfg.platform]}</p>
          {cfg.episode_title && (
            <p className="font-bold text-sm text-on-surface line-clamp-2 leading-snug">{cfg.episode_title}</p>
          )}
          {cfg.description && (
            <p className="text-xs text-on-surface-variant line-clamp-2">{cfg.description}</p>
          )}
          {cfg.episode_duration && (
            <p className="text-[11px] text-on-surface-variant font-medium mt-auto">{cfg.episode_duration}</p>
          )}
        </div>
        <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors text-lg shrink-0 self-center">open_in_new</span>
      </a>
    </section>
  )
}

function SubstackPreviewBlock({ block, posts }: { block: PageBlock; posts: SubstackPost[] }) {
  const cfg = block.config as unknown as SubstackPreviewConfig
  const shown = posts.slice(0, cfg.posts_count ?? 3)
  const pubHost = (() => {
    try {
      const url = cfg.publication_url.startsWith('http') ? cfg.publication_url : `https://${cfg.publication_url}`
      return new URL(url).hostname.replace('www.', '')
    } catch { return cfg.publication_url }
  })()

  if (shown.length === 0) {
    return (
      <section>
        <a
          href={`https://${pubHost}`} target="_blank" rel="noopener noreferrer"
          className="card-surface flex items-center gap-3 w-full py-4 px-5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest transition-all"
        >
          <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>mail</span>
          <span className="font-semibold text-sm text-on-surface">Read on Substack</span>
          <span className="ml-auto material-symbols-outlined text-outline text-lg">open_in_new</span>
        </a>
      </section>
    )
  }

  return (
    <section className="card-surface bg-surface-container-high rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-outline-variant/20 flex items-center gap-2">
        <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>mail</span>
        <h3 className="font-headline font-bold text-on-surface">{pubHost}</h3>
      </div>
      <div className="divide-y divide-outline-variant/20">
        {shown.map((post, i) => (
          <a
            key={i}
            href={post.url} target="_blank" rel="noopener noreferrer"
            className="group flex flex-col gap-1 px-5 py-4 hover:bg-surface-container-highest transition-colors"
          >
            <p className="font-semibold text-sm text-on-surface group-hover:text-primary transition-colors line-clamp-2">
              {post.title}
            </p>
            {post.excerpt && (
              <p className="text-xs text-on-surface-variant line-clamp-2">{post.excerpt}</p>
            )}
            <p className="text-[11px] text-on-surface-variant/60">{post.date}</p>
          </a>
        ))}
      </div>
      {cfg.show_subscribe_button && (
        <div className="px-5 py-4 border-t border-outline-variant/20">
          <a
            href={`https://${pubHost}`} target="_blank" rel="noopener noreferrer"
            className="block w-full text-center py-2.5 rounded-xl bg-primary text-on-primary font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all"
          >
            Subscribe on Substack
          </a>
        </div>
      )}
    </section>
  )
}

function EventCalendarBlock({ block, events, discoverySource }: { block: PageBlock; events: Event[]; discoverySource: 'creator_link' | 'platform_discovery' }) {
  const cfg = block.config as unknown as EventCalendarConfig
  const now = new Date()
  const maxDate = new Date(now.getFullYear(), now.getMonth() + (cfg.months_ahead ?? 1), 0)

  const shown = events.filter((e) => {
    const d = new Date(e.starts_at)
    return d >= now && d <= maxDate
  })

  if (shown.length === 0) return null

  // Group by month
  const grouped: Record<string, Event[]> = {}
  for (const ev of shown) {
    const key = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(new Date(ev.starts_at))
    ;(grouped[key] ??= []).push(ev)
  }

  return (
    <section className="card-surface bg-surface-container-high rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-outline-variant/20 flex items-center gap-2">
        <span className="material-symbols-outlined text-primary">calendar_month</span>
        <h3 className="font-headline font-bold text-on-surface">Upcoming Events</h3>
      </div>
      {Object.entries(grouped).map(([month, evs]) => (
        <div key={month}>
          <div className="px-5 py-2 bg-surface-container-lowest/50">
            <p className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">{month}</p>
          </div>
          {evs.map((ev) => (
            <a
              key={ev.id}
              href={`/events/${ev.slug}?src=${discoverySource}`}
              className="group flex items-center gap-4 px-5 py-3 hover:bg-surface-container-highest transition-colors border-b border-outline-variant/10 last:border-0"
            >
              <div className="flex flex-col items-center w-10 shrink-0 text-center">
                <span className="text-lg font-bold text-primary leading-none">
                  {new Date(ev.starts_at).getDate()}
                </span>
                <span className="text-[10px] text-on-surface-variant uppercase">
                  {new Intl.DateTimeFormat('en-IN', { weekday: 'short' }).format(new Date(ev.starts_at))}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-on-surface truncate group-hover:text-primary transition-colors">{ev.title}</p>
                <p className="text-xs text-on-surface-variant truncate">{ev.venue_name}</p>
              </div>
              <span className="text-xs font-bold text-primary shrink-0">
                {ev.ticket_price === 0 ? 'Free' : `₹${ev.ticket_price / 100}`}
              </span>
            </a>
          ))}
        </div>
      ))}
    </section>
  )
}

function PastEventsGalleryBlock({ block, events, discoverySource }: { block: PageBlock; events: (Event & { attendee_count?: number })[]; discoverySource: 'creator_link' | 'platform_discovery' }) {
  const cfg = block.config as unknown as PastEventsGalleryConfig
  if (events.length === 0) return null

  if (cfg.layout === 'list') {
    return (
      <section className="card-surface bg-surface-container-high rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-outline-variant/20">
          <h3 className="font-headline font-bold text-on-surface">Past Events</h3>
        </div>
        <div className="divide-y divide-outline-variant/10">
          {events.map((ev) => (
            <a
              key={ev.id}
              href={`/events/${ev.slug}?src=${discoverySource}`}
              className="group flex items-center gap-4 px-5 py-4 hover:bg-surface-container-highest transition-colors"
            >
              {ev.cover_image_url && (
                <div className="w-12 h-12 rounded-lg overflow-hidden relative shrink-0">
                  <Image src={ev.cover_image_url} alt={ev.title} fill className="object-cover" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-on-surface truncate group-hover:text-primary transition-colors">{ev.title}</p>
                <p className="text-xs text-on-surface-variant" suppressHydrationWarning>
                  {formatShortDate(ev.starts_at)}
                  {cfg.show_attendee_count && ev.attendee_count != null && ` · ${ev.attendee_count} attended`}
                </p>
              </div>
            </a>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-headline font-bold text-lg text-on-surface px-1">Past Events</h3>
      <div className="grid grid-cols-2 gap-3">
        {events.map((ev) => (
          <a
            key={ev.id}
            href={`/events/${ev.slug}?src=${discoverySource}`}
            className="card-surface group relative aspect-square rounded-xl overflow-hidden bg-surface-container-high"
          >
            {ev.cover_image_url ? (
              <Image src={ev.cover_image_url} alt={ev.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-surface-container-highest">
                <span className="material-symbols-outlined text-on-surface-variant text-3xl">event</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <p className="text-white text-xs font-bold line-clamp-2 leading-snug">{ev.title}</p>
              <p className="text-white/60 text-[10px] mt-0.5" suppressHydrationWarning>
                {formatShortDate(ev.starts_at)}
                {cfg.show_attendee_count && ev.attendee_count != null && ` · ${ev.attendee_count} attended`}
              </p>
            </div>
          </a>
        ))}
      </div>
    </section>
  )
}

function EventSeriesBlock({ block, events, discoverySource }: { block: PageBlock; events: Event[]; discoverySource: 'creator_link' | 'platform_discovery' }) {
  const cfg = block.config as unknown as EventSeriesConfig
  const seriesEvts = events.filter((e) => cfg.linked_event_ids?.includes(e.id))
  const FREQ_LABELS: Record<string, string> = {
    weekly: 'Weekly', fortnightly: 'Fortnightly', monthly: 'Monthly',
    quarterly: 'Quarterly', irregular: 'Recurring',
  }

  return (
    <section className="card-surface bg-surface-container-high rounded-2xl overflow-hidden">
      {cfg.cover_image_url && (
        <div className="relative w-full aspect-[21/9] overflow-hidden">
          <Image src={cfg.cover_image_url} alt={cfg.series_name} fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-container-high via-transparent to-transparent" />
        </div>
      )}
      <div className="p-5 flex flex-col gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest mb-2">
            <span className="material-symbols-outlined text-xs">repeat</span>
            {FREQ_LABELS[cfg.frequency] ?? 'Series'} · {cfg.episode_count} episodes
          </div>
          <h3 className="font-headline font-bold text-xl text-on-surface">{cfg.series_name}</h3>
          {cfg.description && (
            <p className="text-sm text-on-surface-variant mt-1">{cfg.description}</p>
          )}
        </div>

        {seriesEvts.length > 0 && (
          <div className="flex flex-col gap-2 mt-1">
            {seriesEvts.slice(0, 4).map((ev) => (
              <a
                key={ev.id}
                href={`/events/${ev.slug}?src=${discoverySource}`}
                className="group flex items-center gap-3 py-2 hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-sm text-primary">calendar_today</span>
                <span className="text-sm text-on-surface group-hover:text-primary transition-colors flex-1 truncate">{ev.title}</span>
                <span className="text-xs text-on-surface-variant shrink-0" suppressHydrationWarning>{formatShortDate(ev.starts_at)}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function CommunityStatsBlock({ block, profile }: { block: PageBlock; profile: UserProfile }) {
  const cfg = block.config as unknown as CommunityStatsConfig
  const stats: { value: string; label: string; icon: string }[] = []

  if (cfg.show_events_hosted && profile.cumulative_events_hosted > 0) {
    stats.push({ value: String(profile.cumulative_events_hosted), label: 'Events Hosted', icon: 'event' })
  }
  if (cfg.show_total_attendees && profile.cumulative_unique_attendees > 0) {
    stats.push({ value: profile.cumulative_unique_attendees.toLocaleString('en-IN'), label: 'Attendees', icon: 'group' })
  }
  if (cfg.show_average_rating && profile.average_event_rating > 0) {
    stats.push({ value: `${profile.average_event_rating.toFixed(1)}★`, label: 'Avg Rating', icon: 'star' })
  }

  if (stats.length === 0) return null

  return (
    <section className="card-surface bg-surface-container-high rounded-2xl p-5">
      {cfg.custom_label && (
        <h3 className="font-headline font-bold text-on-surface text-center mb-4">{cfg.custom_label}</h3>
      )}
      <div className={`grid ${stats.length === 3 ? 'grid-cols-3' : 'grid-cols-2'} gap-4`}>
        {stats.map((s, i) => (
          <div key={i} className="flex flex-col items-center gap-1 text-center">
            <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              {s.icon}
            </span>
            <span className="font-headline text-2xl font-bold text-on-surface leading-none">{s.value}</span>
            <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function CreatorTypeBadgeBlock({ block, profile }: { block: PageBlock; profile: UserProfile }) {
  const cfg = block.config as unknown as CreatorTypeBadgeConfig
  const pill = CATEGORY_PILL_MAP[cfg.creator_type] ?? CATEGORY_PILL_MAP[profile.creator_type]
  if (!pill) return null

  const label = cfg.custom_label ?? pill.label
  return (
    <section className="flex justify-center">
      {cfg.show_link_to_city_feed ? (
        <a
          href={`/explore?city=${encodeURIComponent(profile.city)}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all"
          style={{ background: pill.background, color: pill.color }}
        >
          {pill.emoji} {label}
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
        </a>
      ) : (
        <span
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm"
          style={{ background: pill.background, color: pill.color }}
        >
          {pill.emoji} {label}
        </span>
      )}
    </section>
  )
}

function CityCommunityBlock({ block, profile }: { block: PageBlock; profile: UserProfile }) {
  const cfg = block.config as unknown as CityCommunityConfig
  const city = cfg.city || profile.city
  const label = cfg.neighbourhood ? `${cfg.neighbourhood}, ${city}` : city

  return (
    <section>
      {cfg.show_city_feed_link ? (
        <a
          href={`/explore?city=${encodeURIComponent(city)}`}
          className="card-surface group flex items-center gap-3 w-full py-4 px-5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest transition-all"
        >
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>location_city</span>
          <span className="flex-1 font-semibold text-sm text-on-surface">{label} Community</span>
          <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors text-lg">arrow_forward</span>
        </a>
      ) : (
        <div className="card-surface flex items-center gap-3 w-full py-4 px-5 rounded-xl bg-surface-container-high">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>location_city</span>
          <span className="font-semibold text-sm text-on-surface">{label} Community</span>
        </div>
      )}
    </section>
  )
}

function CollabInviteBlock({ block, profile }: { block: PageBlock; profile: UserProfile }) {
  const cfg = block.config as unknown as CollabInviteConfig
  const TYPE_LABELS: Record<string, string> = {
    co_host: 'Co-Host', workshop_partner: 'Workshop Partner',
    venue_takeover: 'Venue Takeover', brand_collab: 'Brand Collab',
  }
  return (
    <section className="card-surface bg-surface-container-high rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
          group_add
        </span>
        <div className="flex-1">
          <h3 className="font-headline font-bold text-on-surface">Open for Collabs</h3>
          <p className="text-sm text-on-surface-variant mt-1">{cfg.message}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {cfg.collab_types.map((type) => (
          <span
            key={type}
            className="px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary"
          >
            {TYPE_LABELS[type] ?? type}
          </span>
        ))}
      </div>

      {cfg.availability_note && (
        <p className="text-xs text-on-surface-variant bg-surface-container-lowest/50 rounded-lg px-3 py-2">
          {cfg.availability_note}
        </p>
      )}

      <a
        href={`/hub?connect=${profile.username}`}
        className="block w-full text-center py-3 rounded-xl bg-primary text-on-primary font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all"
      >
        Connect on WIMC Hub
      </a>
    </section>
  )
}

type VenueSummary = { id: string; name: string; address: string; city: string; cover_image_url: string | null; slug: string }

function VenuePartnershipBlock({ block, venueData }: { block: PageBlock; venueData: Record<string, VenueSummary> }) {
  const cfg = block.config as unknown as { venue_ids?: string[]; display_style?: 'cards' | 'row' }
  const venues = (cfg.venue_ids ?? []).map((id) => venueData[id]).filter(Boolean) as VenueSummary[]
  if (venues.length === 0) return null

  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-headline font-bold text-lg text-on-surface px-1">Venue Partners</h3>
      {cfg.display_style === 'row' ? (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {venues.map((v) => (
            <a
              key={v.id}
              href={`/venue/${v.slug}`}
              className="card-surface group shrink-0 w-40 rounded-xl overflow-hidden bg-surface-container-high hover:bg-surface-container-highest transition-colors"
            >
              <div className="relative w-full aspect-video bg-surface-container-highest">
                {v.cover_image_url && (
                  <Image src={v.cover_image_url} alt={v.name} fill className="object-cover" />
                )}
              </div>
              <div className="p-2">
                <p className="text-xs font-bold text-on-surface truncate group-hover:text-primary transition-colors">{v.name}</p>
                <p className="text-[10px] text-on-surface-variant truncate">{v.city}</p>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {venues.map((v) => (
            <a
              key={v.id}
              href={`/venue/${v.slug}`}
              className="card-surface group flex items-center gap-3 p-3 rounded-xl bg-surface-container-high hover:bg-surface-container-highest transition-colors"
            >
              <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-surface-container-highest shrink-0">
                {v.cover_image_url && (
                  <Image src={v.cover_image_url} alt={v.name} fill className="object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-on-surface truncate group-hover:text-primary transition-colors">{v.name}</p>
                <p className="text-xs text-on-surface-variant truncate">{v.address}</p>
              </div>
              <span className="material-symbols-outlined text-outline group-hover:text-primary text-lg shrink-0">arrow_forward</span>
            </a>
          ))}
        </div>
      )}
    </section>
  )
}

function WhiteLabelEventBlock({ block }: { block: PageBlock }) {
  const cfg = block.config as unknown as WhiteLabelEventConfig
  return (
    <section className="card-surface bg-surface-container-high rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        {cfg.partner_logo_url ? (
          <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-surface-container-highest">
            <Image src={cfg.partner_logo_url} alt={cfg.partner_name} fill className="object-contain p-1" />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>business</span>
          </div>
        )}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Presented by</p>
          <p className="font-headline font-bold text-on-surface">{cfg.partner_name}</p>
        </div>
      </div>

      <div>
        <h3 className="font-headline font-bold text-lg text-on-surface">{cfg.event_title}</h3>
        {cfg.event_description && (
          <p className="text-sm text-on-surface-variant mt-1 line-clamp-3">{cfg.event_description}</p>
        )}
        {cfg.event_date && (
          <p className="text-xs text-on-surface-variant mt-2 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-primary">calendar_today</span>
            <span suppressHydrationWarning>{formatShortDate(cfg.event_date)}</span>
          </p>
        )}
      </div>

      {cfg.ticket_url && (
        <a
          href={cfg.ticket_url} target="_blank" rel="noopener noreferrer"
          className="block w-full text-center py-3 rounded-xl bg-primary text-on-primary font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all"
        >
          Get Tickets
        </a>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Layout-specific profile header components
// ---------------------------------------------------------------------------

interface ProfileHeaderProps {
  profile:         UserProfile
  accent:          string
  pillData:        PillData | undefined
  resolvedTheme:   import('@/types/theme').ProfileTheme
  viewerIsExplorer: boolean
  isFollowing:     boolean
}

/** POSTER — full-bleed primary-colored hero, avatar centered top, name massive */
function PosterHeader({ profile, accent, pillData, resolvedTheme, viewerIsExplorer, isFollowing }: ProfileHeaderProps) {
  return (
    <header className="flex flex-col gap-4">
      <div
        className="relative w-full overflow-hidden"
        style={{ ['container-type' as string]: 'inline-size', background: accent, minHeight: 190 }}
      >
        {/* Avatar — centered top */}
        <div className="relative flex justify-center pt-8">
          <div className="relative w-20 h-20 rounded-full border-4 overflow-hidden bg-white/10 shadow-xl"
               style={{ borderColor: 'rgba(255,255,255,0.25)' }}>
            {profile.avatar_url ? (
              <Image src={profile.avatar_url} alt={profile.display_name} fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-display font-black text-2xl"
                   style={{ color: 'rgba(255,255,255,0.4)' }}>
                {profile.display_name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Name — big and white */}
        <div className="px-6 pt-4 pb-6 text-center">
          <h1
            className="font-display font-black text-white uppercase leading-[0.88] tracking-tight"
            style={{ fontSize: 'clamp(36px,12cqw,68px)', letterSpacing: '-0.04em' }}
          >
            {profile.display_name}
          </h1>
          {/* Decorative ✦ line */}
          <div className="flex items-center justify-center gap-3 mt-3">
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 8 }}>✦</span>
            <span className="font-mono text-[9px] uppercase tracking-[0.2em]"
                  style={{ color: 'rgba(255,255,255,0.50)' }}>
              {(profile.city ?? '').toUpperCase()} · {new Date().getFullYear()}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 8 }}>✦</span>
          </div>
        </div>

        {/* Category pill — bottom-left */}
        {pillData && (
          <div className="absolute bottom-3 left-4">
            <span
              className="font-mono text-[9px] px-3 py-1 uppercase tracking-widest"
              style={{ background: 'rgba(0,0,0,0.28)', color: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(6px)' }}
            >
              {pillData.emoji} {pillData.label}
            </span>
          </div>
        )}
      </div>

      {/* Below hero: bio, tier badges, follow */}
      <div className="flex flex-col gap-3">
        {profile.is_verified && (
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-primary uppercase tracking-wider">
            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
            Verified Creator
          </div>
        )}
        {profile.bio && (
          <p className="text-on-surface/80 text-sm leading-relaxed">{profile.bio}</p>
        )}
        {viewerIsExplorer && (
          <FollowButton makerId={profile.id} initialIsFollowing={isFollowing} />
        )}
      </div>
    </header>
  )
}

/** EDITORIAL — thin horizontal rules, name left / avatar right, masthead feel */
function EditorialHeader({ profile, pillData, viewerIsExplorer, isFollowing }: ProfileHeaderProps) {
  return (
    <header className="flex flex-col gap-0" style={{ ['container-type' as string]: 'inline-size' }}>
      {/* Top rule + masthead meta */}
      <div className="flex justify-between items-baseline py-2 border-b-2 border-on-surface">
        <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-on-surface/40">
          WHEN IN MY CITY · {(profile.city ?? '').toUpperCase()}
        </span>
        <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-on-surface/40">
          {new Date().getFullYear()}
        </span>
      </div>

      {/* Main: name left, avatar right */}
      <div className="pt-5 pb-4 flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <h1
            className="font-display font-black text-on-surface leading-[0.88] tracking-tight"
            style={{ fontSize: 'clamp(30px,10cqw,54px)', letterSpacing: '-0.04em' }}
          >
            {profile.display_name}
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <span className="font-mono text-[11px] text-on-surface/40">@{profile.username}</span>
            {pillData && (
              <span
                className="font-mono text-[9px] px-2 py-0.5 uppercase tracking-widest"
                style={{ background: pillData.background, color: pillData.color }}
              >
                {pillData.emoji} {pillData.label}
              </span>
            )}
          </div>
        </div>

        {/* Avatar — right */}
        <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-on-surface/10 bg-surface-container shrink-0">
          {profile.avatar_url ? (
            <Image src={profile.avatar_url} alt={profile.display_name} fill className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-display font-black text-2xl text-on-surface/20">
              {profile.display_name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* Bottom rule */}
      <div className="border-b border-on-surface/20" />

      {/* Bio */}
      {profile.bio && (
        <p className="mt-4 text-sm leading-relaxed text-on-surface/70 italic">{profile.bio}</p>
      )}

      {/* Stats */}
      {(profile.cumulative_events_hosted > 0 || profile.cumulative_unique_attendees > 0) && (
        <div className="flex gap-6 mt-4 pt-4 border-t border-on-surface/10">
          {profile.cumulative_events_hosted > 0 && (
            <div>
              <span className="font-display font-black text-2xl text-primary">{profile.cumulative_events_hosted}</span>
              <span className="font-mono text-[9px] text-on-surface/40 uppercase tracking-widest ml-2">Events</span>
            </div>
          )}
          {profile.cumulative_unique_attendees > 0 && (
            <div>
              <span className="font-display font-black text-2xl text-primary">
                {profile.cumulative_unique_attendees.toLocaleString('en-IN')}
              </span>
              <span className="font-mono text-[9px] text-on-surface/40 uppercase tracking-widest ml-2">Attendees</span>
            </div>
          )}
        </div>
      )}

      {viewerIsExplorer && (
        <div className="mt-4">
          <FollowButton makerId={profile.id} initialIsFollowing={isFollowing} />
        </div>
      )}
    </header>
  )
}

/** MINIMAL — centered avatar, name, pill, bio — clean digital card */
function MinimalHeader({ profile, pillData, viewerIsExplorer, isFollowing }: ProfileHeaderProps) {
  return (
    <header className="flex flex-col items-center gap-4 pt-2" style={{ ['container-type' as string]: 'inline-size' }}>
      {/* Large circle avatar */}
      <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-surface-container-highest bg-surface-container">
        {profile.avatar_url ? (
          <Image src={profile.avatar_url} alt={profile.display_name} fill className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-display font-black text-3xl text-on-surface/20">
            {profile.display_name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Name + username */}
      <div className="text-center">
        <h1
          className="font-display font-bold text-on-surface leading-tight"
          style={{ fontSize: 'clamp(22px,7cqw,30px)', letterSpacing: '-0.02em' }}
        >
          {profile.display_name}
        </h1>
        <p className="text-sm text-on-surface/50 mt-1">@{profile.username}</p>
      </div>

      {/* Category pill */}
      {pillData && (
        <span
          className="font-mono text-[10px] px-4 py-1.5 uppercase tracking-widest rounded-full"
          style={{ background: pillData.background, color: pillData.color }}
        >
          {pillData.emoji} {pillData.label}
        </span>
      )}

      {/* Bio */}
      {profile.bio && (
        <p className="text-center text-sm text-on-surface/70 leading-relaxed max-w-xs px-4">
          {profile.bio}
        </p>
      )}

      {profile.is_verified && (
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-primary uppercase tracking-wider">
          <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
          Verified Creator
        </div>
      )}

      {viewerIsExplorer && (
        <FollowButton makerId={profile.id} initialIsFollowing={isFollowing} />
      )}
    </header>
  )
}

/** REEL — glowing avatar ring, centered info — Gen Z / social creator */
function ReelHeader({ profile, accent, pillData, viewerIsExplorer, isFollowing }: ProfileHeaderProps) {
  return (
    <header className="flex flex-col items-center" style={{ ['container-type' as string]: 'inline-size' }}>
      {/* Avatar — sits directly on the page background (aurora/solid), no extra layer */}
      <div className="pt-4 pb-0">
        <div
          className="relative w-28 h-28 rounded-full overflow-hidden border-4 border-background"
          style={{ boxShadow: `0 0 0 3px ${accent}, 0 0 32px ${accent}80` }}
        >
          {profile.avatar_url ? (
            <Image src={profile.avatar_url} alt={profile.display_name} fill className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-display font-black text-3xl bg-primary text-on-primary">
              {profile.display_name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* Info — centered */}
      <div className="flex flex-col items-center gap-3 pt-5 pb-2 text-center px-4">
        <h1
          className="font-display font-black text-on-surface leading-tight"
          style={{ fontSize: 'clamp(24px,8cqw,40px)', letterSpacing: '-0.02em' }}
        >
          {profile.display_name}
        </h1>
        {pillData && (
          <span
            className="font-mono text-[10px] px-3 py-1 uppercase tracking-widest rounded-full"
            style={{ background: pillData.background, color: pillData.color }}
          >
            {pillData.emoji} {pillData.label}
          </span>
        )}
        <p className="text-xs text-on-surface/40 font-mono">@{profile.username}</p>
        {profile.bio && (
          <p className="text-sm text-on-surface/70 leading-relaxed max-w-xs">{profile.bio}</p>
        )}
        {profile.is_verified && (
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-primary uppercase tracking-wider">
            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
            Verified Creator
          </div>
        )}
        {viewerIsExplorer && (
          <FollowButton makerId={profile.id} initialIsFollowing={isFollowing} />
        )}
      </div>
    </header>
  )
}

/** CORPORATE — square headshot + info row, clean horizontal stats — professional / business */
function CorporateHeader({ profile, accent, pillData, viewerIsExplorer, isFollowing }: ProfileHeaderProps) {
  return (
    <header
      className="flex flex-col gap-0 pb-1"
      style={{ ['container-type' as string]: 'inline-size', borderBottom: '1px solid rgb(var(--color-on-surface) / 0.10)' }}
    >
      <div className="flex gap-4 items-start pb-5">
        {/* Square headshot */}
        <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-on-surface/10 bg-surface-container shrink-0">
          {profile.avatar_url ? (
            <Image src={profile.avatar_url} alt={profile.display_name} fill className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-display font-black text-3xl text-on-surface/20">
              {profile.display_name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        {/* Info right */}
        <div className="flex-1 min-w-0 pt-1">
          <h1
            className="font-display font-bold text-on-surface leading-tight"
            style={{ fontSize: 'clamp(20px,6cqw,32px)', letterSpacing: '-0.02em' }}
          >
            {profile.display_name}
          </h1>
          <p className="text-xs text-on-surface/40 font-mono mt-1">@{profile.username}{profile.city ? ` · ${profile.city}` : ''}</p>
          {pillData && (
            <span
              className="inline-block mt-2 font-mono text-[9px] px-2.5 py-1 uppercase tracking-widest"
              style={{ background: `${accent}18`, color: accent, border: `1px solid ${accent}35` }}
            >
              {pillData.emoji} {pillData.label}
            </span>
          )}
          {profile.bio && (
            <p className="mt-2 text-sm text-on-surface/60 leading-relaxed line-clamp-2">{profile.bio}</p>
          )}
        </div>
      </div>

      {/* Stats row */}
      {(profile.cumulative_events_hosted > 0 || profile.cumulative_unique_attendees > 0) && (
        <div className="flex items-center gap-5 py-3.5 border-t border-on-surface/8">
          {profile.cumulative_events_hosted > 0 && (
            <div>
              <span className="font-bold text-lg text-primary">{profile.cumulative_events_hosted}</span>
              <span className="text-[10px] text-on-surface/40 ml-1.5 uppercase tracking-wider">Events</span>
            </div>
          )}
          {profile.cumulative_unique_attendees > 0 && (
            <div>
              <span className="font-bold text-lg text-primary">
                {profile.cumulative_unique_attendees.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-on-surface/40 ml-1.5 uppercase tracking-wider">Attendees</span>
            </div>
          )}
          {profile.is_verified && (
            <div className="flex items-center gap-1 text-[10px] font-mono text-primary ml-auto">
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
              Verified
            </div>
          )}
        </div>
      )}

      {viewerIsExplorer && (
        <div className="pb-4">
          <FollowButton makerId={profile.id} initialIsFollowing={isFollowing} />
        </div>
      )}
    </header>
  )
}

/** STAGE — ornamental rules, large centered name, small avatar, program-bill feel */
function StageHeader({ profile, pillData, viewerIsExplorer, isFollowing }: ProfileHeaderProps) {
  return (
    <header
      className="flex flex-col items-center gap-3 py-6 text-center"
      style={{ ['container-type' as string]: 'inline-size' }}
    >
      {/* Top ornamental rule */}
      <div className="flex items-center gap-3 w-full">
        <div className="flex-1 h-px bg-on-surface/20" />
        <span className="text-on-surface/30 text-sm">✦</span>
        <div className="flex-1 h-px bg-on-surface/20" />
      </div>

      {/* Name — large, centered */}
      <h1
        className="font-display font-bold text-on-surface uppercase leading-none"
        style={{ fontSize: 'clamp(32px,10cqw,56px)', letterSpacing: '-0.02em' }}
      >
        {profile.display_name}
      </h1>

      {/* Avatar — small, elegant circle */}
      <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-on-surface/20 bg-surface-container">
        {profile.avatar_url ? (
          <Image src={profile.avatar_url} alt={profile.display_name} fill className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-display font-black text-2xl text-on-surface/20">
            {profile.display_name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {pillData && (
        <span
          className="font-mono text-[10px] px-4 py-1.5 uppercase tracking-widest rounded-full"
          style={{ background: pillData.background, color: pillData.color }}
        >
          {pillData.emoji} {pillData.label}
        </span>
      )}

      {profile.bio && (
        <p className="text-sm text-on-surface/60 italic leading-relaxed max-w-xs px-2">{profile.bio}</p>
      )}

      {profile.is_verified && (
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-primary uppercase tracking-wider">
          <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
          Verified Creator
        </div>
      )}

      {/* Bottom ornamental rule */}
      <div className="flex items-center gap-3 w-full">
        <div className="flex-1 h-px bg-on-surface/20" />
        <span className="text-on-surface/30 text-sm">✦</span>
        <div className="flex-1 h-px bg-on-surface/20" />
      </div>

      {viewerIsExplorer && (
        <FollowButton makerId={profile.id} initialIsFollowing={isFollowing} />
      )}
    </header>
  )
}

/** ZINE — massive display type, raw borders, grayscale avatar, printed-zine DIY energy */
function ZineHeader({ profile, pillData, viewerIsExplorer, isFollowing }: ProfileHeaderProps) {
  return (
    <header
      className="flex flex-col gap-0"
      style={{ ['container-type' as string]: 'inline-size', borderBottom: '3px solid rgb(var(--color-on-surface))' }}
    >
      <p className="font-mono text-[9px] text-on-surface/30 uppercase tracking-[0.25em] pt-3 pb-2 border-b border-on-surface/10">
        ISSUE NO.1 · WHENINMYCITY.COM · {(profile.city ?? '').toUpperCase()}
      </p>

      {/* Massive name */}
      <h1
        className="font-display font-black text-on-surface uppercase leading-[0.85] tracking-tight py-3"
        style={{ fontSize: 'clamp(44px,14cqw,80px)', letterSpacing: '-0.04em' }}
      >
        {profile.display_name}
      </h1>

      {/* Bottom strip: avatar + meta */}
      <div className="flex gap-3 items-start pb-4 pt-3 border-t border-on-surface/15">
        {profile.avatar_url && (
          <div
            className="relative w-14 h-14 overflow-hidden shrink-0"
            style={{ border: '2px solid rgb(var(--color-on-surface))' }}
          >
            <Image
              src={profile.avatar_url}
              alt={profile.display_name}
              fill
              className="object-cover grayscale contrast-125"
            />
          </div>
        )}
        <div className="flex-1 flex flex-col gap-1">
          {pillData && (
            <span
              className="font-mono text-[9px] px-2 py-0.5 uppercase tracking-widest self-start"
              style={{ background: pillData.background, color: pillData.color }}
            >
              {pillData.emoji} {pillData.label}
            </span>
          )}
          {profile.bio && (
            <p className="font-mono text-[10px] text-on-surface/50 leading-relaxed">{profile.bio}</p>
          )}
          <p className="font-mono text-[9px] text-on-surface/25 mt-0.5">@{profile.username}</p>
        </div>
      </div>

      {viewerIsExplorer && (
        <div className="pb-4">
          <FollowButton makerId={profile.id} initialIsFollowing={isFollowing} />
        </div>
      )}
    </header>
  )
}

// ---------------------------------------------------------------------------
// Static accent map — module-level so it's not recreated on every render
// ---------------------------------------------------------------------------

const ACCENT_MAP: Record<ProfileTheme['colorScheme'], string> = {
  default:  '#E8572A', midnight: '#818CF8', ocean:    '#22D3EE',
  forest:   '#6EE7B7', blush:    '#E11D48', sand:     '#B45309',
  pista:    '#2D7A4F', gulaal:   '#E8342A', neel:     '#F5A800',
  turmeric: '#F5A800', steel:    '#5B8DEF', sienna:   '#C04A00',
  indigo:      '#818CF8', aurora:      '#D946EF', sage:        '#3D7F53',
  mint:        '#0C8B6B', electric:    '#00E5FF', velvet:      '#8B2340',
  nightforest: '#7EC8A0', parchment:   '#4A3728', gallery:     '#1A1A1A',
  terracotta:  '#C4552A',
}

const CREATOR_GRID_BG_STYLE: React.CSSProperties = {
  backgroundImage: `
    linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
  `,
  backgroundSize: '40px 40px',
}

const LIGHT_SCHEMES = new Set(['blush', 'sand', 'parchment', 'gallery'])

// ---------------------------------------------------------------------------
// Desktop sidebar — file-scoped, only rendered at lg+ breakpoint
// ---------------------------------------------------------------------------

interface DesktopSidebarProps {
  profile: UserProfile
  accent: string
  pillData: PillData | undefined
  layout: LayoutPresetId
  resolvedTheme: ProfileTheme
  upcomingEvents: Event[]
}

function DesktopSidebar({ profile, accent, pillData, layout, resolvedTheme, upcomingEvents }: DesktopSidebarProps) {
  const profileSocial = (profile.social_links ?? {}) as Record<string, string>

  const statsRows = (
    <div className="flex flex-col gap-0 mt-6">
      {[
        { label: 'CITY', value: profile.city ?? '—' },
        { label: 'EVENTS', value: String(profile.cumulative_events_hosted ?? 0) },
        { label: 'ATTENDEES', value: (profile.cumulative_unique_attendees ?? 0).toLocaleString('en-IN') },
      ].map(({ label, value }) => (
        <div
          key={label}
          className="flex justify-between items-center py-3"
          style={{ borderBottom: '1px dashed rgb(var(--color-on-background)/0.12)' }}
        >
          <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'rgb(var(--color-on-background)/0.45)' }}>{label}</span>
          <span className="font-mono text-sm" style={{ color: 'rgb(var(--color-on-background)/0.85)' }}>{value}</span>
        </div>
      ))}
      <div className="mt-5">
        <ProfileSocialLinks socialLinks={profileSocial} />
      </div>
    </div>
  )

  if (layout === 'reel') {
    return (
      <div
        className="w-full h-full flex flex-col items-center justify-center p-10"
        style={{ background: 'rgb(var(--color-background)/0.1)' }}
      >
        <div
          className="rounded-full overflow-hidden"
          style={{ width: 160, height: 160, boxShadow: `0 0 0 3px ${accent}, 0 0 60px ${accent}60`, flexShrink: 0 }}
        >
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.display_name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-display font-black text-5xl" style={{ background: `${accent}30`, color: accent }}>
              {profile.display_name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <h2
          className="font-display font-black text-center uppercase leading-[0.9] tracking-tight mt-6"
          style={{ fontSize: 'clamp(32px,3.5vw,52px)', color: 'rgb(var(--color-on-background))' }}
        >
          {profile.display_name}
        </h2>
        {pillData && (
          <span
            className="mt-3 font-mono text-[11px] px-3 py-1 uppercase tracking-widest rounded-full"
            style={{ background: pillData.background, color: pillData.color }}
          >
            {pillData.emoji} {pillData.label}
          </span>
        )}
        <span className="font-mono text-xs mt-2" style={{ color: 'rgb(var(--color-on-background)/0.45)' }}>
          @{profile.username}
        </span>
        {statsRows}
      </div>
    )
  }

  if (layout === 'boarding-pass') {
    return (
      <div
        className="w-full h-full flex flex-col p-10"
        style={{ background: '#FAF7F0', ...CREATOR_GRID_BG_STYLE, ['--color-on-surface' as string]: '26 17 8', ['--color-on-surface-variant' as string]: '90 65 55' } as React.CSSProperties}
      >
        <div
          className="relative bg-[#FAF7F0] border-2 border-dashed border-outline-variant"
          style={{
            clipPath: 'polygon(0% 0%, 100% 0%, 100% calc(100% - 10px), 97% 100%, 93% calc(100% - 12px), 88% 100%, 82% calc(100% - 8px), 76% 100%, 69% calc(100% - 10px), 63% 100%, 57% calc(100% - 12px), 51% 100%, 44% calc(100% - 10px), 38% 100%, 31% calc(100% - 8px), 25% 100%, 19% calc(100% - 10px), 14% 100%, 8% calc(100% - 12px), 3% 100%, 0% calc(100% - 10px))',
          }}
        >
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
          <div className="flex justify-between items-center px-6 pt-5 gap-3">
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] leading-none" style={{ color: 'rgb(26 17 8 / 0.6)' }}>
              BOARDING NOW · CULTURE PASS · {(profile.city ?? '').toUpperCase()} · {new Date().getFullYear()}
            </span>
          </div>
          <div className="px-6 pt-4 pr-20">
            <h2
              className="font-display font-black uppercase leading-[0.9] tracking-tight"
              style={{ fontSize: 'clamp(28px,3.5vw,52px)', color: 'rgb(26 17 8)', letterSpacing: '-0.04em' }}
            >
              {profile.display_name}
            </h2>
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <span className="font-mono text-[13px]" style={{ color: 'rgb(26 17 8 / 0.4)' }}>@{profile.username}</span>
              {pillData && (
                <span className="font-mono text-[10px] px-3 py-1 uppercase tracking-widest" style={{ background: pillData.background, color: pillData.color }}>
                  {pillData.emoji} {pillData.label}
                </span>
              )}
            </div>
          </div>
          <div className="mx-6 mt-4 border-t-2 border-dashed border-outline-variant/30" />
          <div className="flex flex-wrap gap-6 px-6 py-4">
            {profile.cumulative_events_hosted > 0 && (
              <div>
                <div className="font-display font-black text-2xl leading-none" style={{ color: 'rgb(26 17 8)' }}>{profile.cumulative_events_hosted}</div>
                <div className="font-mono text-[9px] uppercase tracking-widest mt-1" style={{ color: 'rgb(26 17 8 / 0.4)' }}>EVENTS HOSTED</div>
              </div>
            )}
            {profile.cumulative_unique_attendees > 0 && (
              <div>
                <div className="font-display font-black text-2xl leading-none" style={{ color: 'rgb(26 17 8)' }}>{profile.cumulative_unique_attendees.toLocaleString('en-IN')}</div>
                <div className="font-mono text-[9px] uppercase tracking-widest mt-1" style={{ color: 'rgb(26 17 8 / 0.4)' }}>PEOPLE ATTENDED</div>
              </div>
            )}
          </div>
          {/* Avatar bottom-right */}
          <div className="absolute bottom-0 right-5 translate-y-1/2 z-10">
            <div className="relative w-16 h-16 rounded-full border-4 border-[#FAF7F0] overflow-hidden bg-surface-container shadow-md">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.display_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-display font-black text-2xl" style={{ color: 'rgb(26 17 8 / 0.3)' }}>
                  {profile.display_name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-0">
          {[
            { label: 'CITY', value: profile.city ?? '—' },
            { label: 'EVENTS', value: String(profile.cumulative_events_hosted ?? 0) },
            { label: 'ATTENDEES', value: (profile.cumulative_unique_attendees ?? 0).toLocaleString('en-IN') },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center py-3" style={{ borderBottom: '1px dashed rgba(26,17,8,0.12)' }}>
              <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'rgba(26,17,8,0.45)' }}>{label}</span>
              <span className="font-mono text-sm" style={{ color: 'rgba(26,17,8,0.85)' }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (layout === 'poster') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-10" style={{ background: 'rgb(var(--color-primary))' }}>
        <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-white/30 mb-5" style={{ flexShrink: 0 }}>
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.display_name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-display font-black text-3xl text-white/40">
              {profile.display_name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <h2
          className="font-display font-black text-white uppercase text-center leading-[0.9] tracking-tight"
          style={{ fontSize: 'clamp(40px,4.5vw,72px)', letterSpacing: '-0.04em' }}
        >
          {profile.display_name}
        </h2>
        <p className="font-mono text-[11px] text-white/60 mt-3 uppercase tracking-widest">
          {profile.city ?? ''}{pillData ? ` · ${pillData.label}` : ''}
        </p>
        {pillData && (
          <span
            className="mt-4 font-mono text-[10px] px-3 py-1 uppercase tracking-widest rounded-full"
            style={{ background: 'rgba(0,0,0,0.3)', color: 'rgba(255,255,255,0.9)' }}
          >
            {pillData.emoji} {pillData.label}
          </span>
        )}
        {statsRows}
      </div>
    )
  }

  if (layout === 'stage') {
    return (
      <div
        className="w-full h-full flex flex-col items-center justify-center p-10 relative"
        style={{ background: 'rgb(var(--color-surface-container-low))' }}
      >
        <div className="absolute top-0 left-0 right-0 h-20" style={{ background: `linear-gradient(to bottom, ${accent}18, transparent)` }} />
        {/* Ornamental rule */}
        <div className="flex items-center gap-3 w-full mb-6">
          <div className="flex-1 h-px" style={{ background: `rgb(var(--color-on-background)/0.15)` }} />
          <span style={{ color: accent, fontSize: 12 }}>✦</span>
          <div className="flex-1 h-px" style={{ background: `rgb(var(--color-on-background)/0.15)` }} />
        </div>
        <h2
          className="font-display font-bold uppercase text-center leading-[0.9] tracking-tight"
          style={{ fontSize: 'clamp(36px,4vw,60px)', color: 'rgb(var(--color-on-background))', letterSpacing: '-0.03em' }}
        >
          {profile.display_name}
        </h2>
        <div className="relative w-16 h-16 rounded-full overflow-hidden mt-5" style={{ boxShadow: `0 0 0 2px ${accent}` }}>
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.display_name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-display font-black text-2xl" style={{ background: `${accent}30`, color: accent }}>
              {profile.display_name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        {pillData && (
          <span className="mt-4 font-mono text-[11px] px-3 py-1 uppercase tracking-widest" style={{ background: pillData.background, color: pillData.color }}>
            {pillData.emoji} {pillData.label}
          </span>
        )}
        <div className="flex items-center gap-3 w-full mt-6">
          <div className="flex-1 h-px" style={{ background: `rgb(var(--color-on-background)/0.15)` }} />
          <span style={{ color: accent, fontSize: 12 }}>✦</span>
          <div className="flex-1 h-px" style={{ background: `rgb(var(--color-on-background)/0.15)` }} />
        </div>
        {statsRows}
      </div>
    )
  }

  if (layout === 'editorial') {
    return (
      <div
        className="w-full h-full flex flex-col p-10"
        style={{ background: 'rgb(var(--color-surface-container-low))' }}
      >
        <div className="w-full h-0.5" style={{ background: 'rgb(var(--color-on-background))' }} />
        <div className="flex items-start gap-4 pt-6">
          <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.display_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-display font-black text-3xl" style={{ background: `${accent}30`, color: accent }}>
                {profile.display_name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 min-w-0">
            <h2
              className="font-display font-black uppercase leading-[0.9] tracking-tight"
              style={{ fontSize: 'clamp(28px,3.2vw,48px)', color: 'rgb(var(--color-on-background))', letterSpacing: '-0.04em' }}
            >
              {profile.display_name}
            </h2>
            {pillData && (
              <span className="font-mono text-[10px] px-3 py-1 uppercase tracking-widest self-start" style={{ background: pillData.background, color: pillData.color }}>
                {pillData.emoji} {pillData.label}
              </span>
            )}
          </div>
        </div>
        <div className="w-full h-0.5 mt-6" style={{ background: 'rgb(var(--color-on-background)/0.15)' }} />
        <div className="flex gap-8 mt-6">
          {profile.cumulative_events_hosted > 0 && (
            <div>
              <div className="font-display font-black text-3xl leading-none" style={{ color: 'rgb(var(--color-primary))' }}>{profile.cumulative_events_hosted}</div>
              <div className="font-mono text-[9px] uppercase tracking-widest mt-1" style={{ color: 'rgb(var(--color-on-background)/0.45)' }}>EVENTS</div>
            </div>
          )}
          {profile.cumulative_unique_attendees > 0 && (
            <div>
              <div className="font-display font-black text-3xl leading-none" style={{ color: 'rgb(var(--color-primary))' }}>{profile.cumulative_unique_attendees.toLocaleString('en-IN')}</div>
              <div className="font-mono text-[9px] uppercase tracking-widest mt-1" style={{ color: 'rgb(var(--color-on-background)/0.45)' }}>ATTENDEES</div>
            </div>
          )}
        </div>
        {statsRows}
      </div>
    )
  }

  // minimal + fallback (corporate, zine)
  return (
    <div
      className="w-full h-full flex flex-col items-center p-10"
      style={{ background: 'rgb(var(--color-surface-container-lowest))' }}
    >
      <div className="relative w-24 h-24 rounded-full overflow-hidden border border-on-background/20 mb-5" style={{ flexShrink: 0 }}>
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt={profile.display_name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-display font-black text-3xl" style={{ background: `${accent}20`, color: accent }}>
            {profile.display_name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <h2
        className="font-display font-light text-center leading-[1.1]"
        style={{ fontSize: 'clamp(28px,3vw,40px)', color: 'rgb(var(--color-on-background))' }}
      >
        {profile.display_name}
      </h2>
      <div className="mt-3 w-8 h-0.5" style={{ background: 'rgb(var(--color-primary))' }} />
      <p className="font-mono text-[11px] mt-3 text-center" style={{ color: 'rgb(var(--color-on-background)/0.5)' }}>
        {profile.city ?? ''}{pillData ? ` · ${pillData.label}` : ''}
      </p>
      {statsRows}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface PublicProfilePageProps {
  profile:              UserProfile
  blocks:               PageBlock[]
  upcomingEvents:       Event[]
  calendarEvents?:      Event[]
  pastEvents?:          (Event & { attendee_count?: number })[]
  seriesEvents?:        Event[]
  testimonials?:        PublicTestimonial[]
  substackPosts?:       Record<string, SubstackPost[]>
  bookingCapacity?:     { slots_filled: number; effective_status: 'open' | 'closed' | 'waitlist' } | null
  decryptedUpiVpa?:     string | null
  venueData?:           Record<string, VenueSummary>
  shopTheLookProducts?: Record<string, ShopTheLookProduct>
  theme?:               ProfileTheme
  isFollowing?:         boolean
  viewerIsExplorer?:    boolean
  isOwner?:             boolean
  cityMasteryMap?:      MasteryNeighbourhood[]
  posts?:               CreatorPostWithReactions[]
  viewerUserId?:        string | null
  isPreview?:           boolean
  /** Tag applied to outgoing event links: this page counts as the creator's
   * own promotion unless the visitor arrived here via a platform discovery
   * surface (Hall of Lights), in which case that attribution is forwarded. */
  discoverySource?:     'creator_link' | 'platform_discovery'
}

const PublicProfilePage = React.memo(function PublicProfilePage({
  profile,
  blocks,
  upcomingEvents,
  calendarEvents = [],
  pastEvents = [],
  seriesEvents = [],
  testimonials = [],
  substackPosts = {},
  bookingCapacity = null,
  decryptedUpiVpa = null,
  venueData = {},
  shopTheLookProducts = {},
  theme,
  isFollowing = false,
  viewerIsExplorer = false,
  isOwner = false,
  cityMasteryMap = [],
  posts = [],
  viewerUserId = null,
  isPreview = false,
  discoverySource = 'creator_link',
}: PublicProfilePageProps) {
  const resolvedTheme = useMemo<ProfileTheme>(() => theme ?? DEFAULT_PROFILE_THEME, [theme])
  const contentBlocks = useMemo(() => blocks.filter((b) => b.is_visible), [blocks])
  const hasBioBlock        = contentBlocks.some(b => b.block_type === 'text_bio')
  const hasCategoryBadge   = contentBlocks.some(b => b.block_type === 'creator_type_badge')
  const hasSocialLinkBlocks = contentBlocks.some(b => b.block_type === 'social_link')
  const profileSocial = (profile.social_links ?? {}) as Record<string, string>
  const pillData = CATEGORY_PILL_MAP[profile.creator_type]
  const fontClass = FONT_FAMILY_CLASS[resolvedTheme.fontFamily]
  const themeStyle = useMemo(() => buildThemeStyle(resolvedTheme), [resolvedTheme])
  const accent = useMemo(() => ACCENT_MAP[resolvedTheme.colorScheme], [resolvedTheme.colorScheme])

  const layout = (resolvedTheme.layoutPreset ?? 'boarding-pass') as LayoutPresetId
  const headerProps: ProfileHeaderProps = { profile, accent, pillData, resolvedTheme, viewerIsExplorer, isFollowing }

  const wordmarkColor = LIGHT_SCHEMES.has(resolvedTheme.colorScheme) ? 'black' : 'white'
  const nextEvent = upcomingEvents[0]
  const auroraRightPanelStyle: React.CSSProperties = resolvedTheme.backgroundStyle === 'aurora'
    ? { background: 'rgb(var(--color-background)/0.88)', backdropFilter: 'blur(2px)' }
    : {}

  return (
    <div
      className={`relative w-full bg-background text-on-background selection:bg-primary-container selection:text-white ${fontClass}`}
      style={themeStyle}
      data-glass={resolvedTheme.glassEffects ? 'true' : undefined}
      data-shadow={resolvedTheme.dropShadow || undefined}
      data-noise={resolvedTheme.noiseBg ? 'true' : undefined}
      data-heavy-borders={resolvedTheme.heavyBorders ? 'true' : undefined}
    >
      {resolvedTheme.backgroundStyle === 'aurora' && (
        <AuroraBackground scheme={resolvedTheme.colorScheme} style={resolvedTheme.auroraStyle} />
      )}
      {/* ── DESKTOP sticky top bar ──────────────────────────────────────────── */}
      <div
        className={`hidden lg:flex ${isPreview ? 'relative' : 'sticky top-0'} z-40 items-center justify-between px-8 w-full shrink-0`}
        style={{ height: 64, background: 'rgb(var(--color-background)/0.92)', backdropFilter: 'blur(8px)', borderBottom: '2px dashed rgb(var(--color-on-background)/0.10)' }}
      >
        <WimcWordmark color={wordmarkColor} height={28} />
        <span className="font-mono text-xs" style={{ color: 'rgb(var(--color-on-background)/0.45)' }}>@{profile.username}</span>
        <Link
          href="/signin"
          className="font-mono text-[11px] px-3 py-1.5 rounded transition-colors hover:opacity-80"
          style={{ border: '1px solid rgb(var(--color-primary)/0.4)', color: 'rgb(var(--color-primary))' }}
        >
          Create your page →
        </Link>
      </div>

      {/* ── Body: sidebar + right panel (stacks vertically on mobile) ──────── */}
      <div className="flex flex-col lg:flex-row relative z-10" style={isPreview ? { minHeight: 900 } : { minHeight: 'calc(100vh - 64px)' }}>

        {/* DESKTOP left sidebar: 40% sticky, hidden on mobile */}
        <aside
          className={`hidden lg:block ${isPreview ? '' : 'lg:sticky lg:top-16'} shrink-0 overflow-y-auto`}
          style={{ width: '40%', height: isPreview ? 'auto' : 'calc(100vh - 64px)', minHeight: isPreview ? 900 : undefined, borderRight: '2px dashed rgb(var(--color-on-background)/0.10)' }}
        >
          <DesktopSidebar
            profile={profile}
            accent={accent}
            pillData={pillData}
            layout={layout}
            resolvedTheme={resolvedTheme}
            upcomingEvents={upcomingEvents}
          />
        </aside>

        {/* Right panel (60% on desktop, full-width on mobile) */}
        <div
          className="flex-1 flex flex-col items-center lg:items-stretch lg:overflow-y-auto"
          style={{ paddingBottom: 96, ...auroraRightPanelStyle }}
        >

          {/* DESKTOP intro section — hidden on mobile */}
          <div
            className="hidden lg:flex flex-col gap-3 px-12 pt-10 pb-8"
            style={{ borderBottom: '2px dashed rgb(var(--color-on-background)/0.10)' }}
          >
            {profile.is_verified && (
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-primary uppercase tracking-wider">
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                Verified Creator
              </div>
            )}
            {profile.user_tier === 'local' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold self-start"
                    style={{ background: 'rgba(34,197,94,0.12)', color: '#16a34a', border: '1px solid rgba(34,197,94,0.25)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}>where_to_vote</span>
                Local Creator
              </span>
            )}
            {profile.user_tier === 'lantern' && (() => {
              const yrs = profile.lantern_since ? (Date.now() - new Date(profile.lantern_since).getTime()) / (365.25*24*60*60*1000) : 0
              const isMentor = yrs >= 3
              return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold self-start"
                      style={{ background: isMentor ? 'rgba(245,168,0,0.18)' : 'rgba(245,168,0,0.12)', color: '#F5A800', border: '1px solid rgba(245,168,0,0.25)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}>{isMentor ? 'local_fire_department' : 'light_mode'}</span>
                  {isMentor ? 'Lantern Mentor' : 'Lantern Creator'}
                </span>
              )
            })()}
            {profile.user_tier === 'beacon' && (() => {
              const inRecovery = !!profile.tier_recovery_until && new Date(profile.tier_recovery_until) > new Date()
              if (inRecovery) return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold self-start"
                      style={{ background: 'rgba(168,85,247,0.06)', color: 'rgba(168,85,247,0.5)', border: '1px solid rgba(168,85,247,0.2)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 13 }}>schedule</span>
                  Beacon · Reviewing
                </span>
              )
              const yrs = profile.beacon_since ? (Date.now() - new Date(profile.beacon_since).getTime()) / (365.25*24*60*60*1000) : 0
              const isLegacy = yrs >= 5
              return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold self-start"
                      style={{ background: isLegacy ? 'rgba(168,85,247,0.18)' : 'rgba(168,85,247,0.12)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.25)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}>{isLegacy ? 'auto_awesome' : 'workspace_premium'}</span>
                  {isLegacy ? 'Hall of Lights' : 'Beacon Creator'}
                </span>
              )
            })()}
            {!hasBioBlock && profile.bio && <p className="text-on-background/90 text-base leading-relaxed max-w-lg">{profile.bio}</p>}
            {viewerIsExplorer && <FollowButton makerId={profile.id} initialIsFollowing={isFollowing} />}
            {(isOwner || profile.show_city_mastery) && (
              <CityMasteryMap neighbourhoods={cityMasteryMap} isOwner={isOwner} sharingEnabled={profile.show_city_mastery} />
            )}
          </div>

          {/* MOBILE: layout-specific header + social links + mastery (hidden lg) */}
          <main className="w-full max-w-2xl px-4 py-8 flex flex-col gap-8 lg:hidden">

            {/* ── Profile header — switched on layoutPreset ─────────────────── */}
            {layout === 'poster'    && <PosterHeader    {...headerProps} />}
            {layout === 'editorial' && <EditorialHeader {...headerProps} />}
            {layout === 'minimal'   && <MinimalHeader   {...headerProps} />}
            {layout === 'reel'      && <ReelHeader      {...headerProps} />}
            {layout === 'corporate' && <CorporateHeader {...headerProps} />}
            {layout === 'stage'     && <StageHeader     {...headerProps} />}
            {layout === 'zine'      && <ZineHeader      {...headerProps} />}

            {/* Boarding-pass (default) ─────────────────────────────────────── */}
            {layout === 'boarding-pass' && (
              <header className="flex flex-col gap-3">
                <div className="relative" style={{ ['container-type' as string]: 'inline-size' }}>
                  {/* Paper card — torn bottom edge */}
                  <div
                    className="relative bg-[#FAF7F0] border-2 border-dashed border-outline-variant pb-6"
                    style={{
                      clipPath: 'polygon(0% 0%, 100% 0%, 100% calc(100% - 10px), 97% 100%, 93% calc(100% - 12px), 88% 100%, 82% calc(100% - 8px), 76% 100%, 69% calc(100% - 10px), 63% 100%, 57% calc(100% - 12px), 51% 100%, 44% calc(100% - 10px), 38% 100%, 31% calc(100% - 8px), 25% 100%, 19% calc(100% - 10px), 14% 100%, 8% calc(100% - 12px), 3% 100%, 0% calc(100% - 10px))',
                      ['--color-on-surface' as string]: '26 17 8',
                      ['--color-on-surface-variant' as string]: '90 65 55',
                    }}
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                    <div className="flex justify-between items-center px-8 pt-5 gap-3">
                      <span className="font-mono text-[9px] text-on-surface/60 uppercase tracking-[0.2em] leading-none">
                        BOARDING NOW · CULTURE PASS · {(profile.city ?? '').toUpperCase()} · {new Date().getFullYear()}
                      </span>
                      <span className="font-mono text-[9px] text-on-surface/60 leading-none shrink-0">
                        № {profile.id.slice(-6).toUpperCase()}
                      </span>
                    </div>
                    <div className="px-8 pt-4 pr-8">
                      <h1
                        className="font-display font-black text-on-surface uppercase leading-[0.9] tracking-tight"
                        style={{ fontSize: 'clamp(28px,11cqw,60px)', letterSpacing: '-0.04em' }}
                      >
                        {profile.display_name}
                      </h1>
                      <div className="flex flex-wrap items-center gap-3 mt-3">
                        <span className="font-mono text-[13px] text-on-surface/40">@{profile.username}</span>
                        {pillData && (
                          <span
                            className="font-mono text-[10px] px-3 py-1 uppercase tracking-widest"
                            style={{ background: pillData.background, color: pillData.color }}
                          >
                            {pillData.emoji} {pillData.label}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mx-8 mt-5 border-t-2 border-dashed border-outline-variant/30" />
                    <div className="flex flex-wrap gap-6 px-8 py-4">
                      {profile.cumulative_events_hosted > 0 && (
                        <div>
                          <div className="font-display font-black text-2xl text-on-surface leading-none">{profile.cumulative_events_hosted}</div>
                          <div className="font-mono text-[9px] text-on-surface/40 uppercase tracking-widest mt-1">EVENTS HOSTED</div>
                        </div>
                      )}
                      {profile.cumulative_unique_attendees > 0 && (
                        <div>
                          <div className="font-display font-black text-2xl text-on-surface leading-none">
                            {profile.cumulative_unique_attendees.toLocaleString('en-IN')}
                          </div>
                          <div className="font-mono text-[9px] text-on-surface/40 uppercase tracking-widest mt-1">PEOPLE ATTENDED</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Avatar overlapping card bottom-right */}
                  <div className="absolute bottom-0 right-6 translate-y-1/2 z-10">
                    <div className="relative w-24 h-24 rounded-full border-4 border-[#FAF7F0] overflow-hidden bg-surface-container shadow-md">
                      {profile.avatar_url ? (
                        <Image src={profile.avatar_url} alt={profile.display_name} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-display font-black text-3xl text-on-surface/30">
                          {profile.display_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Post-card: tier badges, bio, follow */}
                <div className="mt-12 flex flex-col items-start gap-3">
                  {profile.is_verified && (
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-primary uppercase tracking-wider">
                      <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                      Verified Creator
                    </div>
                  )}
                  {profile.user_tier === 'local' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
                          style={{ background: 'rgba(34,197,94,0.12)', color: '#16a34a', border: '1px solid rgba(34,197,94,0.25)' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}>where_to_vote</span>
                      Local Creator
                    </span>
                  )}
                  {profile.user_tier === 'lantern' && (() => {
                    const yrs = profile.lantern_since ? (Date.now() - new Date(profile.lantern_since).getTime()) / (365.25*24*60*60*1000) : 0
                    const isMentor = yrs >= 3
                    return (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
                            style={{ background: isMentor ? 'rgba(245,168,0,0.18)' : 'rgba(245,168,0,0.12)', color: '#F5A800', border: '1px solid rgba(245,168,0,0.25)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}>{isMentor ? 'local_fire_department' : 'light_mode'}</span>
                        {isMentor ? 'Lantern Mentor' : 'Lantern Creator'}
                      </span>
                    )
                  })()}
                  {profile.user_tier === 'beacon' && (() => {
                    const inRecovery = !!profile.tier_recovery_until && new Date(profile.tier_recovery_until) > new Date()
                    if (inRecovery) return (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
                            style={{ background: 'rgba(168,85,247,0.06)', color: 'rgba(168,85,247,0.5)', border: '1px solid rgba(168,85,247,0.2)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 13 }}>schedule</span>
                        Beacon · Reviewing
                      </span>
                    )
                    const yrs = profile.beacon_since ? (Date.now() - new Date(profile.beacon_since).getTime()) / (365.25*24*60*60*1000) : 0
                    const isLegacy = yrs >= 5
                    return (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
                            style={{ background: isLegacy ? 'rgba(168,85,247,0.18)' : 'rgba(168,85,247,0.12)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.25)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}>{isLegacy ? 'auto_awesome' : 'workspace_premium'}</span>
                        {isLegacy ? 'Hall of Lights' : 'Beacon Creator'}
                      </span>
                    )
                  })()}
                  {!hasBioBlock && profile.bio && <p className="text-on-surface/90 text-sm leading-relaxed">{profile.bio}</p>}
                  {viewerIsExplorer && <FollowButton makerId={profile.id} initialIsFollowing={isFollowing} />}
                </div>
              </header>
            )}

            {/* ── Profile-level social links ────────────────────────────────── */}
            {!hasSocialLinkBlocks && <ProfileSocialLinks socialLinks={profileSocial} />}

            {/* ── City mastery map ──────────────────────────────────────────── */}
            {(isOwner || profile.show_city_mastery) && (
              <CityMasteryMap
                neighbourhoods={cityMasteryMap}
                isOwner={isOwner}
                sharingEnabled={profile.show_city_mastery}
              />
            )}

          </main>

          {/* ── Shared: blocks + posts + footer (mobile & desktop) ─────────── */}
          <div className="w-full max-w-2xl lg:max-w-none px-4 lg:px-12 flex flex-col gap-8 py-8 mx-auto lg:mx-0">

            {/* Social links — desktop only, suppressed when social_link blocks exist */}
            {!hasSocialLinkBlocks && (
              <div className="hidden lg:block">
                <ProfileSocialLinks socialLinks={profileSocial} />
              </div>
            )}

            {/* ── Content blocks ────────────────────────────────────────────── */}
            {contentBlocks.length === 0 ? (
              <PublicPageEmptyState
                displayName={profile.display_name}
                isOwner={isOwner}
                isPreview={isPreview}
                followSlot={viewerIsExplorer ? <FollowButton makerId={profile.id} initialIsFollowing={isFollowing} /> : undefined}
              />
            ) : contentBlocks.map((block) => {
          switch (block.block_type) {

            // ── Original blocks ───────────────────────────────────────────
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
            case 'instagram_embed':
            case 'instagram_post':
              return (
                <ClickTracker key={block.id} blockId={block.id} creatorId={profile.id}>
                  <InstagramBlock block={block} />
                </ClickTracker>
              )
            case 'instagram_feed':
              return (
                <ClickTracker key={block.id} blockId={block.id} creatorId={profile.id}>
                  <InstagramFeedBlock block={block} />
                </ClickTracker>
              )
            case 'event_listing':
              return upcomingEvents.length > 0 ? (
                <ClickTracker key={block.id} blockId={block.id} creatorId={profile.id}>
                  <section
                    className={`relative ${
                      layout === 'corporate' || layout === 'stage'
                        ? 'card-surface rounded-2xl overflow-hidden bg-surface-container-high'
                        : ''
                    }`}
                  >
                    {/* Stacked depth shadow only makes sense on boarding-pass ticket stubs */}
                    {layout === 'boarding-pass' && upcomingEvents.length >= 3 && (
                      <div className="absolute inset-x-2 bottom-[-4px] h-full bg-[#FAF7F0] border border-dashed border-outline-variant/30 -z-10" />
                    )}
                    {layout === 'boarding-pass' && upcomingEvents.length >= 2 && (
                      <div className="absolute inset-x-1 bottom-[-2px] h-full bg-[#FAF7F0] border border-dashed border-outline-variant/30 -z-10" />
                    )}
                    <div className={`flex flex-col ${
                      layout === 'editorial' ? 'gap-0 divide-y divide-on-surface/10' :
                      layout === 'corporate' || layout === 'stage' ? 'gap-0 divide-y divide-on-surface/8' :
                      layout === 'zine' ? 'gap-1.5' :
                      'gap-3'
                    }`}>
                      {upcomingEvents.map((ev) => (
                        <EventCard key={ev.id} event={ev} layout={layout} discoverySource={discoverySource} />
                      ))}
                    </div>
                  </section>
                </ClickTracker>
              ) : null
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

            // ── Testimonials ──────────────────────────────────────────────
            case 'testimonial':
              return testimonials.length > 0 ? (
                <section key={block.id} className="flex flex-col gap-4">
                  <h3
                    className="font-display font-black text-on-surface uppercase"
                    style={{ fontSize: 'clamp(18px,3vw,24px)', letterSpacing: '-0.02em' }}
                  >
                    What Attendees Say
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {testimonials.slice(0, 6).map((t, i) => (
                      <div
                        key={i}
                        className="bg-[#FAF7F0] text-[#07070A] relative flex flex-col pt-6 px-4 pb-4 border border-outline-variant border-t-0"
                        style={{
                          clipPath: 'polygon(0% 12px, 3% 0, 8% 10px, 14% 2px, 19% 12px, 25% 0, 31% 10px, 38% 2px, 44% 12px, 51% 0, 57% 10px, 63% 2px, 69% 12px, 76% 0, 82% 10px, 88% 2px, 93% 12px, 97% 0, 100% 10px, 100% 100%, 0% 100%)',
                          boxShadow: '4px 4px 0px rgb(var(--color-background))',
                        }}
                      >
                        <span className="material-symbols-outlined text-primary opacity-40 absolute top-3 left-3 text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>format_quote</span>
                        <div className="flex gap-0.5 mb-2">
                          {[1,2,3,4,5].map((s) => (
                            <span
                              key={s}
                              className="material-symbols-outlined text-sm"
                              style={{ fontVariationSettings: `'FILL' ${s <= t.rating ? 1 : 0}`, color: '#F59E0B' }}
                            >star</span>
                          ))}
                        </div>
                        <p className="font-sans font-bold text-sm leading-relaxed flex-1">
                          &ldquo;{t.review}&rdquo;
                        </p>
                        <div className="mt-3 pt-3 border-t border-dashed border-[#a58b86] flex flex-col gap-0.5">
                          <span className="font-mono text-[11px] text-[#C04A00]">{t.reviewer_name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null

            // ── New blocks ────────────────────────────────────────────────
            case 'social_links_row':
              return (
                <ClickTracker key={block.id} blockId={block.id} creatorId={profile.id}>
                  <SocialLinksRowBlock block={block} />
                </ClickTracker>
              )
            case 'announcement': {
              const cfg = block.config as unknown as AnnouncementConfig
              return (
                <AnnouncementBlockClient
                  key={block.id}
                  text={cfg.text}
                  ctaLabel={cfg.cta_label}
                  ctaUrl={cfg.cta_url}
                  showCountdown={cfg.show_countdown}
                  countdownTarget={cfg.countdown_target}
                  backgroundStyle={cfg.background_style ?? 'primary'}
                  accent={accent}
                />
              )
            }
            case 'rsvp_link':
              return (
                <ClickTracker key={block.id} blockId={block.id} creatorId={profile.id}>
                  <RsvpLinkBlock block={block} />
                </ClickTracker>
              )
            case 'spotify_now_playing':
              return (
                <ClickTracker key={block.id} blockId={block.id} creatorId={profile.id}>
                  <SpotifyNowPlayingBlock block={block} />
                </ClickTracker>
              )
            case 'podcast_episode':
              return (
                <ClickTracker key={block.id} blockId={block.id} creatorId={profile.id}>
                  <PodcastEpisodeBlock block={block} />
                </ClickTracker>
              )
            case 'substack_preview': {
              const cfg = block.config as unknown as SubstackPreviewConfig
              const posts = substackPosts[cfg.publication_url] ?? []
              return (
                <ClickTracker key={block.id} blockId={block.id} creatorId={profile.id}>
                  <SubstackPreviewBlock block={block} posts={posts} />
                </ClickTracker>
              )
            }
            case 'newsletter_signup': {
              const cfg = block.config as unknown as NewsletterSignupConfig
              return (
                <NewsletterSignupBlock
                  key={block.id}
                  blockId={block.id}
                  profileId={profile.id}
                  config={cfg}
                />
              )
            }
            case 'support_tip': {
              const cfg = block.config as unknown as SupportTipConfigStored
              if (!decryptedUpiVpa) return null
              return (
                <SupportTipBlock
                  key={block.id}
                  message={cfg.message}
                  upiVpa={decryptedUpiVpa}
                  presetAmountsPaise={cfg.preset_amounts_paise}
                  thankYouMessage={cfg.thank_you_message}
                  creatorName={profile.display_name}
                />
              )
            }
            case 'event_calendar':
              return (
                <EventCalendarBlock
                  key={block.id}
                  block={block}
                  events={calendarEvents}
                  discoverySource={discoverySource}
                />
              )
            case 'past_events_gallery':
              return (
                <PastEventsGalleryBlock
                  key={block.id}
                  block={block}
                  events={pastEvents}
                  discoverySource={discoverySource}
                />
              )
            case 'event_series':
              return (
                <EventSeriesBlock
                  key={block.id}
                  block={block}
                  events={seriesEvents}
                  discoverySource={discoverySource}
                />
              )
            case 'community_stats':
              return (
                <CommunityStatsBlock
                  key={block.id}
                  block={block}
                  profile={profile}
                />
              )
            case 'creator_type_badge':
              return (
                <CreatorTypeBadgeBlock
                  key={block.id}
                  block={block}
                  profile={profile}
                />
              )
            case 'city_community':
              return (
                <CityCommunityBlock
                  key={block.id}
                  block={block}
                  profile={profile}
                />
              )
            case 'collab_invite':
              return (
                <ClickTracker key={block.id} blockId={block.id} creatorId={profile.id}>
                  <CollabInviteBlock block={block} profile={profile} />
                </ClickTracker>
              )
            case 'venue_partnership':
              return (
                <VenuePartnershipBlock
                  key={block.id}
                  block={block}
                  venueData={venueData}
                />
              )
            case 'white_label_event':
              return (
                <ClickTracker key={block.id} blockId={block.id} creatorId={profile.id}>
                  <WhiteLabelEventBlock block={block} />
                </ClickTracker>
              )

            // ── Wave 2 — India-first engagement blocks ────────────────────
            case 'whatsapp_community': {
              const cfg = block.config as unknown as WhatsAppCommunityConfig
              return (
                <ClickTracker key={block.id} blockId={block.id} creatorId={profile.id}>
                  <WhatsAppCommunityBlock
                    label={cfg.label}
                    inviteUrl={cfg.invite_url}
                    memberCountLabel={cfg.member_count_label}
                  />
                </ClickTracker>
              )
            }
            case 'music_player': {
              const cfg = block.config as unknown as MusicPlayerConfig
              return (
                <MusicPlayerBlock
                  key={block.id}
                  platform={cfg.platform ?? 'soundcloud'}
                  embedUrl={cfg.embed_url}
                  trackTitle={cfg.track_title}
                  artist={cfg.artist}
                />
              )
            }
            case 'booking_request': {
              const cfg = block.config as unknown as BookingRequestConfig
              return (
                <BookingRequestBlock
                  key={block.id}
                  blockId={block.id}
                  creatorId={profile.id}
                  label={cfg.label}
                  description={cfg.description}
                  categories={cfg.categories ?? []}
                  capacityStatus={bookingCapacity?.effective_status}
                />
              )
            }

            // ── Wave 3 — Social proof & embeds ───────────────────────────
            case 'press_feature': {
              const cfg = block.config as unknown as PressFeatureConfig
              return (
                <PressFeatureBlock
                  key={block.id}
                  features={cfg.features ?? []}
                  heading={cfg.heading}
                  accent={accent}
                />
              )
            }
            case 'twitter_embed': {
              const cfg = block.config as unknown as TwitterEmbedConfig
              return (
                <TwitterEmbedBlock
                  key={block.id}
                  tweetUrl={cfg.tweet_url}
                  handle={cfg.handle}
                  caption={cfg.caption}
                  accent={accent}
                />
              )
            }
            case 'awards_badges': {
              const cfg = block.config as unknown as AwardsBadgesConfig
              return (
                <AwardsBadgesBlock
                  key={block.id}
                  badges={cfg.badges ?? []}
                  heading={cfg.heading}
                  accent={accent}
                />
              )
            }

            // ── Wave 4 — Direct monetisation ─────────────────────────────
            case 'digital_product': {
              const cfg = block.config as unknown as DigitalProductConfig
              return (
                <DigitalProductBlock
                  key={block.id}
                  blockId={block.id}
                  title={cfg.title}
                  description={cfg.description}
                  pricePaise={cfg.price_paise}
                  coverImageUrl={cfg.cover_image_url}
                  accent={accent}
                />
              )
            }
            case 'waitlist': {
              const cfg = block.config as unknown as WaitlistConfig
              return (
                <WaitlistBlock
                  key={block.id}
                  blockId={block.id}
                  label={cfg.label}
                  description={cfg.description}
                  accent={accent}
                />
              )
            }
            case 'fan_membership': {
              const cfg = block.config as unknown as FanMembershipConfig
              return (
                <FanMembershipBlock
                  key={block.id}
                  tiers={cfg.tiers ?? []}
                  heading={cfg.heading}
                  accent={accent}
                />
              )
            }
            case 'shop_the_look': {
              const cfg = block.config as unknown as ShopTheLookConfig
              return (
                <ShopTheLookBlock
                  key={block.id}
                  title={cfg.title}
                  items={cfg.items ?? []}
                  products={shopTheLookProducts}
                  accent={accent}
                />
              )
            }

            default:
              return null
          }
        })}

        {/* ── Creator posts ────────────────────────────────────────────── */}
        {(posts.length > 0 || isOwner) && (
          <CreatorPostsSection
            initialPosts={posts}
            isOwner={isOwner}
            viewerUserId={viewerUserId}
            creatorUsername={profile.username}
          />
        )}

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <footer className="flex flex-col items-center lg:items-start gap-4 pt-12 pb-8">
          <div className="flex items-center gap-2 grayscale opacity-50">
            <WimcWordmark color={wordmarkColor} height={20} />
          </div>
          <Link
            href="/signin"
            className="text-on-surface-variant text-sm hover:text-primary transition-colors flex items-center gap-1"
          >
            Create your own page
            <span className="material-symbols-outlined text-sm">arrow_right_alt</span>
          </Link>
        </footer>

          </div>{/* end shared content */}
        </div>{/* end right panel */}
      </div>{/* end body flex */}

      {/* ── DESKTOP bottom CTA bar ──────────────────────────────────────────── */}
      {!isPreview && <div
        className="hidden lg:flex fixed bottom-0 right-0 z-50 items-center justify-between px-8"
        style={{ width: '60%', height: 72, background: 'rgb(var(--color-background)/0.94)', backdropFilter: 'blur(8px)', borderTop: '2px dashed rgb(var(--color-on-background)/0.10)', boxShadow: '0 -10px 30px rgba(0,0,0,0.25)' }}
      >
        {nextEvent ? (
          <>
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'rgb(var(--color-on-background)/0.45)' }}>NEXT UP</span>
              <span className="font-display font-bold text-sm truncate max-w-[240px]" style={{ color: 'rgb(var(--color-on-background))' }}>{nextEvent.title}</span>
              <span className="font-mono text-[11px]" style={{ color: 'rgb(var(--color-on-background)/0.6)' }}>{formatShortDate(nextEvent.starts_at)}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-display font-black text-xl" style={{ color: 'rgb(var(--color-primary))' }}>
                {nextEvent.ticket_price === 0 ? 'FREE' : `₹${(nextEvent.ticket_price / 100).toLocaleString('en-IN')}`}
              </span>
              <Link
                href={`/events/${nextEvent.id}`}
                className="font-mono text-sm px-5 py-2.5 rounded transition-colors"
                style={{ background: 'rgb(var(--color-primary))', color: 'rgb(var(--color-on-primary))' }}
              >
                Get tickets →
              </Link>
            </div>
          </>
        ) : (
          <div className="flex w-full items-center justify-center">
            <Link href="/signin" className="font-mono text-sm" style={{ color: 'rgb(var(--color-on-background)/0.6)' }}>
              Create your own page on WIMC →
            </Link>
          </div>
        )}
      </div>}

      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
      />
      <style>{`.material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }`}</style>
    </div>
  )
})

export default PublicProfilePage
