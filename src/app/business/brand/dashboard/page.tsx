import { requireProfile } from '@/lib/auth/requireAuth'
import Link from 'next/link'
import PersonaSwitcherPills from '@/components/PersonaSwitcherPills'
import DashPageLink from '@/components/DashPageLink'

// ── Dark palette ──────────────────────────────────────────────────────────────
const D = {
  bg:       '#0C0A06',
  surface:  '#171310',
  elevated: '#1E1A12',
  border:   'rgba(245,168,0,0.15)',
  text:     '#F7F3EB',
  muted:    '#9E8D6B',
  amber:    '#F5A800',
  coral:    '#E8705A',
  teal:     '#5DD9D0',
  navy:     '#1A2744',
} as const

const MONO = "'JetBrains Mono', monospace"
const OUTFIT = "'Outfit', sans-serif"
const DM = "'DM Sans', sans-serif"
const ABRIL = "'Abril Fatface', serif"

// ── Category metadata ─────────────────────────────────────────────────────────
const CAT_LABELS: Record<string, string> = {
  retail: 'Retail', agency: 'Agency', startup: 'Startup', creative: 'Creative',
  fnb: 'F&B', fashion: 'Fashion', tech: 'Tech', media: 'Media',
  beauty: 'Beauty', education: 'Education', health: 'Health', other: 'Other',
}
const CAT_ICONS: Record<string, string> = {
  retail: 'storefront', agency: 'work', startup: 'rocket_launch', creative: 'brush',
  fnb: 'restaurant', fashion: 'checkroom', tech: 'devices', media: 'movie',
  beauty: 'spa', education: 'school', health: 'local_hospital', other: 'bolt',
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function KpiTile({ icon, label, value, sub, accent }: {
  icon: string; label: string; value: string | number; sub?: string; accent?: string
}) {
  return (
    <div style={{
      background: D.surface,
      border: `1px solid ${D.border}`,
      padding: '20px 24px',
      display: 'flex', flexDirection: 'column', gap: 8,
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 16, color: accent ?? D.amber }}>{icon}</span>
        <span style={{ fontFamily: MONO, fontSize: 9, color: D.muted, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{label}</span>
      </div>
      <div style={{ fontFamily: OUTFIT, fontWeight: 900, fontSize: 32, color: D.text, lineHeight: 1, marginTop: 4 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontFamily: MONO, fontSize: 10, color: D.muted, letterSpacing: '0.06em' }}>{sub}</div>
      )}
      <div style={{ position: 'absolute', bottom: 0, right: 0, width: 60, height: 3, background: accent ?? D.amber, opacity: 0.6 }} />
    </div>
  )
}

function QuickAction({ icon, label, href, variant = 'secondary' }: {
  icon: string; label: string; href: string; variant?: 'primary' | 'secondary'
}) {
  return (
    <Link href={href} style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '12px 18px',
      background: variant === 'primary' ? D.amber : 'transparent',
      border: `1px solid ${variant === 'primary' ? D.amber : D.border}`,
      color: variant === 'primary' ? D.bg : D.text,
      fontFamily: DM, fontWeight: 600, fontSize: 13,
      textDecoration: 'none',
      transition: 'all 150ms',
      cursor: 'pointer',
    }}>
      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{icon}</span>
      {label}
    </Link>
  )
}

