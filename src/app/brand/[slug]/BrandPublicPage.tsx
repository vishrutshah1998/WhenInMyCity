import type { ProfileTheme } from '@/types/theme'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BrandRow = {
  id: string
  display_name: string
  username: string
  city: string
  bio: string | null
  business_categories: string[]
  wimc_goals: string[]
  target_audience: string[]
  contact_whatsapp: string | null
  contact_email: string | null
  instagram_handle: string | null
  website_url: string | null
  created_at: string
}

type CreatorRow = {
  id: string
  display_name: string
  creator_type: string
  sub_types: string[]
}

// ---------------------------------------------------------------------------
// Layout system
// ---------------------------------------------------------------------------

type LayoutId = 'boarding-pass' | 'poster' | 'corporate' | 'editorial' | 'minimal' | 'reel'

type LayoutColors = {
  pageBg:    string
  primary:   string
  cardBg:    string   // the sidebar identity card background
  cardText:  string   // text on the card
  text:      string   // main page text
  textMuted: string   // secondary text
  border:    string   // border / dashed lines
  badgeBg:   string   // pill / badge background
  badgeText: string   // pill / badge text
  panelBg:   string   // brief strip / alternate panel
  isLight:   boolean  // true = light-bg layout
}

const LAYOUT_COLORS: Record<LayoutId, LayoutColors> = {
  'boarding-pass': {
    pageBg:    '#07070A',
    primary:   '#F5A800',
    cardBg:    '#FAF7F0',
    cardText:  '#1A2744',
    text:      '#FAF7F0',
    textMuted: 'rgba(250,247,240,0.5)',
    border:    'rgba(245,168,0,0.25)',
    badgeBg:   '#F5A800',
    badgeText: '#07070A',
    panelBg:   '#1A2744',
    isLight:   false,
  },
  'poster': {
    pageBg:    '#1A1108',
    primary:   '#F5A800',
    cardBg:    '#F5A800',
    cardText:  '#1A1108',
    text:      '#F7F2E8',
    textMuted: 'rgba(247,242,232,0.5)',
    border:    'rgba(245,168,0,0.25)',
    badgeBg:   '#1A1108',
    badgeText: '#F5A800',
    panelBg:   '#2C1E0F',
    isLight:   false,
  },
  'corporate': {
    pageBg:    '#071724',
    primary:   '#22D3EE',
    cardBg:    '#0F2D45',
    cardText:  '#D0EEFF',
    text:      '#D0EEFF',
    textMuted: 'rgba(208,238,255,0.5)',
    border:    'rgba(34,211,238,0.2)',
    badgeBg:   '#22D3EE',
    badgeText: '#071724',
    panelBg:   '#0A2038',
    isLight:   false,
  },
  'editorial': {
    pageBg:    '#F7F3E9',
    primary:   '#4A3728',
    cardBg:    '#EDE9D8',
    cardText:  '#2A1F0E',
    text:      '#2A1F0E',
    textMuted: 'rgba(42,31,14,0.5)',
    border:    'rgba(42,31,14,0.2)',
    badgeBg:   '#2A1F0E',
    badgeText: '#F7F3E9',
    panelBg:   '#E4DFC8',
    isLight:   true,
  },
  'minimal': {
    pageBg:    '#FAFAFA',
    primary:   '#1A1A1A',
    cardBg:    '#F0F0F0',
    cardText:  '#1A1A1A',
    text:      '#1A1A1A',
    textMuted: 'rgba(26,26,26,0.45)',
    border:    '#E0E0E0',
    badgeBg:   '#1A1A1A',
    badgeText: '#FAFAFA',
    panelBg:   '#F0F0F0',
    isLight:   true,
  },
  'reel': {
    pageBg:    '#080812',
    primary:   '#818CF8',
    cardBg:    '#14143A',
    cardText:  '#E8E8FF',
    text:      '#E8E8FF',
    textMuted: 'rgba(232,232,255,0.5)',
    border:    'rgba(129,140,248,0.2)',
    badgeBg:   '#818CF8',
    badgeText: '#080812',
    panelBg:   '#0E0E2C',
    isLight:   false,
  },
}

function resolveLayoutId(theme?: ProfileTheme): LayoutId {
  const lp = theme?.layoutPreset
  if (
    lp === 'poster'    ||
    lp === 'corporate' ||
    lp === 'editorial' ||
    lp === 'minimal'   ||
    lp === 'reel'
  ) return lp
  return 'boarding-pass'
}

// ---------------------------------------------------------------------------
// Shared decorations
// ---------------------------------------------------------------------------

function Grain() {
  return (
    <div
      className="fixed inset-0 z-[9999] pointer-events-none opacity-[0.028]"
      aria-hidden="true"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
        <filter id="brand-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#brand-grain)" />
      </svg>
    </div>
  )
}

function BarcodeStrips({ color }: { color: string }) {
  const bars = [2, 3, 1, 4, 2, 1, 3, 2, 1, 3, 2, 4, 1, 2, 3, 1, 2, 3, 1, 2]
  return (
    <div className="flex gap-0.5 h-6 items-end">
      {bars.map((w, i) => (
        <div
          key={i}
          style={{ width: `${w * 2}px`, height: `${48 + ((i * 17) % 52)}%`, background: color }}
        />
      ))}
    </div>
  )
}

const CREATOR_LABELS: Record<string, string> = {
  music:                  'MUSICIAN',
  music_performance:      'MUSICIAN',
  comedy_theatre:         'COMEDIAN',
  comedy_open_mic:        'COMEDIAN',
  art_design:             'ARTIST',
  workshops_teaching:     'EDUCATOR',
  teaching_coaching:      'COACH',
  food_lifestyle:         'FOODIE',
  lifestyle_wellness:     'WELLNESS',
  content_creation:       'CONTENT CREATOR',
  video_content:          'VIDEO CREATOR',
  professional_portfolio: 'PROFESSIONAL',
  community_impact:       'COMMUNITY BUILDER',
}

function creatorLabel(type: string): string {
  return CREATOR_LABELS[type] ?? type.toUpperCase().replace(/_/g, ' ')
}

// ---------------------------------------------------------------------------
// Left sidebar identity cards — 6 layouts
// ---------------------------------------------------------------------------

type CardProps = {
  C:          LayoutColors
  brand:      BrandRow
  initial:    string
  serialId:   string
  sinceYear:  number
  primaryCat: string
}

