import Image from 'next/image'
import type { ProfileTheme } from '@/types/theme'

// ─── Shared brand colour palette ─────────────────────────────────────────────

export type BrandTheme = {
  bg: string
  bgCard: string
  bgPanel: string
  primary: string
  primaryDim: string
  primaryBg: string
  text: string
  textMuted: string
  border: string
  badgeBg: string
  badgeText: string
  heroGradient: string
  label: string
  icon: string
}

export const BRAND_THEMES: Record<string, BrandTheme> = {
  retail: {
    label: 'RETAIL', icon: 'storefront',
    bg: '#0A0806', bgCard: '#151008', bgPanel: '#1C1509',
    primary: '#F97316', primaryDim: 'rgba(249,115,22,0.3)', primaryBg: 'rgba(249,115,22,0.08)',
    text: '#FFF0E8', textMuted: '#9A6040',
    border: 'rgba(249,115,22,0.22)', badgeBg: '#F97316', badgeText: '#0A0806',
    heroGradient: 'linear-gradient(to top, #0A0806 0%, rgba(10,8,6,0.7) 40%, rgba(10,8,6,0.1) 100%)',
  },
  agency: {
    label: 'AGENCY', icon: 'work',
    bg: '#060810', bgCard: '#0C1020', bgPanel: '#101828',
    primary: '#6366F1', primaryDim: 'rgba(99,102,241,0.3)', primaryBg: 'rgba(99,102,241,0.08)',
    text: '#EEF0FF', textMuted: '#5860A0',
    border: 'rgba(99,102,241,0.22)', badgeBg: '#6366F1', badgeText: '#060810',
    heroGradient: 'linear-gradient(to top, #060810 0%, rgba(6,8,16,0.7) 40%, rgba(6,8,16,0.1) 100%)',
  },
  startup: {
    label: 'STARTUP', icon: 'rocket_launch',
    bg: '#07050F', bgCard: '#0E0B1E', bgPanel: '#140F28',
    primary: '#8B5CF6', primaryDim: 'rgba(139,92,246,0.3)', primaryBg: 'rgba(139,92,246,0.08)',
    text: '#F0ECFF', textMuted: '#6050A8',
    border: 'rgba(139,92,246,0.22)', badgeBg: '#8B5CF6', badgeText: '#07050F',
    heroGradient: 'linear-gradient(to top, #07050F 0%, rgba(7,5,15,0.7) 40%, rgba(7,5,15,0.1) 100%)',
  },
  creative: {
    label: 'CREATIVE', icon: 'brush',
    bg: '#0A0510', bgCard: '#14081E', bgPanel: '#1C0B28',
    primary: '#EC4899', primaryDim: 'rgba(236,72,153,0.3)', primaryBg: 'rgba(236,72,153,0.08)',
    text: '#FFE8F5', textMuted: '#904868',
    border: 'rgba(236,72,153,0.22)', badgeBg: '#EC4899', badgeText: '#0A0510',
    heroGradient: 'linear-gradient(to top, #0A0510 0%, rgba(10,5,16,0.7) 40%, rgba(10,5,16,0.1) 100%)',
  },
  fnb: {
    label: 'FOOD & BEVERAGE', icon: 'restaurant',
    bg: '#0E0800', bgCard: '#1C1000', bgPanel: '#241500',
    primary: '#F59E0B', primaryDim: 'rgba(245,158,11,0.3)', primaryBg: 'rgba(245,158,11,0.08)',
    text: '#FFF5DC', textMuted: '#A07020',
    border: 'rgba(245,158,11,0.25)', badgeBg: '#F59E0B', badgeText: '#0E0800',
    heroGradient: 'linear-gradient(to top, #0E0800 0%, rgba(14,8,0,0.7) 40%, rgba(14,8,0,0.1) 100%)',
  },
  fashion: {
    label: 'FASHION', icon: 'checkroom',
    bg: '#0A0508', bgCard: '#150A10', bgPanel: '#1E0E18',
    primary: '#F43F5E', primaryDim: 'rgba(244,63,94,0.3)', primaryBg: 'rgba(244,63,94,0.07)',
    text: '#FFE8F0', textMuted: '#904060',
    border: 'rgba(244,63,94,0.22)', badgeBg: '#F43F5E', badgeText: '#0A0508',
    heroGradient: 'linear-gradient(to top, #0A0508 0%, rgba(10,5,8,0.7) 40%, rgba(10,5,8,0.1) 100%)',
  },
  tech: {
    label: 'TECH', icon: 'devices',
    bg: '#050A10', bgCard: '#0A1220', bgPanel: '#0E1830',
    primary: '#06B6D4', primaryDim: 'rgba(6,182,212,0.3)', primaryBg: 'rgba(6,182,212,0.07)',
    text: '#E8FBFF', textMuted: '#2880A0',
    border: 'rgba(6,182,212,0.22)', badgeBg: '#06B6D4', badgeText: '#050A10',
    heroGradient: 'linear-gradient(to top, #050A10 0%, rgba(5,10,16,0.7) 40%, rgba(5,10,16,0.1) 100%)',
  },
  media: {
    label: 'MEDIA', icon: 'movie',
    bg: '#080510', bgCard: '#100A20', bgPanel: '#180F2E',
    primary: '#A855F7', primaryDim: 'rgba(168,85,247,0.3)', primaryBg: 'rgba(168,85,247,0.08)',
    text: '#F0E8FF', textMuted: '#7050A8',
    border: 'rgba(168,85,247,0.22)', badgeBg: '#A855F7', badgeText: '#080510',
    heroGradient: 'linear-gradient(to top, #080510 0%, rgba(8,5,16,0.7) 40%, rgba(8,5,16,0.1) 100%)',
  },
  beauty: {
    label: 'BEAUTY & WELLNESS', icon: 'spa',
    bg: '#0A0508', bgCard: '#160A12', bgPanel: '#200F1A',
    primary: '#DB2777', primaryDim: 'rgba(219,39,119,0.3)', primaryBg: 'rgba(219,39,119,0.07)',
    text: '#FFE8F2', textMuted: '#904068',
    border: 'rgba(219,39,119,0.22)', badgeBg: '#DB2777', badgeText: '#0A0508',
    heroGradient: 'linear-gradient(to top, #0A0508 0%, rgba(10,5,8,0.7) 40%, rgba(10,5,8,0.1) 100%)',
  },
  education: {
    label: 'EDUCATION', icon: 'school',
    bg: '#040C0E', bgCard: '#081820', bgPanel: '#0C2028',
    primary: '#14B8A6', primaryDim: 'rgba(20,184,166,0.3)', primaryBg: 'rgba(20,184,166,0.07)',
    text: '#E8FFFC', textMuted: '#207870',
    border: 'rgba(20,184,166,0.22)', badgeBg: '#14B8A6', badgeText: '#040C0E',
    heroGradient: 'linear-gradient(to top, #040C0E 0%, rgba(4,12,14,0.7) 40%, rgba(4,12,14,0.1) 100%)',
  },
  health: {
    label: 'HEALTH & FITNESS', icon: 'local_hospital',
    bg: '#040C06', bgCard: '#08180C', bgPanel: '#0C2014',
    primary: '#22C55E', primaryDim: 'rgba(34,197,94,0.3)', primaryBg: 'rgba(34,197,94,0.07)',
    text: '#E8FFEE', textMuted: '#207840',
    border: 'rgba(34,197,94,0.22)', badgeBg: '#22C55E', badgeText: '#040C06',
    heroGradient: 'linear-gradient(to top, #040C06 0%, rgba(4,12,6,0.7) 40%, rgba(4,12,6,0.1) 100%)',
  },
  other: {
    label: 'BRAND', icon: 'bolt',
    bg: '#07070A', bgCard: '#111117', bgPanel: '#1A1F30',
    primary: '#5DD9D0', primaryDim: 'rgba(93,217,208,0.3)', primaryBg: 'rgba(93,217,208,0.08)',
    text: '#F0EFF8', textMuted: '#9896B0',
    border: 'rgba(93,217,208,0.22)', badgeBg: '#5DD9D0', badgeText: '#07070A',
    heroGradient: 'linear-gradient(to top, #07070A 0%, rgba(7,7,10,0.7) 40%, rgba(7,7,10,0.1) 100%)',
  },
}

