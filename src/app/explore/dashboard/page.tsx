import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getCityAttractions } from '@/app/actions/cityGuide'
import ExploreClient, {
  type ExploreEvent,
  type ExploreCreator,
  type ExploreVenue,
  type SubscribedPost,
} from '@/app/explore/ExploreClient'
import ExplorerMapPanel from './ExplorerMapPanel'
import ExplorerCarousel from './ExplorerCarousel'
import CommunitiesComingSoon from '@/components/explore/CommunitiesComingSoon'

// Explorer's dashboard root — a swipe-based 3-page carousel (Map / Home /
// Communities) on mobile, replacing the old ExplorerTabStrip + this page's
// former redirect-to-settings placeholder. Desktop keeps a plain feed view
// (ExplorerSidebar already covers Map/Communities-equivalent nav there, so a
// swipe carousel doesn't make sense with a mouse).
//
// "Home" content mirrors /explore/dashboard/browse/page.tsx's data fetch
// exactly — that route is Explorer's existing dashboard/discovery feed.
export default async function ExplorerDashboardIndexPage({
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

  const [eventsRes, creatorsRes, venuesRes, attractions] = await Promise.all([
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
      .from('venue_profiles')
      .select('id, name, slug, neighbourhood, city, venue_type, capacity_max, is_verified')
      .eq('city', city)
      .eq('is_active', true)
      .limit(6),

    getCityAttractions(),
  ])

  type RawEvent = {
    id: string; title: string; starts_at: string; ticket_price: number
    capacity: number | null; slug: string; venue_name: string; creator_id: string
    creator: { display_name: string; username: string; creator_type: string; city: string } | null
  }
  type RawCreator = { id: string; display_name: string; username: string; creator_type: string; sub_types: string[]; city: string }
  type RawVenue   = { id: string; name: string; slug: string; neighbourhood: string | null; city: string; venue_type: string[]; capacity_max: number | null; is_verified: boolean }

  const rawEvents = ((eventsRes.data ?? []) as unknown as RawEvent[])
    .filter(e => !city || e.creator?.city?.toLowerCase() === city.toLowerCase())
    .slice(0, eventsLimit)

  const events: ExploreEvent[] = rawEvents.map(e => ({
    id: e.id, title: e.title, starts_at: e.starts_at, ticket_price: e.ticket_price,
    capacity: e.capacity, slug: e.slug, venue_name: e.venue_name,
    creator: e.creator ? {
      display_name: e.creator.display_name,
      username:     e.creator.username,
      creator_type: e.creator.creator_type,
      city:         e.creator.city ?? '',
    } : null,
  }))

  const creators: ExploreCreator[] = ((creatorsRes.data ?? []) as unknown as RawCreator[]).map(c => ({
    id: c.id, display_name: c.display_name, username: c.username,
    creator_type: c.creator_type, sub_types: c.sub_types ?? [], city: c.city,
  }))

  const venues: ExploreVenue[] = ((venuesRes.data ?? []) as unknown as RawVenue[]).map(v => ({
    id: v.id, name: v.name, slug: v.slug, neighbourhood: v.neighbourhood, city: v.city,
    venue_type: v.venue_type ?? [], capacity_max: v.capacity_max, is_verified: v.is_verified,
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

  const homeContent = (
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
      basePath="/explore/dashboard/browse"
    />
  )

  return (
    <>
      <div className="lg:hidden">
        <ExplorerCarousel
          mapSlot={<ExplorerMapPanel attractions={attractions} />}
          homeSlot={homeContent}
          communitiesSlot={
            <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 24px 80px' }}>
              <CommunitiesComingSoon />
            </div>
          }
        />
      </div>
      <div className="hidden lg:block">
        {homeContent}
      </div>
    </>
  )
}