function BoardingPassCard({ C, brand, initial, serialId, primaryCat }: CardProps) {
  return (
    <div
      className="relative p-6 rotate-[-1deg] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-transform hover:rotate-0 duration-300 flex flex-col gap-4 mb-8"
      style={{ background: C.cardBg, color: C.cardText }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: C.primary }} />
      <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full" style={{ background: C.pageBg }} />
      <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full" style={{ background: C.pageBg }} />

      <div className="flex justify-between items-start opacity-70 text-[10px]" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
        <span>SERIAL: WIMC-{serialId}-X</span>
        <span>VERIFIED AUTH</span>
      </div>

      <div className="flex gap-4 items-center">
        <div className="w-16 h-16 flex items-center justify-center flex-shrink-0" style={{ background: C.primary }}>
          <span className="font-black text-[28px] leading-none" style={{ color: C.badgeText, fontFamily: 'var(--font-jetbrains-mono)' }}>
            {initial}
          </span>
        </div>
        <div>
          <div className="text-[32px] leading-none mb-1" style={{ fontFamily: 'var(--font-abril)' }}>
            {brand.display_name}
          </div>
          <div className="text-[11px] opacity-80" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
            @{brand.username}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 py-2 text-[11px]" style={{ fontFamily: 'var(--font-jetbrains-mono)', borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <div>
          <span className="block text-[9px] uppercase opacity-50">ORIGIN</span>
          <span className="uppercase">{brand.city}</span>
        </div>
        <div>
          <span className="block text-[9px] uppercase opacity-50">CATEGORY</span>
          <span className="uppercase">{primaryCat}</span>
        </div>
      </div>

      {(brand.wimc_goals?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-1">
          {brand.wimc_goals.slice(0, 3).map((goal) => (
            <span
              key={goal}
              className="px-2 py-[2px] text-[9px] uppercase"
              style={{ background: C.badgeBg, color: C.badgeText, fontFamily: 'var(--font-jetbrains-mono)' }}
            >
              {goal}
            </span>
          ))}
        </div>
      )}

      <p className="text-[14px] italic leading-relaxed opacity-80" style={{ fontFamily: 'var(--font-dm-sans)' }}>
        {brand.bio || 'Brand bio coming soon.'}
      </p>

      <div className="mt-auto pt-4 flex justify-between items-center" style={{ borderTop: `2px dashed ${C.border}` }}>
        <span className="text-[12px]" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>ADMIT ONE</span>
        <div className="flex flex-col items-end gap-1">
          <BarcodeStrips color={C.cardText} />
          <span className="text-[8px] opacity-40" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>STAMP_VALIDATED</span>
        </div>
      </div>
    </div>
  )
}

function PosterCard({ C, brand, initial, primaryCat }: CardProps) {
  return (
    <div
      className="relative mb-8 overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
      style={{ background: C.primary }}
    >
      <div
        className="absolute inset-0 opacity-10"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Crect width='1' height='1' fill='%23000' opacity='0.5'/%3E%3C/svg%3E")` }}
      />
      <div className="relative z-10 p-6 flex flex-col items-center text-center gap-4">
        <div className="text-[10px] tracking-[0.25em] uppercase opacity-60" style={{ fontFamily: 'var(--font-jetbrains-mono)', color: C.cardText }}>
          {primaryCat} BRAND
        </div>
        <div
          className="w-20 h-20 flex items-center justify-center border-4"
          style={{ borderColor: C.cardText, background: 'rgba(0,0,0,0.15)' }}
        >
          <span className="font-black text-[40px] leading-none" style={{ color: C.cardText, fontFamily: 'var(--font-syne)' }}>
            {initial}
          </span>
        </div>
        <div className="font-black uppercase leading-none" style={{ color: C.cardText, fontFamily: 'var(--font-syne)', fontSize: 'clamp(28px,5vw,40px)' }}>
          {brand.display_name}
        </div>
        <div className="text-[11px] opacity-60 uppercase" style={{ fontFamily: 'var(--font-jetbrains-mono)', color: C.cardText }}>
          {brand.city} · EST. {new Date(brand.created_at).getFullYear()}
        </div>
        {brand.bio && (
          <p className="text-[13px] italic opacity-70 max-w-[260px]" style={{ fontFamily: 'var(--font-dm-sans)', color: C.cardText }}>
            {brand.bio}
          </p>
        )}
        {(brand.wimc_goals?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-1 justify-center">
            {brand.wimc_goals.slice(0, 3).map((goal) => (
              <span
                key={goal}
                className="px-2 py-[2px] text-[9px] uppercase"
                style={{ background: 'rgba(0,0,0,0.2)', color: C.cardText, fontFamily: 'var(--font-jetbrains-mono)', border: `1px solid ${C.cardText}40` }}
              >
                {goal}
              </span>
            ))}
          </div>
        )}
        <div className="absolute -bottom-2 -right-2 w-16 h-16 border-2 rounded-full flex items-center justify-center opacity-30 -rotate-12" style={{ borderColor: C.cardText }}>
          <span className="text-[7px] text-center leading-tight" style={{ color: C.cardText, fontFamily: 'var(--font-jetbrains-mono)' }}>WIMC<br />BRAND<br />PASS</span>
        </div>
      </div>
    </div>
  )
}

function CorporateCard({ C, brand, initial, primaryCat, serialId }: CardProps) {
  return (
    <div className="mb-8 border" style={{ background: C.cardBg, borderColor: C.border }}>
      <div className="p-4 flex items-start gap-4" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div
          className="w-16 h-16 flex-shrink-0 flex items-center justify-center text-[28px] font-black"
          style={{ background: C.badgeBg, color: C.badgeText, fontFamily: 'var(--font-jetbrains-mono)' }}
        >
          {initial}
        </div>
        <div>
          <div className="font-black text-[22px] uppercase leading-tight mb-1" style={{ color: C.cardText, fontFamily: 'var(--font-barlow)' }}>
            {brand.display_name}
          </div>
          <div className="text-[10px] uppercase opacity-60" style={{ color: C.cardText, fontFamily: 'var(--font-jetbrains-mono)' }}>
            @{brand.username}
          </div>
          <span
            className="inline-flex items-center gap-1 mt-2 px-2 py-[2px] text-[9px] uppercase font-bold"
            style={{ background: C.badgeBg, color: C.badgeText, fontFamily: 'var(--font-jetbrains-mono)' }}
          >
            {primaryCat}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 text-[11px]" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
        {([['CITY', brand.city], ['REF NO.', `WM-${serialId.slice(0,6)}`]] as const).map(([label, val]) => (
          <div key={label} className="p-3" style={{ borderRight: `1px solid ${C.border}`, color: C.cardText }}>
            <div className="text-[9px] opacity-50 mb-1">{label}</div>
            <div className="uppercase font-bold">{val}</div>
          </div>
        ))}
      </div>
      {brand.bio && (
        <div className="p-4" style={{ borderTop: `1px solid ${C.border}` }}>
          <div className="text-[9px] uppercase opacity-50 mb-1" style={{ color: C.cardText, fontFamily: 'var(--font-jetbrains-mono)' }}>OVERVIEW</div>
          <p className="text-[13px] leading-relaxed opacity-80" style={{ color: C.cardText, fontFamily: 'var(--font-dm-sans)' }}>
            {brand.bio}
          </p>
        </div>
      )}
    </div>
  )
}

function EditorialCard({ C, brand, initial, primaryCat }: CardProps) {
  return (
    <div className="mb-8 p-6 relative" style={{ background: C.cardBg, borderTop: `3px solid ${C.primary}`, borderBottom: `3px solid ${C.primary}` }}>
      <div className="text-center mb-4">
        <div className="text-[9px] tracking-[0.3em] uppercase opacity-50 mb-3" style={{ color: C.cardText, fontFamily: 'var(--font-jetbrains-mono)' }}>
          {primaryCat} · {brand.city}
        </div>
        <div className="h-px opacity-20 mb-3" style={{ background: C.primary }} />
        <div
          className="text-[36px] leading-none"
          style={{ color: C.cardText, fontFamily: 'var(--font-playfair-display)' }}
        >
          {brand.display_name}
        </div>
        <div className="h-px opacity-20 mt-3 mb-3" style={{ background: C.primary }} />
        <div className="text-[9px] tracking-[0.2em] uppercase opacity-40" style={{ color: C.cardText, fontFamily: 'var(--font-jetbrains-mono)' }}>
          @{brand.username}
        </div>
      </div>
      {brand.bio && (
        <p
          className="text-[14px] leading-relaxed text-center mt-4 opacity-70 italic"
          style={{ color: C.cardText, fontFamily: 'var(--font-dm-sans)' }}
        >
          &ldquo;{brand.bio}&rdquo;
        </p>
      )}
      {(brand.wimc_goals?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-1 justify-center mt-4">
          {brand.wimc_goals.slice(0, 3).map((goal) => (
            <span
              key={goal}
              className="px-3 py-[3px] text-[9px] uppercase border"
              style={{ borderColor: C.primary, color: C.primary, fontFamily: 'var(--font-jetbrains-mono)' }}
            >
              {goal}
            </span>
          ))}
        </div>
      )}
      <div className="absolute top-2 left-2 text-[8px] opacity-20" style={{ color: C.primary, fontFamily: 'var(--font-jetbrains-mono)' }}>✦</div>
      <div className="absolute top-2 right-2 text-[8px] opacity-20" style={{ color: C.primary, fontFamily: 'var(--font-jetbrains-mono)' }}>✦</div>
    </div>
  )
}

