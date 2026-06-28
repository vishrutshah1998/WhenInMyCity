import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getShowcasedCreators } from '@/app/actions/hallOfLights'
import HallClient from './HallClient'
import type { UserTier } from '@/types/marketplace'

export const metadata = {
  title: "Hall of Lights — WIMC's Top Creators",
  description: 'Meet the Lantern and Beacon creators powering offline culture across India\'s Tier-2 cities.',
}

export default async function HallOfLightsPage() {
  const [creators, supabase] = await Promise.all([
    getShowcasedCreators(),
    createClient(),
  ])

  // Optionally identify viewer — page is public, no redirect on failure
  const { data: { user } } = await supabase.auth.getUser()

  let viewerCity: string | null = null
  let viewerTier: UserTier | null = null

  if (user) {
    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('user_profiles')
      .select('city, user_tier')
      .eq('id', user.id)
      .maybeSingle()

    if (profile) {
      viewerCity = profile.city
      viewerTier = profile.user_tier as UserTier
    }
  }

  return (
    <HallClient
      creators={creators}
      viewerCity={viewerCity}
      viewerTier={viewerTier}
    />
  )
}
