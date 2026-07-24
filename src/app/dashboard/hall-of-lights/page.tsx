import { requireProfile } from '@/lib/auth/requireAuth'
import { getShowcasedCreators } from '@/app/actions/hallOfLights'
import HallClient from '@/app/hall-of-lights/HallClient'
import type { UserTier } from '@/types/marketplace'

export const metadata = {
  title: 'Hall of Lights — WIMC',
}

export default async function DashboardHallOfLightsPage() {
  const { profile } = await requireProfile()
  const creators = await getShowcasedCreators()

  return (
    <HallClient
      creators={creators}
      viewerCity={profile.city ?? null}
      viewerTier={(profile.user_tier as UserTier) ?? null}
      inDashboard
    />
  )
}