// ─── Colour scheme → primary hex override ────────────────────────────────────

export const SCHEME_PRIMARY_MAP: Record<string, string> = {
  midnight:    '#818CF8',
  ocean:       '#22D3EE',
  forest:      '#6EE7B7',
  blush:       '#E11D48',
  sand:        '#D97706',
  pista:       '#86EFAC',
  gulaal:      '#F472B6',
  neel:        '#60A5FA',
  turmeric:    '#FBBF24',
  steel:       '#94A3B8',
  sienna:      '#C2784B',
  indigo:      '#818CF8',
  sage:        '#86EFAC',
  mint:        '#34D399',
  electric:    '#00D4FF',
  velvet:      '#8B5CF6',
  nightforest: '#4ADE80',
  parchment:   '#78716C',
  gallery:     '#71717A',
  terracotta:  '#DC6E4B',
  aurora:      '#C084FC',
}

/** Derives brand colour tokens from category + pageTheme overrides. */
export function deriveBrandColors(categories: string[], pageTheme?: ProfileTheme): BrandTheme {
  const base = BRAND_THEMES[(categories?.[0] ?? '').toLowerCase()] ?? BRAND_THEMES.other
  if (!pageTheme || pageTheme.colorScheme === 'default') return base

  const primary = SCHEME_PRIMARY_MAP[pageTheme.colorScheme] ?? base.primary
  const bg = (pageTheme.backgroundStyle === 'solid' && pageTheme.solidColor)
    ? pageTheme.solidColor
    : base.bg

  return {
    ...base,
    primary,
    primaryDim: `${primary}40`,
    primaryBg:  `${primary}10`,
    bg,
    border:     `${primary}30`,
    badgeBg:    primary,
    badgeText:  bg,
  }
}

