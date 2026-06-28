import { requireAuth } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import BrandProfileForm from './BrandProfileForm'

const BUSINESS_CATEGORY_LABELS: Record<string, string> = {
  fmcg:          'FMCG / Consumer Goods',
  food_beverage: 'Food & Beverage',
  fashion:       'Fashion & Lifestyle',
  tech:          'Tech / SaaS',
  media:         'Media & Entertainment',
  health:        'Health & Wellness',
  education:     'Education',
  finance:       'Finance / Fintech',
  events:        'Events & Hospitality',
  ngo:           'NGO / Social Impact',
  retail:        'Retail',
  other:         'Other',
}

const T = {
  bg:       'var(--adda-bg-base)',
  surface:  'var(--adda-bg-surface)',
  border:   'var(--adda-border-subtle)',
  borderMd: 'var(--adda-border-default)',
  text:     'var(--adda-text-primary)',
  muted:    'var(--adda-text-muted)',
  amber:    'var(--adda-amber)',
} as const

const MONO  = "'JetBrains Mono', monospace"
const INTER = "'Inter', system-ui, sans-serif"

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function BrandProfilePage() {
  const { user } = await requireAuth('/business/brand/profile')
  const admin    = createAdminClient()

  const { data: profile } = await admin
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) redirect('/onboarding/business')

  const categoryLabels = (profile.business_categories ?? [])
    .map((c: string) => BUSINESS_CATEGORY_LABELS[c] ?? c)
    .join(' · ') || '—'

  return (
    <>
      <style>{`
        @media (max-width: 767px) {
          .brand-profile-grid { grid-template-columns: 1fr !important; }
          .brand-profile-main { padding: 16px !important; }
        }
      `}</style>

      {/* Topbar */}
      <header style={{
        position: 'sticky', top: 48, height: 56, zIndex: 20,
        background: 'rgba(10,10,10,0.88)', backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', padding: '0 28px', gap: 10,
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 18, color: T.amber }}>manage_accounts</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.text, fontFamily: INTER }}>Brand Profile</div>
          <div style={{ fontSize: 11, color: T.muted, fontFamily: MONO }}>BUSINESS IDENTITY</div>
        </div>
      </header>

      <div className="brand-profile-main" style={{ padding: '28px 32px', maxWidth: 900 }}>

        {/* ── Verified Identity (locked) ─────────────────────────────────── */}
        <div style={{
          background: T.surface,
          border: `1px dashed ${T.borderMd}`,
          borderRadius: 2,
          marginBottom: 28,
          overflow: 'hidden',
        }}>

          {/* Section header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px',
            borderBottom: `1px solid ${T.border}`,
            background: 'rgba(245,168,0,0.04)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: T.amber }}>lock</span>
              <span style={{ fontFamily: MONO, fontSize: 10, color: T.amber, letterSpacing: '1.4px', textTransform: 'uppercase' }}>
                Verified Identity
              </span>
            </div>
            <span style={{
              fontFamily: MONO, fontSize: 9, color: T.muted,
              background: 'rgba(255,255,255,0.04)', padding: '2px 8px',
              border: `1px solid ${T.border}`,
            }}>
              Set during onboarding
            </span>
          </div>

          {/* Locked fields grid */}
          <div className="brand-profile-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
            {[
              { label: 'Brand Name',   value: profile.display_name,         icon: 'business'      },
              { label: 'City',         value: profile.city,                  icon: 'location_city' },
              { label: 'Category',     value: categoryLabels,                icon: 'category',     full: true },
              { label: 'Phone',        value: user.phone ?? profile.contact_whatsapp ?? profile.phone ?? '—', icon: 'phone' },
              { label: 'Brand ID',     value: `@${profile.username}`,        icon: 'fingerprint'   },
              { label: 'Member Since', value: formatDate(profile.created_at), icon: 'calendar_today' },
            ].map((field, i) => (
              <div
                key={field.label}
                style={{
                  padding: '14px 20px',
                  borderRight: !field.full && i % 2 === 0 ? `1px solid ${T.border}` : 'none',
                  borderBottom: `1px solid ${T.border}`,
                  gridColumn: field.full ? '1 / -1' : undefined,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 13, color: T.muted }}>
                    {field.icon}
                  </span>
                  <span style={{ fontFamily: MONO, fontSize: 9, color: T.muted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                    {field.label}
                  </span>
                </div>
                <div style={{ fontFamily: INTER, fontSize: 14, fontWeight: 500, color: T.text }}>
                  {field.value}
                </div>
              </div>
            ))}
          </div>

          {/* Support CTA */}
          <div style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14, color: T.muted }}>info</span>
            <span style={{ fontFamily: MONO, fontSize: 10, color: T.muted, letterSpacing: '0.06em' }}>
              Need to change locked details?&nbsp;
            </span>
            <a href="mailto:support@whenin.city" style={{ fontFamily: MONO, fontSize: 10, color: T.amber, letterSpacing: '0.06em', textDecoration: 'none' }}>
              Contact support →
            </a>
          </div>
        </div>

        {/* ── Editable Details ───────────────────────────────────────────── */}
        <BrandProfileForm profile={profile} />

      </div>
    </>
  )
}
