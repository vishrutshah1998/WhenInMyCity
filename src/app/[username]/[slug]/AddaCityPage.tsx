'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import type { AddaProfile, Event, UserProfile } from '@/types/database'
import { WimcWordmark } from '@/components/WimcWordmark'
import type { PricingConfig } from '@/types/marketplace'
import { BottomNav } from '@/components/ui/BottomNav'

// ─── Types ────────────────────────────────────────────────────────────────────

interface UpcomingEvent extends Event {
  maker: Pick<UserProfile, 'display_name' | 'username' | 'avatar_url' | 'creator_type'>
}

interface PastEvent {
  title: string
  date: string
  attendee_count: number
  cover_image_url: string | null
}

interface Props {
  adda: AddaProfile
  upcomingEvents: UpcomingEvent[]
  pastEvents: PastEvent[]
  stats: { total_events: number; average_rating: number }
}

type AddaTheme = {
  bg: string
  bgCard: string
  bgPanel: string
  primary: string
  primaryDim: string
  primaryBg: string
  text: string
  textMuted: string
  border: string
  borderSolid: string
  badgeBg: string
  badgeText: string
  heroGradient: string
  glowColor: string
  label: string
}

// ─── Per-type design themes ───────────────────────────────────────────────────

const THEMES: Record<string, AddaTheme> = {
  cafe: {
    label: 'CAFÉ',
    bg: '#120D07',
    bgCard: '#1E1209',
    bgPanel: '#241609',
    primary: '#D4924A',
    primaryDim: 'rgba(212,146,74,0.3)',
    primaryBg: 'rgba(212,146,74,0.08)',
    text: '#F5ECD7',
    textMuted: '#A8936E',
    border: 'rgba(212,146,74,0.25)',
    borderSolid: '#3D2A14',
    badgeBg: '#D4924A',
    badgeText: '#120D07',
    heroGradient: 'linear-gradient(to top, #120D07 0%, rgba(18,13,7,0.7) 40%, rgba(18,13,7,0.2) 100%)',
    glowColor: 'rgba(212,146,74,0.15)',
  },
  coworking: {
    label: 'COWORKING',
    bg: '#080E1A',
    bgCard: '#0D1425',
    bgPanel: '#101A2E',
    primary: '#3B82F6',
    primaryDim: 'rgba(59,130,246,0.3)',
    primaryBg: 'rgba(59,130,246,0.07)',
    text: '#E8EFF8',
    textMuted: '#6B89B4',
    border: 'rgba(59,130,246,0.22)',
    borderSolid: '#1A2A45',
    badgeBg: '#3B82F6',
    badgeText: '#080E1A',
    heroGradient: 'linear-gradient(to top, #080E1A 0%, rgba(8,14,26,0.7) 40%, rgba(8,14,26,0.2) 100%)',
    glowColor: 'rgba(59,130,246,0.12)',
  },
  gallery: {
    label: 'GALLERY',
    bg: '#050505',
    bgCard: '#0C0C0C',
    bgPanel: '#111111',
    primary: '#C9A84C',
    primaryDim: 'rgba(201,168,76,0.3)',
    primaryBg: 'rgba(201,168,76,0.06)',
    text: '#F0ECE2',
    textMuted: '#8A7A5E',
    border: 'rgba(201,168,76,0.2)',
    borderSolid: '#2A2416',
    badgeBg: '#C9A84C',
    badgeText: '#050505',
    heroGradient: 'linear-gradient(to top, #050505 0%, rgba(5,5,5,0.65) 45%, rgba(5,5,5,0.15) 100%)',
    glowColor: 'rgba(201,168,76,0.1)',
  },
  community_hall: {
    label: 'COMMUNITY HALL',
    bg: '#0F0900',
    bgCard: '#1A1000',
    bgPanel: '#201400',
    primary: '#F59E0B',
    primaryDim: 'rgba(245,158,11,0.3)',
    primaryBg: 'rgba(245,158,11,0.08)',
    text: '#FFF5E0',
    textMuted: '#B08020',
    border: 'rgba(245,158,11,0.25)',
    borderSolid: '#3D2E00',
    badgeBg: '#F59E0B',
    badgeText: '#0F0900',
    heroGradient: 'linear-gradient(to top, #0F0900 0%, rgba(15,9,0,0.7) 40%, rgba(15,9,0,0.15) 100%)',
    glowColor: 'rgba(245,158,11,0.15)',
  },
  rooftop: {
    label: 'ROOFTOP',
    bg: '#03071E',
    bgCard: '#090720',
    bgPanel: '#0D0B2A',
    primary: '#A855F7',
    primaryDim: 'rgba(168,85,247,0.3)',
    primaryBg: 'rgba(168,85,247,0.08)',
    text: '#EDE8FF',
    textMuted: '#7060A8',
    border: 'rgba(168,85,247,0.22)',
    borderSolid: '#1E1550',
    badgeBg: '#A855F7',
    badgeText: '#03071E',
    heroGradient: 'linear-gradient(to top, #03071E 0%, rgba(3,7,30,0.65) 45%, rgba(3,7,30,0.15) 100%)',
    glowColor: 'rgba(168,85,247,0.12)',
  },
  garden: {
    label: 'GARDEN',
    bg: '#020B05',
    bgCard: '#061508',
    bgPanel: '#0A1F0C',
    primary: '#22C55E',
    primaryDim: 'rgba(34,197,94,0.3)',
    primaryBg: 'rgba(34,197,94,0.07)',
    text: '#E8F5EC',
    textMuted: '#4A8A5E',
    border: 'rgba(34,197,94,0.22)',
    borderSolid: '#102A18',
    badgeBg: '#22C55E',
    badgeText: '#020B05',
    heroGradient: 'linear-gradient(to top, #020B05 0%, rgba(2,11,5,0.65) 40%, rgba(2,11,5,0.15) 100%)',
    glowColor: 'rgba(34,197,94,0.12)',
  },
  studio: {
    label: 'STUDIO',
    bg: '#090505',
    bgCard: '#130808',
    bgPanel: '#1A0A0A',
    primary: '#EF4444',
    primaryDim: 'rgba(239,68,68,0.3)',
    primaryBg: 'rgba(239,68,68,0.07)',
    text: '#FFE8E8',
    textMuted: '#8A4444',
    border: 'rgba(239,68,68,0.2)',
    borderSolid: '#2A1010',
    badgeBg: '#EF4444',
    badgeText: '#090505',
    heroGradient: 'linear-gradient(to top, #090505 0%, rgba(9,5,5,0.7) 40%, rgba(9,5,5,0.15) 100%)',
    glowColor: 'rgba(239,68,68,0.12)',
  },
  library: {
    label: 'LIBRARY',
    bg: '#0E0B07',
    bgCard: '#181310',
    bgPanel: '#201A14',
    primary: '#D4B896',
    primaryDim: 'rgba(212,184,150,0.3)',
    primaryBg: 'rgba(212,184,150,0.07)',
    text: '#F5EDD8',
    textMuted: '#7A6850',
    border: 'rgba(212,184,150,0.2)',
    borderSolid: '#2E2416',
    badgeBg: '#D4B896',
    badgeText: '#0E0B07',
    heroGradient: 'linear-gradient(to top, #0E0B07 0%, rgba(14,11,7,0.7) 40%, rgba(14,11,7,0.2) 100%)',
    glowColor: 'rgba(212,184,150,0.1)',
  },
  restaurant: {
    label: 'RESTAURANT',
    bg: '#0A0203',
    bgCard: '#150508',
    bgPanel: '#1C060A',
    primary: '#DC2626',
    primaryDim: 'rgba(220,38,38,0.3)',
    primaryBg: 'rgba(220,38,38,0.07)',
    text: '#FFE8E8',
    textMuted: '#8A3030',
    border: 'rgba(220,38,38,0.22)',
    borderSolid: '#2E0C0C',
    badgeBg: '#DC2626',
    badgeText: '#0A0203',
    heroGradient: 'linear-gradient(to top, #0A0203 0%, rgba(10,2,3,0.7) 40%, rgba(10,2,3,0.2) 100%)',
    glowColor: 'rgba(220,38,38,0.12)',
  },
  default: {
    label: 'ADDA',
    bg: '#07070A',
    bgCard: '#111117',
    bgPanel: '#1A2744',
    primary: '#5DD9D0',
    primaryDim: 'rgba(93,217,208,0.3)',
    primaryBg: 'rgba(93,217,208,0.08)',
    text: '#F0EFF8',
    textMuted: '#9896B0',
    border: 'rgba(93,217,208,0.22)',
    borderSolid: '#57423e',
    badgeBg: '#5DD9D0',
    badgeText: '#07070A',
    heroGradient: 'linear-gradient(to top, #07070A 0%, rgba(7,7,10,0.7) 40%, rgba(7,7,10,0.15) 100%)',
    glowColor: 'rgba(93,217,208,0.12)',
  },
}

