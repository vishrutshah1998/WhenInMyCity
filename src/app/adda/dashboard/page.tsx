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

        </main>
      </div>
    </div>
  )
}
