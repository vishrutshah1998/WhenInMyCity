'use client'

import Link from 'next/link'
import Image from 'next/image'
import type { UserProfile, PageBlock } from '@/types/database'
import type { ProfileTheme } from '@/types/theme'
import { schemeToStyle } from '@/types/theme'
import { WimcWordmark } from '@/components/WimcWordmark'
import { BottomNav } from '@/components/ui/BottomNav'
import BlockRenderer from '@/components/profile/BlockRenderer'
import { deriveBrandColors, BrandHeroDispatcher, type BrandTheme } from '@/components/brand/BrandHeroes'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  brand: UserProfile
  blocks?: PageBlock[]
  pageTheme?: ProfileTheme
}

// ─── Desktop hero variants ────────────────────────────────────────────────────

function DesktopHero({ theme, brand, layoutPreset, categories, waUrl }: {
  theme: BrandTheme; brand: UserProfile; layoutPreset: string; categories: string[]; waUrl: string | null
}) {
  switch (layoutPreset) {
    case 'poster':
      return (
        <div className="relative flex items-center justify-center" style={{ minHeight: '42vh', background: theme.primary, overflow: 'hidden' }}>
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Crect width='1' height='1' fill='%23000000' opacity='0.12'/%3E%3C/svg%3E")` }} />
          <div className="absolute top-6 right-8">
            <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'rgba(0,0,0,0.45)' }}>WHENINMYCITY.COM / {brand.city.toUpperCase()} / {brand.username?.toUpperCase()}</span>
          </div>
          <div className="relative z-10 text-center px-12">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] mb-4" style={{ color: 'rgba(0,0,0,0.5)' }}>{theme.label}</div>
            <h1 className="font-display font-extrabold uppercase leading-none mb-4" style={{ fontSize: 'clamp(64px, 7vw, 112px)', color: theme.badgeText, letterSpacing: '-0.03em' }}>{brand.display_name}</h1>
            <div className="font-mono text-[11px] uppercase tracking-wide" style={{ color: 'rgba(0,0,0,0.5)' }}>{brand.city}{categories.length > 0 && ` · ${categories[0].toUpperCase()}`}</div>
          </div>
        </div>
      )

    case 'corporate':
      return (
        <div className="flex items-stretch" style={{ minHeight: '26vh', background: theme.bgPanel, borderBottom: `2px dashed ${theme.border}` }}>
          <div className="w-[28%] flex items-center justify-center p-8 border-r-2 border-dashed" style={{ borderColor: theme.border }}>
            {brand.avatar_url ? (
              <div className="w-32 h-32 overflow-hidden border-2" style={{ borderColor: theme.primaryDim }}>
                <Image src={brand.avatar_url} alt={brand.display_name} width={128} height={128} className="w-full h-full object-cover" unoptimized />
              </div>
            ) : (
              <div className="w-32 h-32 flex items-center justify-center border-2" style={{ borderColor: theme.primaryDim, background: theme.bgCard }}>
                <span className="material-symbols-outlined" style={{ fontSize: 48, color: theme.textMuted }}>{theme.icon}</span>
              </div>
            )}
          </div>
          <div className="flex-1 flex flex-col justify-center px-10 py-8">
            <span className="font-mono text-[10px] font-bold px-3 py-1.5 uppercase tracking-wider inline-flex items-center gap-1.5 mb-4" style={{ background: theme.badgeBg, color: theme.badgeText, width: 'fit-content' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>{theme.icon}</span>{theme.label}
            </span>
            <h1 className="font-display font-extrabold uppercase leading-none mb-3" style={{ fontSize: 'clamp(36px, 4vw, 60px)', color: theme.text }}>{brand.display_name}</h1>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono text-[11px] uppercase tracking-wide" style={{ color: theme.textMuted }}>{brand.city}</span>
              {categories.map(c => <span key={c} className="font-mono text-[11px] uppercase tracking-wide" style={{ color: theme.primary }}>· {c.toUpperCase()}</span>)}
            </div>
            {waUrl && <div className="mt-4 font-mono text-[11px] flex items-center gap-2" style={{ color: theme.primary }}><span className="material-symbols-outlined" style={{ fontSize: 14 }}>chat</span>Contact to Collaborate</div>}
          </div>
        </div>
      )

    case 'editorial':
      return (
        <div className="relative" style={{ minHeight: '22vh', background: '#F7F3E9', color: '#2A1F0E', borderBottom: '3px solid #2A1F0E' }}>
          <div className="absolute top-6 right-8">
            <span className="font-mono text-[9px] uppercase tracking-[0.2em]" style={{ color: '#6B5040' }}>{brand.city.toUpperCase()}</span>
          </div>
          <div className="px-12 py-10">
            <div className="h-0.5 mb-6" style={{ background: '#2A1F0E' }} />
            <h1 className="font-display mb-3" style={{ fontSize: 'clamp(48px, 5.5vw, 88px)', fontWeight: 700, letterSpacing: '-0.03em', color: '#2A1F0E', fontFamily: 'var(--font-playfair-display), serif', lineHeight: 0.95 }}>{brand.display_name}</h1>
            <div className="flex items-center gap-4 mt-4">
              <div className="h-px flex-1" style={{ background: 'rgba(42,31,14,0.2)' }} />
              <span className="font-mono text-[9px] uppercase tracking-[0.15em]" style={{ color: '#6B5040' }}>{theme.label}</span>
              <div className="h-px flex-1" style={{ background: 'rgba(42,31,14,0.2)' }} />
            </div>
          </div>
        </div>
      )

    case 'minimal':
      return (
        <div className="px-12 py-12 text-center" style={{ background: theme.bg }}>
          {brand.avatar_url && (
            <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-5 border-2" style={{ borderColor: theme.primaryDim }}>
              <Image src={brand.avatar_url} alt={brand.display_name} width={80} height={80} className="w-full h-full object-cover" unoptimized />
            </div>
          )}
          <h1 className="font-display font-bold mb-4" style={{ fontSize: 'clamp(36px, 4vw, 64px)', color: theme.text, letterSpacing: '-0.03em' }}>{brand.display_name}</h1>
          <span className="font-mono text-[10px] px-4 py-2 border uppercase tracking-wider" style={{ borderColor: theme.primaryDim, color: theme.primary }}>{theme.label} · {brand.city.toUpperCase()}</span>
        </div>
      )

    case 'reel':
      return (
        <div className="relative flex items-center" style={{ minHeight: '36vh', background: `linear-gradient(135deg, ${theme.bg} 0%, ${theme.bgCard} 100%)`, overflow: 'hidden' }}>
          <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 70% 50%, ${theme.primaryBg} 0%, transparent 65%)` }} />
          <div className="absolute top-6 right-8">
            <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: `${theme.text}40` }}>WHENINMYCITY.COM / {brand.city.toUpperCase()}</span>
          </div>
          <div className="relative z-10 px-12 flex items-center gap-10">
            <div className="w-28 h-28 rounded-full flex-shrink-0 overflow-hidden border-2" style={{ borderColor: theme.primary, boxShadow: `0 0 40px ${theme.primaryDim}` }}>
              {brand.avatar_url ? (
                <Image src={brand.avatar_url} alt={brand.display_name} width={112} height={112} className="w-full h-full object-cover" unoptimized />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ background: theme.bgCard }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 44, color: theme.primary }}>{theme.icon}</span>
                </div>
              )}
            </div>
            <div>
              <h1 className="font-extrabold uppercase leading-none mb-3" style={{ fontSize: 'clamp(48px, 5.5vw, 80px)', color: theme.text, fontFamily: 'var(--font-space-grotesk), sans-serif', letterSpacing: '-0.04em' }}>{brand.display_name}</h1>
              <div className="font-mono text-[11px] uppercase tracking-wide" style={{ color: theme.primary }}>{brand.city}{categories.length > 0 && ` · ${categories[0].toUpperCase()}`}</div>
            </div>
          </div>
        </div>
      )

    default: // boarding-pass
      return (
        <div className="relative flex items-end" style={{ minHeight: '50vh', background: theme.bgPanel }}>
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `linear-gradient(${theme.primaryDim} 1px, transparent 1px), linear-gradient(90deg, ${theme.primaryDim} 1px, transparent 1px)`, backgroundSize: '60px 60px', opacity: 0.08 }} />
          <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 20% 50%, ${theme.primaryBg}, transparent 65%), ${theme.heroGradient}` }} />
          <div className="absolute top-6 right-8">
            <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: `${theme.text}50` }}>WHENINMYCITY.COM / {brand.city.toUpperCase()} / {brand.username?.toUpperCase()}</span>
          </div>
          <div className="absolute top-6 left-8 flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold px-3 py-1.5 uppercase tracking-wider flex items-center gap-1.5" style={{ background: theme.badgeBg, color: theme.badgeText }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>{theme.icon}</span>{theme.label}
            </span>
            <span className="font-mono text-[10px] px-3 py-1.5 uppercase tracking-wider border flex items-center gap-1" style={{ color: theme.primary, borderColor: theme.border, background: `${theme.bg}cc` }}>
              <span className="material-symbols-outlined" style={{ fontSize: 12, fontVariationSettings: "'FILL' 1" }}>business</span>BUSINESS & BRAND
            </span>
          </div>
          <div className="relative z-10 px-12 pb-10 flex items-end gap-8 w-full">
            {brand.avatar_url && (
              <div className="flex-shrink-0 w-28 h-28 border-2 overflow-hidden" style={{ borderColor: theme.primaryDim, background: theme.bgCard }}>
                <Image src={brand.avatar_url} alt={brand.display_name} width={112} height={112} className="w-full h-full object-cover" unoptimized />
              </div>
            )}
            <div className="flex-1">
              <h1 className="font-display font-extrabold uppercase leading-none mb-3" style={{ fontSize: 'clamp(48px, 5.5vw, 88px)', color: theme.text, textShadow: '0 4px 24px rgba(0,0,0,0.5)' }}>{brand.display_name}</h1>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="material-symbols-outlined" style={{ fontSize: 14, color: theme.textMuted }}>location_on</span>
                <span className="font-mono text-[11px] uppercase tracking-wide" style={{ color: theme.textMuted }}>{brand.city}</span>
                {categories.map(c => <span key={c} className="font-mono text-[11px] uppercase tracking-wide" style={{ color: theme.primary }}>· {c.toUpperCase()}</span>)}
              </div>
            </div>
          </div>
        </div>
      )
  }
}

