import Link from 'next/link'
import Image from 'next/image'
import type { AddaProfile, Event, UserProfile } from '@/types/database'
import { WimcWordmark } from '@/components/WimcWordmark'
import type { PricingConfig } from '@/types/marketplace'
import { BottomNav } from '@/components/ui/BottomNav'
import type { ProfileTheme } from '@/types/theme'

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
  adda:           AddaProfile
  upcomingEvents: UpcomingEvent[]
  pastEvents:     PastEvent[]
  stats:          { total_events: number; average_rating: number }
  theme?:         ProfileTheme
}

// ─── Layout colour system ─────────────────────────────────────────────────────

type LayoutId = 'poster' | 'corporate' | 'boarding-pass' | 'minimal' | 'reel' | 'stage'

interface LayoutColors {
  pageBg: string; leftBg: string; rightBg: string; headerBg: string; cardBg: string
  primary: string; primaryDim: string; primaryBg: string
  text: string; textMuted: string; textFaint: string
  border: string; borderDash: string
  font: string; mono: string
  footerBg: string
}

const LAYOUT_COLORS: Record<LayoutId, LayoutColors> = {
  poster: {
    pageBg: '#14130E', leftBg: '#1E1D18', rightBg: '#14130E', headerBg: '#0E0D09', cardBg: '#2A2922',
    primary: '#5B8DEF', primaryDim: 'rgba(91,141,239,0.3)', primaryBg: 'rgba(91,141,239,0.08)',
    text: '#E7E2D8', textMuted: 'rgba(231,226,216,0.55)', textFaint: 'rgba(231,226,216,0.28)',
    border: 'rgba(91,141,239,0.2)', borderDash: 'rgba(91,141,239,0.25)',
    font: "'Archivo Black', 'Arial Black', sans-serif", mono: "'JetBrains Mono', monospace",
    footerBg: '#0E0D09',
  },
  corporate: {
    pageBg: '#071724', leftBg: '#0A1D2E', rightBg: '#071724', headerBg: '#04101A', cardBg: '#0F2D45',
    primary: '#22D3EE', primaryDim: 'rgba(34,211,238,0.3)', primaryBg: 'rgba(34,211,238,0.07)',
    text: '#D0EEFF', textMuted: 'rgba(208,238,255,0.55)', textFaint: 'rgba(208,238,255,0.28)',
    border: 'rgba(34,211,238,0.18)', borderDash: 'rgba(34,211,238,0.22)',
    font: "'Inter', system-ui, sans-serif", mono: "'JetBrains Mono', monospace",
    footerBg: '#04101A',
  },
  'boarding-pass': {
    pageBg: '#07070A', leftBg: '#1A2744', rightBg: '#07070A', headerBg: '#07070A', cardBg: '#0D0B0A',
    primary: '#5DD9D0', primaryDim: 'rgba(93,217,208,0.3)', primaryBg: 'rgba(93,217,208,0.08)',
    text: '#F0EFF8', textMuted: 'rgba(152,150,176,1)', textFaint: 'rgba(240,239,248,0.3)',
    border: 'rgba(93,217,208,0.3)', borderDash: 'rgba(87,66,62,1)',
    font: "'Archivo Black', 'Arial Black', sans-serif", mono: "'JetBrains Mono', monospace",
    footerBg: '#07070A',
  },
  minimal: {
    pageBg: '#FAFAFA', leftBg: '#F2F2F0', rightBg: '#FAFAFA', headerBg: '#FFFFFF', cardBg: '#EFEFED',
    primary: '#1A1A1A', primaryDim: 'rgba(26,26,26,0.3)', primaryBg: 'rgba(26,26,26,0.06)',
    text: '#1A1A1A', textMuted: 'rgba(26,26,26,0.55)', textFaint: 'rgba(26,26,26,0.28)',
    border: 'rgba(26,26,26,0.12)', borderDash: 'rgba(26,26,26,0.18)',
    font: "'Inter', system-ui, sans-serif", mono: "'JetBrains Mono', monospace",
    footerBg: '#FFFFFF',
  },
  reel: {
    pageBg: '#050A10', leftBg: '#0C1828', rightBg: '#050A10', headerBg: '#030608', cardBg: '#101E30',
    primary: '#00E5FF', primaryDim: 'rgba(0,229,255,0.3)', primaryBg: 'rgba(0,229,255,0.07)',
    text: '#E0F8FF', textMuted: 'rgba(224,248,255,0.5)', textFaint: 'rgba(224,248,255,0.25)',
    border: 'rgba(0,229,255,0.18)', borderDash: 'rgba(0,229,255,0.22)',
    font: "'Space Grotesk', sans-serif", mono: "'JetBrains Mono', monospace",
    footerBg: '#030608',
  },
  stage: {
    pageBg: '#0C0508', leftBg: '#1A0A12', rightBg: '#0C0508', headerBg: '#080306', cardBg: '#22101A',
    primary: '#C0365A', primaryDim: 'rgba(192,54,90,0.3)', primaryBg: 'rgba(192,54,90,0.07)',
    text: '#F5E8EC', textMuted: 'rgba(245,232,236,0.55)', textFaint: 'rgba(245,232,236,0.28)',
    border: 'rgba(192,54,90,0.25)', borderDash: 'rgba(192,54,90,0.3)',
    font: "'Georgia', 'Times New Roman', serif", mono: "'JetBrains Mono', monospace",
    footerBg: '#080306',
  },
}

