import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requireAuth } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAddaDashboardData } from '@/app/actions/venue-dashboard'
import PersonaSwitcherPills from '@/components/PersonaSwitcherPills'
import DashPageLink from '@/components/DashPageLink'
import PriorityActions from '@/components/venue/dashboard/PriorityActions'
import KpiCard from '@/components/venue/dashboard/KpiCard'
import { KpiCardSkeletonRow } from '@/components/venue/dashboard/KpiCardSkeleton'
import WeekStrip from '@/components/venue/dashboard/WeekStrip'
import PendingRequests from '@/components/venue/dashboard/PendingRequests'
import RevenueTrend from '@/components/venue/dashboard/RevenueTrend'
import type { MonthlyRevenue } from '@/components/venue/dashboard/charts/RevenueTrendChart'
import type { AddaProfile, AddaTier } from '@/types/database'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatInr(paise: number) {
  return Math.round(paise / 100).toLocaleString('en-IN')
}

function buildRevenueTrend(): MonthlyRevenue[] {
  const now = new Date()
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    const month = d.toLocaleDateString('en-IN', { month: 'short' })
    return { month, gross_paise: 0, net_paise: 0 }
  })
}

// ---------------------------------------------------------------------------
// Tier progress card
// ---------------------------------------------------------------------------

const TIER_COLORS: Record<AddaTier, { bg: string; border: string; color: string; icon: string }> = {
  open:      { bg: 'rgba(255,255,255,0.04)', border: 'var(--venue-border-subtle)', color: 'var(--venue-text-muted)',  icon: 'storefront' },
  verified:  { bg: 'rgba(77,210,177,0.08)',  border: 'rgba(77,210,177,0.3)',      color: '#4dd2b1',               icon: 'verified' },
  beloved:   { bg: 'rgba(245,168,0,0.08)',   border: 'rgba(245,168,0,0.3)',       color: '#f5a800',               icon: 'favorite' },
  legendary: { bg: 'rgba(168,85,247,0.08)',  border: 'rgba(168,85,247,0.3)',      color: '#a855f7',               icon: 'workspace_premium' },
}

const TIER_LABELS: Record<AddaTier, string> = {
  open: 'Open', verified: 'Verified', beloved: 'Beloved', legendary: 'Legendary',
}

const TIER_ORDER: AddaTier[] = ['open', 'verified', 'beloved', 'legendary']

function Gate({ met, label, detail }: { met: boolean; label: string; detail: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0' }}>
      <span
        className="material-symbols-outlined"
        style={{ fontSize: 16, color: met ? '#4dd2b1' : 'var(--venue-text-muted)', flexShrink: 0, marginTop: 1 }}
      >
        {met ? 'check_circle' : 'radio_button_unchecked'}
      </span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: met ? 'var(--venue-text-primary)' : 'var(--venue-text-muted)' }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--venue-text-muted)', fontFamily: 'var(--font-jetbrains-mono)', marginTop: 1 }}>{detail}</div>
      </div>
    </div>
  )
}