// ─── Hero components ──────────────────────────────────────────────────────────

export type HeroProps = {
  theme:       BrandTheme
  displayName: string
  city:        string
  categories:  string[]
  avatarUrl?:  string | null
  waUrl:       string | null
}

export function BoardingPassHero({ theme, displayName, city, categories, avatarUrl, waUrl }: HeroProps) {
  return (
    <div style={{ padding: '16px 16px 14px', background: theme.bgPanel, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: `linear-gradient(${theme.primaryDim} 1px, transparent 1px), linear-gradient(90deg, ${theme.primaryDim} 1px, transparent 1px)`, backgroundSize: '32px 32px', opacity: 0.06 }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: theme.badgeBg, color: theme.badgeText, padding: '3px 8px', fontSize: 9, fontFamily: 'var(--font-jetbrains-mono), monospace', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 11, fontVariationSettings: "'FILL' 1" }}>{theme.icon}</span>
          {theme.label}
        </span>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
          {avatarUrl && <div style={{ width: 44, height: 44, flexShrink: 0, border: `1.5px solid ${theme.primaryDim}`, overflow: 'hidden' }}><Image src={avatarUrl} alt={displayName} width={44} height={44} style={{ width: '100%', height: '100%', objectFit: 'cover' }} unoptimized /></div>}
          <div>
            <div style={{ fontSize: 'clamp(20px, 5vw, 28px)', fontWeight: 900, textTransform: 'uppercase', lineHeight: 1, color: theme.text, fontFamily: 'var(--font-barlow), sans-serif', marginBottom: 3 }}>{displayName}</div>
            <div style={{ fontSize: 9, fontFamily: 'var(--font-jetbrains-mono), monospace', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{city}{categories.length > 0 && ` · ${categories[0].toUpperCase()}`}</div>
          </div>
        </div>
        {waUrl && <a href={waUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: theme.primary, color: theme.badgeText, textDecoration: 'none', fontWeight: 900, fontSize: 12, textTransform: 'uppercase', fontFamily: 'var(--font-barlow), sans-serif', boxShadow: '3px 3px 0 rgba(0,0,0,0.6)', border: '1.5px solid #000' }}>Collaborate with this Brand<span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_forward</span></a>}
      </div>
    </div>
  )
}

