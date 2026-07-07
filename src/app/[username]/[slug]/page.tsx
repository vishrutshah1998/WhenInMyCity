import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getAddaPublicPage } from '@/app/actions/venue'
import { getBrandPublicPage } from '@/app/actions/persona-complete'
import { getCreatorPosts, type CreatorPostWithReactions } from '@/app/actions/posts'
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
  const addaResult = await getAddaPublicPage(slug)
  if (!('error' in addaResult) && normalizeCity(addaResult.adda.city) === normalizeCity(city)) {
    const { adda } = addaResult
    const typeLabel = adda.adda_type[0]?.replace(/_/g, ' ') ?? 'venue'
    return {
      title: `${adda.name} — ${adda.city} ${typeLabel} | When In My City`,
      description:
        adda.description ??
        `${adda.name} is a ${typeLabel} in ${adda.neighbourhood ?? adda.city}. Book this space on When In My City.`,
      openGraph: {
        title: `${adda.name} — ${adda.city}`,
        description: adda.description ?? `${typeLabel} in ${adda.city}`,
        images: adda.cover_image_url ? [{ url: adda.cover_image_url }] : [],
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

  // 1. Try venue/adda
  const addaResult = await getAddaPublicPage(slug)
  if (!('error' in addaResult) && normalizeCity(addaResult.adda.city) === normalizeCity(city)) {
    return (
      <VenueCityPage
        adda={addaResult.adda}
        upcomingEvents={addaResult.upcomingEvents}
        pastEvents={addaResult.pastEvents}
        stats={addaResult.stats}
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
