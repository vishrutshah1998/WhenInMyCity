import { requireProfile } from '@/lib/auth/requireAuth'
import { createClient } from '@/lib/supabase/server'
import { getCreatorReferralOverview } from '@/app/actions/referrals'
import EarnClient from './EarnClient'

export default async function EarnPage() {
  const { profile } = await requireProfile()
  const supabase = await createClient()

  const [{ count: bookingBlockCount }, referralOverview] = await Promise.all([
    supabase
      .from('page_blocks')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', profile.id)
      .eq('block_type', 'booking_request'),
    getCreatorReferralOverview(),
  ])

  return (
    <EarnClient
      tier={profile.user_tier ?? 'wanderer'}
      eventsHosted={profile.cumulative_events_hosted ?? 0}
      hasBookingBlock={(bookingBlockCount ?? 0) > 0}
      referralOverview={referralOverview}
      profileUsername={profile.username ?? ''}
      profileCity={profile.city ?? ''}
    />
  )
}