function MinimalCard({ C, brand, initial, primaryCat }: CardProps) {
  return (
    <div
      className="mb-8 p-8 flex flex-col items-center text-center border"
      style={{ background: C.cardBg, borderColor: C.border }}
    >
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center text-[26px] font-bold mb-4 border-2"
        style={{ borderColor: C.primary, color: C.primary, fontFamily: 'var(--font-inter)' }}
      >
        {initial}
      </div>
      <div
        className="text-[24px] font-bold mb-2 leading-tight"
        style={{ color: C.cardText, fontFamily: 'var(--font-dm-sans)' }}
      >
        {brand.display_name}
      </div>
      <div className="text-[11px] opacity-50 mb-3" style={{ color: C.cardText, fontFamily: 'var(--font-jetbrains-mono)' }}>
        @{brand.username}
      </div>
      <span
        className="inline-block px-3 py-1 text-[10px] uppercase border mb-4"
        style={{ borderColor: C.primary, color: C.primary, fontFamily: 'var(--font-jetbrains-mono)' }}
      >
        {primaryCat} · {brand.city}
      </span>
      {brand.bio && (
        <p className="text-[13px] leading-relaxed opacity-60" style={{ color: C.cardText, fontFamily: 'var(--font-dm-sans)' }}>
          {brand.bio}
        </p>
      )}
    </div>
  )
}