function resolveLayoutId(theme?: ProfileTheme): LayoutId {
  const lp = theme?.layoutPreset
  if (lp === 'poster' || lp === 'corporate' || lp === 'minimal' || lp === 'reel' || lp === 'stage') return lp
  return 'boarding-pass'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getHourlyRate(adda: AddaProfile): number | null {
  if (adda.pricing_model !== 'fixed_rental') return null
  const cfg = adda.pricing_config as PricingConfig | null
  return cfg?.fixed_rental_paise != null ? Math.round(cfg.fixed_rental_paise / 100) : null
}

function amenityIcon(a: string): string {
  const s = a.toLowerCase()
  if (s.includes('pa') || s.includes('sound') || s.includes('audio') || s.includes('speaker')) return 'speaker_group'
  if (s.includes('light') || s.includes('led')) return 'lightbulb'
  if (s.includes('bar') || s.includes('drink') || s.includes('alcohol')) return 'local_bar'
  if (s.includes('wifi') || s.includes('internet') || s.includes('network')) return 'wifi'
  if (s.includes('stage') || s.includes('perform') || s.includes('theater')) return 'theater_comedy'
  if (s.includes('green') && s.includes('room')) return 'meeting_room'
  if (s.includes('park')) return 'local_parking'
  if (s.includes('ac') || s.includes('hvac') || s.includes('cool')) return 'ac_unit'
  if (s.includes('security') || s.includes('guard')) return 'security'
  if (s.includes('project') || s.includes('screen') || s.includes('display')) return 'videocam'
  if (s.includes('natural') || s.includes('sunlight')) return 'wb_sunny'
  if (s.includes('accessible') || s.includes('wheelchair')) return 'accessible'
  if (s.includes('kitchen') || s.includes('catering')) return 'kitchen'
  if (s.includes('outdoor') || s.includes('garden')) return 'park'
  if (s.includes('whiteboard') || s.includes('board')) return 'edit_square'
  return 'check_circle'
}

function amenityLabel(a: string): string {
  return a.replace(/_/g, ' ').toUpperCase()
}

function typeLabel(types: string[]): string {
  if (!types || types.length === 0) return 'SPACE'
  return types[0].replace(/_/g, ' ').toUpperCase()
}

function typeEmoji(types: string[]): string {
  const t = (types[0] ?? '').toLowerCase()
  if (t.includes('studio')) return '🎛️'
  if (t.includes('bar') || t.includes('restaurant')) return '🍸'
  if (t.includes('rooftop')) return '🏙️'
  if (t.includes('garden') || t.includes('outdoor')) return '🌿'
  if (t.includes('gallery')) return '🎨'
  if (t.includes('library')) return '📚'
  if (t.includes('cowork')) return '💻'
  if (t.includes('cafe')) return '☕'
  return '🎪'
}

// ─── Dynamic calendar helpers ─────────────────────────────────────────────────
// Computes the current month at render time so the calendar is never stale.

function getCalendarData(): {
  monthLabel: string
  dayHeaders: string[]
  dateRows: (number | null)[][]
  startDayIndex: number // 0=Sun…6=Sat for day 1 of this month (MO-first grid)
} {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() // 0-indexed

  const monthLabel = now.toLocaleString('en-IN', { month: 'long', year: 'numeric' }).toUpperCase()

  // Day 1 weekday (0=Sun…6=Sat), convert to Monday-first grid (0=Mon…6=Sun)
  const firstDow = new Date(year, month, 1).getDay() // 0=Sun
  const startOffset = (firstDow + 6) % 7 // Monday-first offset

  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // Build rows of up to 7 dates; null = empty cell before day 1 or after last day
  const allSlots: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  // Up to 6 rows to cover all possible month layouts
  const dateRows: (number | null)[][] = []
  for (let row = 0; row < 6; row++) {
    const slice = allSlots.slice(row * 7, row * 7 + 7)
    if (slice.length === 0) break
    // Pad to full 7 slots so the grid columns align correctly
    while (slice.length < 7) slice.push(null)
    const hasAnyDate = slice.some((v): v is number => v !== null)
    if (hasAnyDate) dateRows.push(slice)
  }

  return {
    monthLabel,
    dayHeaders: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'],
    dateRows,
    startDayIndex: startOffset,
  }
}

/** Returns true if `date` (day-of-month) in the current month falls on an available day. */
function isDateAvailable(date: number, availableDays: string[]): boolean {
  if (!availableDays?.length) return false
  const now = new Date()
  const dow = new Date(now.getFullYear(), now.getMonth(), date).getDay() // 0=Sun
  const FULL_DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const full = FULL_DAYS[dow]
  return availableDays.some(d => {
    const n = d.toLowerCase().trim()
    return n === full || full.startsWith(n) || n.startsWith(full.slice(0, 3))
  })
}

/** Returns true if `full` day name is in availableDays. */
function isDayAvail(full: string, availableDays: string[]): boolean {
  if (!availableDays?.length) return false
  return availableDays.some(d => {
    const n = d.toLowerCase().trim()
    return n === full || full.startsWith(n) || n.startsWith(full.slice(0, 3))
  })
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


const GRID_BG_STYLE: React.CSSProperties = {
  backgroundImage: `
    linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
  `,
  backgroundSize: '40px 40px',
}

// ─── Component ────────────────────────────────────────────────────────────────

type GoogleReview = { author_name: string; rating: number; text: string; time: number }

export default function AddaPublicPage({ adda, stats, theme }: Props) {
  const hourlyRate = getHourlyRate(adda)
  const googleReviews = ((adda as unknown as { google_reviews?: GoogleReview[] }).google_reviews ?? []).filter(r => r.text)
  const types = adda.adda_type
  const bio = adda.description
  const capacity = adda.capacity_max

  const layout = resolveLayoutId(theme)
  const C = LAYOUT_COLORS[layout]

  const pricingDisplay = hourlyRate
    ? `₹${hourlyRate.toLocaleString('en-IN')}`
    : adda.pricing_model
        ? adda.pricing_model.replace(/_/g, ' ').toUpperCase()
        : 'ENQUIRE'

  const waLink = adda.contact_whatsapp
    ? `https://wa.me/${adda.contact_whatsapp.replace(/\D/g, '').replace(/^(?!91)/, '91')}`
    : '#'

  // Dynamic calendar — computed once at render, never stale
  const { monthLabel, dayHeaders, dateRows } = getCalendarData()

  // Show social proof only when the venue has no real event history yet
  const showSocialProof = stats.total_events === 0

  return (
    <>
      <style>{`
        @keyframes thump {
          0%   { transform: scaleY(1); }
          30%  { transform: scaleY(0.92); }
          70%  { transform: scaleY(1.04); }
          100% { transform: scaleY(1); }
        }
        .stamp-thump:active { animation: thump 350ms cubic-bezier(0.22,1,0.36,1); }
        @keyframes adda-marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .adda-marquee { animation: adda-marquee 20s linear infinite; }
        .adda-grain {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n' x='0' y='0'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        }
      `}</style>

      {/* Grain overlay */}
      <div
        className="adda-grain fixed inset-0 pointer-events-none z-[999]"
        style={{ opacity: 0.028 }}
        aria-hidden="true"
      />

      {/* ═══════════════════════════ DESKTOP ════════════════════════════════════ */}
      <div className="hidden lg:block min-h-screen" style={{ background: C.pageBg, color: C.text, fontFamily: C.font }}>

        {/* Header */}
        <header className="sticky top-0 h-16 backdrop-blur-sm z-40 flex items-center justify-between px-8" style={{ background: `${C.headerBg}F5`, borderBottom: `2px dashed ${C.borderDash}` }}>
          <Link href="/explore">
            <WimcWordmark color={layout === 'minimal' ? 'black' : 'white'} height={28} />
          </Link>
          <nav className="flex items-center gap-8">
            {([
              { label: 'CITIES',  href: '/explore' },
              { label: 'CULTURE', href: '/explore' },
              { label: 'ADDAS',  href: '/explore?tab=venues' },
            ] as const).map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className="font-mono text-[11px] uppercase tracking-wider transition-colors no-underline"
                style={{ color: label === 'ADDAS' ? C.primary : C.textMuted }}
              >
                {label}
              </Link>
            ))}
          </nav>
          <Link
            href="/onboarding/business/B2"
            className="font-mono text-[12px] px-6 py-2 uppercase tracking-wider transition-colors"
            style={{ color: C.primary, border: `1px solid ${C.primary}` }}
          >
            List your Adda →
          </Link>
        </header>

        {/* Two-column main */}
        <div className="flex" style={{ height: 'calc(100vh - 64px)' }}>

          {/* ── LEFT PANEL ──────────────────────────────────────────────────── */}
          <div
            className="w-[40%] overflow-y-auto relative z-10"
            style={{ background: C.leftBg, borderRight: `2px dashed ${C.borderDash}`, paddingBottom: 100, ...(layout === 'boarding-pass' ? GRID_BG_STYLE : {}) }}
          >
            <div className="p-10">

              {/* ── Layout-specific hero card ───────────────────────────── */}

              {/* SHOWCASE (poster): Full-bleed cover image hero */}
              {layout === 'poster' && (
                <div style={{ position: 'relative', overflow: 'hidden', border: `1px solid ${C.border}`, boxShadow: `8px 8px 0 0 ${C.primaryDim}` }}>
                  <div style={{ height: 260, position: 'relative', background: C.cardBg }}>
                    {adda.cover_image_url ? (
                      <Image src={adda.cover_image_url} alt={adda.name} fill style={{ objectFit: 'cover', opacity: 0.7 }} unoptimized />
                    ) : (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 64, color: C.border }}>photo_camera</span>
                      </div>
                    )}
                    <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to top, ${C.pageBg} 0%, transparent 60%)` }} />
                    <div style={{ position: 'absolute', top: 12, left: 12, background: C.primary, color: '#fff', padding: '4px 10px', fontSize: 10, fontFamily: C.mono, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{typeLabel(types)}</div>
                  </div>
                  <div style={{ padding: '20px 24px 24px', background: C.cardBg }}>
                    <div style={{ fontSize: 'clamp(28px,3vw,44px)', fontWeight: 900, color: C.text, textTransform: 'uppercase', lineHeight: 0.9, marginBottom: 12 }}>{adda.name}</div>
                    <div style={{ fontSize: 12, fontFamily: C.mono, color: C.textMuted, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{adda.city} · UP TO {capacity ?? '—'} PEOPLE</div>
                    {hourlyRate != null && (
                      <div style={{ fontSize: 28, fontWeight: 900, color: C.primary }}>FROM ₹{hourlyRate.toLocaleString('en-IN')} / HR</div>
                    )}
                  </div>
                </div>
              )}

              {/* EVENT HOUSE (corporate): Compact info card + events list */}
              {layout === 'corporate' && (
                <div>
                  <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, padding: '24px', marginBottom: 20 }}>
                    <div style={{ fontSize: 10, fontFamily: C.mono, color: C.primary, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>{typeLabel(types)}</div>
                    <div style={{ fontSize: 'clamp(24px,3vw,40px)', fontWeight: 700, color: C.text, lineHeight: 1, marginBottom: 10 }}>{adda.name}</div>
                    <div style={{ fontSize: 12, fontFamily: C.mono, color: C.textMuted, marginBottom: 16, textTransform: 'uppercase' }}>{adda.city}</div>
                    <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {[{ l: 'CAPACITY', v: capacity ? `${capacity} MAX` : '—' }, { l: 'LEAD TIME', v: adda.lead_time_weeks ? `${adda.lead_time_weeks}W` : '—' }, { l: 'PRICING', v: adda.pricing_model?.replace(/_/g, ' ').toUpperCase() || '—' }, { l: 'CITY', v: adda.city }].map(r => (
                        <div key={r.l}>
                          <div style={{ fontSize: 9, fontFamily: C.mono, color: C.textFaint, textTransform: 'uppercase', marginBottom: 2 }}>{r.l}</div>
                          <div style={{ fontSize: 14, color: C.primary, fontWeight: 600 }}>{r.v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {hourlyRate != null && (
                    <div style={{ fontSize: 28, fontWeight: 700, color: C.primary, marginBottom: 8 }}>₹{hourlyRate.toLocaleString('en-IN')} / hr</div>
                  )}
                </div>
              )}

              {/* COMMUNITY ADDA (boarding-pass): Ticket-stub card — original design */}
              {layout === 'boarding-pass' && (
                <div
                  className="w-full flex flex-col group relative overflow-hidden hover:-translate-x-[2px] hover:-translate-y-[2px] transition-all"
                  style={{ background: C.cardBg, border: `1px solid ${C.primaryDim}`, boxShadow: `8px 8px 0px 0px ${C.primaryDim}` }}
                >
                  <div className="adda-grain absolute inset-0 z-0 pointer-events-none" style={{ opacity: 0.08 }} aria-hidden="true" />
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, background: C.primary, zIndex: 10 }} />
                  <div className="p-8 pl-10 z-10 flex-grow flex flex-col relative">
                    <p className="font-mono text-[8px] tracking-[0.3em] uppercase mb-4" style={{ color: `${C.primary}60` }}>WHEN IN MY CITY PRESENTS</p>
                    <h2 className="font-display font-extrabold uppercase leading-[0.88] mb-4" style={{ fontSize: 'clamp(28px, 4vw, 48px)', color: C.text, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                      {adda.name || '— — —'}
                    </h2>
                    <div className="flex gap-2 flex-wrap mb-4">
                      {types.length > 0 ? types.map(t => (
                        <span key={t} className="font-mono text-[9px] px-2 py-1 uppercase rounded-full" style={{ background: `${C.primary}20`, color: C.primary, border: `1px solid ${C.primary}30` }}>{t.replace(/_/g, ' ')}</span>
                      )) : (
                        <span className="font-mono text-[9px] px-2 py-1 uppercase rounded-full" style={{ border: `1px dashed ${C.primary}30`, color: `${C.primary}40` }}>TYPE —</span>
                      )}
                    </div>
                    <div className="mb-6">
                      <p className="font-mono text-[12px] tracking-[0.25em] uppercase" style={{ color: `${C.text}60` }}>[ {adda.city?.toUpperCase() || '———'} ]</p>
                      <p className="font-mono text-[10px] mt-1" style={{ color: `${C.primary}70` }}>UP TO {capacity ?? '—'} PEOPLE</p>
                    </div>
                    <div className="border-t border-dashed mb-6" style={{ borderColor: `${C.primary}20` }} />
                    <div className="grid grid-cols-2 gap-2 mb-8">
                      {Array.from({ length: 4 }).map((_, i) => {
                        const a = adda.amenities[i]
                        return <div key={i} className="font-mono text-[9px] uppercase px-2 py-1" style={{ border: `1px solid rgba(255,255,255,0.05)`, background: 'rgba(255,255,255,0.05)', color: `${C.text}50` }}>{a ? amenityLabel(a) : '— — — —'}</div>
                      })}
                    </div>
                    <div className="mt-auto flex justify-between items-end">
                      <div>
                        {hourlyRate != null ? (
                          <span className="font-display font-extrabold text-[28px]" style={{ color: C.primary }}>FROM ₹{hourlyRate.toLocaleString('en-IN')} / HR</span>
                        ) : adda.pricing_model ? (
                          <span className="font-display font-extrabold text-[28px]" style={{ color: C.primary }}>{adda.pricing_model.replace(/_/g, ' ').toUpperCase()}</span>
                        ) : (
                          <span className="font-display font-extrabold text-[28px]" style={{ color: `${C.primary}30` }}>FROM ₹ — — — / HR</span>
                        )}
                      </div>
                      <div className="w-12 h-12 rounded-full flex items-center justify-center opacity-60 mix-blend-screen" style={{ border: `1px solid ${C.primary}40`, transform: 'rotate(-12deg)' }}>
                        <span className="font-mono text-[5px] uppercase text-center leading-tight" style={{ color: C.primary }}>VERIFIED<br />VENUE</span>
                      </div>
                    </div>
                  </div>
                  <div className="py-2 px-8 pl-10 relative z-10 overflow-hidden" style={{ background: `${C.primary}05`, borderTop: `1px solid ${C.primary}20` }}>
                    <p className="font-mono text-[7px] tracking-widest uppercase" style={{ color: `${C.primary}40` }}>WHENINMYCITY.COM/{adda.city?.toLowerCase().replace(/\s+/g, '-')}/{adda.slug}</p>
                  </div>
                </div>
              )}

              {/* OPEN STUDIO (minimal): Clean white info card */}
              {layout === 'minimal' && (
                <div style={{ border: `1px solid ${C.border}`, padding: '28px', background: C.cardBg }}>
                  {adda.cover_image_url && (
                    <div style={{ height: 180, position: 'relative', marginBottom: 20, overflow: 'hidden' }}>
                      <Image src={adda.cover_image_url} alt={adda.name} fill style={{ objectFit: 'cover', filter: 'grayscale(20%)' }} unoptimized />
                    </div>
                  )}
                  <div style={{ fontSize: 9, fontFamily: C.mono, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 8 }}>{typeLabel(types)}</div>
                  <div style={{ fontSize: 'clamp(24px,3vw,40px)', fontWeight: 300, color: C.text, lineHeight: 1.05, marginBottom: 12, letterSpacing: '-0.5px' }}>{adda.name}</div>
                  <div style={{ width: 32, height: 2, background: C.primary, marginBottom: 16 }} />
                  <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 20 }}>{adda.city}{capacity ? ` · Up to ${capacity} people` : ''}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      { l: 'Pricing', v: adda.pricing_model?.replace(/_/g, ' ') || '—' },
                      { l: 'Lead Time', v: adda.lead_time_weeks ? `${adda.lead_time_weeks} weeks` : '—' },
                    ].map(r => (
                      <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
                        <span style={{ fontSize: 11, fontFamily: C.mono, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{r.l}</span>
                        <span style={{ fontSize: 13, color: C.text }}>{r.v}</span>
                      </div>
                    ))}
                  </div>
                  {hourlyRate != null && (
                    <div style={{ fontSize: 28, fontWeight: 300, color: C.text, marginTop: 20 }}>₹{hourlyRate.toLocaleString('en-IN')}<span style={{ fontSize: 14, color: C.textMuted }}> / hr</span></div>
                  )}
                </div>
              )}

              {/* NIGHTSPOT (reel): Dark electric hero with glow */}
              {layout === 'reel' && (
                <div style={{ position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'relative', height: 260, background: `linear-gradient(160deg, ${C.cardBg} 0%, ${C.leftBg} 100%)`, overflow: 'hidden', border: `1px solid ${C.border}` }}>
                    {adda.cover_image_url && (
                      <Image src={adda.cover_image_url} alt={adda.name} fill style={{ objectFit: 'cover', opacity: 0.2, mixBlendMode: 'luminosity' }} unoptimized />
                    )}
                    <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, background: `radial-gradient(circle, ${C.primary}20 0%, transparent 70%)`, pointerEvents: 'none' }} />
                    <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
                      <div style={{ fontSize: 9, fontFamily: C.mono, color: C.primary, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 6 }}>{typeLabel(types)}</div>
                      <div style={{ fontSize: 'clamp(32px,4vw,52px)', fontWeight: 700, color: C.primary, lineHeight: 0.9, textShadow: `0 0 40px ${C.primary}50, 0 0 80px ${C.primary}20`, textTransform: 'uppercase' }}>{adda.name}</div>
                      <div style={{ fontSize: 11, fontFamily: C.mono, color: C.textMuted, marginTop: 8, textTransform: 'uppercase' }}>{adda.city}</div>
                    </div>
                  </div>
                  <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderTop: 'none', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      {hourlyRate != null ? (
                        <div style={{ fontSize: 28, fontWeight: 700, color: C.primary, textShadow: `0 0 20px ${C.primary}40` }}>₹{hourlyRate.toLocaleString('en-IN')}<span style={{ fontSize: 14, fontWeight: 400, color: C.textMuted }}> / hr</span></div>
                      ) : (
                        <div style={{ fontSize: 14, fontFamily: C.mono, color: C.textMuted, textTransform: 'uppercase' }}>{adda.pricing_model?.replace(/_/g, ' ') || 'ENQUIRE'}</div>
                      )}
                      <div style={{ fontSize: 9, fontFamily: C.mono, color: C.textFaint, marginTop: 4 }}>UP TO {capacity ?? '—'} PEOPLE</div>
                    </div>
                    {adda.contact_whatsapp && (
                      <a href={waLink} target="_blank" rel="noopener noreferrer" style={{ padding: '10px 20px', border: `1px solid ${C.primary}`, color: C.primary, fontFamily: C.mono, fontSize: 11, textTransform: 'uppercase', textDecoration: 'none', boxShadow: `0 0 14px ${C.primary}25` }}>BOOK →</a>
                    )}
                  </div>
                </div>
              )}

              {/* HERITAGE HALL (stage): Theatrical centered design */}
              {layout === 'stage' && (
                <div style={{ border: `1px solid ${C.border}`, padding: '32px 24px', background: C.cardBg, textAlign: 'center' }}>
                  {adda.cover_image_url && (
                    <div style={{ height: 160, position: 'relative', marginBottom: 24, overflow: 'hidden', border: `1px solid ${C.border}` }}>
                      <Image src={adda.cover_image_url} alt={adda.name} fill style={{ objectFit: 'cover', opacity: 0.4 }} unoptimized />
                      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to top, ${C.cardBg} 0%, transparent 60%)` }} />
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
                    <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${C.primary}50)` }} />
                    <span style={{ fontSize: 9, fontFamily: C.mono, color: C.primary, textTransform: 'uppercase', letterSpacing: '0.2em' }}>✦ {typeLabel(types)} ✦</span>
                    <div style={{ flex: 1, height: 1, background: `linear-gradient(to left, transparent, ${C.primary}50)` }} />
                  </div>
                  <div style={{ fontSize: 'clamp(28px,3vw,44px)', color: C.text, fontStyle: 'italic', lineHeight: 1, marginBottom: 8 }}>{adda.name}</div>
                  <div style={{ fontSize: 12, fontFamily: C.mono, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 20 }}>{adda.city}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
                    <div style={{ flex: 1, height: 1, background: C.border }} />
                    <span style={{ fontSize: 9, fontFamily: C.mono, color: C.textFaint }}>CAPACITY: {capacity ?? '—'}</span>
                    <div style={{ flex: 1, height: 1, background: C.border }} />
                  </div>
                  {hourlyRate != null && (
                    <div style={{ fontSize: 24, color: C.primary, marginBottom: 8 }}>₹{hourlyRate.toLocaleString('en-IN')}<span style={{ fontSize: 13, color: C.textMuted }}> / hr</span></div>
                  )}
                  <div style={{ marginTop: 20, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
                    <a href={waLink} style={{ fontSize: 10, fontFamily: C.mono, color: C.primary, textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.15em', border: `1px solid ${C.primary}`, padding: '10px 24px', display: 'inline-block' }}>Enquire Now</a>
                  </div>
                </div>
              )}

              {/* Quick Info — shared across all layouts */}
              <div className="mt-10">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] mb-2 font-bold" style={{ color: C.primary }}>
                  QUICK DETAILS
                </p>
                {[
                  { label: 'CAPACITY',      value: capacity != null ? `${capacity} MAX` : '—',                isLink: false },
                  { label: 'LEAD TIME',     value: adda.lead_time_weeks ? `${adda.lead_time_weeks} WEEKS` : '—', isLink: false },
                  { label: 'PRICING MODEL', value: adda.pricing_model?.replace(/_/g, ' ').toUpperCase() || '—', isLink: false },
                  { label: 'CONTACT',       value: 'REQUEST INTRO',                                            isLink: true },
                ].map(row => (
                  <div
                    key={row.label}
                    className="flex justify-between items-center py-3 transition-colors"
                    style={{ borderBottom: `1px dashed ${C.border}` }}
                  >
                    <span className="font-mono text-[10px] uppercase" style={{ color: C.textFaint }}>{row.label}</span>
                    {row.isLink ? (
                      <a
                        href={adda.contact_whatsapp ? waLink : '#'}
                        className="underline cursor-pointer"
                        style={{ color: C.primary, fontFamily: C.font, fontSize: 18 }}
                        target={adda.contact_whatsapp ? '_blank' : undefined}
                        rel="noopener noreferrer"
                      >
                        {row.value}
                      </a>
                    ) : (
                      <span style={{ color: C.primary, fontFamily: C.font, fontSize: 18 }}>
                        {row.value}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* ── Dynamic Availability Grid ──────────────────────────────── */}
              <div className="mt-10">
                <div className="flex justify-between items-center mb-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] font-bold" style={{ color: C.primary }}>
                    AVAILABILITY
                  </p>
                  <p className="font-mono text-[10px] uppercase" style={{ color: C.textFaint }}>{monthLabel}</p>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-1">
                  {dayHeaders.map(d => (
                    <div key={d} className="font-mono text-[8px] uppercase text-center py-1" style={{ color: C.textFaint }}>
                      {d}
                    </div>
                  ))}
                </div>

                {dateRows.map((row, ri) => (
                  <div key={ri} className="grid grid-cols-7 gap-1 mb-1">
                    {row.map((date, ci) => {
                      if (date === null) {
                        return <div key={`empty-${ri}-${ci}`} className="py-2" />
                      }
                      const active = isDateAvailable(date, adda.available_days)
                      const isToday = date === new Date().getDate()

                      if (active) {
                        return (
                          <div
                            key={date}
                            className="cursor-pointer transition-colors py-2 text-center"
                            style={{ background: C.pageBg, border: `1px solid ${isToday ? C.primary : C.primaryDim}` }}
                          >
                            <span className="font-mono text-[10px] font-bold" style={{ color: C.primary }}>{date}</span>
                          </div>
                        )
                      }
                      return (
                        <div
                          key={date}
                          className="py-2 text-center opacity-30"
                          style={{ background: C.pageBg, border: `1px solid ${C.border}` }}
                        >
                          <span className="font-mono text-[10px]" style={{ color: C.text }}>{date}</span>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>

            </div>
          </div>

          {/* ── RIGHT PANEL ─────────────────────────────────────────────────── */}
          <div
            className="flex-1 overflow-y-auto relative z-0"
            style={{ background: C.rightBg, paddingBottom: 120 }}
          >
            <div className="p-12">

              {/* Hero */}
              <div className="mb-12 flex items-end justify-between pb-8" style={{ borderBottom: `2px dashed ${C.border}` }}>
                <div>
                  <span className="px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider inline-block mb-4" style={{ background: C.primary, color: C.pageBg }}>
                    VERIFIED ADDA
                  </span>
                  <h1
                    className="font-display font-extrabold leading-none uppercase"
                    style={{ fontSize: 'clamp(48px, 5vw, 80px)', color: C.text }}
                  >
                    {adda.name || 'THE ADDA'}
                  </h1>
                  <p className="font-mono text-[12px] uppercase tracking-[0.2em] mt-3" style={{ color: `${C.primary}60` }}>
                    {adda.city}
                    {types.length > 0 ? ` • ${types.map(t => t.replace(/_/g, ' ')).join(' / ').toUpperCase()}` : ''}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 ml-8 shrink-0">
                  <button
                    className="stamp-thump px-8 py-4 border-2 border-black transition-all flex items-center gap-2 whitespace-nowrap"
                    style={{ background: C.primary, color: C.pageBg, fontFamily: 'var(--font-barlow)', fontSize: 20, fontWeight: 700, boxShadow: '8px 8px 0px 0px rgba(0,0,0,0.9)' }}
                  >
                    Book this Adda
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_forward</span>
                  </button>
                  <p className="font-mono text-[9px] uppercase tracking-wider text-right" style={{ color: C.textFaint }}>
                    Available to{' '}
                    <Link href="/onboarding" className="underline transition-colors" style={{ color: `${C.primary}60` }}>Local+ creators</Link>
                    {' · '}
                    <Link href="/onboarding" className="underline transition-colors" style={{ color: `${C.primary}60` }}>Join free</Link>
                  </p>
                </div>
              </div>

              {/* About */}
              <div className="mb-16">
                <h2 className="text-[28px] mb-6" style={{ fontFamily: layout === 'stage' ? C.font : 'var(--font-abril)', color: C.text }}>
                  About This Space
                </h2>
                <p className="font-sans text-[16px] leading-relaxed max-w-3xl" style={{ color: C.textMuted }}>
                  {bio ?? 'A raw, brutalist space for culture to happen. Designed for creators who reject the polished corporate norm.'}
                </p>
              </div>

              {/* What We Host */}
              <div className="mb-16">
                <h2 className="text-[24px] mb-6" style={{ fontFamily: layout === 'stage' ? C.font : 'var(--font-abril)', color: C.text }}>
                  What We Host
                </h2>
                <div className="flex flex-wrap gap-3">
                  {(adda.event_preferences.length > 0
                    ? adda.event_preferences
                    : ['GIGS', 'WORKSHOPS', 'STAND-UP', 'LIVE ART']
                  ).map(pref => (
                    <span
                      key={pref}
                      className="px-4 py-2 font-mono text-[11px] uppercase cursor-default transition-colors"
                      style={{ border: `1px solid ${C.primaryDim}`, color: C.primary }}
                    >
                      {pref.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>

              {/* Amenities */}
              <div className="mb-16">
                <h2 className="text-[24px] mb-6" style={{ fontFamily: layout === 'stage' ? C.font : 'var(--font-abril)', color: C.text }}>
                  Amenities
                </h2>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {(adda.amenities.length > 0
                    ? adda.amenities
                    : ['wifi', 'pa_system', 'projector', 'parking']
                  ).map(a => (
                    <div
                      key={a}
                      className="p-4 flex items-center gap-4 transition-colors group"
                      style={{ background: C.leftBg, border: `1px solid ${C.border}` }}
                    >
                      <span className="material-symbols-outlined group-hover:scale-110 transition-transform" style={{ fontSize: 20, color: C.primary }}>
                        {amenityIcon(a)}
                      </span>
                      <span className="font-mono text-[11px] uppercase" style={{ color: C.textMuted }}>
                        {amenityLabel(a)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* WHY HOST ON WIMC */}
              {showSocialProof && (
                <div className="mb-10 p-8" style={{ background: C.leftBg, border: `1px solid ${C.primaryDim}` }}>
                  <p className="font-mono text-[10px] uppercase tracking-[0.25em] mb-5 font-bold" style={{ color: C.primary }}>
                    ✦ WHY HOST ON WIMC
                  </p>
                  <div className="flex flex-col gap-4 mb-8">
                    {[
                      'Direct bookings from verified creators',
                      'Zero commission on your first 5 events',
                      'Your space, your rules — full calendar control',
                    ].map(point => (
                      <div key={point} className="flex items-start gap-3">
                        <span className="font-mono text-[12px] shrink-0 mt-0.5" style={{ color: C.primary }}>✦</span>
                        <span className="font-sans text-[14px] leading-snug" style={{ color: `${C.text}80` }}>{point}</span>
                      </div>
                    ))}
                  </div>
                  <Link
                    href="/onboarding/business/B2"
                    className="inline-block font-mono text-[12px] px-6 py-3 uppercase tracking-wider hover:opacity-90 transition-opacity"
                    style={{ background: C.primary, color: C.pageBg }}
                  >
                    List your Adda →
                  </Link>
                </div>
              )}

              {/* Google Reviews */}
              {googleReviews.length > 0 && (
                <div className="mb-16">
                  <h2 className="text-[24px] mb-6" style={{ fontFamily: layout === 'stage' ? C.font : 'var(--font-abril)', color: C.text }}>
                    What visitors say
                  </h2>
                  <div className="grid grid-cols-1 gap-4">
                    {googleReviews.map((rv, i) => (
                      <div key={i} className="p-5 transition-colors" style={{ background: C.leftBg, border: `1px solid ${C.border}` }}>
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-sans text-[14px] font-semibold" style={{ color: `${C.text}70` }}>{rv.author_name}</span>
                          <span className="text-[14px] tracking-tight" style={{ color: C.primary }}>
                            {'★'.repeat(rv.rating)}
                            <span style={{ color: `${C.text}20` }}>{'★'.repeat(5 - rv.rating)}</span>
                          </span>
                        </div>
                        <p className="font-sans text-[13px] leading-relaxed line-clamp-4" style={{ color: `${C.text}55` }}>{rv.text}</p>
                      </div>
                    ))}
                  </div>
                  <p className="font-mono text-[9px] uppercase tracking-widest mt-3" style={{ color: C.textFaint }}>Reviews via Google Maps</p>
                </div>
              )}

              {/* Marquee strip */}
              <div className="-mx-12 py-3 overflow-hidden mt-12 border-y" style={{ background: C.leftBg, borderColor: `${C.text}05` }}>
                <div className="flex whitespace-nowrap adda-marquee">
                  {[0, 1].map(i => (
                    <span key={i} className="font-mono text-[10px] uppercase tracking-widest px-2" style={{ color: `${C.primary}40` }}>
                      {'WHENINMYCITY · '}
                      {adda.name?.toUpperCase()}
                      {' · VERIFIED ADDA · OPEN FOR BOOKINGS · '}
                      {'WHENINMYCITY · '}
                      {adda.name?.toUpperCase()}
                      {' · VERIFIED ADDA · OPEN FOR BOOKINGS · '}
                    </span>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Sticky footer — right panel only */}
        <div
          className="fixed bottom-0 right-0 w-[60%] h-[80px] backdrop-blur-sm z-50 flex items-center justify-between px-12"
          style={{ background: `${C.footerBg}F5`, borderTop: `2px dashed ${C.borderDash}`, boxShadow: '0 -10px 30px rgba(0,0,0,0.5)' }}
        >
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider mb-1" style={{ color: C.textFaint }}>
              STARTING FROM
            </p>
            <p className="font-display font-extrabold text-[24px] leading-none" style={{ color: C.primary }}>
              {pricingDisplay}
              {hourlyRate != null && (
                <span className="text-[16px] font-normal" style={{ color: C.textMuted }}> / hour</span>
              )}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <button
              className="stamp-thump px-10 py-3 border-2 border-black transition-all flex items-center gap-2"
              style={{ background: C.primary, color: C.pageBg, fontFamily: 'var(--font-barlow)', fontSize: 20, fontWeight: 700, boxShadow: '4px 4px 0px 0px rgba(0,0,0,0.9)' }}
            >
              Book this Adda
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_forward</span>
            </button>
            <p className="font-mono text-[9px] uppercase tracking-wider" style={{ color: C.textFaint }}>
              Local+ creators ·{' '}
              <Link href="/onboarding" className="underline transition-colors" style={{ color: `${C.primary}50` }}>Join free</Link>
            </p>
          </div>
        </div>

      </div>

      {/* ═══════════════════════════ MOBILE ═════════════════════════════════════ */}
      <div className="block lg:hidden min-h-screen" style={{ background: C.pageBg, color: C.text, fontFamily: C.font }}>

        {/* Header */}
        <header className="fixed top-0 left-0 right-0 h-16 backdrop-blur-sm z-[100] flex items-center justify-between px-4" style={{ background: `${C.headerBg}F5`, borderBottom: `2px dashed ${C.borderDash}` }}>
          <Link href="/explore" className="font-display font-extrabold text-[20px] uppercase tracking-tighter" style={{ color: C.primary }}>
            WIMC
          </Link>
          <div className="flex items-center gap-3">
            <button style={{ color: C.primary }} aria-label="Share">
              <span className="material-symbols-outlined" style={{ fontSize: 24 }}>share</span>
            </button>
            <button style={{ color: C.primary }} aria-label="More options">
              <span className="material-symbols-outlined" style={{ fontSize: 24 }}>more_vert</span>
            </button>
          </div>
        </header>

        {/* Hero */}
        <div className="mt-16 relative h-[260px] overflow-hidden" style={{ background: `linear-gradient(135deg, ${C.leftBg} 0%, ${C.pageBg} 100%)` }}>
          {adda.cover_image_url ? (
            <Image src={adda.cover_image_url} alt={adda.name} fill style={{ objectFit: 'cover', opacity: layout === 'minimal' ? 0.5 : 0.3, mixBlendMode: layout === 'reel' ? 'luminosity' : 'normal' }} unoptimized />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-[80px] opacity-10 select-none pointer-events-none" aria-hidden="true">{typeEmoji(types)}</div>
          )}
          <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${C.pageBg} 0%, ${C.pageBg}50 50%, transparent 100%)` }} />

          {/* Verified badge */}
          <div className="absolute top-4 left-4 px-3 py-1 flex items-center gap-1 z-10" style={{ background: C.primary, color: C.pageBg }}>
            <span className="material-symbols-outlined" style={{ fontSize: 12, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            <span className="font-mono text-[10px] font-bold uppercase">VERIFIED</span>
          </div>

          <div className="absolute bottom-6 left-4 right-4 z-10">
            <h1 className="text-[36px] leading-none mb-1" style={{ fontFamily: layout === 'stage' ? C.font : 'var(--font-abril)', color: C.text, fontStyle: layout === 'stage' ? 'italic' : 'normal', textShadow: layout === 'reel' ? `0 0 30px ${C.primary}50` : 'none' }}>
              {adda.name}
            </h1>
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest" style={{ color: `${C.primary}80` }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>location_on</span>
              {adda.city}
              {types[0] && ` · ${types[0].replace(/_/g, ' ').toUpperCase()}`}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="px-4 py-5 flex justify-between border-b-2 border-dashed" style={{ borderColor: `${C.primary}20` }}>
          {[
            { label: 'CAPACITY', value: capacity != null ? capacity.toString() : '—' },
            { label: 'EVENTS',   value: adda.total_events_hosted.toString() },
            { label: 'RATING',   value: adda.average_maker_rating > 0 ? adda.average_maker_rating.toFixed(1) : '4.9' },
          ].map(stat => (
            <div key={stat.label} className="flex flex-col items-center">
              <span className="font-display font-extrabold text-[22px] leading-none" style={{ color: C.primary }}>{stat.value}</span>
              <span className="font-mono text-[9px] uppercase mt-1 tracking-wider" style={{ color: C.textMuted }}>{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Book CTA */}
        <div className="px-4 py-4 border-b-2 border-dashed" style={{ background: `${C.primary}10`, borderColor: `${C.primary}20` }}>
          <button
            className="stamp-thump w-full py-4 px-5 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex justify-between items-center"
            style={{ background: C.primary, color: C.pageBg, fontFamily: 'var(--font-barlow)', fontSize: 18, fontWeight: 900 }}
          >
            Book this Adda
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_forward</span>
          </button>
          <p className="font-mono text-[9px] uppercase tracking-wider mt-2 text-center" style={{ color: C.textFaint }}>
            Available to Local+ creators ·{' '}
            <Link href="/onboarding" className="underline" style={{ color: `${C.primary}50` }}>Join free</Link>
          </p>
        </div>

        {/* Scrollable sections */}
        <div className="px-4 mt-4 flex flex-col gap-8 pb-32">

          {/* About */}
          <div>
            <h2 className="mb-3" style={{ fontFamily: layout === 'stage' ? C.font : 'var(--font-abril)', fontSize: 22, color: C.text, fontWeight: layout === 'stage' ? 900 : 400 }}>
              About This Space
            </h2>
            <p className="font-sans text-[15px] leading-relaxed" style={{ color: `${C.text}80` }}>
              {bio ?? 'A raw, brutalist space for culture to happen. Designed for creators who reject the polished corporate norm.'}
            </p>
          </div>

          {/* Pricing card */}
          <div>
            <h2 className="mb-3" style={{ fontFamily: layout === 'stage' ? C.font : 'var(--font-abril)', fontSize: 22, color: C.text, fontWeight: layout === 'stage' ? 900 : 400 }}>
              How It Works
            </h2>
            <div className="p-4 relative overflow-hidden" style={{ background: C.leftBg, border: `1px solid ${C.primary}` }}>
              <div className="absolute top-0 right-0 font-mono text-[10px] px-2 py-1 font-bold" style={{ background: C.primary, color: C.pageBg }}>
                {adda.lead_time_weeks || 1} WEEK LEAD TIME
              </div>
              <p className="text-[22px] mt-2" style={{ fontFamily: 'var(--font-barlow)', color: C.text }}>
                {adda.pricing_model.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </p>
              <p className="font-display font-extrabold text-[32px] mt-1 leading-none" style={{ color: C.primary }}>
                {hourlyRate != null ? `₹${hourlyRate.toLocaleString('en-IN')} / hr` : adda.pricing_model.replace(/_/g, ' ').toUpperCase()}
              </p>
            </div>
          </div>

          {/* Amenities */}
          <div>
            <h2 className="mb-3" style={{ fontFamily: layout === 'stage' ? C.font : 'var(--font-abril)', fontSize: 22, color: C.text, fontWeight: layout === 'stage' ? 900 : 400 }}>
              Amenities
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {(adda.amenities.length > 0 ? adda.amenities : ['wifi', 'pa_system', 'projector', 'parking']).map(a => (
                <div key={a} className="p-3 flex flex-col gap-2" style={{ background: C.leftBg, border: `1px solid ${C.border}` }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: C.primary }}>{amenityIcon(a)}</span>
                  <span className="font-mono text-[10px] uppercase" style={{ color: C.text }}>{amenityLabel(a)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Perfect For */}
          <div>
            <h2 className="mb-3" style={{ fontFamily: layout === 'stage' ? C.font : 'var(--font-abril)', fontSize: 22, color: C.text, fontWeight: layout === 'stage' ? 900 : 400 }}>
              What We Host
            </h2>
            <div className="flex flex-wrap gap-2">
              {(adda.event_preferences.length > 0 ? adda.event_preferences : ['GIGS', 'WORKSHOPS', 'STAND-UP', 'LIVE ART']).map(pref => (
                <span key={pref} className="px-3 py-1 font-mono text-[10px] uppercase" style={{ background: `${C.primary}10`, border: `1px solid ${C.primary}30`, color: C.primary }}>
                  {pref.toUpperCase()}
                </span>
              ))}
            </div>
          </div>

          {/* Availability — day pills */}
          <div>
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: C.primary }}>
              <span className="w-2 h-2 inline-block shrink-0" style={{ background: C.primary }} aria-hidden="true" />
              OPEN
            </div>
            <div className="flex justify-between items-center">
              {MOB_DAYS.map((d, i) => {
                const active = isDayAvail(d.full, adda.available_days)
                return active ? (
                  <div key={i} className="w-8 h-8 rounded-full font-mono text-[10px] font-bold flex items-center justify-center" style={{ background: C.primary, color: C.pageBg }}>{d.label}</div>
                ) : (
                  <div key={i} className="w-8 h-8 rounded-full font-mono text-[10px] flex items-center justify-center" style={{ border: `1px solid ${C.border}`, color: C.textFaint }}>{d.label}</div>
                )
              })}
            </div>
          </div>

          {/* Google Reviews */}
          {googleReviews.length > 0 && (
            <div>
              <h2 className="mb-4" style={{ fontFamily: layout === 'stage' ? C.font : 'var(--font-abril)', fontSize: 22, color: C.text, fontWeight: layout === 'stage' ? 900 : 400 }}>
                What Visitors Say
              </h2>
              <div className="flex flex-col gap-3">
                {googleReviews.map((rv, i) => (
                  <div key={i} className="p-4" style={{ background: C.leftBg, border: `1px solid ${C.border}` }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-sans text-[13px] font-semibold" style={{ color: `${C.text}70` }}>{rv.author_name}</span>
                      <span className="text-[12px]" style={{ color: C.primary }}>
                        {'★'.repeat(rv.rating)}
                        <span style={{ color: `${C.text}20` }}>{'★'.repeat(5 - rv.rating)}</span>
                      </span>
                    </div>
                    <p className="font-sans text-[13px] leading-relaxed line-clamp-3" style={{ color: `${C.text}55` }}>{rv.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* WHY HOST ON WIMC — social proof */}
          {showSocialProof && (
            <div className="p-5" style={{ background: C.leftBg, border: `1px solid ${C.primaryDim}` }}>
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] mb-4 font-bold" style={{ color: C.primary }}>
                ✦ WHY HOST ON WIMC
              </p>
              <div className="flex flex-col gap-3 mb-5">
                {[
                  'Direct bookings from verified creators',
                  'Zero commission on your first 5 events',
                  'Your space, your rules — full calendar control',
                ].map(point => (
                  <div key={point} className="flex items-start gap-3">
                    <span className="font-mono text-[12px] shrink-0 mt-0.5" style={{ color: C.primary }}>✦</span>
                    <span className="font-sans text-[14px] leading-snug" style={{ color: `${C.text}80` }}>{point}</span>
                  </div>
                ))}
              </div>
              <a
                href="/onboarding/business/B2"
                className="inline-block font-mono text-[11px] px-5 py-2.5 uppercase tracking-wider"
                style={{ background: C.primary, color: C.pageBg }}
              >
                List your Adda →
              </a>
            </div>
          )}

          {/* Contact */}
          {(adda.contact_whatsapp || adda.contact_email) && (
            <div>
              <h2 className="mb-3" style={{ fontFamily: layout === 'stage' ? C.font : 'var(--font-abril)', fontSize: 22, color: C.text, fontWeight: layout === 'stage' ? 900 : 400 }}>
                Get in Touch
              </h2>
              <div className="flex flex-col gap-3">
                {adda.contact_whatsapp && (
                  <a href={waLink} target="_blank" rel="noopener noreferrer" className="p-4 flex items-center gap-4 no-underline" style={{ background: C.leftBg, border: `1px solid ${C.border}` }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 24, color: C.primary }}>chat</span>
                    <span className="font-sans text-[14px]" style={{ color: C.text }}>Chat with Host</span>
                  </a>
                )}
                {adda.contact_email && (
                  <a href={`mailto:${adda.contact_email}`} className="p-4 flex items-center gap-4 no-underline" style={{ background: C.leftBg, border: `1px solid ${C.border}` }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 24, color: C.primary }}>mail</span>
                    <span className="font-sans text-[14px]" style={{ color: C.text }}>{adda.contact_email}</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Marquee strip */}
          <div className="-mx-4 py-[4px] overflow-hidden" style={{ background: C.primary }}>
            <div className="flex whitespace-nowrap adda-marquee">
              {[0, 1].map(i => (
                <span key={i} className="font-mono text-[10px] uppercase tracking-widest px-8" style={{ color: C.pageBg }}>
                  {'WHENINMYCITY · '}
                  {adda.name?.toUpperCase()}
                  {' · VERIFIED ADDA · OPEN FOR BOOKINGS · '}
                </span>
              ))}
            </div>
          </div>

          {/* Venue identity artifact */}
          <div className="-mx-4 relative overflow-hidden py-8 px-10" style={{ background: C.leftBg, borderTop: `2px dashed ${C.primaryDim}` }}>
            <div className="text-center">
              <div className="w-20 h-20 rounded-full mx-auto flex flex-col items-center justify-center" style={{ border: `2px dashed ${C.primary}`, transform: 'rotate(-12deg)' }}>
                <span className="font-mono text-[12px] font-bold" style={{ color: C.primary }}>WIMC</span>
                <span className="font-display font-extrabold text-[18px] uppercase leading-tight" style={{ color: C.primary }}>
                  {(types[0] ?? 'ADDA').slice(0, 6).toUpperCase()}
                </span>
              </div>
              <p className="font-mono text-[9px] mt-4 uppercase" style={{ color: C.textFaint }}>WIMC-V-{adda.slug?.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>

        </div>

        {/* Mobile sticky footer */}
        <div className="fixed bottom-14 left-0 right-0 backdrop-blur-sm p-3 z-[55]" style={{ background: `${C.footerBg}F5`, borderTop: `2px dashed ${C.borderDash}` }}>
          <button
            className="stamp-thump w-full py-3 px-5 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex justify-between items-center"
            style={{ background: C.primary, color: C.pageBg, fontFamily: 'var(--font-barlow)', fontSize: 18, fontWeight: 900 }}
          >
            Book this Adda
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>event_available</span>
          </button>
        </div>
        <div className="lg:hidden"><BottomNav /></div>

        {/* Back breadcrumb strip */}
        <div className="fixed top-16 left-0 right-0 px-4 py-1.5 z-[90] lg:hidden" style={{ background: `${C.pageBg}CC`, borderBottom: `1px solid ${C.border}` }}>
          <Link href="/explore?tab=venues" className="font-mono text-[10px] uppercase tracking-widest transition-colors" style={{ color: `${C.primary}70` }}>
            ← ADDAS
          </Link>
        </div>

      </div>
    </>
  )
}
