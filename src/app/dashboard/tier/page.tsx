import { requireProfile } from '@/lib/auth/requireAuth'
import { createClient } from '@/lib/supabase/server'
import TierClient from './TierClient'
import type { UserTier } from '@/types/database'

export default async function TierPage() {
  const { profile } = await requireProfile()
  const supabase = await createClient()
  const now = new Date()
  const d90  = new Date(now.getTime() - 90  * 24 * 60 * 60 * 1000).toISOString()
  const d180 = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString()
  const d365 = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { data: fullProfile },
    { count: attended90 },
    { count: hosted180 },
    { count: hosted365 },
  ] = await Promise.all([
    supabase
      .from('user_profiles')
      .select(`
        user_tier, cumulative_events_hosted, cumulative_unique_attendees,
        cumulative_gmv_paise, average_event_rating, repeat_attendee_rate,
        monthly_page_visitors, is_founding_maker, events_attended_count,
        rsvps_total_count, no_shows_count, reviews_posted_count,
        whatsapp_subscriber_count, tier_recovery_until
      `)
      .eq('id', profile.id)
      .single(),
    supabase
      .from('explorer_event_history')
      .select('id', { count: 'exact', head: true })
      .eq('explorer_id', profile.id)
      .eq('attended', true)
      .gte('created_at', d90),
    supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('creator_id', profile.id)
      .neq('status', 'draft')
      .gte('starts_at', d180),
    supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('creator_id', profile.id)
      .neq('status', 'draft')
      .gte('starts_at', d365),
  ])

  const metrics = fullProfile ?? {
    user_tier: 'wanderer' as UserTier,
    cumulative_events_hosted: 0,
    cumulative_unique_attendees: 0,
    cumulative_gmv_paise: 0,
    average_event_rating: 0,
    repeat_attendee_rate: 0,
    monthly_page_visitors: 0,
    is_founding_maker: false,
    events_attended_count: 0,
    rsvps_total_count: 0,
    no_shows_count: 0,
    reviews_posted_count: 0,
    whatsapp_subscriber_count: 0,
    tier_recovery_until: null,
  }

  return (
    <TierClient
      tier={(profile.user_tier ?? 'wanderer') as UserTier}
      metrics={metrics}
      eventsAttendedIn90d={attended90 ?? 0}
      eventsHostedIn180d={hosted180 ?? 0}
      eventsHostedIn365d={hosted365 ?? 0}
    />
  )
}