function ReelCard({ C, brand, initial, primaryCat }: CardProps) {
  return (
    <div
      className="mb-8 p-6 relative overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${C.pageBg} 0%, ${C.cardBg} 100%)` }}
    >
      <div
        className="absolute inset-0"
        style={{ background: `radial-gradient(ellipse at 60% 40%, ${C.primary}18 0%, transparent 65%)` }}
      />
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: C.primary, boxShadow: `0 0 12px ${C.primary}` }} />
      <div className="relative z-10 flex items-center gap-4 mb-4">
        <div
          className="w-14 h-14 rounded-full flex-shrink-0 flex items-center justify-center text-[24px] font-black border-2"
          style={{
            borderColor: C.primary,
            color: C.primary,
            background: C.cardBg,
            boxShadow: `0 0 16px ${C.primary}50`,
            fontFamily: 'var(--font-space-grotesk)',
          }}
        >
          {initial}
        </div>
        <div>
          <div
            className="font-black uppercase text-[20px] leading-tight"
            style={{ color: C.cardText, fontFamily: 'var(--font-space-grotesk)' }}
          >
            {brand.display_name}
          </div>
          <div className="text-[9px] uppercase mt-1" style={{ color: C.primary, fontFamily: 'var(--font-jetbrains-mono)' }}>
            {brand.city} · {primaryCat}
          </div>
        </div>
      </div>
      {brand.bio && (
        <p className="text-[13px] leading-relaxed mb-4 opacity-70" style={{ color: C.cardText, fontFamily: 'var(--font-dm-sans)' }}>
          {brand.bio}
        </p>
      )}
      {(brand.wimc_goals?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-1">
          {brand.wimc_goals.slice(0, 3).map((goal) => (
            <span
              key={goal}
              className="px-2 py-[2px] text-[9px] uppercase"
              style={{
                background: `${C.primary}15`,
                color: C.primary,
                border: `1px solid ${C.primary}40`,
                fontFamily: 'var(--font-jetbrains-mono)',
              }}
            >
              {goal}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Desktop right-panel headers — 6 layouts
// ---------------------------------------------------------------------------

type HeaderProps = { C: LayoutColors; brand: BrandRow; serialId: string; sinceYear: number; primaryCat: string }

function BoardingPassHeader({ C, brand, serialId, sinceYear, primaryCat }: HeaderProps) {
  return (
    <div className="p-[40px]" style={{ background: C.pageBg }}>
      <h1
        className="leading-none uppercase font-black"
        style={{ color: C.text, fontFamily: 'var(--font-syne)', fontSize: 'clamp(52px,8vw,112px)' }}
      >
        {brand.display_name}
      </h1>
      <div className="flex items-center gap-4 mt-3 flex-wrap">
        <span className="text-[12px]" style={{ color: C.primary, fontFamily: 'var(--font-jetbrains-mono)' }}>
          ID: VRF_{serialId}
        </span>
        <div className="w-2 h-2 rounded-full" style={{ background: C.primary }} />
        <span className="text-[12px]" style={{ color: C.textMuted, fontFamily: 'var(--font-jetbrains-mono)' }}>
          SINCE {sinceYear}
        </span>
        <div className="w-2 h-2 rounded-full" style={{ background: C.primary }} />
        <span className="text-[12px] uppercase" style={{ color: C.textMuted, fontFamily: 'var(--font-jetbrains-mono)' }}>
          {primaryCat}
        </span>
      </div>
    </div>
  )
}

function PosterHeader({ C, brand, primaryCat }: HeaderProps) {
  return (
    <div className="relative overflow-hidden" style={{ background: C.primary, minHeight: 200 }}>
      <div
        className="absolute inset-0 opacity-10"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Crect width='1' height='1' fill='%23000' opacity='0.5'/%3E%3C/svg%3E")` }}
      />
      <div className="relative z-10 p-[40px]">
        <div className="text-[11px] tracking-[0.2em] uppercase mb-4 opacity-60" style={{ color: C.badgeText, fontFamily: 'var(--font-jetbrains-mono)' }}>
          {primaryCat} BRAND · {brand.city}
        </div>
        <h1
          className="leading-none uppercase font-black"
          style={{ color: C.badgeText, fontFamily: 'var(--font-syne)', fontSize: 'clamp(48px,8vw,108px)' }}
        >
          {brand.display_name}
        </h1>
      </div>
    </div>
  )
}

function CorporateHeader({ C, brand, serialId, primaryCat }: HeaderProps) {
  return (
    <div className="p-[40px]" style={{ background: C.pageBg }}>
      <div className="flex items-start gap-6 mb-6">
        <div
          className="w-20 h-20 flex-shrink-0 flex items-center justify-center text-[32px] font-black"
          style={{ background: C.badgeBg, color: C.badgeText, fontFamily: 'var(--font-jetbrains-mono)' }}
        >
          {brand.display_name[0]?.toUpperCase()}
        </div>
        <div>
          <h1
            className="leading-none uppercase font-black"
            style={{ color: C.text, fontFamily: 'var(--font-barlow)', fontSize: 'clamp(32px,5vw,64px)' }}
          >
            {brand.display_name}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <span
              className="px-3 py-1 text-[10px] uppercase font-bold"
              style={{ background: C.badgeBg, color: C.badgeText, fontFamily: 'var(--font-jetbrains-mono)' }}
            >
              {primaryCat}
            </span>
            <span className="text-[11px] opacity-50" style={{ color: C.text, fontFamily: 'var(--font-jetbrains-mono)' }}>
              REF: WM-{serialId.slice(0, 6)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function EditorialHeader({ C, brand, sinceYear, primaryCat }: HeaderProps) {
  return (
    <div className="p-[40px]" style={{ background: C.pageBg }}>
      <div className="text-[10px] tracking-[0.4em] uppercase opacity-50 mb-3" style={{ color: C.text, fontFamily: 'var(--font-jetbrains-mono)' }}>
        {primaryCat} · {brand.city} · EST. {sinceYear}
      </div>
      <div className="h-[2px] mb-4" style={{ background: C.primary }} />
      <h1
        className="leading-none"
        style={{ color: C.text, fontFamily: 'var(--font-playfair-display)', fontSize: 'clamp(44px,7vw,100px)' }}
      >
        {brand.display_name}
      </h1>
      <div className="h-[2px] mt-4" style={{ background: C.primary, opacity: 0.3 }} />
    </div>
  )
}

function MinimalHeader({ C, brand, primaryCat }: HeaderProps) {
  return (
    <div className="p-[40px]" style={{ background: C.pageBg }}>
      <h1
        className="leading-none font-bold"
        style={{ color: C.text, fontFamily: 'var(--font-dm-sans)', fontSize: 'clamp(40px,6vw,88px)' }}
      >
        {brand.display_name}
      </h1>
      <div className="flex items-center gap-4 mt-3">
        <span className="text-[11px] opacity-50" style={{ color: C.text, fontFamily: 'var(--font-jetbrains-mono)' }}>
          {brand.city}
        </span>
        <span className="text-[11px] opacity-30" style={{ color: C.text }}>·</span>
        <span className="text-[11px] opacity-50 uppercase" style={{ color: C.text, fontFamily: 'var(--font-jetbrains-mono)' }}>
          {primaryCat}
        </span>
      </div>
    </div>
  )
}

function ReelHeader({ C, brand, primaryCat }: HeaderProps) {
  return (
    <div
      className="p-[40px] relative overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${C.pageBg} 0%, ${C.cardBg} 100%)` }}
    >
      <div
        className="absolute inset-0"
        style={{ background: `radial-gradient(ellipse at 20% 50%, ${C.primary}20 0%, transparent 60%)` }}
      />
      <div className="relative z-10">
        <div className="text-[10px] uppercase mb-3" style={{ color: C.primary, fontFamily: 'var(--font-jetbrains-mono)', letterSpacing: '0.2em' }}>
          {primaryCat} · {brand.city}
        </div>
        <h1
          className="leading-none uppercase font-black"
          style={{ color: C.text, fontFamily: 'var(--font-space-grotesk)', fontSize: 'clamp(44px,7vw,100px)', textShadow: `0 0 40px ${C.primary}40` }}
        >
          {brand.display_name}
        </h1>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Mobile hero — layout-specific
// ---------------------------------------------------------------------------

type MobileHeroProps = { C: LayoutColors; brand: BrandRow; initial: string; primaryCat: string; layout: LayoutId }

function MobileHero({ C, brand, initial, primaryCat, layout }: MobileHeroProps) {
  if (layout === 'poster') {
    return (
      <section
        className="flex flex-col items-center text-center py-8 px-6 relative overflow-hidden"
        style={{ background: C.primary }}
      >
        <div className="text-[10px] uppercase tracking-[0.2em] opacity-60 mb-3" style={{ color: C.badgeText, fontFamily: 'var(--font-jetbrains-mono)' }}>
          {primaryCat} BRAND
        </div>
        <div
          className="w-20 h-20 flex items-center justify-center border-4 mb-4"
          style={{ borderColor: C.badgeText, color: C.badgeText, fontFamily: 'var(--font-syne)', fontSize: 36, fontWeight: 900 }}
        >
          {initial}
        </div>
        <h1 className="text-[32px] font-black uppercase leading-none mb-2" style={{ color: C.badgeText, fontFamily: 'var(--font-syne)' }}>
          {brand.display_name}
        </h1>
        <span className="text-[11px] opacity-50 lowercase" style={{ color: C.badgeText, fontFamily: 'var(--font-jetbrains-mono)' }}>
          @{brand.username} · {brand.city}
        </span>
      </section>
    )
  }
  if (layout === 'editorial') {
    return (
      <section className="px-6 py-6" style={{ background: C.cardBg, borderBottom: `2px solid ${C.primary}` }}>
        <div className="h-[2px] mb-3" style={{ background: C.primary }} />
        <h1 className="text-[32px] leading-none mb-2" style={{ color: C.text, fontFamily: 'var(--font-playfair-display)' }}>
          {brand.display_name}
        </h1>
        <div className="text-[10px] tracking-[0.2em] uppercase opacity-50 mb-1" style={{ color: C.text, fontFamily: 'var(--font-jetbrains-mono)' }}>
          {primaryCat} · {brand.city}
        </div>
        <div className="h-px mt-3" style={{ background: C.primary, opacity: 0.3 }} />
      </section>
    )
  }
  if (layout === 'minimal') {
    return (
      <section className="px-6 py-8 flex flex-col items-center text-center" style={{ background: C.pageBg }}>
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-[28px] font-bold border-2 mb-4"
          style={{ borderColor: C.primary, color: C.primary }}
        >
          {initial}
        </div>
        <h1 className="text-[28px] font-bold leading-none mb-2" style={{ color: C.text, fontFamily: 'var(--font-dm-sans)' }}>
          {brand.display_name}
        </h1>
        <span
          className="inline-block px-3 py-1 border text-[10px] uppercase"
          style={{ borderColor: C.primary, color: C.primary, fontFamily: 'var(--font-jetbrains-mono)' }}
        >
          {primaryCat} · {brand.city}
        </span>
      </section>
    )
  }
  if (layout === 'reel') {
    return (
      <section
        className="px-6 py-6 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${C.pageBg} 0%, ${C.cardBg} 100%)` }}
      >
        <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: C.primary }} />
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-full flex-shrink-0 flex items-center justify-center text-[28px] font-black border-2"
            style={{ borderColor: C.primary, color: C.primary, boxShadow: `0 0 16px ${C.primary}40` }}
          >
            {initial}
          </div>
          <div>
            <h1 className="text-[28px] font-black uppercase leading-none" style={{ color: C.text, fontFamily: 'var(--font-space-grotesk)' }}>
              {brand.display_name}
            </h1>
            <div className="text-[10px] uppercase mt-1" style={{ color: C.primary, fontFamily: 'var(--font-jetbrains-mono)' }}>
              {brand.city} · {primaryCat}
            </div>
          </div>
        </div>
      </section>
    )
  }
  if (layout === 'corporate') {
    return (
      <section className="px-6 py-5 flex items-center gap-4" style={{ background: C.cardBg, borderBottom: `1px solid ${C.border}` }}>
        <div
          className="w-14 h-14 flex-shrink-0 flex items-center justify-center text-[24px] font-black"
          style={{ background: C.badgeBg, color: C.badgeText, fontFamily: 'var(--font-jetbrains-mono)' }}
        >
          {initial}
        </div>
        <div>
          <h1 className="text-[24px] font-black uppercase leading-none" style={{ color: C.cardText, fontFamily: 'var(--font-barlow)' }}>
            {brand.display_name}
          </h1>
          <div className="text-[10px] opacity-60 uppercase mt-1" style={{ color: C.cardText, fontFamily: 'var(--font-jetbrains-mono)' }}>
            {primaryCat} · {brand.city}
          </div>
        </div>
      </section>
    )
  }
  // boarding-pass (default)
  return (
    <section className="flex items-start gap-4 px-6 pt-6">
      <div
        className="w-20 h-20 border-2 flex items-center justify-center flex-shrink-0"
        style={{ background: C.panelBg, borderColor: C.primary }}
      >
        <span className="text-[36px] font-black leading-none" style={{ color: C.primary, fontFamily: 'var(--font-syne)' }}>
          {initial}
        </span>
      </div>
      <div className="flex flex-col">
        <h1 className="text-[32px] leading-none mb-1" style={{ color: C.text, fontFamily: 'var(--font-abril)' }}>
          {brand.display_name}
        </h1>
        <span className="text-[12px] mb-2" style={{ color: C.textMuted, fontFamily: 'var(--font-jetbrains-mono)' }}>
          @{brand.username}
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="px-2 py-1 text-[10px] uppercase"
            style={{ background: `${C.primary}20`, color: C.primary, fontFamily: 'var(--font-jetbrains-mono)' }}
          >
            {brand.city}
          </span>
          <span
            className="px-2 py-1 text-[10px] uppercase"
            style={{ background: `${C.text}08`, color: C.textMuted, fontFamily: 'var(--font-jetbrains-mono)' }}
          >
            {primaryCat}
          </span>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface BrandPublicPageProps {
  brand:    BrandRow
  creators: CreatorRow[]
  theme?:   ProfileTheme
}

export default function BrandPublicPage({ brand, creators, theme }: BrandPublicPageProps) {
  const layout   = resolveLayoutId(theme)
  const C        = LAYOUT_COLORS[layout]

  const initial     = brand.display_name?.[0]?.toUpperCase() ?? 'W'
  const serialId    = brand.id.slice(0, 8).toUpperCase()
  const sinceYear   = new Date(brand.created_at).getFullYear()
  const primaryCat  = brand.business_categories?.[0] ?? 'BRAND'
  const marqueeText = `VERIFIED BRAND · OPEN FOR PARTNERSHIPS · ${brand.display_name?.toUpperCase()} · WHENINMYCITY ·`

  const cardProps: CardProps   = { C, brand, initial, serialId, sinceYear, primaryCat }
  const headerProps: HeaderProps = { C, brand, serialId, sinceYear, primaryCat }

  return (
    <div style={{ background: C.pageBg, minHeight: '100vh' }}>
      <Grain />

      {/* ================================================================
          DESKTOP LAYOUT  (md+)
      ================================================================ */}
      <div className="hidden md:block">

        {/* Header */}
        <header
          className="sticky top-0 z-50 h-16 backdrop-blur border-b-2 border-dashed flex items-center justify-between px-6"
          style={{ background: `${C.pageBg}f0`, borderColor: C.border }}
        >
          <div className="flex items-center gap-10">
            <span className="text-[32px] font-black tracking-tighter" style={{ color: C.primary, fontFamily: 'var(--font-syne)' }}>
              WIMC
            </span>
            <div className="hidden md:flex px-4 py-2 border w-80 items-center gap-2" style={{ background: `${C.panelBg}80`, borderColor: C.border }}>
              <span className="material-symbols-outlined text-[16px]" style={{ color: C.textMuted }}>search</span>
              <input
                className="bg-transparent border-none outline-none text-sm flex-1 uppercase placeholder:opacity-30"
                style={{ color: C.textMuted, fontFamily: 'var(--font-jetbrains-mono)' }}
                placeholder="SEARCH CREATORS / BRANDS"
                readOnly
              />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <nav className="hidden lg:flex gap-4">
              {(['Discover', 'Creators', 'Partnerships'] as const).map((label, i) => (
                <a
                  key={label}
                  href="#"
                  className="text-sm transition-colors"
                  style={{
                    color: i === 0 ? C.primary : C.textMuted,
                    fontFamily: 'var(--font-dm-sans)',
                    fontWeight: i === 0 ? 700 : 400,
                    borderBottom: i === 0 ? `3px solid ${C.primary}` : 'none',
                    paddingBottom: i === 0 ? 2 : 0,
                  }}
                >
                  {label}
                </a>
              ))}
            </nav>
            <button
              className="px-4 py-2 text-sm uppercase font-bold stamp-thump"
              style={{ background: C.primary, color: C.badgeText, fontFamily: 'var(--font-dm-sans)' }}
            >
              LIST YOUR BRAND
            </button>
          </div>
        </header>

        {/* Main */}
        <div className="flex min-h-[calc(100vh-64px)]">

          {/* Left sidebar */}
          <aside
            className="w-[35%] p-6 border-r-2 border-dashed sticky top-16 h-[calc(100vh-64px)] overflow-y-auto flex-shrink-0"
            style={{ borderColor: C.border }}
          >
            {layout === 'boarding-pass' && <BoardingPassCard {...cardProps} />}
            {layout === 'poster'        && <PosterCard        {...cardProps} />}
            {layout === 'corporate'     && <CorporateCard     {...cardProps} />}
            {layout === 'editorial'     && <EditorialCard     {...cardProps} />}
            {layout === 'minimal'       && <MinimalCard       {...cardProps} />}
            {layout === 'reel'          && <ReelCard          {...cardProps} />}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-10">
              {([
                ['0', 'PARTNERSHIPS'],
                ['0', 'EVENTS'],
                [brand.city ? '1' : '0', 'CITIES'],
              ] as const).map(([val, label]) => (
                <div key={label} className="border-l-[3px] pl-2" style={{ borderColor: C.primary }}>
                  <div className="text-[28px] font-black leading-none" style={{ color: C.primary, fontFamily: 'var(--font-syne)' }}>
                    {val}
                  </div>
                  <div className="text-[10px] uppercase" style={{ color: C.textMuted, fontFamily: 'var(--font-jetbrains-mono)' }}>
                    {label}
                  </div>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-4 mb-10">
              <button
                className="w-full py-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all text-[20px] uppercase flex items-center justify-center gap-2 stamp-thump"
                style={{ background: C.primary, color: C.badgeText, fontFamily: 'var(--font-barlow)', fontWeight: 900 }}
              >
                <span className="material-symbols-outlined text-[20px]">handshake</span>
                PARTNER WITH US
              </button>
              <button
                className="w-full border-2 py-4 uppercase hover:opacity-80 transition-opacity flex items-center justify-center gap-2"
                style={{ borderColor: C.primary, color: C.primary, fontFamily: 'var(--font-barlow)', fontWeight: 900 }}
              >
                <span className="material-symbols-outlined text-[18px]">person_add</span>
                FOLLOW
              </button>
            </div>

            {/* Goals */}
            {(brand.wimc_goals?.length ?? 0) > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-widest mb-3" style={{ color: C.textMuted, fontFamily: 'var(--font-jetbrains-mono)' }}>
                  WE&apos;RE LOOKING FOR
                </div>
                <div className="flex flex-wrap gap-2">
                  {brand.wimc_goals.map((goal) => (
                    <span
                      key={goal}
                      className="px-4 py-2 text-[12px] uppercase"
                      style={{ background: `${C.primary}15`, border: `1px solid ${C.primary}40`, color: C.primary, fontFamily: 'var(--font-jetbrains-mono)' }}
                    >
                      {goal}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </aside>

          {/* Right main */}
          <main className="w-[65%] min-h-screen relative">

            {/* Sticky right badge */}
            <div
              className="fixed right-0 top-1/2 z-50 px-[4px] py-4 border-l-2"
              style={{
                background: C.primary,
                color: C.badgeText,
                borderColor: C.pageBg,
                writingMode: 'vertical-lr',
                transform: 'translateY(-50%) rotate(180deg)',
              }}
            >
              <span className="text-[10px]" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                BRAND · {brand.display_name?.toUpperCase()} · BRAND · {brand.display_name?.toUpperCase()}
              </span>
            </div>

            {/* Page header — layout-specific */}
            {layout === 'boarding-pass' && <BoardingPassHeader {...headerProps} />}
            {layout === 'poster'        && <PosterHeader        {...headerProps} />}
            {layout === 'corporate'     && <CorporateHeader     {...headerProps} />}
            {layout === 'editorial'     && <EditorialHeader     {...headerProps} />}
            {layout === 'minimal'       && <MinimalHeader       {...headerProps} />}
            {layout === 'reel'          && <ReelHeader          {...headerProps} />}

            {/* Brand brief strip */}
            <div className="p-6 flex gap-6 items-center justify-between" style={{ background: C.panelBg }}>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] mb-2 uppercase" style={{ color: C.primary, fontFamily: 'var(--font-jetbrains-mono)' }}>
                  OUR BRIEF
                </div>
                <p className="text-[18px] leading-snug" style={{ color: C.text, fontFamily: 'var(--font-dm-sans)' }}>
                  {brand.bio || 'We are open for creative partnerships.'}
                </p>
              </div>
              <div className="flex flex-col gap-1 items-end flex-shrink-0">
                {[1, 0.6, 0.3].map((opacity, i) => (
                  <div key={i} className="w-3 h-3" style={{ background: C.primary, opacity }} />
                ))}
                <div className="text-[10px] mt-2" style={{ color: C.primary, fontFamily: 'var(--font-jetbrains-mono)' }}>
                  QUOTA: 0/3 PARTNERSHIPS
                </div>
              </div>
            </div>

            {/* Creator matches */}
            <div className="p-[40px]">
              <div className="flex justify-between items-end mb-6">
                <h2
                  className="text-[36px] border-b-2 inline-block pb-1"
                  style={{ color: C.text, borderColor: C.primary, fontFamily: 'var(--font-abril)' }}
                >
                  Open Collaborations
                </h2>
                <span className="text-[12px] uppercase" style={{ color: C.primary, fontFamily: 'var(--font-jetbrains-mono)' }}>
                  {creators.length} {creators.length === 1 ? 'Match' : 'Matches'} Found
                </span>
              </div>

              {creators.length > 0 ? (
                <div className="grid grid-cols-3 gap-6">
                  {creators.map((creator) => (
                    <div
                      key={creator.id}
                      className="p-6 flex flex-col gap-4 relative group hover:opacity-80 transition-opacity"
                      style={{
                        background: C.panelBg,
                        border: `1px solid ${C.border}`,
                        boxShadow: `8px 8px 0px 0px ${C.primary}20`,
                      }}
                    >
                      <div
                        className="w-12 h-12 flex items-center justify-center text-[22px] font-black"
                        style={{ background: C.badgeBg, color: C.badgeText, fontFamily: 'var(--font-syne)' }}
                      >
                        {creator.display_name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div className="font-bold text-[20px]" style={{ color: C.text, fontFamily: 'var(--font-dm-sans)' }}>
                        {creator.display_name}
                      </div>
                      <div className="text-[12px] uppercase" style={{ color: C.textMuted, fontFamily: 'var(--font-jetbrains-mono)' }}>
                        {creatorLabel(creator.creator_type)}
                      </div>
                      {(creator.sub_types?.length ?? 0) > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {creator.sub_types.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-[2px] text-[9px] uppercase"
                              style={{ background: `${C.text}10`, color: C.textMuted, fontFamily: 'var(--font-jetbrains-mono)' }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <button
                        className="w-full py-2 text-sm uppercase hover:opacity-90 transition-opacity stamp-thump mt-auto"
                        style={{ background: C.primary, color: C.badgeText, fontFamily: 'var(--font-barlow)', fontWeight: 900 }}
                      >
                        REACH OUT
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 flex flex-col items-center justify-center border-2 border-dashed" style={{ borderColor: C.border }}>
                  <span className="material-symbols-outlined text-[48px] mb-3" style={{ color: C.textMuted }}>group_add</span>
                  <span className="text-[12px] uppercase tracking-widest" style={{ color: C.textMuted, fontFamily: 'var(--font-jetbrains-mono)' }}>
                    NO MATCHES IN {brand.city?.toUpperCase()} YET
                  </span>
                </div>
              )}
            </div>

            {/* What we work in */}
            <div className="p-[40px]" style={{ background: C.panelBg }}>
              <div className="text-[10px] uppercase tracking-[0.4em] mb-6" style={{ color: C.textMuted, fontFamily: 'var(--font-jetbrains-mono)' }}>
                WHAT WE WORK IN
              </div>
              <div className="flex flex-wrap items-center">
                {(brand.business_categories?.length ?? 0) > 0 ? (
                  brand.business_categories.map((cat, i) => (
                    <span key={cat} className="flex items-center">
                      <span
                        className="hover:line-through cursor-pointer transition-all"
                        style={{ color: C.primary, fontFamily: 'var(--font-syne)', fontWeight: 900, fontSize: 52 }}
                      >
                        {cat}
                      </span>
                      {i < brand.business_categories.length - 1 && (
                        <span className="mx-4" style={{ color: C.textMuted, fontFamily: 'var(--font-syne)', fontWeight: 900, fontSize: 52 }}>
                          /
                        </span>
                      )}
                    </span>
                  ))
                ) : (
                  <span style={{ color: C.primary, fontFamily: 'var(--font-syne)', fontWeight: 900, fontSize: 52 }}>BRAND</span>
                )}
              </div>
            </div>

            {/* Archive collabs */}
            <div className="p-[40px]">
              <div className="flex justify-between items-end mb-6">
                <h2 className="text-[36px]" style={{ color: C.text, fontFamily: 'var(--font-abril)' }}>Archive Collabs</h2>
                <span className="text-[10px]" style={{ color: C.textMuted, fontFamily: 'var(--font-jetbrains-mono)' }}>SCROLL TO DISCOVER →</span>
              </div>
              <div className="flex overflow-x-auto gap-6 pb-6">
                {(['POP-UP EVENT', 'CITY COLLAB', 'BRAND TAKEOVER'] as const).map((name, i) => (
                  <div
                    key={i}
                    className="min-w-[280px] p-4 flex-shrink-0"
                    style={{ background: C.panelBg, borderLeft: `4px solid ${C.primary}` }}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className="w-8 h-8 flex items-center justify-center text-sm font-black"
                        style={{ border: `1px solid ${C.primary}`, color: C.primary, fontFamily: 'var(--font-syne)' }}
                      >
                        {initial}
                      </div>
                      <span className="text-[10px]" style={{ color: C.textMuted, fontFamily: 'var(--font-jetbrains-mono)' }}>
                        WIMC × COLLAB_0{i + 1}
                      </span>
                    </div>
                    <div className="text-[20px] leading-tight font-black" style={{ color: C.text, fontFamily: 'var(--font-syne)' }}>
                      {name}
                    </div>
                    <div className="text-[10px] mt-2" style={{ color: C.textMuted, fontFamily: 'var(--font-jetbrains-mono)' }}>
                      {brand.city?.toUpperCase()} · {sinceYear}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Marquee */}
            <div className="py-[4px] overflow-hidden border-y-2" style={{ background: C.primary, borderColor: C.pageBg }}>
              <div className="animate-brand-marquee">
                <span className="shrink-0 mx-[40px] text-sm uppercase" style={{ color: C.badgeText, fontFamily: 'var(--font-jetbrains-mono)' }}>
                  {marqueeText}
                </span>
                <span className="shrink-0 mx-[40px] text-sm uppercase" style={{ color: C.badgeText, fontFamily: 'var(--font-jetbrains-mono)' }}>
                  {marqueeText}
                </span>
              </div>
            </div>

            {/* Sticky footer */}
            <div
              className="sticky bottom-0 p-6 border-t-2 border-dashed flex items-center justify-between z-20"
              style={{ background: C.pageBg, borderColor: C.border }}
            >
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: C.primary }} />
                <span className="text-[12px]" style={{ color: C.text, fontFamily: 'var(--font-jetbrains-mono)' }}>
                  OPEN FOR PARTNERSHIPS
                </span>
              </div>
              <div className="flex gap-6 items-center">
                <span className="text-[10px]" style={{ color: C.textMuted, fontFamily: 'var(--font-jetbrains-mono)' }}>
                  © {sinceYear} WIMC
                </span>
                <button
                  className="font-bold px-6 py-2 flex items-center gap-2 stamp-thump"
                  style={{ background: C.primary, color: C.badgeText, fontFamily: 'var(--font-dm-sans)' }}
                >
                  <span className="material-symbols-outlined text-[18px]">handshake</span>
                  PARTNER WITH US
                </button>
              </div>
            </div>
          </main>
        </div>

        {/* Postmark decoration */}
        <div
          className="fixed bottom-24 right-12 w-24 h-24 border-2 rounded-full flex items-center justify-center -rotate-12 pointer-events-none opacity-30 z-10"
          style={{ borderColor: C.primary }}
        >
          <div className="flex flex-col items-center justify-center">
            <span className="text-[7px] text-center leading-tight" style={{ color: C.primary, fontFamily: 'var(--font-jetbrains-mono)' }}>
              VALIDATED<br />WIMC<br />{sinceYear}
            </span>
          </div>
        </div>
      </div>

      {/* ================================================================
          MOBILE LAYOUT  (< md)
      ================================================================ */}
      <div className="md:hidden">

        {/* Mobile header */}
        <header
          className="fixed h-16 top-0 left-0 right-0 backdrop-blur border-b z-[100] flex items-center justify-between px-6"
          style={{ background: `${C.pageBg}f5`, borderColor: C.border }}
        >
          <span className="text-[24px] font-black tracking-tighter" style={{ color: C.primary, fontFamily: 'var(--font-syne)' }}>
            WIMC
          </span>
          <div className="flex gap-4" style={{ color: C.primary }}>
            <span className="material-symbols-outlined">share</span>
            <span className="material-symbols-outlined">more_vert</span>
          </div>
        </header>

        <div className="pt-16 pb-36">

          {/* Layout-specific mobile hero */}
          <MobileHero C={C} brand={brand} initial={initial} primaryCat={primaryCat} layout={layout} />

          {/* Editorial header */}
          <div className="px-6 pt-8 pb-6" style={{ borderBottom: `1px solid ${C.border}` }}>
            <div className="text-[10px] uppercase tracking-widest mb-3" style={{ color: C.textMuted, fontFamily: 'var(--font-jetbrains-mono)' }}>
              {primaryCat} · {brand.city} · EST. {sinceYear}
            </div>
            <h1
              className="text-[52px] font-black leading-none tracking-tighter"
              style={{ color: C.text, fontFamily: 'var(--font-syne)' }}
            >
              {brand.display_name}
            </h1>
          </div>

          {/* OUR BRIEF panel */}
          <div className="flex justify-between items-start gap-4 px-6 py-5" style={{ background: C.panelBg }}>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase mb-2" style={{ color: C.primary, fontFamily: 'var(--font-jetbrains-mono)' }}>
                OUR BRIEF
              </div>
              <p className="text-[16px] leading-snug" style={{ color: C.text, fontFamily: 'var(--font-dm-sans)' }}>
                {brand.bio || 'We are open for creative partnerships.'}
              </p>
            </div>
            <div className="flex flex-col gap-1 items-end flex-shrink-0">
              {([1, 0.6, 0.3] as const).map((opacity, i) => (
                <div key={i} className="w-2.5 h-2.5" style={{ background: C.primary, opacity }} />
              ))}
              <div className="text-[9px] mt-2" style={{ color: C.primary, fontFamily: 'var(--font-jetbrains-mono)' }}>
                QUOTA: 0/3
              </div>
            </div>
          </div>

          <div className="px-6 pt-8 space-y-10">

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              {([
                ['0', 'CREATORS\nPARTNERED'],
                ['0', 'EVENTS\nBACKED'],
                [brand.city ? '1' : '0', 'CITIES'],
              ] as const).map(([val, label]) => (
                <div key={label} className="border-l-[3px] pl-3" style={{ borderColor: C.primary }}>
                  <span className="text-[28px] font-black leading-none block" style={{ color: C.primary, fontFamily: 'var(--font-syne)' }}>
                    {val}
                  </span>
                  <span className="text-[9px] uppercase mt-1 block" style={{ color: C.textMuted, fontFamily: 'var(--font-jetbrains-mono)', whiteSpace: 'pre-line' }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="flex flex-col gap-3">
              <button
                className="py-4 flex items-center justify-center gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all stamp-thump"
                style={{ background: C.primary, color: C.badgeText, fontFamily: 'var(--font-syne)', fontWeight: 900, fontSize: 15 }}
              >
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>handshake</span>
                PARTNER WITH US
              </button>
              <button
                className="border py-4 flex items-center justify-center gap-3 active:opacity-80 transition-opacity"
                style={{ borderColor: C.primary, color: C.primary, fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 14 }}
              >
                <span className="material-symbols-outlined">person_add</span>
                FOLLOW
              </button>
            </div>

            {/* Open Collaborations */}
            <div>
              <div className="flex items-end justify-between mb-5">
                <h2
                  className="text-[28px] border-b-2 inline-block pb-1"
                  style={{ color: C.text, borderColor: C.primary, fontFamily: 'var(--font-abril)' }}
                >
                  Open Collaborations
                </h2>
                <span className="text-[10px] mb-1" style={{ color: C.textMuted, fontFamily: 'var(--font-jetbrains-mono)' }}>
                  {creators.length} {creators.length === 1 ? 'MATCH' : 'MATCHES'}
                </span>
              </div>
              <div className="space-y-3">
                {creators.length > 0 ? (
                  creators.map((creator) => (
                    <div
                      key={creator.id}
                      className="p-4 flex items-center justify-between"
                      style={{
                        background: C.panelBg,
                        border: `1px solid ${C.border}`,
                        boxShadow: `4px 4px 0px 0px ${C.primary}20`,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 flex items-center justify-center font-black text-[15px]"
                          style={{ background: C.primary, color: C.badgeText, fontFamily: 'var(--font-syne)' }}
                        >
                          {creator.display_name?.[0]?.toUpperCase() ?? '?'}
                        </div>
                        <div>
                          <div className="font-black text-[15px]" style={{ color: C.text, fontFamily: 'var(--font-syne)' }}>
                            {creator.display_name}
                          </div>
                          <div className="text-[10px]" style={{ color: C.primary, fontFamily: 'var(--font-jetbrains-mono)' }}>
                            {creatorLabel(creator.creator_type)}
                          </div>
                        </div>
                      </div>
                      <button
                        className="px-3 py-2 text-[10px] uppercase stamp-thump"
                        style={{ background: C.primary, color: C.badgeText, fontFamily: 'var(--font-jetbrains-mono)', fontWeight: 700 }}
                      >
                        REACH OUT
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="border-2 border-dashed p-8 flex flex-col items-center" style={{ borderColor: C.border }}>
                    <span className="material-symbols-outlined text-[36px] mb-2" style={{ color: C.textMuted }}>group_add</span>
                    <span className="text-[11px] uppercase" style={{ color: C.textMuted, fontFamily: 'var(--font-jetbrains-mono)' }}>
                      NO MATCHES IN {brand.city?.toUpperCase()} YET
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Goals */}
            {(brand.wimc_goals?.length ?? 0) > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-[0.3em] mb-3" style={{ color: C.textMuted, fontFamily: 'var(--font-jetbrains-mono)' }}>
                  WE&apos;RE LOOKING FOR
                </div>
                <div className="flex flex-wrap gap-2">
                  {brand.wimc_goals.map((goal) => (
                    <span
                      key={goal}
                      className="px-3 py-2 text-[10px] uppercase"
                      style={{ background: `${C.primary}15`, border: `1px solid ${C.primary}40`, color: C.primary, fontFamily: 'var(--font-jetbrains-mono)' }}
                    >
                      {goal}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Get in touch */}
            {(brand.contact_whatsapp || brand.contact_email || brand.instagram_handle) && (
              <div>
                <div className="text-[10px] uppercase tracking-widest mb-3" style={{ color: C.textMuted, fontFamily: 'var(--font-jetbrains-mono)' }}>
                  GET IN TOUCH
                </div>
                <div style={{ borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
                  {brand.contact_whatsapp && (
                    <a
                      href={`https://wa.me/${brand.contact_whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-4 flex justify-between items-center"
                      style={{ borderBottom: `1px solid ${C.border}` }}
                    >
                      <div className="flex items-center gap-4">
                        <span className="material-symbols-outlined" style={{ color: C.primary }}>chat</span>
                        <span className="text-[13px]" style={{ color: C.text, fontFamily: 'var(--font-jetbrains-mono)' }}>WHATSAPP</span>
                      </div>
                      <span className="material-symbols-outlined text-[18px]" style={{ color: C.textMuted }}>arrow_forward_ios</span>
                    </a>
                  )}
                  {brand.contact_email && (
                    <a
                      href={`mailto:${brand.contact_email}`}
                      className="py-4 flex justify-between items-center"
                      style={{ borderBottom: brand.instagram_handle ? `1px solid ${C.border}` : undefined }}
                    >
                      <div className="flex items-center gap-4">
                        <span className="material-symbols-outlined" style={{ color: C.primary }}>alternate_email</span>
                        <span className="text-[13px]" style={{ color: C.text, fontFamily: 'var(--font-jetbrains-mono)' }}>EMAIL</span>
                      </div>
                      <span className="material-symbols-outlined text-[18px]" style={{ color: C.textMuted }}>arrow_forward_ios</span>
                    </a>
                  )}
                  {brand.instagram_handle && (
                    <a
                      href={brand.instagram_handle.startsWith('http') ? brand.instagram_handle : `https://instagram.com/${brand.instagram_handle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-4 flex justify-between items-center"
                    >
                      <div className="flex items-center gap-4">
                        <span className="material-symbols-outlined" style={{ color: C.primary }}>photo_camera</span>
                        <span className="text-[13px]" style={{ color: C.text, fontFamily: 'var(--font-jetbrains-mono)' }}>INSTAGRAM</span>
                      </div>
                      <span className="material-symbols-outlined text-[18px]" style={{ color: C.textMuted }}>arrow_forward_ios</span>
                    </a>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* What We Work In — full-bleed panel */}
          <div className="mt-10" style={{ background: C.panelBg }}>
            <div className="px-6 py-6">
              <div className="text-[10px] uppercase tracking-[0.4em] mb-4" style={{ color: C.textMuted, fontFamily: 'var(--font-jetbrains-mono)' }}>
                WHAT WE WORK IN
              </div>
              <div className="flex flex-wrap items-center">
                {(brand.business_categories?.length ?? 0) > 0 ? (
                  brand.business_categories.map((cat, i) => (
                    <span key={cat} className="flex items-center">
                      <span style={{ color: C.primary, fontFamily: 'var(--font-syne)', fontWeight: 900, fontSize: 36 }}>
                        {cat}
                      </span>
                      {i < brand.business_categories.length - 1 && (
                        <span className="mx-2" style={{ color: C.textMuted, fontFamily: 'var(--font-syne)', fontWeight: 900, fontSize: 36 }}>
                          /
                        </span>
                      )}
                    </span>
                  ))
                ) : (
                  <span style={{ color: C.primary, fontFamily: 'var(--font-syne)', fontWeight: 900, fontSize: 36 }}>BRAND</span>
                )}
              </div>
            </div>
          </div>

          {/* Archive Collabs — horizontal scroll */}
          <div className="px-6 py-8">
            <div className="flex justify-between items-end mb-5">
              <h2 className="text-[28px]" style={{ color: C.text, fontFamily: 'var(--font-abril)' }}>Archive Collabs</h2>
              <span className="text-[10px]" style={{ color: C.textMuted, fontFamily: 'var(--font-jetbrains-mono)' }}>SCROLL →</span>
            </div>
            <div className="flex overflow-x-auto gap-4 pb-4 -mx-6 px-6" style={{ scrollbarWidth: 'none' }}>
              {(['POP-UP EVENT', 'CITY COLLAB', 'BRAND TAKEOVER'] as const).map((name, i) => (
                <div
                  key={i}
                  className="min-w-[220px] p-4 flex-shrink-0"
                  style={{ background: C.panelBg, borderLeft: `4px solid ${C.primary}` }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="w-7 h-7 flex items-center justify-center text-xs font-black"
                      style={{ border: `1px solid ${C.primary}`, color: C.primary, fontFamily: 'var(--font-syne)' }}
                    >
                      {initial}
                    </div>
                    <span className="text-[9px]" style={{ color: C.textMuted, fontFamily: 'var(--font-jetbrains-mono)' }}>
                      WIMC × COLLAB_0{i + 1}
                    </span>
                  </div>
                  <div className="text-[18px] font-black leading-tight" style={{ color: C.text, fontFamily: 'var(--font-syne)' }}>
                    {name}
                  </div>
                  <div className="text-[9px] mt-2" style={{ color: C.textMuted, fontFamily: 'var(--font-jetbrains-mono)' }}>
                    {brand.city?.toUpperCase()} · {sinceYear}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Marquee — primary color band */}
          <div className="py-[4px] overflow-hidden" style={{ background: C.primary }}>
            <div className="animate-brand-marquee">
              <span className="shrink-0 mx-[32px] text-[11px] uppercase" style={{ color: C.badgeText, fontFamily: 'var(--font-jetbrains-mono)' }}>
                {marqueeText}
              </span>
              <span className="shrink-0 mx-[32px] text-[11px] uppercase" style={{ color: C.badgeText, fontFamily: 'var(--font-jetbrains-mono)' }}>
                {marqueeText}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-5 flex items-center justify-between" style={{ borderTop: `1px dashed ${C.border}` }}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: C.primary }} />
              <span className="text-[10px]" style={{ color: C.text, fontFamily: 'var(--font-jetbrains-mono)' }}>
                OPEN FOR PARTNERSHIPS
              </span>
            </div>
            <span className="text-[10px]" style={{ color: C.textMuted, fontFamily: 'var(--font-jetbrains-mono)' }}>
              © {sinceYear} WIMC
            </span>
          </div>

        </div>

        {/* Fixed bottom CTA */}
        <div
          className="fixed bottom-0 left-0 w-full z-[90] pt-10 px-6 pb-6"
          style={{ background: `linear-gradient(to top, ${C.pageBg} 0%, ${C.pageBg} 60%, transparent 100%)` }}
        >
          <button
            className="w-full py-5 flex items-center justify-center gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all stamp-thump"
            style={{ background: C.primary, color: C.badgeText, fontFamily: 'var(--font-syne)', fontWeight: 900, fontSize: 15 }}
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>handshake</span>
            PARTNER WITH US
          </button>
        </div>
      </div>
    </div>
  )
}
