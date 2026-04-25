import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { requireAuth } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import AddaSidebar from '@/components/adda/AddaSidebar'
import AnalyticsPageClient from '@/components/adda/analytics/AnalyticsPageClient'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

// ---------------------------------------------------------------------------
// Page — server component, handles auth + venue lookup, delegates to client
// ---------------------------------------------------------------------------

export default async function AddaAnalyticsPage() {
  const { user } = await requireAuth('/adda/analytics')

  const admin = createAdminClient()

  const { data: adda } = await admin
    .from('adda_profiles')
    .select('id, name, slug')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!adda) redirect('/adda/onboarding')

  const ownerName =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split('@')[0] ??
    'Owner'
  const initials = getInitials(ownerName)

  return (
    <div className="adda-theme" style={{ minHeight: '100vh', background: 'var(--adda-bg-base)' }}>

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <AddaSidebar
        addaId={adda.id}
        venueName={adda.name}
        ownerName={ownerName}
        initials={initials}
      />

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div style={{ marginLeft: 240 }}>

        {/* Sticky topbar */}
        <header style={{
          position: 'sticky',
          top: 0,
          height: 56,
          background: 'rgba(10,10,10,0.88)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--adda-border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 28px',
          zIndex: 40,
        }}>
          <div>
            <div style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--adda-text-primary)',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              lineHeight: 1.2,
            }}>
              Analytics
            </div>
            <div style={{
              fontSize: 11,
              color: 'var(--adda-text-muted)',
              fontFamily: 'var(--font-jetbrains-mono), monospace',
              marginTop: 1,
            }}>
              {adda.name}
            </div>
          </div>

          <Link
            href={`/adda/${adda.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 12.5,
              fontWeight: 600,
              color: 'var(--adda-amber)',
              textDecoration: 'none',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
            }}
          >
            View public listing
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span>
          </Link>
        </header>

        {/* Page content — Suspense because AnalyticsPageClient uses useSearchParams */}
        <main style={{ maxWidth: 1400, margin: '0 auto', paddingTop: 28 }}>
          <Suspense fallback={<AnalyticsSkeleton />}>
            <AnalyticsPageClient venueName={adda.name} venueSlug={adda.slug} />
          </Suspense>
        </main>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Skeleton — shown while the client component hydrates
// ---------------------------------------------------------------------------

function AnalyticsSkeleton() {
  return (
    <div style={{ padding: '0 28px 48px' }}>
      {/* Date range bar skeleton */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ width: 72, height: 28, borderRadius: 6, background: 'var(--adda-bg-elevated)' }} />
        ))}
      </div>

      {/* KPI row skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ height: 120, borderRadius: 12, background: 'var(--adda-bg-elevated)' }} />
        ))}
      </div>

      {/* Chart skeleton */}
      <div style={{ height: 320, borderRadius: 12, background: 'var(--adda-bg-elevated)', marginBottom: 16 }} />
    </div>
  )
}
