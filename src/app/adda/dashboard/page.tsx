import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requireAuth } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAddaDashboardData } from '@/app/actions/adda-dashboard'
import AddaSidebar from '@/components/adda/AddaSidebar'
import PriorityActions from '@/components/adda/dashboard/PriorityActions'
import KpiCard from '@/components/adda/dashboard/KpiCard'
import { KpiCardSkeletonRow } from '@/components/adda/dashboard/KpiCardSkeleton'
import WeekStrip from '@/components/adda/dashboard/WeekStrip'
import PendingRequests from '@/components/adda/dashboard/PendingRequests'
import RevenueTrend from '@/components/adda/dashboard/RevenueTrend'
import type { MonthlyRevenue } from '@/components/adda/dashboard/charts/RevenueTrendChart'
import type { AddaProfile, AddaTier } from '@/types/database'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatInr(paise: number) {
  return Math.round(paise / 100).toLocaleString('en-IN')
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function formatDateLong(date: Date) {
  return date.toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

// ---------------------------------------------------------------------------
// Mock data helpers
// TODO: replace with API calls to /api/adda/dashboard/stats once the endpoint exists
// ---------------------------------------------------------------------------

function buildMockSparkline(): number[] {
  // TODO: replace with real 30-day revenue time-series from API
  return [42, 58, 51, 67, 60, 75, 68, 82, 79, 90, 85, 95]
}

function buildMockOccupancySparkline(): number[] {
  // TODO: replace with real occupancy history from API
  return [60, 55, 70, 65, 72, 68, 75, 80, 74, 82, 79, 85]
}

function buildMockRevenueTrend(totalRevenuePaise: number): MonthlyRevenue[] {
  // TODO: replace with real month-over-month data from /api/adda/dashboard/stats
  const now = new Date()
  const baseGross = totalRevenuePaise / 6 || 100_000_00 // fallback to ₹1L/month
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    const month = d.toLocaleDateString('en-IN', { month: 'short' })
    const jitter = 0.7 + Math.random() * 0.6
    const gross = Math.round(baseGross * jitter)
    const net   = Math.round(gross * 0.35)  // adda share ≈ 35% of gross
    return { month, gross_paise: gross, net_paise: net }
  })
}

// ---------------------------------------------------------------------------
// Tier progress card
// ---------------------------------------------------------------------------

