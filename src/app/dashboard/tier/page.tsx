import { requireProfile } from '@/lib/auth/requireAuth'
import { createClient } from '@/lib/supabase/server'
import TierClient from './TierClient'

export default async function TierPage() {
  const { profile } = await requireProfile()
  const supabase = await createClient()

  // Fetch full profile with tier metrics
  const { data: fullProfile } = await supabase
    .from('user_profiles')
    .select(`
      maker_tier,
      cumulative_events_hosted,
      cumulative_unique_attendees,
      cumulative_gmv_paise,
      average_event_rating,
      repeat_attendee_rate,
      monthly_page_visitors,
      is_founding_maker
    `)
    .eq('id', profile.id)
    .single()

  const metrics = fullProfile ?? {
    maker_tier: 'mohalla',
    cumulative_events_hosted: 0,
    cumulative_unique_attendees: 0,
    cumulative_gmv_paise: 0,
    average_event_rating: 0,
    repeat_attendee_rate: 0,
    monthly_page_visitors: 0,
    is_founding_maker: false,
  }

  return <TierClient tier={profile.maker_tier ?? 'mohalla'} metrics={metrics} />
}
