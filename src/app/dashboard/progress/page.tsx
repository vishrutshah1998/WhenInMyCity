import { requireProfile } from '@/lib/auth/requireAuth'
import { getTierMetrics } from '@/app/actions/tier'
import { getShowcasedCreators } from '@/app/actions/hallOfLights'
import TierClient from '@/app/dashboard/tier/TierClient'
import HallClient from '@/app/hall-of-lights/HallClient'
import type { UserTier } from '@/types/marketplace'

// Combines the two existing standalone pages (/dashboard/tier,
// /dashboard/hall-of-lights) into one scrollable page — the same
// composition the mobile carousel's Progress tab used to stack inline
// (CreatorProgressSlot.tsx, now removed). Reached from a "Progress" card in
// CreatorBusinessSlot.tsx's Business tab; the two standalone routes stay
// linked separately from desktop's Sidebar (a single "Progress" NavLink
// pointing at /dashboard/hall-of-lights, with an in-page SectionTabs strip
// on each page to switch to the sibling), untouched by this route's
// existence. showSectionTabs is off here since both pages already render
// stacked on one scroll.
export default async function CreatorProgressPage() {
  const { profile } = await requireProfile()

  const [tierData, creators] = await Promise.all([
    getTierMetrics(),
    getShowcasedCreators(),
  ])

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ borderBottom: '1px solid var(--wimc-border-default)' }}>
        <TierClient
          tier={tierData.tier}
          metrics={tierData.metrics}
          eventsAttendedIn90d={tierData.eventsAttendedIn90d}
          eventsHostedIn180d={tierData.eventsHostedIn180d}
          eventsHostedIn365d={tierData.eventsHostedIn365d}
          showSectionTabs={false}
        />
      </div>
      <HallClient
        creators={creators}
        viewerCity={profile.city ?? null}
        viewerTier={(profile.user_tier as UserTier) ?? null}
        inDashboard
        showSectionTabs={false}
      />
    </div>
  )
}
