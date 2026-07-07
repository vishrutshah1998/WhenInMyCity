import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { requireAuth } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAddaAnalytics } from '@/app/actions/venue-analytics'
import type { AddaAnalyticsData } from '@/app/actions/venue-analytics'
import AnalyticsPageClient from '@/components/venue/analytics/AnalyticsPageClient'

const EMPTY_ANALYTICS: AddaAnalyticsData = {
  dailyMetrics: [],
  proposalFunnel: { received: 0, accepted: 0, eventsCompleted: 0 },
  demandGrid: [],
  trafficStats: { totalViews: 0, byDay: [], windowDays: 30 },
  hasData: false,
}

export default async function AddaAnalyticsPage() {
  const { user } = await requireAuth('/business/venue/analytics')

  const admin = createAdminClient()

  const { data: adda } = await admin
    .from('adda_profiles')
    .select('id, name, slug')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!adda) redirect('/business/venue/onboard')

  const analytics = await getAddaAnalytics(adda.id)

  return (
    <div style={{ paddingTop: 28 }}>
      {/* Page heading + public listing link */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 28px 20px',
      }}>
        <div>
          <div style={{
            fontSize: 20, fontWeight: 700,
            color: 'var(--venue-text-primary)',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
          }}>
            Analytics
          </div>
          <div style={{
            fontSize: 11, color: 'var(--venue-text-muted)',
            fontFamily: 'var(--font-jetbrains-mono), monospace', marginTop: 2,
          }}>
            {adda.name}
          </div>
        </div>
        <Link
          href={`/adda/${adda.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 12.5, fontWeight: 600,
            color: 'var(--venue-amber)', textDecoration: 'none',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
          }}
        >
          View public listing
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span>
        </Link>
      </div>

      <main style={{ maxWidth: 1400, margin: '0 auto' }}>
        <Suspense fallback={<AnalyticsSkeleton />}>
          <AnalyticsPageClient
            venueName={adda.name}
            venueSlug={adda.slug}
            realData={analytics ?? EMPTY_ANALYTICS}
          />
        </Suspense>
      </main>
    </div>
  )
}

function AnalyticsSkeleton() {
  return (
    <div style={{ padding: '0 28px 48px' }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ width: 72, height: 28, borderRadius: 6, background: 'var(--venue-bg-elevated)' }} />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ height: 120, borderRadius: 12, background: 'var(--venue-bg-elevated)' }} />
        ))}
      </div>
      <div style={{ height: 320, borderRadius: 12, background: 'var(--venue-bg-elevated)', marginBottom: 16 }} />
    </div>
  )
}
