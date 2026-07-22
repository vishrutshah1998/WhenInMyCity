import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getVenuePublicPage } from '@/app/actions/venue'
import { getBrandPublicPage } from '@/app/actions/persona-complete'
import { getCreatorPosts, type CreatorPostWithReactions } from '@/app/actions/posts'
import { getSubstackPosts } from '@/app/actions/blocks'
import type { SubstackPost } from '@/lib/validators/blocks'
import { getPublicTestimonials } from '@/app/actions/explorer'
import { getPastEventsWithAttendance } from '@/app/actions/events'
import { getBookingCapacityStatus, type BookingCapacityStatus } from '@/app/actions/booking'
import type { BookingRequestConfig } from '@/types/database'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveTheme } from '@/types/theme'
import { cityToSlug } from '@/lib/profile-url'
import type { Event, PageBlock } from '@/types/database'
import VenueCityPage from './VenueCityPage'
import BrandCityPage from './BrandCityPage'
import PublicProfilePage from '@/components/profile/PublicProfilePage'
import ExplorerPublicProfile from '@/components/profile/ExplorerPublicProfile'

function normalizeCity(raw: string): string {
  return raw.toLowerCase().replace(/-/g, ' ').trim()
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string; slug: string }>
}): Promise<Metadata> {
  const { slug, username: city } = await params

  // Try venue first
  const venueResult = await getVenuePublicPage(slug)
  if (!('error' in venueResult) && normalizeCity(venueResult.venue.city) === normalizeCity(city)) {
    const { venue } = venueResult
    const typeLabel = venue.venue_type[0]?.replace(/_/g, ' ') ?? 'venue'
    return {
      title: `${venue.name} — ${venue.city} ${typeLabel} | When In My City`,
      description:
        venue.description ??
        `${venue.name} is a ${typeLabel} in ${venue.neighbourhood ?? venue.city}. Book this space on When In My City.`,
      openGraph: {
        title: `${venue.name} — ${venue.city}`,
        description: venue.description ?? `${typeLabel} in ${venue.city}`,
        images: venue.cover_image_url ? [{ url: venue.cover_image_url }] : [],
      },
    }
  }

  // Try brand
  const brandResult = await getBrandPublicPage(city, slug)
  if (!('error' in brandResult)) {
    const { brand } = brandResult
    const catLabel = brand.business_categories?.[0] ?? 'brand'
    return {
      title: `${brand.display_name} — ${brand.city} ${catLabel} | When In My City`,
      description:
        brand.bio ??
        `${brand.display_name} is a ${catLabel} brand in ${brand.city}.`,
      openGraph: {
        title: `${brand.display_name} — ${brand.city}`,
        description: brand.bio ?? `${catLabel} brand in ${brand.city}`,
        images: brand.avatar_url ? [{ url: brand.avatar_url }] : [],
      },
    }
  }

  // Try creator profile at /{city}/{username}
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('display_name, bio, avatar_url, username, city')
    .eq('username', slug)
    .maybeSingle()

  if (profile) {
    const canonical = `https://www.wheninmycity.com/${cityToSlug(profile.city)}/${profile.username}`
    return {
      title:       `${profile.display_name} (@${profile.username}) — When In My City`,
      description: profile.bio ?? `Check out ${profile.display_name}'s page on WIMC`,
      alternates:  { canonical },
      openGraph: {
        title:       `${profile.display_name} on WIMC`,
        description: profile.bio ?? undefined,
        images:      profile.avatar_url ? [{ url: profile.avatar_url }] : [],
        url:         canonical,
      },
    }
  }

  return { title: 'Not found — When In My City' }
}