export function PosterHero({ theme, displayName, city, categories }: HeroProps) {
  return (
    <div style={{ position: 'relative', minHeight: 130, background: theme.primary, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.25)', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Crect width='1' height='1' fill='%23ffffff' opacity='0.15'/%3E%3C/svg%3E")` }} />
      <div style={{ position: 'relative', zIndex: 1, padding: '22px 16px 18px', textAlign: 'center' }}>
        <div style={{ fontSize: 9, fontFamily: 'var(--font-jetbrains-mono), monospace', color: 'rgba(0,0,0,0.6)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 10 }}>{theme.label}</div>
        <div style={{ fontSize: 'clamp(28px, 8vw, 42px)', fontWeight: 900, textTransform: 'uppercase', color: theme.badgeText, fontFamily: 'var(--font-barlow), sans-serif', lineHeight: 0.9, marginBottom: 8, letterSpacing: '-0.02em' }}>{displayName}</div>
        <div style={{ fontSize: 9, color: 'rgba(0,0,0,0.55)', fontFamily: 'var(--font-jetbrains-mono), monospace', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{city}{categories.length > 0 && ` · ${categories[0].toUpperCase()}`}</div>
      </div>
    </div>
  )
}

export function CorporateHero({ theme, displayName, city, categories, avatarUrl, waUrl }: HeroProps) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '16px', background: theme.bgPanel, borderBottom: `1px solid ${theme.border}` }}>
      <div style={{ width: 64, height: 64, flexShrink: 0, background: theme.bgCard, border: `1.5px solid ${theme.primaryDim}`, overflow: 'hidden' }}>
        {avatarUrl ? <Image src={avatarUrl} alt={displayName} width={64} height={64} style={{ width: '100%', height: '100%', objectFit: 'cover' }} unoptimized /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="material-symbols-outlined" style={{ fontSize: 28, color: theme.textMuted }}>{theme.icon}</span></div>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 17, fontWeight: 900, textTransform: 'uppercase', color: theme.text, fontFamily: 'var(--font-barlow), sans-serif', lineHeight: 1.1, marginBottom: 3 }}>{displayName}</div>
        <div style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'var(--font-jetbrains-mono), monospace', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{city}{categories.length > 0 && ` · ${categories[0].toUpperCase()}`}</div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: theme.badgeBg, color: theme.badgeText, padding: '2px 7px', fontSize: 8, fontFamily: 'var(--font-jetbrains-mono), monospace', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 9, fontVariationSettings: "'FILL' 1" }}>{theme.icon}</span>{theme.label}
        </span>
        {waUrl && <div style={{ marginTop: 6, fontSize: 9, color: theme.primary, fontFamily: 'var(--font-jetbrains-mono), monospace', display: 'flex', alignItems: 'center', gap: 4 }}><span className="material-symbols-outlined" style={{ fontSize: 10 }}>chat</span>Collaborate →</div>}
      </div>
    </div>
  )
}