// ─── Goal + audience display helpers ─────────────────────────────────────────

const GOAL_LABELS: Record<string, string> = {
  reach_creators:  'Reach creators',
  host_collabs:    'Host collabs',
  sponsor_events:  'Sponsor events',
  build_community: 'Build community',
  grow_brand:      'Grow brand',
}

const AUDIENCE_LABELS: Record<string, string> = {
  artists:      'Artists',
  musicians:    'Musicians',
  comedians:    'Comedians',
  poets:        'Poets',
  dancers:      'Dancers',
  photographers:'Photographers',
  filmmakers:   'Filmmakers',
  designers:    'Designers',
  'all-creators': 'All creators',
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AddaBrandPage({ brand, blocks = [], pageTheme }: Props) {
  const theme = deriveBrandColors(brand.business_categories ?? [], pageTheme)
  const cityPath = brand.city.toLowerCase().replace(/\s+/g, '-')
  const exploreHref = `/explore?city=${cityPath}`

  const waUrl = brand.contact_whatsapp
    ? `https://wa.me/${brand.contact_whatsapp.replace(/\D/g, '').replace(/^(?!91)/, '91')}`
    : null

  const goals = (brand.wimc_goals ?? []).filter(Boolean)
  const audience = (brand.target_audience ?? []).filter(Boolean)
  const categories = (brand.business_categories ?? []).filter(Boolean)

  return (
    <>
      <style>{`
        @keyframes brand-marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .brand-marquee { animation: brand-marquee 30s linear infinite; }
        .brand-press:active { transform: scale(0.97); }
        @keyframes brand-grain {
          0%, 100% { opacity: 0.02; }
          50%       { opacity: 0.03; }
        }
        .brand-grain {
          animation: brand-grain 4s ease-in-out infinite;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        }
      `}</style>

      <div className="brand-grain fixed inset-0 pointer-events-none z-[999]" aria-hidden />

      {/* ═══════════════════════════ DESKTOP ═══════════════════════════════════ */}
      <div className="hidden lg:flex flex-col min-h-screen" style={{ background: theme.bg, color: theme.text, ...schemeToStyle(pageTheme?.colorScheme ?? 'default') }}>

        {/* Header */}
        <header
          className="sticky top-0 h-16 z-50 flex items-center justify-between px-8 border-b-2 border-dashed backdrop-blur-sm"
          style={{ background: `${theme.bg}f0`, borderColor: theme.border }}
        >
          <Link href="/explore">
            <WimcWordmark color="white" height={26} />
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              href={exploreHref}
              className="font-mono text-[11px] uppercase tracking-wider no-underline"
              style={{ color: theme.primary }}
            >
              ← {brand.city.toUpperCase()}
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
            className="font-mono text-[11px] px-5 py-2 uppercase tracking-wider no-underline border transition-all"
            style={{ color: theme.primary, borderColor: theme.primary }}
          >
            List your Brand →
          </Link>
        </header>

        {/* Hero — layout-responsive */}
        <DesktopHero
          theme={theme}
          brand={brand}
          layoutPreset={pageTheme?.layoutPreset ?? 'boarding-pass'}
          categories={categories}
          waUrl={waUrl}
        />

        {/* Two-column body */}
        <div className="flex flex-1">

          {/* ── LEFT PANEL ────────────────────────────────────────────────── */}
          <div
            className="w-[36%] border-r-2 border-dashed overflow-y-auto"
            style={{ borderColor: theme.border, background: theme.bgPanel, paddingBottom: 100 }}
          >
            <div className="p-8 flex flex-col gap-10">

              {/* Quick Info */}
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] mb-4 font-bold" style={{ color: theme.primary }}>
                  ABOUT THIS BRAND
                </p>
                {[
                  { label: 'CITY',       value: brand.city },
                  { label: 'CATEGORY',   value: categories.map(c => c.toUpperCase()).join(', ') || '—' },
                  ...(brand.website_url ? [{ label: 'WEBSITE', value: 'Visit →', href: brand.website_url }] : []),
                  ...(brand.instagram_handle ? [{ label: 'INSTAGRAM', value: `@${brand.instagram_handle}`, href: brand.instagram_handle.startsWith('http') ? brand.instagram_handle : `https://instagram.com/${brand.instagram_handle}` }] : []),
                ].map(row => (
                  <div
                    key={row.label}
                    className="flex justify-between items-center py-3 border-b border-dashed"
                    style={{ borderColor: theme.border }}
                  >
                    <span className="font-mono text-[10px] uppercase" style={{ color: `${theme.text}50` }}>{row.label}</span>
                    {'href' in row && row.href ? (
                      <a
                        href={row.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[13px] font-bold no-underline hover:opacity-70 transition-opacity"
                        style={{ color: theme.primary }}
                      >
                        {row.value}
                      </a>
                    ) : (
                      <span className="font-mono text-[13px] font-bold" style={{ color: theme.primary }}>
                        {row.value}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Goals on WIMC */}
              {goals.length > 0 && (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.25em] mb-4 font-bold" style={{ color: theme.primary }}>
                    WHY THEY&rsquo;RE HERE
                  </p>
                  <div className="flex flex-col gap-2">
                    {goals.map(g => (
                      <div
                        key={g}
                        className="flex items-center gap-3 px-3 py-2 border"
                        style={{ borderColor: theme.border, background: theme.primaryBg }}
                      >
                        <span className="font-mono text-[9px]" style={{ color: theme.primary }}>✦</span>
                        <span className="font-mono text-[11px] uppercase" style={{ color: theme.text }}>
                          {GOAL_LABELS[g] ?? g.replace(/_/g, ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Target audience */}
              {audience.length > 0 && (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.25em] mb-4 font-bold" style={{ color: theme.primary }}>
                    WORKS WITH
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {audience.map(a => (
                      <span
                        key={a}
                        className="font-mono text-[10px] uppercase px-3 py-1.5 border"
                        style={{ borderColor: theme.primaryDim, color: theme.primary, background: theme.primaryBg }}
                      >
                        {AUDIENCE_LABELS[a] ?? a.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact */}
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] mb-4 font-bold" style={{ color: theme.primary }}>
                  GET IN TOUCH
                </p>
                <div className="flex flex-col gap-3">
                  {waUrl && (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-3 border no-underline hover:opacity-80 transition-opacity"
                      style={{ borderColor: theme.primary, background: theme.primaryBg }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 20, color: theme.primary }}>chat</span>
                      <span className="font-mono text-[12px] font-bold uppercase" style={{ color: theme.primary }}>
                        Chat on WhatsApp
                      </span>
                    </a>
                  )}
                  {brand.contact_email && (
                    <a
                      href={`mailto:${brand.contact_email}`}
                      className="flex items-center gap-3 px-4 py-3 border no-underline hover:opacity-80 transition-opacity"
                      style={{ borderColor: theme.border, background: theme.bgCard }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 20, color: theme.primary }}>mail</span>
                      <span className="font-mono text-[11px] uppercase" style={{ color: theme.text }}>
                        {brand.contact_email}
                      </span>
                    </a>
                  )}
                  {brand.website_url && (
                    <a
                      href={brand.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-3 border no-underline hover:opacity-80 transition-opacity"
                      style={{ borderColor: theme.border, background: theme.bgCard }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 20, color: theme.primary }}>language</span>
                      <span className="font-mono text-[12px] uppercase" style={{ color: theme.text }}>
                        Visit Website
                      </span>
                    </a>
                  )}
                  {brand.instagram_handle && (
                    <a
                      href={brand.instagram_handle.startsWith('http') ? brand.instagram_handle : `https://instagram.com/${brand.instagram_handle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-3 border no-underline hover:opacity-80 transition-opacity"
                      style={{ borderColor: theme.border, background: theme.bgCard }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 20, color: theme.primary }}>photo_camera</span>
                      <span className="font-mono text-[12px] uppercase" style={{ color: theme.text }}>
                        @{brand.instagram_handle}
                      </span>
                    </a>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* ── RIGHT PANEL ───────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto" style={{ background: theme.bg, paddingBottom: 100 }}>
            <div className="p-10 flex flex-col gap-14">

              {/* About */}
              {brand.bio && (
                <div>
                  <h2
                    className="font-display font-extrabold text-[28px] uppercase mb-5"
                    style={{ color: theme.text, borderBottom: `2px dashed ${theme.border}`, paddingBottom: 12 }}
                  >
                    About {brand.display_name}
                  </h2>
                  <p
                    className="text-[17px] leading-relaxed max-w-2xl"
                    style={{ color: theme.textMuted }}
                  >
                    {brand.bio}
                  </p>
                </div>
              )}

              {/* What they're looking for */}
              {(goals.length > 0 || audience.length > 0) && (
                <div>
                  <h2
                    className="font-display font-extrabold text-[24px] uppercase mb-6"
                    style={{ color: theme.text, borderBottom: `2px dashed ${theme.border}`, paddingBottom: 12 }}
                  >
                    On When In My City
                  </h2>
                  <div className="grid grid-cols-2 gap-6">
                    {goals.length > 0 && (
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.2em] mb-3" style={{ color: theme.primary }}>
                          GOALS
                        </p>
                        <div className="flex flex-col gap-2">
                          {goals.map(g => (
                            <div
                              key={g}
                              className="flex items-center gap-3 px-4 py-3 border"
                              style={{ borderColor: theme.primaryDim, background: theme.primaryBg }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 16, color: theme.primary }}>
                                arrow_forward
                              </span>
                              <span className="font-mono text-[11px] uppercase" style={{ color: theme.text }}>
                                {GOAL_LABELS[g] ?? g.replace(/_/g, ' ')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {audience.length > 0 && (
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.2em] mb-3" style={{ color: theme.primary }}>
                          CREATOR TYPES THEY WORK WITH
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {audience.map(a => (
                            <span
                              key={a}
                              className="font-mono text-[11px] uppercase px-3 py-2 border"
                              style={{ borderColor: theme.primaryDim, color: theme.primary, background: theme.primaryBg }}
                            >
                              {AUDIENCE_LABELS[a] ?? a.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Collaborate CTA */}
              <div
                className="p-8 border-2"
                style={{ borderColor: theme.primaryDim, background: theme.primaryBg }}
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] mb-3 font-bold" style={{ color: theme.primary }}>
                  ✦ OPEN FOR COLLABS
                </p>
                <p className="text-[22px] font-bold mb-2" style={{ color: theme.text, fontFamily: 'var(--font-barlow)' }}>
                  {brand.display_name} wants to work with creators in {brand.city}.
                </p>
                <p className="text-[15px] leading-relaxed mb-6" style={{ color: theme.textMuted }}>
                  {goals.length > 0
                    ? `Looking to ${goals.map(g => GOAL_LABELS[g]?.toLowerCase() ?? g).join(', ')}.`
                    : 'Reach out to explore sponsorships, collabs, and partnerships.'}
                </p>
                {waUrl && (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-8 py-3 border-2 border-black no-underline font-bold uppercase tracking-wider transition-all hover:opacity-90"
                    style={{
                      background: theme.primary,
                      color: theme.badgeText,
                      fontFamily: 'var(--font-barlow)',
                      fontSize: 16,
                      boxShadow: '6px 6px 0 rgba(0,0,0,0.8)',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chat</span>
                    Get in touch
                  </a>
                )}
              </div>

              {/* Marquee */}
              <div
                className="-mx-10 py-3 overflow-hidden border-y"
                style={{ borderColor: theme.border, background: theme.bgCard }}
              >
                <div className="flex whitespace-nowrap brand-marquee">
                  {[0, 1].map(i => (
                    <span key={i} className="font-mono text-[10px] uppercase tracking-widest px-2" style={{ color: `${theme.primary}40` }}>
                      {'WHENINMYCITY · '}
                      {brand.display_name?.toUpperCase()}
                      {' · '}
                      {brand.city?.toUpperCase()}
                      {' · '}
                      {theme.label}
                      {' · OPEN FOR COLLABS · '}
                      {'WHENINMYCITY · '}
                      {brand.display_name?.toUpperCase()}
                      {' · '}
                      {brand.city?.toUpperCase()}
                      {' · '}
                      {theme.label}
                      {' · OPEN FOR COLLABS · '}
                    </span>
                  ))}
                </div>
              </div>

              {/* ── Page blocks ── */}
              {blocks.length > 0 && pageTheme && (
                <div
                  style={{
                    '--pp-bg':         theme.bg,
                    '--pp-primary':    theme.primary,
                    '--pp-text':       theme.text,
                    '--pp-text-muted': theme.textMuted,
                    '--pp-surface':    theme.bgCard,
                  } as React.CSSProperties}
                >
                  <div className="border-b border-dashed mb-8" style={{ borderColor: theme.border }}>
                    <span className="font-mono text-[10px] uppercase tracking-[0.25em] font-bold" style={{ color: theme.primary }}>
                      MORE FROM {brand.display_name?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex flex-col gap-4">
                    {blocks.filter(b => b.is_visible).map(block => (
                      <BlockRenderer key={block.id} block={block} theme={pageTheme} />
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>

        {/* Desktop sticky footer */}
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
            <p className="font-mono text-[10px] uppercase tracking-wider mb-0.5" style={{ color: `${theme.text}50` }}>
              {brand.city.toUpperCase()} · {theme.label}
            </p>
            <p className="font-display font-extrabold text-[22px] leading-none" style={{ color: theme.primary }}>
              {brand.display_name}
            </p>
          </div>
          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="brand-press flex items-center gap-2 font-bold uppercase tracking-wider px-10 py-3 border-2 border-black no-underline"
              style={{
                background: theme.primary,
                color: theme.badgeText,
                fontFamily: 'var(--font-barlow)',
                fontSize: 18,
                boxShadow: '6px 6px 0 rgba(0,0,0,0.8)',
              }}
            >
              Collaborate
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_forward</span>
            </a>
          )}
        </div>

      </div>

      {/* ═══════════════════════════ MOBILE ════════════════════════════════════ */}
      <div className="block lg:hidden min-h-screen" style={{ background: theme.bg, color: theme.text, ...schemeToStyle(pageTheme?.colorScheme ?? 'default') }}>

        {/* Fixed header */}
        <header
          className="fixed top-0 left-0 right-0 h-14 z-[100] flex items-center justify-between px-4 border-b-2 border-dashed backdrop-blur-sm"
          style={{ background: `${theme.bg}f0`, borderColor: theme.border }}
        >
          <Link href={exploreHref}>
            <WimcWordmark color="white" height={22} />
          </Link>
          <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: theme.primary }}>
            {brand.city}
          </span>
        </header>

        {/* Back strip */}
        <div
          className="fixed top-14 left-0 right-0 z-[90] px-4 py-1.5 border-b"
          style={{ background: `${theme.bg}cc`, borderColor: `${theme.border}60` }}
        >
          <Link
            href={exploreHref}
            className="font-mono text-[10px] uppercase tracking-widest no-underline"
            style={{ color: theme.primary }}
          >
            ← {brand.city.toUpperCase()}
          </Link>
        </div>

        {/* Hero — layout-responsive */}
        <div className="mt-[90px]">
          <BrandHeroDispatcher
            layoutPreset={pageTheme?.layoutPreset ?? 'boarding-pass'}
            theme={theme}
            displayName={brand.display_name}
            city={brand.city}
            categories={categories}
            avatarUrl={brand.avatar_url}
            waUrl={waUrl}
          />
        </div>

        {/* Scrollable sections */}
        <div className="px-4 pb-36 flex flex-col gap-7 mt-5">

          {/* About */}
          {brand.bio && (
            <div>
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: theme.primary }}>
                <span className="w-2 h-2 inline-block shrink-0" style={{ background: theme.primary }} />
                ABOUT
              </div>
              <div className="pl-4 py-1" style={{ borderLeft: `2px dashed ${theme.primaryDim}` }}>
                <p className="text-[15px] leading-relaxed" style={{ color: `${theme.text}90` }}>
                  {brand.bio}
                </p>
              </div>
            </div>
          )}

          {/* Goals */}
          {goals.length > 0 && (
            <div>
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: theme.primary }}>
                <span className="w-2 h-2 inline-block shrink-0" style={{ background: theme.primary }} />
                GOALS ON WIMC
              </div>
              <div className="flex flex-col gap-2">
                {goals.map(g => (
                  <div
                    key={g}
                    className="flex items-center gap-3 px-4 py-3 border"
                    style={{ borderColor: theme.border, background: theme.bgCard }}
                  >
                    <span className="font-mono text-[11px]" style={{ color: theme.primary }}>✦</span>
                    <span className="font-mono text-[11px] uppercase" style={{ color: theme.text }}>
                      {GOAL_LABELS[g] ?? g.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Works With */}
          {audience.length > 0 && (
            <div>
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: theme.primary }}>
                <span className="w-2 h-2 inline-block shrink-0" style={{ background: theme.primary }} />
                WORKS WITH
              </div>
              <div className="flex flex-wrap gap-2">
                {audience.map(a => (
                  <span
                    key={a}
                    className="font-mono text-[10px] uppercase px-3 py-1.5 border"
                    style={{ borderColor: theme.primaryDim, color: theme.primary, background: theme.primaryBg }}
                  >
                    {AUDIENCE_LABELS[a] ?? a.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Contact */}
          <div>
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: theme.primary }}>
              <span className="w-2 h-2 inline-block shrink-0" style={{ background: theme.primary }} />
              GET IN TOUCH
            </div>
            <div className="flex flex-col gap-2">
              {waUrl && (
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
              {brand.contact_email && (
                <a
                  href={`mailto:${brand.contact_email}`}
                  className="flex items-center gap-3 p-4 border no-underline"
                  style={{ borderColor: theme.border, background: theme.bgCard }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 22, color: theme.primary }}>mail</span>
                  <span className="font-mono text-[12px] uppercase" style={{ color: theme.text }}>{brand.contact_email}</span>
                </a>
              )}
              {brand.website_url && (
                <a
                  href={brand.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 border no-underline"
                  style={{ borderColor: theme.border, background: theme.bgCard }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 22, color: theme.primary }}>language</span>
                  <span className="font-mono text-[12px] uppercase" style={{ color: theme.text }}>
                    Visit Website
                  </span>
                </a>
              )}
              {brand.instagram_handle && (
                <a
                  href={brand.instagram_handle.startsWith('http') ? brand.instagram_handle : `https://instagram.com/${brand.instagram_handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 border no-underline"
                  style={{ borderColor: theme.border, background: theme.bgCard }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 22, color: theme.primary }}>photo_camera</span>
                  <span className="font-mono text-[12px] uppercase" style={{ color: theme.text }}>
                    @{brand.instagram_handle}
                  </span>
                </a>
              )}
            </div>
          </div>

          {/* ── Page blocks (mobile) ── */}
          {blocks.length > 0 && pageTheme && (
            <div
              className="px-4 pb-4"
              style={{
                '--pp-bg':         theme.bg,
                '--pp-primary':    theme.primary,
                '--pp-text':       theme.text,
                '--pp-text-muted': theme.textMuted,
                '--pp-surface':    theme.bgCard,
              } as React.CSSProperties}
            >
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest mb-4" style={{ color: theme.primary }}>
                <span className="w-2 h-2 inline-block shrink-0" style={{ background: theme.primary }} />
                MORE FROM {brand.display_name?.toUpperCase()}
              </div>
              <div className="flex flex-col gap-3">
                {blocks.filter(b => b.is_visible).map(block => (
                  <BlockRenderer key={block.id} block={block} theme={pageTheme} />
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Mobile sticky footer */}
        {waUrl && (
          <div
            className="fixed bottom-14 left-0 right-0 p-3 z-[55] border-t-2 border-dashed backdrop-blur-sm"
            style={{ background: `${theme.bg}f0`, borderColor: theme.border }}
          >
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="brand-press w-full flex items-center justify-between px-5 py-3 border-2 border-black no-underline font-bold uppercase"
              style={{
                background: theme.primary,
                color: theme.badgeText,
                fontFamily: 'var(--font-barlow)',
                fontSize: 17,
                boxShadow: '4px 4px 0 rgba(0,0,0,0.8)',
              }}
            >
              Collaborate with this Brand
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>chat</span>
            </a>
          </div>
        )}
        <div className="lg:hidden"><BottomNav /></div>

      </div>
    </>
  )
}
