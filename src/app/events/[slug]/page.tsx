import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getEventBySlug } from '@/app/actions/events'
import { getMyRSVPForEvent } from '@/app/actions/rsvp'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import EventPage, { type EventReview } from './event-page'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const { event } = await getEventBySlug(slug)

  if (!event) return { title: 'Event not found — WIMC' }

  return {
    title: `${event.title} — When In My City`,
    description: event.description ?? `${event.title} at ${event.venue_name}`,
    openGraph: {
      title: event.title,
      description: event.description ?? `${event.title} at ${event.venue_name}`,
      images: event.cover_image_url ? [{ url: event.cover_image_url }] : [],
    },
  }
}

export default async function EventSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { event, rsvpCount, spotsLeft } = await getEventBySlug(slug)

  if (!event) notFound()

  const admin = createAdminClient()
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const isAuthenticated = !!session

  const [{ data: creator }, { data: reviewHistory }, { rsvp: myRSVP }] = await Promise.all([
    admin
      .from('user_profiles')
      .select('display_name, avatar_url, username, city, creator_type, is_verified, user_tier, lantern_since, beacon_since, tier_recovery_until')
      .eq('id', event.creator_id)
      .maybeSingle(),
    admin
      .from('explorer_event_history')
      .select('rating, review, rated_at, explorer_id')
      .eq('event_id', event.id)
      .not('rating', 'is', null)
      .order('rated_at', { ascending: false })
      .limit(20),
    getMyRSVPForEvent(event.id),
  ])

  // Hydrate reviewer display names in a single batch query.
  let reviews: EventReview[] = []
  if (reviewHistory?.length) {
    const explorerIds = reviewHistory.map((r) => r.explorer_id)
    const { data: explorers } = await admin
      .from('explorer_profiles')
      .select('id, display_name')
      .in('id', explorerIds)

    const explorerMap = Object.fromEntries((explorers ?? []).map((e) => [e.id, e.display_name]))
    reviews = reviewHistory
      .filter((r): r is typeof r & { rating: number } => r.rating !== null)
      .map((r) => ({
        rating:         r.rating,
        review:         r.review,
        rated_at:       r.rated_at,
        reviewer_name:  explorerMap[r.explorer_id] ?? 'Anonymous',
      }))
  }

  return (
    <EventPage
      event={event}
      rsvpCount={rsvpCount}
      spotsLeft={spotsLeft}
      creator={creator ?? null}
      reviews={reviews}
      myRSVP={myRSVP}
      isAuthenticated={isAuthenticated}
    />
  )
}