export function EditorialHero({ theme, displayName, city }: HeroProps) {
  return (
    <div style={{ padding: '14px 16px 12px', background: '#F7F3E9', borderBottom: '2px solid #2A1F0E' }}>
      <div style={{ height: 2, background: '#2A1F0E', marginBottom: 10 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <div style={{ fontSize: 'clamp(17px, 5vw, 24px)', fontWeight: 700, color: '#2A1F0E', fontFamily: 'var(--font-playfair-display), serif', letterSpacing: '-0.03em', lineHeight: 1 }}>{displayName}</div>
        <div style={{ fontSize: 8, color: '#6B5040', fontFamily: 'var(--font-jetbrains-mono), monospace', textTransform: 'uppercase', letterSpacing: '0.10em' }}>{city}</div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ height: 1, background: 'rgba(42,31,14,0.25)', flex: 1 }} />
        <span style={{ fontSize: 8, color: '#6B5040', fontFamily: 'var(--font-jetbrains-mono), monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{theme.label}</span>
        <div style={{ height: 1, background: 'rgba(42,31,14,0.25)', flex: 1 }} />
      </div>
    </div>
  )
}

export function MinimalHero({ theme, displayName, avatarUrl }: HeroProps) {
  return (
    <div style={{ padding: '24px 16px 16px', textAlign: 'center', background: theme.bg }}>
      {avatarUrl && <div style={{ width: 52, height: 52, borderRadius: '50%', overflow: 'hidden', margin: '0 auto 10px', border: `1.5px solid ${theme.primaryDim}` }}><Image src={avatarUrl} alt={displayName} width={52} height={52} style={{ width: '100%', height: '100%', objectFit: 'cover' }} unoptimized /></div>}
      <div style={{ fontSize: 19, fontWeight: 700, color: theme.text, marginBottom: 6, letterSpacing: '-0.02em' }}>{displayName}</div>
      <span style={{ display: 'inline-block', padding: '3px 10px', border: `1px solid ${theme.primaryDim}`, color: theme.primary, fontSize: 9, fontFamily: 'var(--font-jetbrains-mono), monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{theme.label}</span>
    </div>
  )
}

export function ReelHero({ theme, displayName, city, categories, avatarUrl }: HeroProps) {
  return (
    <div style={{ position: 'relative', minHeight: 110, background: `linear-gradient(135deg, ${theme.bg} 0%, ${theme.bgCard} 100%)`, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 70% 50%, ${theme.primaryBg} 0%, transparent 70%)` }} />
      <div style={{ position: 'relative', zIndex: 1, padding: '16px 16px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 46, height: 46, borderRadius: '50%', flexShrink: 0, border: `2px solid ${theme.primary}`, boxShadow: `0 0 14px ${theme.primaryDim}`, overflow: 'hidden', background: theme.bgCard }}>
          {avatarUrl ? <Image src={avatarUrl} alt={displayName} width={46} height={46} style={{ width: '100%', height: '100%', objectFit: 'cover' }} unoptimized /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="material-symbols-outlined" style={{ fontSize: 22, color: theme.primary }}>{theme.icon}</span></div>}
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 900, color: theme.text, fontFamily: 'var(--font-space-grotesk), sans-serif', textTransform: 'uppercase', letterSpacing: '-0.03em' }}>{displayName}</div>
          <div style={{ fontSize: 9, color: theme.primary, fontFamily: 'var(--font-jetbrains-mono), monospace', textTransform: 'uppercase', marginTop: 2 }}>{city}{categories.length > 0 && ` · ${categories[0].toUpperCase()}`}</div>
        </div>
      </div>
    </div>
  )
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

export function BrandHeroDispatcher(props: HeroProps & { layoutPreset: string }) {
  const { layoutPreset, ...heroProps } = props
  switch (layoutPreset) {
    case 'poster':    return <PosterHero    {...heroProps} />
    case 'corporate': return <CorporateHero {...heroProps} />
    case 'editorial': return <EditorialHero {...heroProps} />
    case 'minimal':   return <MinimalHero   {...heroProps} />
    case 'reel':      return <ReelHero      {...heroProps} />
    default:          return <BoardingPassHero {...heroProps} />
  }
}
