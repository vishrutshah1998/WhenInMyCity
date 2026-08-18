import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getEventBySlug } from '@/app/actions/events'
import { getMyRSVPForEvent } from '@/app/actions/rsvp'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import EventPage, { type EventReview } from './event-page'
import CancelledEventNotice from './CancelledEventNotice'

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
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ src?: string }>
}) {
  const { slug } = await params
  const { src } = await searchParams
  const discoverySource = src === 'creator_link' || src === 'platform_discovery' ? src : undefined
  const { event, rsvpCount, spotsLeft } = await getEventBySlug(slug)

  if (!event) notFound()

  const admin = createAdminClient()
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const isAuthenticated = !!session

  if (event.status === 'cancelled') {
    let hadBooking = false
    if (session) {
      const { data: rsvp } = await admin
        .from('rsvps')
        .select('id')
        .eq('event_id', event.id)
        .eq('attendee_user_id', session.user.id)
        .in('payment_status', ['captured', 'refunded', 'refund_failed'])
        .maybeSingle()
      hadBooking = !!rsvp
    }
    return <CancelledEventNotice event={event} hadBooking={hadBooking} />
  }

  const [{ data: creator }, { data: reviewHistory }, { rsvp: myRSVP }, { data: viewerProfile }] = await Promise.all([
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
    session
      ? admin.from('user_profiles').select('display_name').eq('id', session.user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  // Prefill source for the RSVP sheet's Name/Phone fields (authenticated
  // viewers only). Phone comes from the auth user record — the same source
  // already used for prefill elsewhere (getOnboardingStudioBootstrap's
  // `authPhone`) — because `user_profiles.phone` is only populated on the
  // creator onboarding path, not the explorer path, and would be null for
  // most Explorers.
  const viewerName = viewerProfile?.display_name ?? null
  const rawViewerPhone = session?.user.phone ?? null
  const viewerPhoneDigits = rawViewerPhone
    ? (() => {
        const digits = rawViewerPhone.replace(/\D/g, '').slice(-10)
        return /^[6-9]\d{9}$/.test(digits) ? digits : null
      })()
    : null

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
      discoverySource={discoverySource}
      viewerName={viewerName}
      viewerPhoneDigits={viewerPhoneDigits}
    />
  )
}