function SectionHeader({ title, mono }: { title: string; mono: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
      <h2 style={{ fontFamily: OUTFIT, fontWeight: 900, fontSize: 18, color: D.text, margin: 0 }}>{title}</h2>
      <span style={{ fontFamily: MONO, fontSize: 9, color: D.muted, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{mono}</span>
    </div>
  )
}

function EmptyState({ icon, message, cta, href }: { icon: string; message: string; cta?: string; href?: string }) {
  return (
    <div style={{
      background: D.surface, border: `1px dashed ${D.border}`,
      padding: '48px 24px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
      textAlign: 'center',
    }}>
      <span className="material-symbols-outlined" style={{ fontSize: 36, color: D.muted, opacity: 0.5 }}>{icon}</span>
      <p style={{ fontFamily: DM, fontSize: 13, color: D.muted, margin: 0, maxWidth: 280, lineHeight: 1.6 }}>{message}</p>
      {cta && href && (
        <Link href={href} style={{
          padding: '8px 20px', background: `${D.amber}18`, border: `1px solid ${D.amber}`,
          color: D.amber, fontFamily: MONO, fontSize: 11, letterSpacing: '0.10em',
          textTransform: 'uppercase', textDecoration: 'none',
        }}>{cta}</Link>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function BrandDashboardPage() {
  const { profile } = await requireProfile()

  const brandName   = profile.display_name ?? profile.username ?? 'BRAND'
  const city        = profile.city ?? '—'
  const citySlug    = profile.city.toLowerCase().replace(/\s+/g, '-')
  const bio         = profile.bio ?? ''
  const instagram   = profile.instagram_handle ?? ''
  const email       = profile.contact_email ?? ''
  const categories  = profile.business_categories ?? []
  const goals       = profile.wimc_goals ?? []
  const audience    = profile.target_audience ?? []
  const catId       = categories[0] ?? ''
  const catLabel    = CAT_LABELS[catId] ?? catId
  const catIcon     = CAT_ICONS[catId] ?? 'storefront'

  const pageVisitors    = profile.monthly_page_visitors ?? 0
  const creatorsReached = profile.cumulative_unique_attendees ?? 0

  return (
    <>
      <style>{`
        .brand-kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; }
        .brand-actions  { display: flex; flex-wrap: wrap; gap: 10px; }
        .brand-2col     { display: grid; grid-template-columns: 1.5fr 1fr; gap: 24px; }
        @media (max-width: 900px) {
          .brand-kpi-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .brand-2col     { grid-template-columns: 1fr !important; }
        }
        @keyframes dash-enter {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .dash-enter { animation: dash-enter 0.38s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>

      <div className="dash-enter" style={{ minHeight: '100vh', background: D.bg, padding: '0 0 60px' }}>

        {/* ── Persona switcher ── */}
        <PersonaSwitcherPills
          personas={(profile.personas ?? []) as string[]}
          currentPersona="brand"
          variant="dark"
        />

        {/* ── Page link with copy / share / QR ── */}
        <DashPageLink
          url={`${process.env.NEXT_PUBLIC_APP_URL ?? 'https://wheninmycity.com'}/${citySlug}/${profile.username}`}
          variant="dark"
        />

        <div style={{ padding: '32px 32px 0', maxWidth: 1280, margin: '0 auto' }}>

          {/* ── Brand pass hero card ────────────────────────────────────── */}
          <div style={{ marginBottom: 32 }}>
            <div style={{
              background: D.surface,
              border: `1px solid ${D.border}`,
              display: 'flex', overflow: 'hidden',
              boxShadow: `0 4px 32px rgba(245,168,0,0.12), 0 1px 4px rgba(0,0,0,0.60)`,
              position: 'relative',
            }}>
              <div style={{ width: 12, flexShrink: 0, background: D.amber }} />

              <div style={{ flex: 1, padding: '32px 36px', display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontFamily: MONO, fontSize: 9, color: D.amber, letterSpacing: '0.20em', textTransform: 'uppercase', margin: '0 0 8px' }}>
                      — BRAND PASS
                    </p>
                    <h1 style={{
                      fontFamily: ABRIL, fontSize: 'clamp(28px, 4vw, 44px)',
                      color: D.text, lineHeight: 1, margin: 0,
                    }}>
                      {brandName}
                    </h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: MONO, fontSize: 10, color: D.muted, letterSpacing: '0.10em' }}>{catLabel.toUpperCase()}</span>
                      <span style={{ color: D.border }}>·</span>
                      <span style={{ fontFamily: MONO, fontSize: 10, color: D.muted, letterSpacing: '0.10em' }}>{city.toUpperCase()}</span>
                      {goals.length > 0 && (
                        <>
                          <span style={{ color: D.border }}>·</span>
                          <span style={{ fontFamily: MONO, fontSize: 10, color: `${D.amber}80`, letterSpacing: '0.10em' }}>
                            {goals.length} WIMC GOAL{goals.length > 1 ? 'S' : ''}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', border: `1px solid ${D.amber}40`, background: `${D.amber}10` }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: D.amber, boxShadow: `0 0 6px ${D.amber}` }} />
                      <span style={{ fontFamily: MONO, fontSize: 9, color: D.amber, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Active</span>
                    </div>
                    <span style={{ fontFamily: MONO, fontSize: 8, color: D.muted, letterSpacing: '0.10em' }}>
                      ID: B-{profile.username?.toUpperCase().slice(0, 6) ?? '000000'}
                    </span>
                  </div>
                </div>

                {bio && (
                  <p style={{ fontFamily: DM, fontSize: 14, color: `${D.text}90`, lineHeight: 1.7, margin: 0, maxWidth: 640, fontStyle: 'italic' }}>
                    {bio.length > 180 ? bio.slice(0, 180) + '…' : bio}
                  </p>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, paddingTop: 16, borderTop: `1px solid rgba(255,255,255,0.06)` }}>
                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                    {instagram && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14, color: D.muted }}>alternate_email</span>
                        <span style={{ fontFamily: MONO, fontSize: 11, color: D.muted }}>@{instagram}</span>
                      </div>
                    )}
                    {email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14, color: D.muted }}>mail</span>
                        <span style={{ fontFamily: MONO, fontSize: 11, color: D.muted }}>{email}</span>
                      </div>
                    )}
                  </div>
                  {audience.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {audience.slice(0, 3).map(a => (
                        <span key={a} style={{
                          fontFamily: MONO, fontSize: 9, color: D.muted, letterSpacing: '0.08em',
                          padding: '3px 10px', border: `1px solid ${D.border}`, background: 'rgba(255,255,255,0.03)',
                        }}>
                          {a}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div style={{
                width: 80, flexShrink: 0, background: `${D.amber}14`,
                borderLeft: `1px dashed rgba(255,255,255,0.08)`,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'space-between', padding: '24px 0',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 28, color: D.amber, opacity: 0.7 }}>{catIcon}</span>
                <div style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)', fontFamily: MONO, fontSize: 8, color: D.muted, letterSpacing: '0.30em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                  BRAND · WIMC · CULTURE
                </div>
                <div style={{ fontFamily: MONO, fontSize: 14, letterSpacing: '-0.18em', color: `${D.amber}40`, lineHeight: 1, textAlign: 'center' }}>
                  |||||||||||||||||
                </div>
              </div>

              <div style={{ position: 'absolute', bottom: 24, right: 120, opacity: 0.08, animation: 'spin 14s linear infinite', pointerEvents: 'none' }}>
                <svg width="80" height="80" viewBox="0 0 100 100">
                  <path id="bp-circle" d="M 50,50 m -37,0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0" fill="transparent" />
                  <text fontFamily="JetBrains Mono" fontSize="8" fontWeight="700" fill={D.amber}>
                    <textPath href="#bp-circle">WIMC BRAND PARTNER • REGISTERED •</textPath>
                  </text>
                </svg>
              </div>
            </div>
          </div>

          {/* ── KPI row ────────────────────────────────────────────────── */}
          <div className="brand-kpi-grid" style={{ marginBottom: 32, border: `1px solid ${D.border}` }}>
            <KpiTile icon="event"       label="Events Activated" value={profile.cumulative_events_hosted ?? 0} sub="lifetime total" />
            <KpiTile icon="groups"      label="Creators Reached" value={creatorsReached} sub="unique attendees" />
            <KpiTile icon="visibility"  label="Profile Views"    value={pageVisitors} sub="this month" accent={D.teal} />
            <KpiTile icon="inbox"       label="Enquiries"         value={0} sub="awaiting reply" accent={D.coral} />
          </div>

          {/* ── Quick actions ─────────────────────────────────────────── */}
          <div style={{ marginBottom: 32 }}>
            <SectionHeader title="Quick Actions" mono="BRAND_OPS" />
            <div className="brand-actions">
              <QuickAction icon="add_circle" label="Activate Campaign"  href="/dashboard/events/create" variant="primary" />
              <QuickAction icon="search"     label="Browse Creators"    href="/explore" />
              <QuickAction icon="person"     label="Edit Brand Profile" href="/business/brand/profile" />
              <QuickAction icon="web"        label="My Page"            href="/business/brand/studio" />
            </div>
          </div>

          {/* ── 2-col: Campaigns + Enquiries ─────────────────────────── */}
          <div className="brand-2col">
            <div>
              <SectionHeader title="Campaigns" mono="ACTIVE_EVENTS" />
              <EmptyState
                icon="campaign"
                message="No active campaigns yet. Activate your first event to start engaging local creators and their audiences."
                cta="Activate Campaign"
                href="/dashboard/events/create"
              />
            </div>
            <div>
              <SectionHeader title="Creator Enquiries" mono="PENDING_COLLAB" />
              <EmptyState
                icon="groups"
                message="No enquiries yet. Creators will reach out here once your brand is live on the platform."
              />
            </div>
          </div>

          {/* ── Goals strip ───────────────────────────────────────────── */}
          {goals.length > 0 && (
            <div style={{ marginTop: 32, background: D.surface, border: `1px solid ${D.border}`, padding: '20px 24px' }}>
              <p style={{ fontFamily: MONO, fontSize: 9, color: D.amber, letterSpacing: '0.16em', textTransform: 'uppercase', margin: '0 0 14px' }}>
                WIMC GOALS
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {goals.map(g => (
                  <span key={g} style={{
                    padding: '6px 14px', fontFamily: MONO, fontSize: 10, letterSpacing: '0.08em',
                    color: D.text, border: `1px solid ${D.amber}40`, background: `${D.amber}10`,
                    textTransform: 'uppercase',
                  }}>
                    {g.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── FAB ─────────────────────────────────────────────────────────── */}
      <Link
        href="/dashboard/events/create"
        style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 50,
          width: 56, height: 56, borderRadius: '50%',
          background: D.amber,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 4px 20px ${D.amber}60`,
          textDecoration: 'none',
        }}
        title="Activate Campaign"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 24, color: D.bg }}>campaign</span>
      </Link>
    </>
  )
}
