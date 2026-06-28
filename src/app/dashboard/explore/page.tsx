import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import ExploreClient, {
  type ExploreEvent,
  type ExploreCreator,
  type ExploreVenue,
  type SubscribedPost,
} from '@/app/explore/ExploreClient'

export default async function DashboardExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; city?: string }>
}) {
  const admin      = createAdminClient()
  const userClient = await createClient()

  const sp   = await searchParams
  const tab  = sp.tab  ?? 'all'
  const city = sp.city ?? 'Ahmedabad'

  const now         = new Date().toISOString()
  const eventsLimit = tab === 'events' ? 8 : 4

  const [eventsRes, creatorsRes, venuesRes] = await Promise.all([
    admin
      .from('events')
      .select(
        'id, title, starts_at, ticket_price, capacity, slug, venue_name, creator_id, creator:user_profiles(display_name, username, creator_type, city)',
      )
      .eq('status', 'published')
      .gt('starts_at', now)
      .order('starts_at', { ascending: true })
      .limit(80),

    admin
      .from('user_profiles')
      .select('id, display_name, username, creator_type, sub_types, city')
      .not('creator_type', 'in', '("business_brand","exploring")')
      .eq('city', city)
      .limit(8),

    admin
      .from('adda_profiles')
      .select('id, name, slug, neighbourhood, city, adda_type, capacity_max, is_verified')
      .eq('city', city)
      .eq('is_active', true)
      .limit(6),
  ])

  type RawEvent = {
    id: string; title: string; starts_at: string; ticket_price: number
    capacity: number | null; slug: string; venue_name: string; creator_id: string
    creator: { display_name: string; username: string; creator_type: string; city: string } | null
  }
  type RawCreator = { id: string; display_name: string; username: string; creator_type: string; sub_types: string[]; city: string }
  type RawVenue   = { id: string; name: string; slug: string; neighbourhood: string | null; city: string; adda_type: string[]; capacity_max: number | null; is_verified: boolean }

  const rawEvents = ((eventsRes.data ?? []) as unknown as RawEvent[])
    .filter(e => !city || e.creator?.city?.toLowerCase() === city.toLowerCase())
    .slice(0, eventsLimit)

  const events: ExploreEvent[] = rawEvents.map(e => ({
    id: e.id, title: e.title, starts_at: e.starts_at, ticket_price: e.ticket_price,
    capacity: e.capacity, slug: e.slug, venue_name: e.venue_name,
    creator: e.creator ? { display_name: e.creator.display_name, username: e.creator.username, creator_type: e.creator.creator_type, city: e.creator.city ?? '' } : null,
  }))

  const creators: ExploreCreator[] = ((creatorsRes.data ?? []) as unknown as RawCreator[]).map(c => ({
    id: c.id, display_name: c.display_name, username: c.username,
    creator_type: c.creator_type, sub_types: c.sub_types ?? [], city: c.city,
  }))

  const venues: ExploreVenue[] = ((venuesRes.data ?? []) as unknown as RawVenue[]).map(v => ({
    id: v.id, name: v.name, slug: v.slug, neighbourhood: v.neighbourhood, city: v.city,
    adda_type: v.adda_type ?? [], capacity_max: v.capacity_max, is_verified: v.is_verified,
  }))

  let subscribedPosts: SubscribedPost[] = []
  let followedCreatorIds: string[]      = []
  let viewerUserId: string | null       = null

  try {
    const { data: { user } } = await userClient.auth.getUser()
    viewerUserId = user?.id ?? null

    if (user) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = userClient as any
      const { data: followsRaw } = await db.from('follows').select('creator_id').eq('follower_id', user.id)
      followedCreatorIds = (followsRaw ?? []).map((f: { creator_id: string }) => f.creator_id)

      if (followedCreatorIds.length > 0) {
        const { data: postsRaw } = await db
          .from('creator_posts')
          .select('id, post_type, content, image_url, link_url, link_title, created_at, creator:user_profiles!creator_id(display_name, username, creator_type)')
          .in('creator_id', followedCreatorIds)
          .eq('is_subscriber_only', false)
          .order('created_at', { ascending: false })
          .limit(5)
        subscribedPosts = (postsRaw ?? []) as SubscribedPost[]
      }
    }
  } catch {
    // Optional tables may not exist yet
  }

  return (
    <ExploreClient
      tab={tab}
      city={city}
      events={events}
      creators={creators}
      venues={venues}
      subscribedPosts={subscribedPosts}
      followedCreatorIds={followedCreatorIds}
      viewerUserId={viewerUserId}
      inDashboard
    />
  )
}
