import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import VenueProfileForm from '@/components/venue/editor/VenueProfileForm'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

const ADDA_TYPE_LABELS: Record<string, string> = {
  cafe: 'Café', coworking: 'Coworking', gallery: 'Gallery',
  community_hall: 'Community Hall', rooftop: 'Rooftop', garden: 'Garden',
  studio: 'Studio', library: 'Library', restaurant: 'Restaurant',
  bar: 'Bar', hostel: 'Hostel', other: 'Other',
}

const T = {
  bg:       'var(--venue-bg-base)',
  surface:  'var(--venue-bg-surface)',
  border:   'var(--venue-border-subtle)',
  borderMd: 'var(--venue-border-default)',
  text:     'var(--venue-text-primary)',
  muted:    'var(--venue-text-muted)',
  amber:    'var(--venue-amber)',
} as const

const MONO  = "'JetBrains Mono', monospace"
const INTER = "'Inter', system-ui, sans-serif"

export default async function AddaProfilePage() {
  const { user } = await requireAuth('/business/venue/profile')
  const admin = createAdminClient()

  const { data: adda } = await admin
    .from('adda_profiles')
    .select('*')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!adda) redirect('/business/venue/onboard')

  const typeLabels = (adda.adda_type ?? [])
    .map((t: string) => ADDA_TYPE_LABELS[t] ?? t)
    .join(' · ')

  return (
    <>
      <style>{`
        @media (max-width: 767px) {
          .adda-profile-grid { grid-template-columns: 1fr !important; }
          .adda-profile-main { padding: 16px !important; }
        }
      `}</style>

      <div className="adda-profile-main" style={{ padding: '28px 32px', maxWidth: 900 }}>

        {/* Page heading */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: T.amber }}>manage_accounts</span>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.text, fontFamily: INTER }}>My Profile</div>
            <div style={{ fontSize: 10, color: T.muted, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.10em' }}>
              BUSINESS IDENTITY
            </div>
          </div>
        </div>

        {/* Verified Identity — locked fields */}
        <div style={{
          background: T.surface,
          border: `1px dashed ${T.borderMd}`,
          borderRadius: 2,
          marginBottom: 28,
          overflow: 'hidden',
        }}>
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

          <div className="adda-profile-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
            {[
              { label: 'Venue Name',   value: adda.name,                   icon: 'storefront' },
              { label: 'City',         value: adda.city,                   icon: 'location_city' },
              { label: 'Address',      value: adda.address,                icon: 'pin_drop', full: true },
              { label: 'Venue Type',   value: typeLabels || '—',           icon: 'category' },
              { label: 'Adda ID',      value: adda.slug,                   icon: 'fingerprint' },
              { label: 'Member Since', value: formatDate(adda.created_at), icon: 'calendar_today' },
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

        {/* Editable details */}
        <VenueProfileForm adda={adda} authEmail={user.email ?? null} />
      </div>
    </>
  )
}
