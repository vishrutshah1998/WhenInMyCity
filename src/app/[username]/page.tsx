import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import PublicProfilePage from '@/components/profile/PublicProfilePage'
import { fetchInstagramThumbnail } from '@/lib/instagram'
import type { Event, EventListingConfig, InstagramEmbedConfig } from '@/types/database'
import type { PublicTestimonial } from '@/components/profile/PublicProfilePage'
import { resolveTheme } from '@/types/theme'
import { requireAuth } from '@/lib/auth/requireAuth'
import { getSubstackPosts } from '@/app/actions/blocks'
import type { SubstackPost } from '@/lib/validators/blocks'
import { getCityMasteryMap } from '@/app/actions/analytics'
import type { MasteryNeighbourhood } from '@/app/actions/analytics'

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>
}): Promise<Metadata> {
  const { username } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('display_name, bio, avatar_url, username')
    .eq('username', username)
    .maybeSingle()

  if (!profile) return { title: 'Profile not found — WIMC' }

  return {
    title: `${profile.display_name} (@${profile.username}) — When In My City`,
    description: profile.bio ?? `Check out ${profile.display_name}'s page on WIMC`,
    openGraph: {
      title: `${profile.display_name} on WIMC`,
      description: profile.bio ?? undefined,
      images: profile.avatar_url ? [{ url: profile.avatar_url }] : [],
    },
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function UsernamePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const supabase = await createClient()

  // Fetch profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('username', username)
    .maybeSingle()

  if (!profile) notFound()

  // Fetch visible blocks in display order
  const { data: blocks } = await supabase
    .from('page_blocks')
    .select('*')
    .eq('profile_id', profile.id)
    .eq('is_visible', true)
    .order('position')

  const visibleBlocks = blocks ?? []

  // ── event_listing ─────────────────────────────────────────────────────────
  const hasEventListing = visibleBlocks.some((b) => b.block_type === 'event_listing')
  let upcomingEvents: Event[] = []

  if (hasEventListing) {
    const explicitIds = visibleBlocks
      .filter((b) => b.block_type === 'event_listing')
      .flatMap((b) => (b.config as EventListingConfig).event_ids ?? [])

    const maxItems = visibleBlocks
      .filter((b) => b.block_type === 'event_listing')
      .reduce((max, b) => Math.max(max, (b.config as EventListingConfig).max_items ?? 3), 3)

    if (explicitIds.length > 0) {
      const { data } = await supabase
        .from('events')
        .select('*')
        .in('id', explicitIds)
        .eq('status', 'published')
        .order('starts_at')
      upcomingEvents = data ?? []
    } else {
      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('creator_id', profile.id)
        .eq('status', 'published')
        .gte('starts_at', new Date().toISOString())
        .order('starts_at')
        .limit(maxItems)
      upcomingEvents = data ?? []
    }
  }

  // ── event_calendar ────────────────────────────────────────────────────────
  const hasEventCalendar = visibleBlocks.some((b) => b.block_type === 'event_calendar')
  let calendarEvents: Event[] = []
  if (hasEventCalendar && upcomingEvents.length === 0) {
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('creator_id', profile.id)
      .eq('status', 'published')
      .gte('starts_at', new Date().toISOString())
      .order('starts_at')
      .limit(20)
    calendarEvents = data ?? []
  } else if (hasEventCalendar) {
    calendarEvents = upcomingEvents
  }

  // ── past_events_gallery ───────────────────────────────────────────────────
  const pastEventsBlock = visibleBlocks.find((b) => b.block_type === 'past_events_gallery')
  let pastEvents: Event[] = []
  if (pastEventsBlock) {
    const cfg = pastEventsBlock.config as { max_events?: number }
    const limit = cfg.max_events ?? 6
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('creator_id', profile.id)
      .eq('status', 'completed')
      .order('starts_at', { ascending: false })
      .limit(limit)
    pastEvents = data ?? []
  }

  // ── event_series ──────────────────────────────────────────────────────────
  const seriesBlocks = visibleBlocks.filter((b) => b.block_type === 'event_series')
  let seriesEvents: Event[] = []
  if (seriesBlocks.length > 0) {
    const allLinkedIds = seriesBlocks.flatMap(
      (b) => ((b.config as { linked_event_ids?: string[] }).linked_event_ids) ?? []
    )
    if (allLinkedIds.length > 0) {
      const { data } = await supabase
        .from('events')
        .select('*')
        .in('id', allLinkedIds)
      seriesEvents = data ?? []
    }
  }

  // ── instagram_embed thumbnails ─────────────────────────────────────────────
  const instagramBlocks = visibleBlocks.filter(
    (b) => b.block_type === 'instagram_embed' || b.block_type === 'instagram_post'
  )
  const instagramThumbnails: Record<string, string> = {}
  await Promise.all(
    instagramBlocks.map(async (b) => {
      const cfg = b.config as unknown as InstagramEmbedConfig
      if (cfg.post_url) {
        const thumb = await fetchInstagramThumbnail(cfg.post_url)
        if (thumb) instagramThumbnails[cfg.post_url] = thumb
      }
    })
  )

  // ── testimonial ────────────────────────────────────────────────────────────
  const hasTestimonialBlock = visibleBlocks.some((b) => b.block_type === 'testimonial')
  let testimonials: PublicTestimonial[] = []

  if (hasTestimonialBlock) {
    const admin = createAdminClient()
    const { data: eventIds } = await admin
      .from('events')
      .select('id')
      .eq('creator_id', profile.id)

    if (eventIds?.length) {
      const ids = eventIds.map((e) => e.id)
      const { data: histories } = await admin
        .from('explorer_event_history')
        .select('rating, review, explorer_id')
        .in('event_id', ids)
        .not('rating', 'is', null)
        .not('review', 'is', null)
        .gte('rating', 4)
        .order('rating', { ascending: false })
        .limit(6)

      if (histories?.length) {
        const explorerIds = histories.map((h) => h.explorer_id)
        const { data: explorers } = await admin
          .from('explorer_profiles')
          .select('id, display_name')
          .in('id', explorerIds)

        const nameMap = Object.fromEntries((explorers ?? []).map((e) => [e.id, e.display_name]))
        testimonials = histories
          .filter((h): h is typeof h & { rating: number; review: string } => h.rating !== null && h.review !== null)
          .map((h) => ({
            rating:        h.rating,
            review:        h.review,
            reviewer_name: nameMap[h.explorer_id] ?? 'Anonymous',
          }))
      }
    }
  }

  // ── substack_preview ──────────────────────────────────────────────────────
  const substackBlocks = visibleBlocks.filter((b) => b.block_type === 'substack_preview')
  const substackPosts: Record<string, SubstackPost[]> = {}
  await Promise.all(
    substackBlocks.map(async (b) => {
      const cfg = b.config as { publication_url?: string }
      if (cfg.publication_url) {
        const posts = await getSubstackPosts(cfg.publication_url)
        if (posts.length > 0) substackPosts[cfg.publication_url] = posts
      }
    })
  )

  // ── support_tip — decrypt UPI VPA ─────────────────────────────────────────
  const hasSupportTip = visibleBlocks.some((b) => b.block_type === 'support_tip')
  let decryptedUpiVpa: string | null = null
  if (hasSupportTip) {
    try {
      const admin = createAdminClient()
      const { data } = await admin.rpc('get_decrypted_upi_vpa', { p_profile_id: profile.id })
      decryptedUpiVpa = data ?? null
    } catch {
      // UPI VPA unavailable — tip block will be hidden.
    }
  }

  // ── venue_partnership — fetch adda profile summaries ──────────────────────
  const venuePartnershipBlocks = visibleBlocks.filter((b) => b.block_type === 'venue_partnership')
  type VenueSummary = { id: string; name: string; address: string; city: string; cover_image_url: string | null; slug: string }
  const venueData: Record<string, VenueSummary> = {}
  if (venuePartnershipBlocks.length > 0) {
    const allVenueIds = venuePartnershipBlocks.flatMap(
      (b) => ((b.config as { venue_ids?: string[] }).venue_ids) ?? []
    )
    if (allVenueIds.length > 0) {
      const admin = createAdminClient()
      const { data: venues } = await admin
        .from('adda_profiles')
        .select('id, name, address, city, cover_image_url, slug')
        .in('id', allVenueIds)
      for (const v of venues ?? []) {
        venueData[v.id] = v
      }
    }
  }

  const safeProfile = { ...profile, social_links: profile.social_links ?? null }
  const resolvedTheme = resolveTheme(profile.page_theme, profile.creator_type)

  // Check if the viewer is an explorer, whether they follow this creator,
  // and whether they are the profile owner.
  let viewerIsExplorer = false
  let isFollowing = false
  let isOwner = false

  try {
    const { user } = await requireAuth()
    isOwner = user.id === profile.id
    const admin = createAdminClient()
    const { data: explorerRow } = await admin
      .from('explorer_profiles')
      .select('followed_maker_ids')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (explorerRow) {
      viewerIsExplorer = true
      isFollowing = explorerRow.followed_maker_ids.includes(profile.id)
    }
  } catch {
    // Unauthenticated visitor — no follow button shown.
  }

  // City mastery map: fetch for the profile owner or if sharing is enabled.
  let cityMasteryMap: MasteryNeighbourhood[] = []
  if (isOwner || profile.show_city_mastery) {
    cityMasteryMap = await getCityMasteryMap(profile.id)
  }

  return (
    <PublicProfilePage
      profile={safeProfile}
      blocks={visibleBlocks}
      upcomingEvents={upcomingEvents}
      calendarEvents={calendarEvents}
      pastEvents={pastEvents}
      seriesEvents={seriesEvents}
      instagramThumbnails={instagramThumbnails}
      testimonials={testimonials}
      substackPosts={substackPosts}
      decryptedUpiVpa={decryptedUpiVpa}
      venueData={venueData}
      theme={resolvedTheme}
      isFollowing={isFollowing}
      viewerIsExplorer={viewerIsExplorer}
      isOwner={isOwner}
      cityMasteryMap={cityMasteryMap}
    />
  )
}