const TIER_COLORS: Record<AddaTier, { bg: string; border: string; color: string; icon: string }> = {
  open:      { bg: 'rgba(255,255,255,0.04)', border: 'var(--adda-border-subtle)', color: 'var(--adda-text-muted)',  icon: 'storefront' },
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
        style={{ fontSize: 16, color: met ? '#4dd2b1' : 'var(--adda-text-muted)', flexShrink: 0, marginTop: 1 }}
      >
        {met ? 'check_circle' : 'radio_button_unchecked'}
      </span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: met ? 'var(--adda-text-primary)' : 'var(--adda-text-muted)' }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--adda-text-muted)', fontFamily: 'var(--font-jetbrains-mono)', marginTop: 1 }}>{detail}</div>
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

  // Gates for next tier
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
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: `${c.color}22`, display: 'grid', placeItems: 'center', color: c.color,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{c.icon}</span>
          </div>
          <div>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-jetbrains-mono)', color: 'var(--adda-text-muted)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 2 }}>
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

      {/* Next tier gates or max tier message */}
      {nextTier ? (
        <>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--adda-text-secondary)', fontFamily: 'var(--font-jetbrains-mono)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>
            Requirements for {TIER_LABELS[nextTier]}
          </div>
          <div style={{ borderTop: '1px solid var(--adda-border-subtle)' }}>
            {gates.map((g) => <Gate key={g.label} {...g} />)}
          </div>
        </>
      ) : (
        <div style={{ fontSize: 13, color: 'var(--adda-text-secondary)', textAlign: 'center', padding: '8px 0' }}>
          You have reached the highest Adda tier. Keep the flame alive!
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// KPI Cards section — own async boundary so it can stream independently
// ---------------------------------------------------------------------------

interface KpiRowProps {
  totalRevenuePaise:     number
  mtdRevenuePaise:       number
  revenueDelta:          number
  occupancyPercent:      number
  occupancyDelta:        number
  avgBookingPaise:       number
  avgBookingDelta:       number
  pendingCount:          number
  soonestExpiry:         string | null
}

function KpiRow({
  totalRevenuePaise,
  mtdRevenuePaise,
  revenueDelta,
  occupancyPercent,
  occupancyDelta,
  avgBookingPaise,
  avgBookingDelta,
  pendingCount,
  soonestExpiry,
}: KpiRowProps) {
  const subtextForPending = soonestExpiry
    ? `Respond before ${new Date(soonestExpiry).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
    : undefined

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 16,
      marginBottom: 24,
    }}>
      <KpiCard
        label="Net Revenue MTD"
        prefix="₹"
        value={formatInr(mtdRevenuePaise)}
        delta={revenueDelta}
        deltaDirection={revenueDelta > 5 ? 'up' : revenueDelta < -5 ? 'down' : 'neutral'}
        sparklineData={buildMockSparkline()}
        tooltip="Your share of ticket revenue for confirmed events this month. Excludes pending payouts."
      />
      <KpiCard
        label="Occupancy Rate"
        suffix="%"
        value={occupancyPercent}
        delta={occupancyDelta}
        deltaDirection={occupancyDelta > 0 ? 'up' : occupancyDelta < 0 ? 'down' : 'neutral'}
        arcPercent={occupancyPercent}
        tooltip="Confirmed booking days ÷ total available days this month."
      />
      <KpiCard
        label="Avg Booking Value"
        prefix="₹"
        value={formatInr(avgBookingPaise)}
        delta={avgBookingDelta}
        deltaDirection={avgBookingDelta > 0 ? 'up' : avgBookingDelta < 0 ? 'down' : 'neutral'}
        sparklineData={buildMockOccupancySparkline()}
        tooltip="Average adda share per confirmed event."
      />
      <KpiCard
        label="Pending Requests"
        value={pendingCount}
        delta={0}
        deltaDirection="neutral"
        subtext={pendingCount > 0 ? subtextForPending : undefined}
        tooltip="Booking requests awaiting your response. Unanswered requests expire in 48h."
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AddaDashboardPage() {
  const { user } = await requireAuth('/adda/dashboard')

  const admin = createAdminClient()

  // Find the adda owned by this user
  const { data: adda } = await admin
    .from('adda_profiles')
    .select('id, name, slug')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!adda) redirect('/adda/onboarding')

  // Full dashboard data
  const result = await getAddaDashboardData(adda.id)

  if ('error' in result) {
    return (
      <div style={{
        display: 'grid',
        placeItems: 'center',
        minHeight: '100vh',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
        color: 'var(--adda-text-secondary)',
      }}>
        {result.error}
      </div>
    )
  }

  const {
    adda: addaProfile,
    pendingProposals,
    recentRevenue,
    availabilityThisMonth,
    stats,
  } = result

  // Review count for tier progress card
  const { data: eventIds } = await admin
    .from('events')
    .select('id')
    .eq('venue_adda_id', adda.id)
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

  // Sidebar owner info from auth metadata
  const ownerName =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split('@')[0] ??
    'Owner'
  const initials = getInitials(ownerName)

  // ---------------------------------------------------------------------------
  // Compute KPI values
  // TODO: replace with dedicated /api/adda/dashboard/stats when available
  // ---------------------------------------------------------------------------

  // MTD revenue: sum adda_share_paise for current month entries
  const now = new Date()
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const mtdRevenuePaise = recentRevenue
    .filter(e => e.event_date.startsWith(monthPrefix))
    .reduce((s, e) => s + e.adda_share_paise, 0)

  // TODO: replace with real prev-month comparison from API
  const revenueDelta = 12  // mock +12% vs last month

  // Occupancy: confirmed days / total days in month
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const confirmedDays = new Set(
    availabilityThisMonth.filter(s => s.status === 'confirmed').map(s => s.date)
  ).size
  const occupancyPercent = daysInMonth > 0 ? Math.round((confirmedDays / daysInMonth) * 100) : 0
  // TODO: replace with real prev-month occupancy delta from API
  const occupancyDelta = 5  // mock +5pp vs last month

  // Avg booking value
  const completedRevenue = recentRevenue.filter(e => e.adda_share_paise > 0)
  const avgBookingPaise = completedRevenue.length
    ? Math.round(completedRevenue.reduce((s, e) => s + e.adda_share_paise, 0) / completedRevenue.length)
    : 0
  // TODO: replace with real avg booking delta from API
  const avgBookingDelta = -3  // mock -3% vs last month

  // Soonest-expiring pending proposal
  const soonestExpiry = pendingProposals.length
    ? pendingProposals.reduce((a, b) =>
        new Date(a.expires_at) < new Date(b.expires_at) ? a : b
      ).expires_at
    : null

  // Revenue trend mock data
  // TODO: replace with real 6-month time-series from /api/adda/dashboard/stats
  const revenueTrendData = buildMockRevenueTrend(stats.total_revenue_paise)

  return (
    <div className="adda-theme" style={{ minHeight: '100vh', background: 'var(--adda-bg-base)' }}>

      {/* ── Fixed sidebar ─────────────────────────────────────────────────── */}
      <AddaSidebar
        addaId={adda.id}
        venueName={addaProfile.name}
        ownerName={ownerName}
        initials={initials}
      />

      {/* ── Content area (offset by sidebar width) ───────────────────────── */}
      <div style={{ marginLeft: 240 }}>

        {/* Topbar — 56px fixed */}
        <header style={{
          position: 'sticky',
          top: 0,
          height: 56,
          background: 'rgba(10, 10, 10, 0.88)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--adda-border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 28px',
          zIndex: 40,
        }}>
          {/* Left: venue name + date */}
          <div>
            <div style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--adda-text-primary)',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              lineHeight: 1.2,
            }}>
              {addaProfile.name}
            </div>
            <div style={{
              fontSize: 11,
              color: 'var(--adda-text-muted)',
              fontFamily: 'var(--font-jetbrains-mono), monospace',
              marginTop: 1,
            }}>
              {formatDateLong(new Date())}
            </div>
          </div>

          {/* Right: actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link
              href={`/adda/${addaProfile.slug}`}
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
          </div>
        </header>

        {/* ── Main content ──────────────────────────────────────────────────── */}
        <main style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>

          {/* Row 1: Priority action chips */}
          <PriorityActions pendingProposals={pendingProposals} />

          {/* Row 2: KPI cards — Suspense so skeleton shows on slow loads */}
          <Suspense fallback={<KpiCardSkeletonRow />}>
            <KpiRow
              totalRevenuePaise={stats.total_revenue_paise}
              mtdRevenuePaise={mtdRevenuePaise}
              revenueDelta={revenueDelta}
              occupancyPercent={occupancyPercent}
              occupancyDelta={occupancyDelta}
              avgBookingPaise={avgBookingPaise}
              avgBookingDelta={avgBookingDelta}
              pendingCount={pendingProposals.length}
              soonestExpiry={soonestExpiry}
            />
          </Suspense>

          {/* Row 3: Week strip (2/3) + Pending requests (1/3) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr',
            gap: 24,
            marginBottom: 24,
          }}>
            <WeekStrip availability={availabilityThisMonth} />
            <PendingRequests proposals={pendingProposals} />
          </div>

          {/* Row 4: Revenue trend (full width) */}
          <RevenueTrend data={revenueTrendData} />

          {/* Row 5: Tier progress card */}
          <TierProgressCard adda={addaProfile} reviewCount={reviewCount} />

        </main>
      </div>
    </div>
  )
}
