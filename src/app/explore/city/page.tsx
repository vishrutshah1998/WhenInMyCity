import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCityPulse, getCityLeaderboard, getNeighbourhoodLeaderboards, getFriendLeaderboard } from '@/app/actions/gamification'
import CityClient from './CityClient'

export default async function CityPage() {
  const { user } = await requireAuth('/explore/city')
  const admin = createAdminClient()

  const { data: explorer } = await admin
    .from('explorer_profiles')
    .select('city')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  const { data: userProfile } = await admin
    .from('user_profiles')
    .select('attendance_streak, streak_freeze_tokens')
    .eq('id', user.id)
    .maybeSingle()

  if (!explorer) redirect('/onboarding')

  const [pulse, leaderboard, neighbourhoods, friends] = await Promise.all([
    getCityPulse(),
    getCityLeaderboard(explorer.city),
    getNeighbourhoodLeaderboards(explorer.city),
    getFriendLeaderboard(explorer.city),
  ])

  return (
    <CityClient
      pulse={pulse}
      leaderboard={leaderboard}
      neighbourhoods={neighbourhoods}
      friends={friends}
      userCity={explorer.city}
      attendanceStreak={userProfile?.attendance_streak ?? 0}
      streakFreezeTokens={userProfile?.streak_freeze_tokens ?? 0}
    />
  )
}
