import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import ExploreClient, {
  type ExploreEvent,
  type ExploreCreator,
  type ExploreVenue,
  type SubscribedPost,
} from './ExploreClient'

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; city?: string; when?: string }>
}) {
  const admin      = createAdminClient()
  const userClient = await createClient()

  const sp = await searchParams
  const tab  = sp.tab  ?? 'all'
  const city = sp.city ?? 'Ahmedabad'
  const when = sp.when ?? 'all'

  const now     = new Date()
  const nowIso  = now.toISOString()
  const eventsLimit = tab === 'events' ? 8 : 4

  // Date-range boundaries for the TONIGHT / WEEKEND / THIS WEEK filters, computed
  // in IST (Asia/Kolkata) since events are India-only — the server clock is UTC.
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
  const istNow = new Date(now.getTime() + IST_OFFSET_MS)
  const startOfTodayUTC = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate()) - IST_OFFSET_MS)
  const startOfTomorrowUTC = new Date(startOfTodayUTC.getTime() + 86400000)
  const dow = new Date(startOfTodayUTC.getTime() + IST_OFFSET_MS).getUTCDay() // 0=Sun..6=Sat, IST calendar day
  // "Weekend" = Sat+Sun of the current/upcoming weekend; if today is already Sat/Sun, start is today.
  const daysToWeekendStart = dow === 0 ? -1 : (6 - dow) % 7
  const startOfWeekendUTC = new Date(startOfTodayUTC.getTime() + daysToWeekendStart * 86400000)
  const endOfWeekendUTC   = new Date(startOfWeekendUTC.getTime() + 2 * 86400000)
  // "This week" runs through the end of the current ISO week (Sunday night IST).
  const daysUntilNextMonday = ((8 - dow) % 7) || 7
  const endOfWeekUTC = new Date(startOfTodayUTC.getTime() + daysUntilNextMonday * 86400000)

  let eventsQuery = admin
    .from('events')
    .select(
      'id, title, starts_at, ticket_price, capacity, slug, venue_name, creator_id, creator:user_profiles!inner(display_name, username, creator_type, city)',
    )
    .eq('status', 'published')
    .gt('starts_at', nowIso)
    .ilike('creator.city', city)
    .order('starts_at', { ascending: true })
    .limit(80)

  if (when === 'tonight') {
    eventsQuery = eventsQuery.lt('starts_at', startOfTomorrowUTC.toISOString())
  } else if (when === 'weekend') {
    eventsQuery = eventsQuery
      .gte('starts_at', startOfWeekendUTC.toISOString())
      .lt('starts_at', endOfWeekendUTC.toISOString())
  } else if (when === 'week') {
    eventsQuery = eventsQuery.lt('starts_at', endOfWeekUTC.toISOString())
  }

  const countBase = () =>
    admin
      .from('events')
      .select('id, creator:user_profiles!inner(city)', { count: 'exact', head: true })
      .eq('status', 'published')
      .gt('starts_at', nowIso)
      .ilike('creator.city', city)

  const [eventsRes, creatorsRes, venuesRes, tonightCountRes, weekendCountRes, weekCountRes, allCountRes] = await Promise.all([
    eventsQuery,

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

    countBase().lt('starts_at', startOfTomorrowUTC.toISOString()),
    countBase().gte('starts_at', startOfWeekendUTC.toISOString()).lt('starts_at', endOfWeekendUTC.toISOString()),
    countBase().lt('starts_at', endOfWeekUTC.toISOString()),
    countBase(),
  ])

  const eventCounts = {
    tonight: tonightCountRes.count ?? 0,
    weekend: weekendCountRes.count ?? 0,
    week:    weekCountRes.count ?? 0,
    all:     allCountRes.count ?? 0,
  }

  type RawEvent = {
    id: string
    title: string
    starts_at: string
    ticket_price: number
    capacity: number | null
    slug: string
    venue_name: string
    creator_id: string
    creator: { display_name: string; username: string; creator_type: string; city: string } | null
  }

  type RawCreator = {
    id: string
    display_name: string
    username: string
    creator_type: string
    sub_types: string[]
    city: string
  }

  type RawVenue = {
    id: string
    name: string
    slug: string
    neighbourhood: string | null
    city: string
    venue_type: string[]
    capacity_max: number | null
    is_verified: boolean
  }

  const rawEvents = ((eventsRes.data ?? []) as unknown as RawEvent[]).slice(0, eventsLimit)

  const events: ExploreEvent[] = rawEvents.map(e => ({
    id:           e.id,
    title:        e.title,
    starts_at:    e.starts_at,
    ticket_price: e.ticket_price,
    capacity:     e.capacity,
    slug:         e.slug,
    venue_name:   e.venue_name,
    creator:      e.creator ? {
      display_name: e.creator.display_name,
      username:     e.creator.username,
      creator_type: e.creator.creator_type,
      city:         e.creator.city ?? '',
    } : null,
  }))

  const creators: ExploreCreator[] = ((creatorsRes.data ?? []) as unknown as RawCreator[]).map(c => ({
    id:           c.id,
    display_name: c.display_name,
    username:     c.username,
    creator_type: c.creator_type,
    sub_types:    c.sub_types ?? [],
    city:         c.city,
  }))

  const venues: ExploreVenue[] = ((venuesRes.data ?? []) as unknown as RawVenue[]).map(v => ({
    id:           v.id,
    name:         v.name,
    slug:         v.slug,
    neighbourhood: v.neighbourhood,
    city:         v.city,
    venue_type:    v.venue_type ?? [],
    capacity_max: v.capacity_max,
    is_verified:  v.is_verified,
  }))

  // ── Auth + subscribed posts for authenticated users ───────────────────────
  let subscribedPosts:    SubscribedPost[] = []
  let followedCreatorIds: string[]         = []
  let viewerUserId:       string | null    = null

  try {
    const { data: { user } } = await userClient.auth.getUser()
    viewerUserId = user?.id ?? null

    if (user) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = userClient as any

      // Get followed creator IDs
      const { data: followsRaw } = await db
        .from('follows')
        .select('creator_id')
        .eq('follower_id', user.id)

      followedCreatorIds = (followsRaw ?? []).map((f: { creator_id: string }) => f.creator_id)

      if (followedCreatorIds.length > 0) {
        // Fetch recent public posts from followed creators
        const { data: postsRaw } = await db
          .from('creator_posts')
          .select(`
            id, post_type, content, image_url, link_url, link_title, created_at,
            creator:user_profiles!creator_id(display_name, username, creator_type)
          `)
          .in('creator_id', followedCreatorIds)
          .eq('is_subscriber_only', false)
          .order('created_at', { ascending: false })
          .limit(5)

        subscribedPosts = (postsRaw ?? []) as SubscribedPost[]
      }
    }
  } catch {
    // follows / creator_posts tables may not exist yet
  }

  return (
    <ExploreClient
      tab={tab}
      city={city}
      when={when}
      eventCounts={eventCounts}
      events={events}
      creators={creators}
      venues={venues}
      subscribedPosts={subscribedPosts}
      followedCreatorIds={followedCreatorIds}
      viewerUserId={viewerUserId}
    />
  )
}
