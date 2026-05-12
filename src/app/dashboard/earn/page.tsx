import { requireProfile } from '@/lib/auth/requireAuth'
import { createClient } from '@/lib/supabase/server'
import EarnClient from './EarnClient'

export default async function EarnPage() {
  const { profile } = await requireProfile()
  const supabase = await createClient()

  // Check if creator already has a booking_request block on their page
  const { count: bookingBlockCount } = await supabase
    .from('page_blocks')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', profile.id)
    .eq('block_type', 'booking_request')

  return (
    <EarnClient
      tier={profile.user_tier ?? 'wanderer'}
      eventsHosted={profile.cumulative_events_hosted ?? 0}
      hasBookingBlock={(bookingBlockCount ?? 0) > 0}
    />
  )
}
