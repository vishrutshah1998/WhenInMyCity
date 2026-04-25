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

  // Fetch upcoming published events for any event_listing blocks
  const hasEventListing = visibleBlocks.some((b) => b.block_type === 'event_listing')
  let upcomingEvents: Event[] = []

  if (hasEventListing) {
    // Collect explicit event_ids from all event_listing blocks
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

  // Fetch Instagram thumbnails server-side for all instagram_embed blocks
  const instagramBlocks = visibleBlocks.filter((b) => b.block_type === 'instagram_embed')
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

  // Fetch top reviews when a testimonial block exists.
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

  const safeProfile = { ...profile, social_links: profile.social_links ?? null }
  const resolvedTheme = resolveTheme(profile.page_theme, profile.creator_type)

  // Check if the viewer is an explorer and whether they follow this creator.
  let viewerIsExplorer = false
  let isFollowing = false

  try {
    const { user } = await requireAuth()
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

  return (
    <PublicProfilePage
      profile={safeProfile}
      blocks={visibleBlocks}
      upcomingEvents={upcomingEvents ?? []}
      instagramThumbnails={instagramThumbnails}
      testimonials={testimonials}
      theme={resolvedTheme}
      isFollowing={isFollowing}
      viewerIsExplorer={viewerIsExplorer}
    />
  )
}