function TierProgressCard({ adda, reviewCount }: { adda: AddaProfile; reviewCount: number }) {
  const currentTier = adda.adda_tier as AddaTier
  const currentIndex = TIER_ORDER.indexOf(currentTier)
  const nextTier = TIER_ORDER[currentIndex + 1] as AddaTier | undefined
  const c = TIER_COLORS[currentTier]
  const isTrending = adda.trending_until ? new Date(adda.trending_until) > new Date() : false

  const belovedYears = adda.beloved_since
    ? (Date.now() - new Date(adda.beloved_since).getTime()) / (365 * 24 * 60 * 60 * 1000)
    : 0

  let gates: Array<{ met: boolean; label: string; detail: string }> = []
  if (nextTier === 'verified') {
    gates = [
      { met: adda.total_events_hosted >= 3,   label: '3+ events hosted (lifetime)',    detail: `You have ${adda.total_events_hosted}` },
      { met: reviewCount >= 10,                label: '10+ reviews',                   detail: `You have ${reviewCount}` },
      { met: adda.average_maker_rating >= 4.0, label: '4.0★ average rating',          detail: `Your rating: ${adda.average_maker_rating.toFixed(1)}★` },
      { met: adda.is_verified,                 label: 'Claimed & profile complete',    detail: adda.is_verified ? 'Profile verified' : 'Awaiting admin verification' },
    ]
  } else if (nextTier === 'beloved') {
    gates = [
      { met: reviewCount >= 100,                              label: '100+ reviews',                      detail: `You have ${reviewCount}` },
      { met: adda.average_maker_rating >= 4.6,               label: '4.6★ average rating',              detail: `Your rating: ${adda.average_maker_rating.toFixed(1)}★` },
      { met: adda.unique_lantern_beacon_hosts >= 3,          label: '3+ Lantern/Beacon hosts',          detail: `You have ${adda.unique_lantern_beacon_hosts}` },
      { met: adda.complaint_rate <= 0.02,                    label: '<2% complaint rate',               detail: `Yours: ${(adda.complaint_rate * 100).toFixed(1)}%` },
      { met: adda.on_time_rate >= 0.90,                      label: '≥90% on-time rate',               detail: `Yours: ${(adda.on_time_rate * 100).toFixed(0)}%` },
    ]
  } else if (nextTier === 'legendary') {
    gates = [
      { met: reviewCount >= 500,                              label: '500+ reviews',                     detail: `You have ${reviewCount}` },
      { met: adda.average_maker_rating >= 4.7,               label: '4.7★ average rating',             detail: `Your rating: ${adda.average_maker_rating.toFixed(1)}★` },
      { met: adda.unique_lantern_beacon_hosts >= 10,         label: '10+ Beacon hosts',                 detail: `You have ${adda.unique_lantern_beacon_hosts}` },
      { met: adda.repeat_attendee_rate >= 0.40,              label: '≥40% repeat attendee rate',       detail: `Yours: ${(adda.repeat_attendee_rate * 100).toFixed(0)}%` },
      { met: belovedYears >= 2,                              label: '2+ years at Beloved tier',        detail: belovedYears >= 2 ? `${belovedYears.toFixed(1)} years` : `${(belovedYears * 12).toFixed(0)} months in` },
    ]
  }

  return (
    <div style={{
      background: c.bg, border: `1px solid ${c.border}`, borderRadius: 16,
      padding: 24, marginBottom: 24,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: `${c.color}22`, display: 'grid', placeItems: 'center', color: c.color,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{c.icon}</span>
          </div>
          <div>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-jetbrains-mono)', color: 'var(--venue-text-muted)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 2 }}>
              Current Tier
            </div>
            <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 20, color: c.color }}>
              {TIER_LABELS[currentTier]}
            </div>
          </div>
        </div>
        {isTrending && (
          <span style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 700,
            background: 'rgba(232,87,42,0.15)', border: '1px solid rgba(232,87,42,0.4)',
            color: '#ff7a45', fontFamily: 'var(--font-jetbrains-mono)',
          }}>
            🔥 Trending
          </span>
        )}
      </div>

      {nextTier ? (
        <>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--venue-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>
            Requirements for {TIER_LABELS[nextTier]}
          </div>
          <div style={{ borderTop: '1px solid var(--venue-border-subtle)' }}>
            {gates.map((g) => <Gate key={g.label} {...g} />)}
          </div>
        </>
      ) : (
        <div style={{ fontSize: 13, color: 'var(--venue-text-secondary)', textAlign: 'center', padding: '8px 0' }}>
          You have reached the highest Adda tier. Keep the flame alive!
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// KPI row
// ---------------------------------------------------------------------------

interface KpiRowProps {
  mtdRevenuePaise:  number
  occupancyPercent: number
  avgBookingPaise:  number
  pendingCount:     number
  soonestExpiry:    string | null
}

function KpiRow({ mtdRevenuePaise, occupancyPercent, avgBookingPaise, pendingCount, soonestExpiry }: KpiRowProps) {
  const subtextForPending = soonestExpiry
    ? `Respond before ${new Date(soonestExpiry).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
    : undefined

  return (
    <div className="adda-kpi-grid" style={{
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24,
    }}>
      <KpiCard label="Net Revenue MTD" prefix="₹" value={formatInr(mtdRevenuePaise)} delta={0} deltaDirection="neutral" tooltip="Your share of ticket revenue for confirmed events this month. Excludes pending payouts." />
      <KpiCard label="Occupancy Rate" suffix="%" value={occupancyPercent} delta={0} deltaDirection="neutral" arcPercent={occupancyPercent} tooltip="Confirmed booking days ÷ total available days this month." />
      <KpiCard label="Avg Booking Value" prefix="₹" value={formatInr(avgBookingPaise)} delta={0} deltaDirection="neutral" tooltip="Average adda share per confirmed event." />
      <KpiCard label="Pending Requests" value={pendingCount} delta={0} deltaDirection="neutral" subtext={pendingCount > 0 ? subtextForPending : undefined} tooltip="Booking requests awaiting your response. Unanswered requests expire in 48h." />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AddaDashboardPage() {
  const { user } = await requireAuth('/business/venue/dashboard')

  const admin = createAdminClient()

  const { data: adda } = await admin
    .from('adda_profiles')
    .select('id, name, slug')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!adda) redirect('/business/venue/onboard')

  const [result, { data: userProfile }] = await Promise.all([
    getAddaDashboardData(adda.id),
    admin.from('user_profiles').select('personas').eq('id', user.id).maybeSingle(),
  ])

  const rawPersonas = (userProfile?.personas ?? []) as string[]
  const personas = rawPersonas.includes('venue') ? rawPersonas : [...rawPersonas, 'venue']

  if ('error' in result) {
    return (
      <div style={{
        display: 'grid', placeItems: 'center', minHeight: '60vh',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
        color: 'var(--venue-text-secondary)',
      }}>
        {(result as { error: string }).error}
      </div>
    )
  }

  const { adda: addaProfile, pendingProposals, recentRevenue, availabilityThisMonth } = result

  // Review count for tier progress card
  const { data: eventIds } = await admin
    .from('events')
    .select('id')
    .eq('venue_id', adda.id)
    .in('status', ['published', 'completed'])

  const eventIdList = (eventIds ?? []).map((e) => e.id)
  const reviewCount = eventIdList.length > 0
    ? ((await admin
        .from('explorer_event_history')
        .select('id', { count: 'exact', head: true })
        .in('event_id', eventIdList)
        .not('rating', 'is', null)
      ).count ?? 0)
    : 0

  // KPI calculations
  const now = new Date()
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const mtdRevenuePaise = recentRevenue
    .filter(e => e.event_date.startsWith(monthPrefix))
    .reduce((s, e) => s + e.adda_share_paise, 0)

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const confirmedDays = new Set(
    availabilityThisMonth.filter(s => s.status === 'confirmed').map(s => s.date)
  ).size
  const occupancyPercent = daysInMonth > 0 ? Math.round((confirmedDays / daysInMonth) * 100) : 0

  const completedRevenue = recentRevenue.filter(e => e.adda_share_paise > 0)
  const avgBookingPaise = completedRevenue.length
    ? Math.round(completedRevenue.reduce((s, e) => s + e.adda_share_paise, 0) / completedRevenue.length)
    : 0

  const soonestExpiry = pendingProposals.length
    ? pendingProposals.reduce((a, b) => new Date(a.expires_at) < new Date(b.expires_at) ? a : b).expires_at
    : null

  const revenueTrendData = buildRevenueTrend()

  return (
    <>
      <style>{`
        @media (max-width: 767px) {
          .adda-page-main  { padding: 14px !important; }
          .adda-kpi-grid   { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
          .adda-row3-grid  { grid-template-columns: 1fr !important; gap: 16px !important; }
        }
        @keyframes dash-enter {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .dash-enter { animation: dash-enter 0.38s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>

      <PersonaSwitcherPills personas={personas} currentPersona="venue" variant="dark" />
      <DashPageLink
        url={`${process.env.NEXT_PUBLIC_APP_URL ?? 'https://wheninmycity.com'}/adda/${adda.slug}`}
        variant="dark"
      />

      <div className="adda-page-main dash-enter" style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>

        {/* Pending proposals hero */}
        {pendingProposals.length > 0 && (
          <Link
            href="/business/venue/creators"
            style={{
              display: 'flex', alignItems: 'center', gap: 20,
              background: 'linear-gradient(135deg, rgba(245,168,0,0.1) 0%, rgba(245,168,0,0.04) 100%)',
              border: '1px solid rgba(245,168,0,0.35)',
              borderRadius: 16, padding: '20px 24px', marginBottom: 24,
              textDecoration: 'none', cursor: 'pointer',
              transition: 'border-color 180ms ease',
            }}
          >
            <div style={{
              width: 64, height: 64, borderRadius: 14,
              background: 'rgba(245,168,0,0.15)',
              display: 'grid', placeItems: 'center', flexShrink: 0,
            }}>
              <span style={{
                fontFamily: 'var(--font-syne)', fontSize: 28, fontWeight: 900,
                color: 'var(--venue-amber)', lineHeight: 1,
              }}>
                {pendingProposals.length}
              </span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 18,
                color: 'var(--venue-text-primary)', marginBottom: 4,
              }}>
                {pendingProposals.length === 1
                  ? '1 creator wants to perform at your space'
                  : `${pendingProposals.length} creators want to perform at your space`}
              </div>
              <div style={{ fontSize: 13, color: 'var(--venue-text-muted)', fontFamily: 'var(--font-dm-sans, sans-serif)' }}>
                Respond within 48 hours to secure the booking · Tap to review
              </div>
            </div>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'rgba(245,168,0,0.15)',
              display: 'grid', placeItems: 'center', flexShrink: 0,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--venue-amber)' }}>arrow_forward</span>
            </div>
          </Link>
        )}

        <PriorityActions pendingProposals={pendingProposals} />

        <Suspense fallback={<KpiCardSkeletonRow />}>
          <KpiRow
            mtdRevenuePaise={mtdRevenuePaise}
            occupancyPercent={occupancyPercent}
            avgBookingPaise={avgBookingPaise}
            pendingCount={pendingProposals.length}
            soonestExpiry={soonestExpiry}
          />
        </Suspense>

        <div className="adda-row3-grid" style={{
          display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 24,
        }}>
          <WeekStrip availability={availabilityThisMonth} />
          <PendingRequests proposals={pendingProposals} />
        </div>

        <RevenueTrend data={revenueTrendData} />

        <TierProgressCard adda={addaProfile} reviewCount={reviewCount} />
      </div>
    </>
  )
}
