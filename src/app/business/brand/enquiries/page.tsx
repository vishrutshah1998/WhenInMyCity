import { requireAuth } from '@/lib/auth/requireAuth'
import { createClient } from '@/lib/supabase/server'

const T = {
  bg:      'var(--venue-bg-base)',
  surface: 'var(--venue-bg-surface)',
  border:  'var(--venue-border-subtle)',
  text:    'var(--venue-text-primary)',
  muted:   'var(--venue-text-muted)',
  amber:   'var(--venue-amber)',
} as const

const MONO  = "'JetBrains Mono', monospace"
const INTER = "'Inter', system-ui, sans-serif"

export default async function BrandEnquiriesPage() {
  await requireAuth('/business/brand/enquiries')

  return (
    <>
      {/* Topbar */}
      <header style={{
        position: 'sticky', top: 48, height: 56, zIndex: 20,
        background: 'rgba(10,10,10,0.88)', backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', padding: '0 28px', gap: 10,
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 18, color: T.amber }}>inbox</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.text, fontFamily: INTER }}>Enquiries</div>
          <div style={{ fontSize: 11, color: T.muted, fontFamily: MONO }}>CREATOR OUTREACH</div>
        </div>
      </header>

      <div style={{ padding: '40px 32px', maxWidth: 820 }}>

        {/* Empty state */}
        <div style={{
          background: T.surface,
          border: `1px dashed ${T.border}`,
          borderRadius: 2,
          padding: '64px 40px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
          textAlign: 'center',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: T.muted, opacity: 0.5 }}>
            inbox
          </span>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 13, color: T.text, marginBottom: 8 }}>
              No enquiries yet
            </div>
            <div style={{ fontFamily: INTER, fontSize: 13, color: T.muted, maxWidth: 380, lineHeight: 1.6 }}>
              When creators reach out to collaborate with your brand, their messages will appear here.
            </div>
          </div>
          <div style={{
            marginTop: 8,
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(245,168,0,0.06)',
            border: `1px solid rgba(245,168,0,0.2)`,
            borderRadius: 2, padding: '10px 20px',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 15, color: T.amber }}>tips_and_updates</span>
            <span style={{ fontFamily: MONO, fontSize: 10, color: T.amber, letterSpacing: '0.06em' }}>
              TIP: Complete your brand page to attract creator interest
            </span>
          </div>
        </div>

      </div>
    </>
  )
}
