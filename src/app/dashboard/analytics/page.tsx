import { Suspense } from 'react'
import { requireProfile } from '@/lib/auth/requireAuth'
import { createClient } from '@/lib/supabase/server'
import { getLinkClickStats, getAudienceBreakdown } from '@/app/actions/analytics'
import AnalyticsClient from './AnalyticsClient'

export default async function AnalyticsPage() {
  const { profile } = await requireProfile()
  const supabase = await createClient()

  const [stats7, stats30, stats365, audience, blocksResult, eventsResult] = await Promise.all([
    getLinkClickStats(profile.id, 7),
    getLinkClickStats(profile.id, 30),
    getLinkClickStats(profile.id, 365),
    getAudienceBreakdown(),
    supabase
      .from('page_blocks')
      .select('id, block_type')
      .eq('profile_id', profile.id),
    supabase
      .from('events')
      .select('id, title, starts_at, status, ticket_price')
      .eq('creator_id', profile.id)
      .order('starts_at', { ascending: false }),
  ])

  const blocks = blocksResult.data ?? []
  const events = eventsResult.data ?? []
  const eventIds = events.map((e) => e.id)

  const { data: rsvpRows } = eventIds.length > 0
    ? await supabase
        .from('rsvps')
        .select('event_id, amount_paid')
        .in('event_id', eventIds)
        .eq('payment_status', 'captured')
    : { data: [] as { event_id: string; amount_paid: number | null }[] }

  // Aggregate RSVPs + revenue per event
  const rsvpByEvent: Record<string, { count: number; revenue: number }> = {}
  for (const r of rsvpRows ?? []) {
    if (!rsvpByEvent[r.event_id]) rsvpByEvent[r.event_id] = { count: 0, revenue: 0 }
    rsvpByEvent[r.event_id].count++
    rsvpByEvent[r.event_id].revenue += r.amount_paid ?? 0
  }

  const eventStats = events.map((e) => ({
    id:           e.id,
    title:        e.title,
    starts_at:    e.starts_at,
    status:       e.status as string,
    rsvpCount:    rsvpByEvent[e.id]?.count ?? 0,
    revenuePaise: rsvpByEvent[e.id]?.revenue ?? 0,
  }))

  const citySlug   = profile.city.toLowerCase().replace(/\s+/g, '-')
  const profilePath = profile.creator_type === 'business_brand'
    ? `/${citySlug}/${profile.username}`
    : `/${profile.username}`

  return (
    <Suspense>
      <AnalyticsClient
        stats7={stats7}
        stats30={stats30}
        stats365={stats365}
        blocks={blocks}
        username={profile.username ?? ''}
        profilePath={profilePath}
        eventStats={eventStats}
        audience={audience}
      />
    </Suspense>
  )
}