export default async function CitySlugPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string; slug: string }>
  searchParams: Promise<{ src?: string }>
}) {
  const { username: city, slug } = await params
  const { src } = await searchParams
  const discoverySource = src === 'platform_discovery' ? 'platform_discovery' as const : 'creator_link' as const

  // 1. Try venue/venue
  const venueResult = await getVenuePublicPage(slug)
  if (!('error' in venueResult) && normalizeCity(venueResult.venue.city) === normalizeCity(city)) {
    return (
      <VenueCityPage
        venue={venueResult.venue}
        upcomingEvents={venueResult.upcomingEvents}
        pastEvents={venueResult.pastEvents}
        stats={venueResult.stats}
      />
    )
  }

  // 2. Try brand profile
  const brandResult = await getBrandPublicPage(city, slug)
  if (!('error' in brandResult)) {
    const { brand } = brandResult
    const admin = createAdminClient()
    const { data: brandBlocks } = await admin
      .from('page_blocks')
      .select('*')
      .eq('profile_id', brand.id)
      .eq('is_visible', true)
      .order('position')
    const brandTheme = resolveTheme(brand.page_theme, {
      creatorType:        brand.creator_type,
      businessCategories: brand.business_categories,
    })
    return (
      <BrandCityPage
        brand={brand}
        blocks={(brandBlocks ?? []) as PageBlock[]}
        pageTheme={brandTheme}
      />
    )
  }

  // 3. Try creator profile at /{city}/{username}
  const supabase = await createClient()
  const { data: { user: sessionUser } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('username', slug)
    .maybeSingle()

  if (profile) {
    // Redirect to canonical city slug if the URL doesn't match
    const canonicalCitySlug = cityToSlug(profile.city)
    if (city !== canonicalCitySlug) {
      redirect(`/${canonicalCitySlug}/${profile.username}`)
    }

    const isOwner = sessionUser?.id === profile.id

    const [{ data: upcomingRaw }, { data: blocksRaw }] = await Promise.all([
      supabase
        .from('events')
        .select('*')
        .eq('creator_id', profile.id)
        .eq('status', 'published')
        .gte('starts_at', new Date().toISOString())
        .order('starts_at')
        .limit(6),
      supabase
        .from('page_blocks')
        .select('*')
        .eq('profile_id', profile.id)
        .eq('is_visible', true)
        .order('position'),
    ])

    const blockTypesPresent = new Set((blocksRaw ?? []).map((b) => b.block_type))

    let substackPosts: Record<string, SubstackPost[]> = {}
    if (blockTypesPresent.has('substack_preview')) {
      const publicationUrls = Array.from(new Set(
        (blocksRaw ?? [])
          .filter((b) => b.block_type === 'substack_preview')
          .map((b) => (b.config as { publication_url?: string }).publication_url)
          .filter((url): url is string => !!url)
      ))
      const postsByUrl = await Promise.all(publicationUrls.map((url) => getSubstackPosts(url)))
      substackPosts = Object.fromEntries(publicationUrls.map((url, i) => [url, postsByUrl[i]]))
    }

    // instagram_embed/instagram_post/instagram_feed all render client-side via
    // self-fetching components (InstagramEmbedWidget / InstagramFeedPreview) —
    // no server-side data needed for any of them.

    const testimonials = blockTypesPresent.has('testimonial')
      ? await getPublicTestimonials(profile.id)
      : []

    const pastEventsWithAttendance = blockTypesPresent.has('past_events_gallery')
      ? await getPastEventsWithAttendance(profile.id)
      : []

    let bookingCapacity: BookingCapacityStatus | null = null
    if (blockTypesPresent.has('booking_request')) {
      const bookingBlock = (blocksRaw ?? []).find((b) => b.block_type === 'booking_request')
      if (bookingBlock) {
        bookingCapacity = await getBookingCapacityStatus(profile.id, bookingBlock.config as unknown as BookingRequestConfig)
      }
    }

    let shopTheLookProducts: Record<string, { title: string; price_paise: number; cover_image_url?: string | null }> = {}
    if (blockTypesPresent.has('shop_the_look')) {
      const internalIds = Array.from(new Set(
        (blocksRaw ?? [])
          .filter((b) => b.block_type === 'shop_the_look')
          .flatMap((b) => (b.config as { items?: Array<{ link_type: string; internal_block_id?: string }> }).items ?? [])
          .filter((item) => item.link_type === 'internal_product' && item.internal_block_id)
          .map((item) => item.internal_block_id as string)
      ))
      if (internalIds.length > 0) {
        const { data: productBlocks } = await supabase
          .from('page_blocks')
          .select('id, config')
          .eq('block_type', 'digital_product')
          .eq('is_visible', true)
          .in('id', internalIds)
        shopTheLookProducts = Object.fromEntries(
          (productBlocks ?? []).map((b) => {
            const pc = b.config as { title?: string; price_paise?: number; cover_image_url?: string }
            return [b.id, { title: pc.title ?? 'Digital Product', price_paise: pc.price_paise ?? 0, cover_image_url: pc.cover_image_url ?? null }]
          })
        )
      }
    }

    let venueData: Record<string, { id: string; name: string; address: string; city: string; cover_image_url: string | null; slug: string }> = {}
    if (blockTypesPresent.has('venue_partnership')) {
      const venueIds = Array.from(new Set(
        (blocksRaw ?? [])
          .filter((b) => b.block_type === 'venue_partnership')
          .flatMap((b) => (b.config as { venue_ids?: string[] }).venue_ids ?? [])
      ))
      if (venueIds.length > 0) {
        const { data: venueRows } = await supabase
          .from('venue_profiles')
          .select('id, name, address, city, cover_image_url, slug')
          .in('id', venueIds)
        venueData = Object.fromEntries((venueRows ?? []).map((v) => [v.id, v]))
      }
    }

    let isFollowing = false
    let posts: CreatorPostWithReactions[] = []

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tb = (supabase as any).from('follows')
      if (sessionUser && !isOwner) {
        const { data: followRow } = await tb
          .select('id')
          .eq('follower_id', sessionUser.id)
          .eq('creator_id', profile.id)
          .maybeSingle()
        isFollowing = !!followRow
      }
    } catch {
      // follows table not yet created in this environment
    }

    try {
      const allPosts = await getCreatorPosts(profile.id, sessionUser?.id ?? null)
      posts = allPosts.filter((p) => !p.is_subscriber_only || isFollowing || isOwner)
    } catch {
      // Table may not exist yet in this environment
    }

    const upcomingEvents: Event[]     = upcomingRaw ?? []
    const blocks:         PageBlock[] = (blocksRaw ?? []) as PageBlock[]
    const theme = resolveTheme(profile.page_theme, {
      creatorType:        profile.creator_type,
      explorerScene:      profile.explorer_scene,
      businessCategories: profile.business_categories,
    })

    // Explorer profile — different public page
    if (profile.user_role === 'explorer') {
      const admin = createAdminClient()

      type ExplorerRow = {
        id: string
        interest_tags: string[]
        preferred_formats: string[]
        total_events_attended: number
        followed_maker_ids: string[]
        explorer_score: number
      }
      const { data: explorerRow } = await admin
        .from('explorer_profiles')
        .select('id, interest_tags, preferred_formats, total_events_attended, followed_maker_ids, explorer_score')
        .eq('auth_user_id', profile.id)
        .maybeSingle() as { data: ExplorerRow | null }

      type AttendedEvent = { id: string; title: string; venue_name: string; starts_at: string; slug: string; rating: number | null }
      let attendedEvents: AttendedEvent[] = []
      let followedCreators: Array<{ id: string; display_name: string; username: string; creator_type: string; city: string; avatar_url: string | null }> = []

      if (explorerRow) {
        const [historyRes, creatorsRes] = await Promise.all([
          admin
            .from('explorer_event_history')
            .select('rating, events(id, title, venue_name, starts_at, slug)')
            .eq('explorer_id', explorerRow.id)
            .eq('attended', true)
            .order('created_at', { ascending: false })
            .limit(20),
          explorerRow.followed_maker_ids.length
            ? admin
                .from('user_profiles')
                .select('id, display_name, username, creator_type, city, avatar_url')
                .in('id', explorerRow.followed_maker_ids)
                .limit(12)
            : Promise.resolve({ data: [] }),
        ])

        type HistoryRow = { rating: number | null; events: { id: string; title: string; venue_name: string; starts_at: string; slug: string } | null }
        for (const row of ((historyRes.data ?? []) as HistoryRow[])) {
          if (row.events) attendedEvents.push({ ...row.events, rating: row.rating })
        }
        followedCreators = (creatorsRes.data ?? []) as typeof followedCreators
      }

      return (
        <ExplorerPublicProfile
          profile={profile}
          explorerData={explorerRow ?? { interest_tags: [], preferred_formats: [], total_events_attended: 0, followed_maker_ids: [], explorer_score: 0 }}
          attendedEvents={attendedEvents}
          followedCreators={followedCreators}
          isOwner={isOwner}
        />
      )
    }

    return (
      <PublicProfilePage
        profile={profile}
        blocks={blocks}
        upcomingEvents={upcomingEvents}
        calendarEvents={upcomingEvents}
        pastEvents={pastEventsWithAttendance}
        testimonials={testimonials}
        substackPosts={substackPosts}
        bookingCapacity={bookingCapacity}
        shopTheLookProducts={shopTheLookProducts}
        venueData={venueData}
        theme={theme}
        isFollowing={isFollowing}
        isOwner={isOwner}
        viewerIsExplorer={!isOwner && !!sessionUser}
        posts={posts}
        viewerUserId={sessionUser?.id ?? null}
        discoverySource={discoverySource}
      />
    )
  }

  notFound()
}