function getTheme(types: string[]): AddaTheme {
  const t = (types[0] ?? '').toLowerCase()
  for (const key of Object.keys(THEMES)) {
    if (t === key) return THEMES[key]
  }
  if (t.includes('cafe')) return THEMES.cafe
  if (t.includes('cowork')) return THEMES.coworking
  if (t.includes('gallery')) return THEMES.gallery
  if (t.includes('community')) return THEMES.community_hall
  if (t.includes('rooftop')) return THEMES.rooftop
  if (t.includes('garden') || t.includes('outdoor')) return THEMES.garden
  if (t.includes('studio')) return THEMES.studio
  if (t.includes('library')) return THEMES.library
  if (t.includes('restaurant') || t.includes('bar')) return THEMES.restaurant
  return THEMES.default
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type GoogleReview = { author_name: string; rating: number; text: string; time: number }
type AddaExtended = AddaProfile & {
  google_reviews?: GoogleReview[]
  google_rating?: number
  google_photo_urls?: string[]
  website?: string
  phone?: string
  alcohol_license?: boolean
  sound_curfew_time?: string
  capacity_configurations?: Array<{ type: string; capacity: number }>
}

function getHourlyRate(adda: AddaProfile): number | null {
  if (adda.pricing_model !== 'fixed_rental') return null
  const cfg = adda.pricing_config as PricingConfig | null
  return cfg?.fixed_rental_paise != null ? Math.round(cfg.fixed_rental_paise / 100) : null
}

function pricingLabel(adda: AddaProfile): string {
  const hourlyRate = getHourlyRate(adda)
  if (hourlyRate != null) return `₹${hourlyRate.toLocaleString('en-IN')} / hr`
  const cfg = adda.pricing_config as Record<string, number> | null
  if (adda.pricing_model === 'door_split' && cfg?.door_split_percent)
    return `${cfg.door_split_percent}% DOOR SPLIT`
  if (adda.pricing_model === 'f_and_b_minimum' && cfg?.f_and_b_minimum_paise)
    return `₹${Math.round(cfg.f_and_b_minimum_paise / 100).toLocaleString('en-IN')} MIN SPEND`
  return adda.pricing_model?.replace(/_/g, ' ').toUpperCase() ?? 'ENQUIRE'
}

function amenityIcon(a: string): string {
  const s = a.toLowerCase()
  if (s.includes('wifi') || s.includes('internet')) return 'wifi'
  if (s.includes('pa') || s.includes('sound') || s.includes('speaker')) return 'speaker_group'
  if (s.includes('bar') || s.includes('alcohol')) return 'local_bar'
  if (s.includes('stage') || s.includes('theater') || s.includes('perform')) return 'theater_comedy'
  if (s.includes('project') || s.includes('screen')) return 'videocam'
  if (s.includes('park')) return 'local_parking'
  if (s.includes('ac') || s.includes('cool')) return 'ac_unit'
  if (s.includes('accessible') || s.includes('wheelchair')) return 'accessible'
  if (s.includes('kitchen') || s.includes('catering')) return 'kitchen'
  if (s.includes('outdoor') || s.includes('garden')) return 'park'
  if (s.includes('natural') || s.includes('sunlight')) return 'wb_sunny'
  if (s.includes('whiteboard') || s.includes('board')) return 'edit_square'
  if (s.includes('coffee') || s.includes('tea')) return 'local_cafe'
  if (s.includes('food')) return 'restaurant'
  if (s.includes('light') || s.includes('led')) return 'lightbulb'
  if (s.includes('micro')) return 'mic'
  if (s.includes('power')) return 'bolt'
  if (s.includes('photo')) return 'photo_camera'
  if (s.includes('dj')) return 'queue_music'
  if (s.includes('smoking')) return 'smoking_rooms'
  if (s.includes('late') || s.includes('night')) return 'nightlife'
  if (s.includes('transit') || s.includes('metro')) return 'directions_transit'
  return 'check_circle'
}

function waLink(num: string | null): string {
  if (!num) return '#'
  return `https://wa.me/${num.replace(/\D/g, '').replace(/^(?!91)/, '91')}`
}

function gmapsLink(adda: AddaProfile): string {
  if (adda.lat && adda.lng) return `https://maps.google.com/?q=${adda.lat},${adda.lng}`
  return `https://maps.google.com/?q=${encodeURIComponent(adda.address + ', ' + adda.city)}`
}

const MOB_DAYS = [
  { label: 'M', full: 'monday' },
  { label: 'T', full: 'tuesday' },
  { label: 'W', full: 'wednesday' },
  { label: 'T', full: 'thursday' },
  { label: 'F', full: 'friday' },
  { label: 'S', full: 'saturday' },
  { label: 'S', full: 'sunday' },
]

function isDayAvail(full: string, days: string[]): boolean {
  if (!days?.length) return false
  return days.some(d => {
    const n = d.toLowerCase().trim()
    return n === full || full.startsWith(n) || n.startsWith(full.slice(0, 3))
  })
}

function getCalendarData() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const monthLabel = now.toLocaleString('en-IN', { month: 'long', year: 'numeric' }).toUpperCase()
  const firstDow = new Date(year, month, 1).getDay()
  const startOffset = (firstDow + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const allSlots: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  const dateRows: (number | null)[][] = []
  for (let row = 0; row < 6; row++) {
    const slice = allSlots.slice(row * 7, row * 7 + 7)
    if (slice.length === 0) break
    while (slice.length < 7) slice.push(null)
    if (slice.some((v): v is number => v !== null)) dateRows.push(slice)
  }
  return { monthLabel, dayHeaders: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'], dateRows }
}

function isDateAvailable(date: number, availableDays: string[]): boolean {
  if (!availableDays?.length) return false
  const now = new Date()
  const dow = new Date(now.getFullYear(), now.getMonth(), date).getDay()
  const FULL_DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  return isDayAvail(FULL_DAYS[dow], availableDays)
}

// ─── Gallery component ────────────────────────────────────────────────────────

function Gallery({ images, primary }: { images: string[]; primary: string }) {
  const [active, setActive] = useState<string | null>(null)
  if (!images.length) return null
  const shown = images.slice(0, 6)

  return (
    <>
      {active && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 cursor-pointer"
          onClick={() => setActive(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full mx-4">
            <Image
              src={active}
              alt="Gallery photo"
              width={1200}
              height={800}
              className="w-full h-auto object-contain max-h-[90vh]"
              unoptimized
            />
            <button
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
              onClick={() => setActive(null)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {shown.map((src, i) => (
          <div
            key={i}
            className={`relative overflow-hidden cursor-pointer group ${i === 0 ? 'col-span-2 row-span-2 aspect-[4/3]' : 'aspect-square'}`}
            onClick={() => setActive(src)}
            style={{ border: `1px solid ${primary}22` }}
          >
            <Image
              src={src}
              alt={`Photo ${i + 1}`}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              unoptimized
            />
            {i === shown.length - 1 && images.length > 6 && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="font-mono text-white text-[14px] font-bold">+{images.length - 6} MORE</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AddaCityPage({ adda, stats }: Props) {
  const ext = adda as unknown as AddaExtended
  const theme = getTheme(adda.adda_type)
  const hourlyRate = getHourlyRate(adda)
  const pricing = pricingLabel(adda)
  const googleReviews = (ext.google_reviews ?? []).filter(r => r.text)
  const galleryImages = [
    ...adda.gallery_images,
    ...(ext.google_photo_urls ?? []),
  ].filter(Boolean).slice(0, 12)
  const capacityConfigs = (ext.capacity_configurations ?? []) as Array<{ type: string; capacity: number }>
  const { monthLabel, dayHeaders, dateRows } = getCalendarData()
  const waUrl = waLink(adda.contact_whatsapp)
  const mapsUrl = gmapsLink(adda)
  const cityPath = adda.city.toLowerCase().replace(/\s+/g, '-')
  const exploreHref = `/explore?city=${cityPath}&tab=venues`

  const typeLabels = adda.adda_type.map(t => t.replace(/_/g, ' ').toUpperCase()).join(' · ')

  return (
    <>
      <style>{`
        @keyframes city-marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .city-marquee { animation: city-marquee 28s linear infinite; }
        .stamp-press:active { transform: scale(0.97); }
        @keyframes city-grain {
          0%, 100% { opacity: 0.025; }
          50%       { opacity: 0.035; }
        }
        .city-grain {
          animation: city-grain 4s ease-in-out infinite;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        }
      `}</style>

      {/* Grain overlay */}
      <div className="city-grain fixed inset-0 pointer-events-none z-[999]" aria-hidden />

      {/* ═══════════════════════════ DESKTOP ═══════════════════════════════════ */}
      <div
        className="hidden lg:flex flex-col min-h-screen"
        style={{ background: theme.bg, color: theme.text }}
      >
        {/* Header */}
        <header
          className="sticky top-0 h-16 z-50 flex items-center justify-between px-8 border-b-2 border-dashed backdrop-blur-sm"
          style={{
            background: `${theme.bg}f0`,
            borderColor: theme.border,
          }}
        >
          <Link href="/explore">
            <WimcWordmark color="white" height={26} />
          </Link>
          <nav className="flex items-center gap-8">
            <Link
              href={exploreHref}
              className="font-mono text-[11px] uppercase tracking-wider transition-colors no-underline"
              style={{ color: theme.primary }}
            >
              ← {adda.city.toUpperCase()}
            </Link>
            <Link
              href="/explore"
              className="font-mono text-[11px] uppercase tracking-wider no-underline"
              style={{ color: `${theme.text}60` }}
            >
              EXPLORE
            </Link>
          </nav>
          <Link
            href="/onboarding/business/B2"
            className="font-mono text-[11px] px-5 py-2 uppercase tracking-wider transition-all no-underline border"
            style={{
              color: theme.primary,
              borderColor: theme.primary,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLAnchorElement).style.background = theme.primary
              ;(e.currentTarget as HTMLAnchorElement).style.color = theme.bg
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'
              ;(e.currentTarget as HTMLAnchorElement).style.color = theme.primary
            }}
          >
            List your Space →
          </Link>
        </header>

        {/* Hero — full-bleed cover image or themed gradient */}
        <div className="relative h-[55vh] overflow-hidden">
          {adda.cover_image_url ? (
            <Image
              src={adda.cover_image_url}
              alt={adda.name}
              fill
              className="object-cover"
              priority
              unoptimized
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(ellipse at 30% 60%, ${theme.primaryBg}, transparent 70%), ${theme.bgPanel}`,
              }}
            />
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0" style={{ background: theme.heroGradient }} />

          {/* Glow */}
          <div
            className="absolute bottom-0 left-0 right-0 h-1/3"
            style={{ background: `linear-gradient(to top, ${theme.glowColor}, transparent)` }}
          />

          {/* Type badge */}
          <div className="absolute top-6 left-8 flex items-center gap-2">
            <span
              className="font-mono text-[10px] font-bold px-3 py-1.5 uppercase tracking-wider"
              style={{ background: theme.badgeBg, color: theme.badgeText }}
            >
              {theme.label}
            </span>
            {adda.is_verified && (
              <span
                className="font-mono text-[10px] px-3 py-1.5 uppercase tracking-wider border flex items-center gap-1"
                style={{ color: theme.primary, borderColor: theme.border, background: `${theme.bg}cc` }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 12, fontVariationSettings: "'FILL' 1" }}>
                  verified
                </span>
                VERIFIED
              </span>
            )}
            {adda.trending_until && new Date(adda.trending_until) > new Date() && (
              <span
                className="font-mono text-[10px] px-3 py-1.5 uppercase tracking-wider border"
                style={{ color: theme.primary, borderColor: theme.primaryDim, background: `${theme.bg}cc` }}
              >
                TRENDING
              </span>
            )}
          </div>

          {/* Breadcrumb */}
          <div className="absolute top-6 right-8">
            <span
              className="font-mono text-[10px] uppercase tracking-widest"
              style={{ color: `${theme.text}60` }}
            >
              WHENINMYCITY.COM / {adda.city.toUpperCase()} / {adda.slug.toUpperCase()}
            </span>
          </div>

          {/* Hero title */}
          <div className="absolute bottom-0 left-0 right-0 px-8 pb-8">
            <h1
              className="font-display font-extrabold uppercase leading-none mb-3"
              style={{
                fontSize: 'clamp(52px, 6vw, 96px)',
                color: theme.text,
                textShadow: '0 4px 24px rgba(0,0,0,0.6)',
              }}
            >
              {adda.name}
            </h1>
            <div className="flex items-center gap-3 flex-wrap">
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 no-underline transition-opacity hover:opacity-70"
                style={{ color: theme.textMuted }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>location_on</span>
                <span className="font-mono text-[11px] uppercase tracking-wide">
                  {adda.neighbourhood ? `${adda.neighbourhood}, ` : ''}{adda.city}
                </span>
              </a>
              {typeLabels && (
                <span style={{ color: theme.primaryDim }}>·</span>
              )}
              <span className="font-mono text-[11px] uppercase tracking-wide" style={{ color: theme.primary }}>
                {typeLabels}
              </span>
              {ext.google_rating && (
                <>
                  <span style={{ color: theme.primaryDim }}>·</span>
                  <span className="font-mono text-[11px] flex items-center gap-1" style={{ color: '#F59E0B' }}>
                    ★ {ext.google_rating.toFixed(1)} Google
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Two-column body */}
        <div className="flex flex-1">

          {/* ── LEFT PANEL ────────────────────────────────────────────────── */}
          <div
            className="w-[36%] overflow-y-auto border-r-2 border-dashed"
            style={{ borderColor: theme.border, background: theme.bgPanel, paddingBottom: 120 }}
          >
            <div className="p-8 flex flex-col gap-10">

              {/* Quick Info */}
              <div>
                <p
                  className="font-mono text-[10px] uppercase tracking-[0.25em] mb-4 font-bold"
                  style={{ color: theme.primary }}
                >
                  QUICK DETAILS
                </p>
                {[
                  { label: 'TYPE', value: typeLabels || '—' },
                  { label: 'CAPACITY', value: adda.capacity_max ? `${adda.capacity_min ?? 1}–${adda.capacity_max} PEOPLE` : '—' },
                  { label: 'LEAD TIME', value: adda.lead_time_weeks ? `${adda.lead_time_weeks} WEEKS` : '—' },
                  { label: 'PRICING', value: pricing },
                  ...(ext.alcohol_license ? [{ label: 'BAR', value: 'LICENSED' }] : []),
                  ...(ext.sound_curfew_time ? [{ label: 'SOUND CURFEW', value: ext.sound_curfew_time }] : []),
                ].map(row => (
                  <div
                    key={row.label}
                    className="flex justify-between items-center py-3 border-b border-dashed"
                    style={{ borderColor: theme.border }}
                  >
                    <span className="font-mono text-[10px] uppercase" style={{ color: `${theme.text}50` }}>
                      {row.label}
                    </span>
                    <span
                      className="font-mono text-[13px] font-bold text-right"
                      style={{ color: theme.primary, fontFamily: 'var(--font-barlow)' }}
                    >
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Capacity configurations */}
              {capacityConfigs.length > 0 && (
                <div>
                  <p
                    className="font-mono text-[10px] uppercase tracking-[0.25em] mb-4 font-bold"
                    style={{ color: theme.primary }}
                  >
                    ROOM SETUPS
                  </p>
                  <div className="flex flex-col gap-2">
                    {capacityConfigs.map((cfg, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center px-3 py-2 border"
                        style={{ borderColor: theme.border, background: theme.primaryBg }}
                      >
                        <span className="font-mono text-[11px] uppercase" style={{ color: theme.text }}>
                          {cfg.type.replace(/_/g, ' ')}
                        </span>
                        <span
                          className="font-display font-extrabold text-[18px]"
                          style={{ color: theme.primary }}
                        >
                          {cfg.capacity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Availability calendar */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <p
                    className="font-mono text-[10px] uppercase tracking-[0.25em] font-bold"
                    style={{ color: theme.primary }}
                  >
                    AVAILABILITY
                  </p>
                  <p className="font-mono text-[10px] uppercase" style={{ color: `${theme.text}40` }}>
                    {monthLabel}
                  </p>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-1">
                  {dayHeaders.map(d => (
                    <div
                      key={d}
                      className="font-mono text-[8px] uppercase text-center py-1"
                      style={{ color: `${theme.text}40` }}
                    >
                      {d}
                    </div>
                  ))}
                </div>

                {dateRows.map((row, ri) => (
                  <div key={ri} className="grid grid-cols-7 gap-1 mb-1">
                    {row.map((date, ci) => {
                      if (date === null) return <div key={`e-${ri}-${ci}`} className="py-2" />
                      const active = isDateAvailable(date, adda.available_days)
                      const isToday = date === new Date().getDate()
                      return (
                        <div
                          key={date}
                          className="py-2 text-center transition-colors cursor-default border"
                          style={{
                            background: active ? theme.primaryBg : `${theme.bg}80`,
                            borderColor: active
                              ? isToday ? theme.primary : theme.primaryDim
                              : `${theme.text}10`,
                            opacity: active ? 1 : 0.4,
                          }}
                        >
                          <span
                            className="font-mono text-[10px] font-bold"
                            style={{ color: active ? theme.primary : theme.textMuted }}
                          >
                            {date}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>

              {/* Contact */}
              <div>
                <p
                  className="font-mono text-[10px] uppercase tracking-[0.25em] mb-4 font-bold"
                  style={{ color: theme.primary }}
                >
                  GET IN TOUCH
                </p>
                <div className="flex flex-col gap-3">
                  {adda.contact_whatsapp && (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-3 border no-underline transition-opacity hover:opacity-80"
                      style={{ borderColor: theme.primary, background: theme.primaryBg }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 20, color: theme.primary }}>chat</span>
                      <span className="font-mono text-[12px] font-bold uppercase" style={{ color: theme.primary }}>
                        Chat on WhatsApp
                      </span>
                    </a>
                  )}
                  {ext.phone && (
                    <a
                      href={`tel:${ext.phone}`}
                      className="flex items-center gap-3 px-4 py-3 border no-underline transition-opacity hover:opacity-80"
                      style={{ borderColor: theme.border, background: theme.bgCard }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 20, color: theme.primary }}>call</span>
                      <span className="font-mono text-[12px] uppercase" style={{ color: theme.text }}>{ext.phone}</span>
                    </a>
                  )}
                  {adda.contact_email && (
                    <a
                      href={`mailto:${adda.contact_email}`}
                      className="flex items-center gap-3 px-4 py-3 border no-underline transition-opacity hover:opacity-80"
                      style={{ borderColor: theme.border, background: theme.bgCard }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 20, color: theme.primary }}>mail</span>
                      <span className="font-mono text-[12px] uppercase" style={{ color: theme.text }}>
                        {adda.contact_email}
                      </span>
                    </a>
                  )}
                  {adda.instagram_handle && (
                    <a
                      href={adda.instagram_handle.startsWith('http') ? adda.instagram_handle : `https://instagram.com/${adda.instagram_handle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-3 border no-underline transition-opacity hover:opacity-80"
                      style={{ borderColor: theme.border, background: theme.bgCard }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 20, color: theme.primary }}>photo_camera</span>
                      <span className="font-mono text-[12px] uppercase" style={{ color: theme.text }}>
                        @{adda.instagram_handle}
                      </span>
                    </a>
                  )}
                  {ext.website && (
                    <a
                      href={ext.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-3 border no-underline transition-opacity hover:opacity-80"
                      style={{ borderColor: theme.border, background: theme.bgCard }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 20, color: theme.primary }}>language</span>
                      <span className="font-mono text-[12px] uppercase" style={{ color: theme.text }}>
                        Visit Website
                      </span>
                    </a>
                  )}
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 border no-underline transition-opacity hover:opacity-80"
                    style={{ borderColor: theme.border, background: theme.bgCard }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 20, color: theme.primary }}>location_on</span>
                    <span className="font-mono text-[11px] uppercase leading-snug" style={{ color: theme.textMuted }}>
                      {adda.address}
                    </span>
                  </a>
                </div>
              </div>

            </div>
          </div>

          {/* ── RIGHT PANEL ───────────────────────────────────────────────── */}
          <div
            className="flex-1 overflow-y-auto"
            style={{ background: theme.bg, paddingBottom: 120 }}
          >
            <div className="p-10 flex flex-col gap-14">

              {/* Stats strip */}
              <div
                className="grid grid-cols-4 border border-dashed"
                style={{ borderColor: theme.border }}
              >
                {[
                  { label: 'EVENTS HOSTED', value: adda.total_events_hosted.toString() },
                  { label: 'CAPACITY', value: adda.capacity_max ? adda.capacity_max.toString() : '—' },
                  { label: 'GOOGLE RATING',
                    value: ext.google_rating ? `${ext.google_rating.toFixed(1)} ★` : adda.average_maker_rating > 0 ? `${adda.average_maker_rating.toFixed(1)} ★` : '—' },
                  { label: 'LEAD TIME', value: adda.lead_time_weeks ? `${adda.lead_time_weeks}w` : '—' },
                ].map((s, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center justify-center py-5 border-r border-dashed last:border-r-0"
                    style={{ borderColor: theme.border, background: i % 2 === 0 ? theme.primaryBg : 'transparent' }}
                  >
                    <span
                      className="font-display font-extrabold leading-none"
                      style={{ fontSize: 'clamp(24px, 2.5vw, 36px)', color: theme.primary }}
                    >
                      {s.value}
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-wider mt-1" style={{ color: theme.textMuted }}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* About */}
              {adda.description && (
                <div>
                  <h2
                    className="font-display font-extrabold text-[28px] uppercase mb-5"
                    style={{ color: theme.text, borderBottom: `2px dashed ${theme.border}`, paddingBottom: 12 }}
                  >
                    About This Space
                  </h2>
                  <p className="text-[16px] leading-relaxed max-w-2xl" style={{ color: theme.textMuted, fontFamily: 'var(--font-dm-sans, sans-serif)' }}>
                    {adda.description}
                  </p>
                </div>
              )}

              {/* Photo Gallery */}
              {galleryImages.length > 0 && (
                <div>
                  <h2
                    className="font-display font-extrabold text-[24px] uppercase mb-5"
                    style={{ color: theme.text, borderBottom: `2px dashed ${theme.border}`, paddingBottom: 12 }}
                  >
                    Gallery
                  </h2>
                  <Gallery images={galleryImages} primary={theme.primary} />
                </div>
              )}

              {/* Amenities */}
              {adda.amenities.length > 0 && (
                <div>
                  <h2
                    className="font-display font-extrabold text-[24px] uppercase mb-5"
                    style={{ color: theme.text, borderBottom: `2px dashed ${theme.border}`, paddingBottom: 12 }}
                  >
                    What We Offer
                  </h2>
                  <div className="grid grid-cols-3 gap-3">
                    {adda.amenities.map(a => (
                      <div
                        key={a}
                        className="flex items-center gap-3 px-4 py-3 border transition-all hover:opacity-80 group"
                        style={{
                          background: theme.bgCard,
                          borderColor: theme.border,
                        }}
                      >
                        <span
                          className="material-symbols-outlined transition-transform group-hover:scale-110"
                          style={{ fontSize: 18, color: theme.primary }}
                        >
                          {amenityIcon(a)}
                        </span>
                        <span className="font-mono text-[10px] uppercase" style={{ color: `${theme.text}80` }}>
                          {a.replace(/_/g, ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* What We Host */}
              {adda.event_preferences.length > 0 && (
                <div>
                  <h2
                    className="font-display font-extrabold text-[24px] uppercase mb-5"
                    style={{ color: theme.text, borderBottom: `2px dashed ${theme.border}`, paddingBottom: 12 }}
                  >
                    Perfect For
                  </h2>
                  <div className="flex flex-wrap gap-3">
                    {adda.event_preferences.map(p => (
                      <span
                        key={p}
                        className="font-mono text-[11px] uppercase px-4 py-2 border transition-all hover:opacity-80 cursor-default"
                        style={{ borderColor: theme.primaryDim, color: theme.primary, background: theme.primaryBg }}
                      >
                        {p.toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Open Days */}
              <div>
                <h2
                  className="font-display font-extrabold text-[24px] uppercase mb-5"
                  style={{ color: theme.text, borderBottom: `2px dashed ${theme.border}`, paddingBottom: 12 }}
                >
                  Open Days
                </h2>
                <div className="flex gap-3 flex-wrap">
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => {
                    const active = isDayAvail(day, adda.available_days)
                    return (
                      <div
                        key={day}
                        className="font-mono text-[11px] uppercase px-4 py-2 border"
                        style={{
                          borderColor: active ? theme.primary : theme.border,
                          color: active ? theme.primary : `${theme.text}30`,
                          background: active ? theme.primaryBg : 'transparent',
                        }}
                      >
                        {day.slice(0, 3)}
                      </div>
                    )
                  })}
                </div>
                {adda.preferred_times?.length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-3">
                    {adda.preferred_times.map(t => (
                      <span
                        key={t}
                        className="font-mono text-[10px] uppercase px-3 py-1"
                        style={{ color: theme.textMuted, background: theme.bgCard, border: `1px solid ${theme.border}` }}
                      >
                        {t.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Google Reviews */}
              {googleReviews.length > 0 && (
                <div>
                  <h2
                    className="font-display font-extrabold text-[24px] uppercase mb-5"
                    style={{ color: theme.text, borderBottom: `2px dashed ${theme.border}`, paddingBottom: 12 }}
                  >
                    What Visitors Say
                    <span className="font-mono text-[12px] ml-3 font-normal" style={{ color: theme.textMuted }}>
                      via Google
                    </span>
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    {googleReviews.slice(0, 4).map((rv, i) => (
                      <div
                        key={i}
                        className="p-5 border transition-all hover:opacity-80"
                        style={{ background: theme.bgCard, borderColor: theme.border }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-mono text-[13px] font-bold" style={{ color: theme.text }}>
                            {rv.author_name}
                          </span>
                          <span className="text-[12px]" style={{ color: '#F59E0B' }}>
                            {'★'.repeat(rv.rating)}
                            <span style={{ color: `${theme.text}20` }}>{'★'.repeat(5 - rv.rating)}</span>
                          </span>
                        </div>
                        <p className="text-[13px] leading-relaxed line-clamp-4" style={{ color: theme.textMuted }}>
                          {rv.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Social Proof for new venues */}
              {stats.total_events === 0 && (
                <div
                  className="p-8 border"
                  style={{ borderColor: theme.primaryDim, background: theme.primaryBg }}
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.25em] mb-5 font-bold" style={{ color: theme.primary }}>
                    ✦ WHY LIST ON WIMC
                  </p>
                  {[
                    'Direct bookings from verified creators — no middlemen',
                    'Zero commission on your first 5 events',
                    'Your calendar, your rules — full control always',
                  ].map(pt => (
                    <div key={pt} className="flex items-start gap-3 mb-3">
                      <span className="font-mono text-[12px] shrink-0 mt-0.5" style={{ color: theme.primary }}>✦</span>
                      <span className="text-[14px] leading-snug" style={{ color: `${theme.text}80` }}>{pt}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Marquee strip */}
              <div
                className="-mx-10 py-3 overflow-hidden border-y"
                style={{ borderColor: theme.border, background: theme.bgCard }}
              >
                <div className="flex whitespace-nowrap city-marquee">
                  {[0, 1].map(i => (
                    <span key={i} className="font-mono text-[10px] uppercase tracking-widest px-2" style={{ color: `${theme.primary}40` }}>
                      {'WHENINMYCITY · '}
                      {adda.name?.toUpperCase()}
                      {' · '}
                      {adda.city?.toUpperCase()}
                      {' · '}
                      {theme.label}
                      {' · BOOK THIS SPACE · '}
                      {'WHENINMYCITY · '}
                      {adda.name?.toUpperCase()}
                      {' · '}
                      {adda.city?.toUpperCase()}
                      {' · '}
                      {theme.label}
                      {' · BOOK THIS SPACE · '}
                    </span>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Sticky bottom bar — right panel only */}
        <div
          className="fixed bottom-0 right-0 z-50 flex items-center justify-between px-10"
          style={{
            width: '64%',
            height: 76,
            background: `${theme.bg}f5`,
            borderTop: `2px dashed ${theme.border}`,
            backdropFilter: 'blur(12px)',
            boxShadow: '0 -8px 30px rgba(0,0,0,0.5)',
          }}
        >
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider mb-1" style={{ color: `${theme.text}50` }}>
              STARTING FROM
            </p>
            <p className="font-display font-extrabold text-[22px] leading-none" style={{ color: theme.primary }}>
              {pricing}
            </p>
          </div>
          <button
            className="stamp-press flex items-center gap-2 font-bold uppercase tracking-wider px-10 py-3 border-2 border-black transition-all"
            style={{
              background: theme.primary,
              color: theme.badgeText,
              fontFamily: 'var(--font-barlow)',
              fontSize: 18,
              boxShadow: '6px 6px 0 rgba(0,0,0,0.8)',
            }}
          >
            Book this Space
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_forward</span>
          </button>
        </div>

      </div>

      {/* ═══════════════════════════ MOBILE ════════════════════════════════════ */}
      <div
        className="block lg:hidden min-h-screen"
        style={{ background: theme.bg, color: theme.text }}
      >
        {/* Fixed header */}
        <header
          className="fixed top-0 left-0 right-0 h-14 z-[100] flex items-center justify-between px-4 border-b-2 border-dashed backdrop-blur-sm"
          style={{ background: `${theme.bg}f0`, borderColor: theme.border }}
        >
          <Link href={exploreHref}>
            <WimcWordmark color="white" height={22} />
          </Link>
          <div className="flex items-center gap-3">
            <span
              className="font-mono text-[10px] uppercase tracking-widest"
              style={{ color: theme.primary }}
            >
              {adda.city}
            </span>
            <button style={{ color: theme.primary }} aria-label="Share">
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>share</span>
            </button>
          </div>
        </header>

        {/* Back strip */}
        <div
          className="fixed top-14 left-0 right-0 z-[90] px-4 py-1.5 border-b"
          style={{ background: `${theme.bg}cc`, borderColor: `${theme.border}60` }}
        >
          <Link
            href={exploreHref}
            className="font-mono text-[10px] uppercase tracking-widest no-underline transition-opacity hover:opacity-70"
            style={{ color: theme.primary }}
          >
            ← {adda.city.toUpperCase()} / VENUES
          </Link>
        </div>

        {/* Hero */}
        <div className="mt-[90px] relative h-[280px] overflow-hidden">
          {adda.cover_image_url ? (
            <Image
              src={adda.cover_image_url}
              alt={adda.name}
              fill
              className="object-cover"
              priority
              unoptimized
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(ellipse at 30% 60%, ${theme.primaryBg}, transparent 70%), ${theme.bgPanel}`,
              }}
            />
          )}
          <div className="absolute inset-0" style={{ background: theme.heroGradient }} />

          <div className="absolute top-3 left-3">
            <span
              className="font-mono text-[10px] font-bold px-3 py-1.5 uppercase tracking-wider"
              style={{ background: theme.badgeBg, color: theme.badgeText }}
            >
              {theme.label}
            </span>
          </div>

          <div className="absolute bottom-4 left-4 right-4">
            <h1
              className="font-display font-extrabold uppercase leading-none mb-1"
              style={{ fontSize: 'clamp(28px, 8vw, 44px)', color: theme.text }}
            >
              {adda.name}
            </h1>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="material-symbols-outlined" style={{ fontSize: 12, color: theme.textMuted }}>location_on</span>
              <span className="font-mono text-[10px] uppercase" style={{ color: theme.textMuted }}>
                {adda.neighbourhood ? `${adda.neighbourhood}, ` : ''}{adda.city}
              </span>
              {ext.google_rating && (
                <span className="font-mono text-[10px]" style={{ color: '#F59E0B' }}>
                  · ★ {ext.google_rating.toFixed(1)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div
          className="flex justify-around py-4 border-b-2 border-dashed"
          style={{ borderColor: theme.border, background: theme.bgPanel }}
        >
          {[
            { label: 'CAPACITY', value: adda.capacity_max?.toString() ?? '—' },
            { label: 'EVENTS', value: adda.total_events_hosted.toString() },
            { label: 'PRICING', value: adda.pricing_model?.replace(/_/g, ' ').toUpperCase() ?? '—' },
          ].map(s => (
            <div key={s.label} className="flex flex-col items-center">
              <span className="font-display font-extrabold text-[20px] leading-none" style={{ color: theme.primary }}>
                {s.value}
              </span>
              <span className="font-mono text-[9px] uppercase mt-1" style={{ color: theme.textMuted }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div
          className="px-4 py-3 border-b-2 border-dashed"
          style={{ borderColor: theme.border, background: theme.primaryBg }}
        >
          <button
            className="stamp-press w-full py-4 flex items-center justify-between px-5 border-2 border-black font-bold uppercase tracking-wider"
            style={{
              background: theme.primary,
              color: theme.badgeText,
              fontFamily: 'var(--font-barlow)',
              fontSize: 17,
              boxShadow: '4px 4px 0 rgba(0,0,0,0.8)',
            }}
          >
            Book this Space
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_forward</span>
          </button>
          <p className="font-mono text-[9px] uppercase tracking-wider text-center mt-2" style={{ color: `${theme.text}40` }}>
            Available to Local+ creators ·{' '}
            <Link href="/onboarding" className="underline" style={{ color: `${theme.primary}80` }}>
              Join free
            </Link>
          </p>
        </div>

        {/* Scrollable content */}
        <div className="px-4 pb-36 flex flex-col gap-8 mt-5">

          {/* About */}
          {adda.description && (
            <div>
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: theme.primary }}>
                <span className="w-2 h-2 inline-block shrink-0" style={{ background: theme.primary }} />
                ABOUT THIS SPACE
              </div>
              <div className="pl-4 py-1" style={{ borderLeft: `2px dashed ${theme.primaryDim}` }}>
                <p className="text-[15px] leading-relaxed" style={{ color: `${theme.text}90` }}>
                  {adda.description}
                </p>
              </div>
            </div>
          )}

          {/* Gallery */}
          {galleryImages.length > 0 && (
            <div>
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: theme.primary }}>
                <span className="w-2 h-2 inline-block shrink-0" style={{ background: theme.primary }} />
                GALLERY
              </div>
              <Gallery images={galleryImages.slice(0, 4)} primary={theme.primary} />
            </div>
          )}

          {/* Pricing */}
          <div>
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: theme.primary }}>
              <span className="w-2 h-2 inline-block shrink-0" style={{ background: theme.primary }} />
              PRICING
            </div>
            <div
              className="p-4 border relative overflow-hidden"
              style={{ borderColor: theme.primary, background: theme.bgCard }}
            >
              <div
                className="absolute top-0 right-0 font-mono text-[10px] px-2 py-1 font-bold"
                style={{ background: theme.primary, color: theme.badgeText }}
              >
                {adda.lead_time_weeks || 1}w LEAD
              </div>
              <p className="text-[18px] mt-2" style={{ color: theme.text, fontFamily: 'var(--font-barlow)' }}>
                {adda.pricing_model?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </p>
              <p className="font-display font-extrabold text-[28px] leading-none mt-1" style={{ color: theme.primary }}>
                {pricing}
              </p>
            </div>
          </div>

          {/* Capacity configs */}
          {capacityConfigs.length > 0 && (
            <div>
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: theme.primary }}>
                <span className="w-2 h-2 inline-block shrink-0" style={{ background: theme.primary }} />
                ROOM SETUPS
              </div>
              <div className="grid grid-cols-2 gap-2">
                {capacityConfigs.map((cfg, i) => (
                  <div
                    key={i}
                    className="flex flex-col p-3 border"
                    style={{ borderColor: theme.border, background: theme.bgCard }}
                  >
                    <span className="font-mono text-[10px] uppercase" style={{ color: theme.textMuted }}>
                      {cfg.type.replace(/_/g, ' ')}
                    </span>
                    <span className="font-display font-extrabold text-[24px]" style={{ color: theme.primary }}>
                      {cfg.capacity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Amenities */}
          {adda.amenities.length > 0 && (
            <div>
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: theme.primary }}>
                <span className="w-2 h-2 inline-block shrink-0" style={{ background: theme.primary }} />
                AMENITIES
              </div>
              <div className="grid grid-cols-2 gap-2">
                {adda.amenities.map(a => (
                  <div
                    key={a}
                    className="flex items-center gap-2 p-3 border"
                    style={{ background: theme.bgCard, borderColor: theme.border }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: theme.primary }}>
                      {amenityIcon(a)}
                    </span>
                    <span className="font-mono text-[10px] uppercase" style={{ color: `${theme.text}80` }}>
                      {a.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Perfect For */}
          {adda.event_preferences.length > 0 && (
            <div>
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: theme.primary }}>
                <span className="w-2 h-2 inline-block shrink-0" style={{ background: theme.primary }} />
                PERFECT FOR
              </div>
              <div className="flex flex-wrap gap-2">
                {adda.event_preferences.map(p => (
                  <span
                    key={p}
                    className="font-mono text-[10px] uppercase px-3 py-1.5 border"
                    style={{ borderColor: theme.primaryDim, color: theme.primary, background: theme.primaryBg }}
                  >
                    {p.toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Open Days */}
          <div>
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: theme.primary }}>
              <span className="w-2 h-2 inline-block shrink-0" style={{ background: theme.primary }} />
              OPEN
            </div>
            <div className="flex justify-between">
              {MOB_DAYS.map((d, i) => {
                const active = isDayAvail(d.full, adda.available_days)
                return (
                  <div
                    key={i}
                    className="w-9 h-9 flex items-center justify-center font-mono text-[11px] font-bold border"
                    style={{
                      background: active ? theme.primary : 'transparent',
                      color: active ? theme.badgeText : `${theme.text}30`,
                      borderColor: active ? theme.primary : `${theme.text}20`,
                    }}
                  >
                    {d.label}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Google Reviews */}
          {googleReviews.length > 0 && (
            <div>
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: theme.primary }}>
                <span className="w-2 h-2 inline-block shrink-0" style={{ background: theme.primary }} />
                WHAT VISITORS SAY
                <span style={{ color: theme.textMuted }}>— Google</span>
              </div>
              <div className="flex flex-col gap-3">
                {googleReviews.slice(0, 3).map((rv, i) => (
                  <div
                    key={i}
                    className="p-4 border"
                    style={{ background: theme.bgCard, borderColor: theme.border }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-[12px] font-bold" style={{ color: theme.text }}>{rv.author_name}</span>
                      <span className="text-[12px]" style={{ color: '#F59E0B' }}>
                        {'★'.repeat(rv.rating)}
                        <span style={{ color: `${theme.text}20` }}>{'★'.repeat(5 - rv.rating)}</span>
                      </span>
                    </div>
                    <p className="text-[13px] leading-relaxed line-clamp-3" style={{ color: theme.textMuted }}>{rv.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contact */}
          {(adda.contact_whatsapp || adda.contact_email || adda.instagram_handle) && (
            <div>
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: theme.primary }}>
                <span className="w-2 h-2 inline-block shrink-0" style={{ background: theme.primary }} />
                GET IN TOUCH
              </div>
              <div className="flex flex-col gap-2">
                {adda.contact_whatsapp && (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 border no-underline"
                    style={{ borderColor: theme.primary, background: theme.primaryBg }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 22, color: theme.primary }}>chat</span>
                    <span className="font-mono text-[12px] font-bold uppercase" style={{ color: theme.primary }}>
                      Chat on WhatsApp
                    </span>
                  </a>
                )}
                {adda.contact_email && (
                  <a
                    href={`mailto:${adda.contact_email}`}
                    className="flex items-center gap-3 p-4 border no-underline"
                    style={{ borderColor: theme.border, background: theme.bgCard }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 22, color: theme.primary }}>mail</span>
                    <span className="font-mono text-[12px] uppercase" style={{ color: theme.text }}>{adda.contact_email}</span>
                  </a>
                )}
                {adda.instagram_handle && (
                  <a
                    href={adda.instagram_handle.startsWith('http') ? adda.instagram_handle : `https://instagram.com/${adda.instagram_handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 border no-underline"
                    style={{ borderColor: theme.border, background: theme.bgCard }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 22, color: theme.primary }}>photo_camera</span>
                    <span className="font-mono text-[12px] uppercase" style={{ color: theme.text }}>
                      @{adda.instagram_handle}
                    </span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Address */}
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 p-4 border no-underline"
            style={{ borderColor: theme.border, background: theme.bgCard }}
          >
            <span className="material-symbols-outlined mt-0.5" style={{ fontSize: 20, color: theme.primary }}>location_on</span>
            <div>
              <p className="font-mono text-[11px] font-bold uppercase mb-1" style={{ color: theme.primary }}>
                FIND US
              </p>
              <p className="font-mono text-[11px] leading-relaxed" style={{ color: theme.textMuted }}>
                {adda.address}
              </p>
            </div>
          </a>

        </div>

        {/* Mobile sticky footer */}
        <div
          className="fixed bottom-14 left-0 right-0 p-3 z-[55] border-t-2 border-dashed backdrop-blur-sm"
          style={{ background: `${theme.bg}f0`, borderColor: theme.border }}
        >
          <button
            className="stamp-press w-full py-3 flex items-center justify-between px-5 border-2 border-black font-bold uppercase"
            style={{
              background: theme.primary,
              color: theme.badgeText,
              fontFamily: 'var(--font-barlow)',
              fontSize: 17,
              boxShadow: '4px 4px 0 rgba(0,0,0,0.8)',
            }}
          >
            Book this Space
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>event_available</span>
          </button>
        </div>
        <div className="lg:hidden"><BottomNav /></div>

      </div>
    </>
  )
}
