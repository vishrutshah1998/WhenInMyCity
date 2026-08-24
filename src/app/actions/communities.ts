'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth, requireProfile, requireAdmin } from '@/lib/auth/requireAuth'
import { createEvent } from '@/app/actions/events'
import { CITIES } from '@/lib/constants/interests'
import { CREATOR_CATEGORIES } from '@/lib/constants/categories'
import type { CreateEventInput } from '@/types/events'
import type { Event } from '@/types/database'

// ---------------------------------------------------------------------------
// Types (communities / community_members / community_posts / community_events
// are not in the auto-generated DB types)
// ---------------------------------------------------------------------------

export interface Community {
  id: string
  name: string
  slug: string
  description: string | null
  cover_image_url: string | null
  city: string | null
  category: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_by: string
  admin_reviewed_by: string | null
  admin_reviewed_at: string | null
  admin_rejection_reason: string | null
  created_at: string
  updated_at: string
}

export interface CommunityMember {
  id: string
  community_id: string
  user_id: string
  role: 'owner' | 'member'
  status: 'pending' | 'approved' | 'rejected'
  requested_at: string
  approved_at: string | null
  approved_by: string | null
}

export interface CommunityPost {
  id: string
  community_id: string
  author_id: string
  content: string
  post_type: 'update' | 'event_share'
  event_id: string | null
  created_at: string
}

export interface CommunityEventLink {
  id: string
  community_id: string
  event_id: string
  added_by: string
  added_via: 'dashboard_share' | 'community_direct'
  created_at: string
}

// Narrow column-level preview of a draft event, returned by
// get_community_event_preview() (migration 072) to approved community
// members only — see getCommunityCalendar().
export interface CommunityEventPreview {
  id: string
  title: string
  starts_at: string
  creator_id: string
}

export interface RequestCommunityInput {
  name: string
  description?: string
  cover_image_url?: string
  city?: string
  category?: string
}

export interface AdminCommunityRow extends Community {
  creator_name: string
  creator_username: string
}

// ---------------------------------------------------------------------------
// Slug generation (batch-candidate approach, mirrors generateUniqueSlug in
// venue-onboarding.ts — community names are stable identities like venues,
// not one-off titles like events)
// ---------------------------------------------------------------------------

async function generateUniqueCommunitySlug(
  name: string,
  admin: ReturnType<typeof createAdminClient>,
): Promise<string> {
  const base = name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'community'

  const candidates = [base, ...Array.from({ length: 6 }, () => `${base}-${Math.floor(100 + Math.random() * 900)}`)]
    .filter((c) => c.length >= 3)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any
  const { data: taken } = await db.from('communities').select('slug').in('slug', candidates)
  const takenSet = new Set((taken ?? []).map((r: { slug: string }) => r.slug))
  const free = candidates.find((c) => !takenSet.has(c))
  if (free) return free
  return `community-${Math.floor(100000 + Math.random() * 900000)}`
}

// ---------------------------------------------------------------------------
// Name normalization — every community is "[Activity] In My City". Enforced
// here (action layer only, not a DB CHECK) so the convention can flex later
// without a migration. Permissive by design: append the suffix rather than
// reject, since admin review is still the real gate.
// ---------------------------------------------------------------------------

const NAME_SUFFIX = 'In My City'

function normalizeCommunityName(rawName: string): string {
  const trimmed = rawName.trim().replace(/\s+/g, ' ')
  const lower = trimmed.toLowerCase()
  const suffixLower = NAME_SUFFIX.toLowerCase()

  if (lower === suffixLower) return NAME_SUFFIX

  const alreadyHasSuffix =
    lower.endsWith(suffixLower) && /\s$/.test(trimmed.slice(0, trimmed.length - NAME_SUFFIX.length))

  if (alreadyHasSuffix) {
    const activity = trimmed.slice(0, trimmed.length - NAME_SUFFIX.length).trimEnd()
    return `${activity} ${NAME_SUFFIX}`
  }

  return `${trimmed} ${NAME_SUFFIX}`
}

// ---------------------------------------------------------------------------
// previewCommunityName — live name/slug preview for the request form. Calls
// the SAME normalizeCommunityName + generateUniqueCommunitySlug the real
// submit path uses, so the client-side preview can never drift from what
// requestCommunity() would actually produce (a bare read, no insert — the
// real submit still re-runs slug generation itself).
// ---------------------------------------------------------------------------

export async function previewCommunityName(
  rawName: string,
): Promise<{ name: string; slug: string } | null> {
  const trimmed = rawName?.trim()
  if (!trimmed) return null

  const name = normalizeCommunityName(trimmed)
  const admin = createAdminClient()
  const slug = await generateUniqueCommunitySlug(name, admin)

  return { name, slug }
}

// ---------------------------------------------------------------------------
// requestCommunity — creator requests a new community (status='pending')
// ---------------------------------------------------------------------------

export async function requestCommunity(
  input: RequestCommunityInput,
): Promise<{ community: Community | null; error: string | null }> {
  const { user } = await requireProfile()

  const rawName = input.name?.trim()
  if (!rawName) {
    return { community: null, error: 'Community name is required.' }
  }

  const name = normalizeCommunityName(rawName)
  if (name.length > 100) {
    return { community: null, error: 'Community name must be at most 100 characters, including " In My City".' }
  }
  const description = input.description?.trim()
  if (description && description.length > 1000) {
    return { community: null, error: 'Description must be at most 1000 characters.' }
  }
  if (input.city && !CITIES.some((c) => c.id === input.city)) {
    return { community: null, error: 'Unknown city.' }
  }
  if (input.category && !CREATOR_CATEGORIES.some((c) => c.id === input.category)) {
    return { community: null, error: 'Unknown category.' }
  }

  const admin = createAdminClient()
  const slug = await generateUniqueCommunitySlug(name, admin)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any
  const { data, error } = await db
    .from('communities')
    .insert({
      name,
      slug,
      description: description || null,
      cover_image_url: input.cover_image_url || null,
      city: input.city || null,
      category: input.category || null,
      created_by: user.id,
      status: 'pending',
    })
    .select()
    .single()

  if (error || !data) {
    console.error('[requestCommunity] insert failed', error?.message)
    return { community: null, error: 'Failed to submit community request.' }
  }

  return { community: data as Community, error: null }
}

// ---------------------------------------------------------------------------
// adminReviewCommunity — admin approves/rejects a pending community
// ---------------------------------------------------------------------------

export async function adminReviewCommunity(
  communityId: string,
  decision: 'approved' | 'rejected',
  reason?: string,
): Promise<{ error: string | null }> {
  const { user } = await requireAdmin()
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any

  const { data: community, error: fetchError } = await db
    .from('communities')
    .select('id, status, created_by')
    .eq('id', communityId)
    .maybeSingle()

  if (fetchError || !community) return { error: 'Community not found.' }
  if (community.status !== 'pending') return { error: 'Community has already been reviewed.' }

  const now = new Date().toISOString()

  const { error: updateError } = await db
    .from('communities')
    .update({
      status: decision,
      admin_reviewed_by: user.id,
      admin_reviewed_at: now,
      admin_rejection_reason: decision === 'rejected' ? (reason?.trim() || null) : null,
    })
    .eq('id', communityId)

  if (updateError) {
    console.error('[adminReviewCommunity] update failed', updateError.message)
    return { error: 'Failed to update community status.' }
  }

  if (decision === 'approved') {
    const { error: memberError } = await db
      .from('community_members')
      .insert({
        community_id: communityId,
        user_id: community.created_by,
        role: 'owner',
        status: 'approved',
        approved_at: now,
        approved_by: user.id,
      })

    if (memberError) {
      console.error('[adminReviewCommunity] owner membership insert failed', memberError.message)
      return { error: 'Community approved, but failed to create the owner membership. Contact engineering.' }
    }
  }

  return { error: null }
}

// ---------------------------------------------------------------------------
// requestJoinCommunity — any authenticated user requests membership
// ---------------------------------------------------------------------------

export async function requestJoinCommunity(
  communityId: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'Not authenticated.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: community } = await db
    .from('communities')
    .select('id, status')
    .eq('id', communityId)
    .maybeSingle()

  if (!community || community.status !== 'approved') {
    return { success: false, error: 'Community not found.' }
  }

  const { data: existing } = await db
    .from('community_members')
    .select('id, status')
    .eq('community_id', communityId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    if (existing.status === 'approved' || existing.status === 'pending') {
      return { success: true }  // idempotent
    }
    // Previously rejected — allow re-request rather than duplicating the row.
    const { error } = await db
      .from('community_members')
      .update({ status: 'pending', requested_at: new Date().toISOString(), approved_at: null, approved_by: null })
      .eq('id', existing.id)
    if (error) return { success: false, error: error.message }
    return { success: true }
  }

  const { error } = await db
    .from('community_members')
    .insert({ community_id: communityId, user_id: user.id, role: 'member', status: 'pending' })

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ---------------------------------------------------------------------------
// respondToJoinRequest — community owner approves/rejects a join request
// ---------------------------------------------------------------------------

export async function respondToJoinRequest(
  memberId: string,
  decision: 'approved' | 'rejected',
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'Not authenticated.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: member, error: fetchError } = await db
    .from('community_members')
    .select('id, community_id')
    .eq('id', memberId)
    .maybeSingle()

  if (fetchError || !member) return { success: false, error: 'Request not found.' }

  const { data: owner } = await db
    .from('community_members')
    .select('id')
    .eq('community_id', member.community_id)
    .eq('user_id', user.id)
    .eq('role', 'owner')
    .eq('status', 'approved')
    .maybeSingle()

  if (!owner) return { success: false, error: 'Only the community owner can respond to join requests.' }

  const now = new Date().toISOString()
  const { error } = await db
    .from('community_members')
    .update({
      status: decision,
      approved_at: decision === 'approved' ? now : null,
      approved_by: decision === 'approved' ? user.id : null,
    })
    .eq('id', memberId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ---------------------------------------------------------------------------
// createCommunityPost
// ---------------------------------------------------------------------------

export async function createCommunityPost(
  communityId: string,
  content: string,
  postType: 'update' | 'event_share' = 'update',
  eventId?: string,
): Promise<{ post: CommunityPost | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { post: null, error: 'Not authenticated.' }

  const trimmed = content?.trim()
  if (!trimmed || trimmed.length > 2000) {
    return { post: null, error: 'Post content must be 1–2000 characters.' }
  }
  if (postType === 'event_share' && !eventId) {
    return { post: null, error: 'eventId is required for event_share posts.' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: member } = await db
    .from('community_members')
    .select('id')
    .eq('community_id', communityId)
    .eq('user_id', user.id)
    .eq('status', 'approved')
    .maybeSingle()

  if (!member) return { post: null, error: 'You must be an approved member to post.' }

  if (postType === 'event_share') {
    // eventId is guaranteed defined here — validated by the guard above.
    const { data: event } = await supabase
      .from('events')
      .select('id, creator_id')
      .eq('id', eventId as string)
      .maybeSingle()

    if (!event || event.creator_id !== user.id) {
      return { post: null, error: 'You can only share events you created.' }
    }
  }

  const { data, error } = await db
    .from('community_posts')
    .insert({
      community_id: communityId,
      author_id: user.id,
      content: trimmed,
      post_type: postType,
      event_id: postType === 'event_share' ? eventId : null,
    })
    .select()
    .single()

  if (error || !data) {
    console.error('[createCommunityPost] insert failed', error?.message)
    return { post: null, error: 'Failed to create post.' }
  }

  return { post: data as CommunityPost, error: null }
}

// ---------------------------------------------------------------------------
// shareEventToCommunity — "dashboard share" path: link + a matching post
// ---------------------------------------------------------------------------

export async function shareEventToCommunity(
  eventId: string,
  communityId: string,
): Promise<{ error: string | null }> {
  const { user } = await requireAuth()
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: event } = await supabase
    .from('events')
    .select('id, title, creator_id')
    .eq('id', eventId)
    .maybeSingle()

  if (!event || event.creator_id !== user.id) {
    return { error: 'You can only share events you created.' }
  }

  const { data: member } = await db
    .from('community_members')
    .select('id')
    .eq('community_id', communityId)
    .eq('user_id', user.id)
    .eq('status', 'approved')
    .maybeSingle()

  if (!member) return { error: 'You must be an approved member of this community.' }

  const { error: linkError } = await db
    .from('community_events')
    .insert({ community_id: communityId, event_id: eventId, added_by: user.id, added_via: 'dashboard_share' })

  if (linkError) {
    if (linkError.code === '23505') return { error: 'This event has already been added to the community.' }
    console.error('[shareEventToCommunity] link insert failed', linkError.message)
    return { error: 'Failed to share event.' }
  }

  const { error: postError } = await db
    .from('community_posts')
    .insert({
      community_id: communityId,
      author_id: user.id,
      content: `Shared an event: ${event.title}`,
      post_type: 'event_share',
      event_id: eventId,
    })

  if (postError) {
    // Non-fatal — community_events (the calendar's source of truth) is already written.
    console.error('[shareEventToCommunity] post insert failed', postError.message)
  }

  return { error: null }
}

// ---------------------------------------------------------------------------
// addEventDirectlyToCommunity — "community direct add" path: reuses createEvent
// ---------------------------------------------------------------------------

export async function addEventDirectlyToCommunity(
  communityId: string,
  eventInput: CreateEventInput,
): Promise<{ event: Event | null; error: string | null }> {
  const { user } = await requireProfile()
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: member } = await db
    .from('community_members')
    .select('id')
    .eq('community_id', communityId)
    .eq('user_id', user.id)
    .eq('status', 'approved')
    .maybeSingle()

  if (!member) return { event: null, error: 'You must be an approved member of this community.' }

  const { event, error } = await createEvent(eventInput)
  if (error || !event) return { event: null, error: error ?? 'Failed to create event.' }

  const { error: linkError } = await db
    .from('community_events')
    .insert({ community_id: communityId, event_id: event.id, added_by: user.id, added_via: 'community_direct' })

  if (linkError) {
    console.error('[addEventDirectlyToCommunity] link insert failed', linkError.message)
    return { event, error: 'Event was created, but could not be linked to the community.' }
  }

  return { event, error: null }
}

// ---------------------------------------------------------------------------
// linkEventToCommunity — links an event created OUTSIDE this file's flow
// (e.g. the standard /dashboard/events/create form) into a community, as
// 'community_direct'. addEventDirectlyToCommunity() covers event creation
// driven from the community page itself; this covers linking an event
// that already exists.
// ---------------------------------------------------------------------------

export async function linkEventToCommunity(
  eventId: string,
  communityId: string,
): Promise<{ error: string | null }> {
  const { user } = await requireAuth()
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: member } = await db
    .from('community_members')
    .select('id')
    .eq('community_id', communityId)
    .eq('user_id', user.id)
    .eq('status', 'approved')
    .maybeSingle()

  if (!member) return { error: 'You must be an approved member of this community.' }

  const { error: linkError } = await db
    .from('community_events')
    .insert({ community_id: communityId, event_id: eventId, added_by: user.id, added_via: 'community_direct' })

  if (linkError) {
    if (linkError.code === '23505') return { error: null } // already linked — idempotent
    console.error('[linkEventToCommunity] link insert failed', linkError.message)
    return { error: 'Event was created, but could not be linked to the community.' }
  }

  return { error: null }
}

// ---------------------------------------------------------------------------
// getCommunityFeed — paginated feed read (cursor/nextCursor/done convention)
//
// event_share posts need real event data (cover/date/venue/RSVP) to render
// the boarding-pass card, not just the frozen `content` string. Same
// draft-visibility situation getCommunityCalendar() already handles:
// events_select_public_or_own is all-or-nothing, so a draft event only
// resolves via the normal join for its own creator. For everyone else we
// fall back to get_community_event_preview() (migration 072) and mark the
// post previewOnly — same field names (event/preview/previewOnly) as
// getCommunityCalendar() so the UI can share rendering logic between feed
// and calendar cards.
//
// Reaction counts + the viewer's own reactions are batched in (mirrors
// getCreatorPosts() in posts.ts) rather than fetched per-post, since the
// feed is already paginated at FEED_PAGE_SIZE.
// ---------------------------------------------------------------------------

const FEED_PAGE_SIZE = 20
const REACTION_EMOJIS = ['🔥', '❤️', '👏', '🎉', '💭']

export interface CommunityPostReactionCount {
  emoji: string
  count: number
}

export interface CommunityFeedPost extends CommunityPost {
  event: Event | null
  preview: CommunityEventPreview | null
  previewOnly: boolean
  reactions: CommunityPostReactionCount[]
  viewerReactions: string[]
  author: { display_name: string; username: string; avatar_url: string | null } | null
}

export async function getCommunityFeed(
  communityId: string,
  cursor?: string | null,
): Promise<{ posts: CommunityFeedPost[]; nextCursor: string | null; done: boolean }> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: { user: viewer } } = await supabase.auth.getUser()

  let query = db
    .from('community_posts')
    .select('*, event:events(*), author:user_profiles(display_name, username, avatar_url)')
    .eq('community_id', communityId)
    .order('created_at', { ascending: false })
    .limit(FEED_PAGE_SIZE)

  if (cursor) query = query.lt('created_at', cursor)

  const { data, error } = await query

  if (error) {
    console.error('[getCommunityFeed]', error.message)
    return { posts: [], nextCursor: null, done: true }
  }

  const rawPosts = (data ?? []) as (CommunityPost & {
    event: Event | null
    author: { display_name: string; username: string; avatar_url: string | null } | null
  })[]
  if (rawPosts.length === 0) {
    return { posts: [], nextCursor: null, done: true }
  }

  const withEventData = await Promise.all(
    rawPosts.map(async (post) => {
      if (post.post_type !== 'event_share' || !post.event_id) {
        return { ...post, event: null as Event | null, preview: null as CommunityEventPreview | null, previewOnly: false }
      }
      if (post.event) {
        return { ...post, preview: null as CommunityEventPreview | null, previewOnly: false }
      }

      const { data: preview, error: previewError } = await db
        .rpc('get_community_event_preview', { p_event_id: post.event_id })
        .maybeSingle()

      if (previewError) {
        console.error('[getCommunityFeed] preview fetch failed', previewError.message)
        return { ...post, event: null as Event | null, preview: null as CommunityEventPreview | null, previewOnly: false }
      }

      const previewRow = (preview as CommunityEventPreview | null) ?? null
      return { ...post, event: null as Event | null, preview: previewRow, previewOnly: previewRow !== null }
    }),
  )

  const postIds = withEventData.map((p) => p.id)

  const { data: reactionsRaw } = await db
    .from('community_post_reactions')
    .select('community_post_id, emoji')
    .in('community_post_id', postIds)

  const reactionMap: Record<string, Record<string, number>> = {}
  for (const r of (reactionsRaw ?? [])) {
    if (!reactionMap[r.community_post_id]) reactionMap[r.community_post_id] = {}
    reactionMap[r.community_post_id][r.emoji] = (reactionMap[r.community_post_id][r.emoji] ?? 0) + 1
  }

  const viewerMap: Record<string, string[]> = {}
  if (viewer) {
    const { data: viewerRaw } = await db
      .from('community_post_reactions')
      .select('community_post_id, emoji')
      .in('community_post_id', postIds)
      .eq('user_id', viewer.id)

    for (const r of (viewerRaw ?? [])) {
      if (!viewerMap[r.community_post_id]) viewerMap[r.community_post_id] = []
      viewerMap[r.community_post_id].push(r.emoji)
    }
  }

  const posts: CommunityFeedPost[] = withEventData.map((p) => ({
    ...p,
    reactions: REACTION_EMOJIS
      .map((emoji) => ({ emoji, count: reactionMap[p.id]?.[emoji] ?? 0 }))
      .filter((r) => r.count > 0),
    viewerReactions: viewerMap[p.id] ?? [],
  }))

  const nextCursor = posts.length === FEED_PAGE_SIZE ? posts[posts.length - 1].created_at : null

  return { posts, nextCursor, done: nextCursor === null }
}

// ---------------------------------------------------------------------------
// reactToCommunityPost — toggles a reaction (insert if absent, delete if present)
// ---------------------------------------------------------------------------

export async function reactToCommunityPost(
  postId: string,
  emoji: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'Not authenticated.' }

  if (!REACTION_EMOJIS.includes(emoji)) {
    return { success: false, error: 'Unsupported reaction.' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: existing } = await db
    .from('community_post_reactions')
    .select('id')
    .eq('community_post_id', postId)
    .eq('user_id', user.id)
    .eq('emoji', emoji)
    .maybeSingle()

  if (existing) {
    const { error } = await db.from('community_post_reactions').delete().eq('id', existing.id)
    if (error) return { success: false, error: error.message }
    return { success: true }
  }

  const { error } = await db
    .from('community_post_reactions')
    .insert({ community_post_id: postId, user_id: user.id, emoji })

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ---------------------------------------------------------------------------
// getCommunityCalendar — community_events joined to events
//
// events_select_public_or_own (migration 001) is all-or-nothing: a draft
// event only resolves for its own creator. For everyone else the `event`
// embed comes back null — including its date, so the calendar can't place
// it on the right day. For those rows we fall back to
// get_community_event_preview() (migration 072), a SECURITY DEFINER
// function that returns just id/title/starts_at/creator_id to an approved
// community member, regardless of publish status. A non-member gets
// nothing from that fallback either — the preview is member-gated, not
// public. previewOnly marks rows where only that narrow preview resolved,
// so the UI can render the muted "preparing an event" treatment instead of
// the full card.
// ---------------------------------------------------------------------------

export async function getCommunityCalendar(
  communityId: string,
): Promise<(CommunityEventLink & { event: Event | null; preview: CommunityEventPreview | null; previewOnly: boolean })[]> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data, error } = await db
    .from('community_events')
    .select('*, event:events(*)')
    .eq('community_id', communityId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getCommunityCalendar]', error.message)
    return []
  }

  const rows = (data ?? []) as (CommunityEventLink & { event: Event | null })[]

  return Promise.all(
    rows.map(async (row) => {
      if (row.event) {
        return { ...row, preview: null, previewOnly: false }
      }

      const { data: preview, error: previewError } = await db
        .rpc('get_community_event_preview', { p_event_id: row.event_id })
        .maybeSingle()

      if (previewError) {
        console.error('[getCommunityCalendar] preview fetch failed', previewError.message)
        return { ...row, preview: null, previewOnly: false }
      }

      const previewRow = (preview as CommunityEventPreview | null) ?? null
      return { ...row, preview: previewRow, previewOnly: previewRow !== null }
    }),
  )
}

// ---------------------------------------------------------------------------
// getCommunityBySlug — single-community read for /circles/[slug]
// ---------------------------------------------------------------------------

export async function getCommunityBySlug(slug: string): Promise<Community | null> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data, error } = await db.from('communities').select('*').eq('slug', slug).maybeSingle()

  if (error) {
    console.error('[getCommunityBySlug]', error.message)
    return null
  }

  return (data as Community | null) ?? null
}

// ---------------------------------------------------------------------------
// getCommunityMembership — the CALLING user's membership row for a community
// (used to gate join/pending/member UI on the public circle page)
// ---------------------------------------------------------------------------

export interface CommunityMembershipStatus {
  isMember: boolean
  isOwner: boolean
  isPending: boolean
  memberId: string | null
}

export async function getCommunityMembership(communityId: string): Promise<CommunityMembershipStatus> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { isMember: false, isOwner: false, isPending: false, memberId: null }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data } = await db
    .from('community_members')
    .select('id, role, status')
    .eq('community_id', communityId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!data) return { isMember: false, isOwner: false, isPending: false, memberId: null }

  return {
    isMember: data.status === 'approved',
    isOwner: data.status === 'approved' && data.role === 'owner',
    isPending: data.status === 'pending',
    memberId: data.id,
  }
}

// ---------------------------------------------------------------------------
// getPendingJoinRequests — owner-facing list, read via the session client.
// Readable by anyone for an approved community (community_members_select_
// public_or_own doesn't gate on the ROW's own status, only the community's)
// — the UI is what restricts this to the owner, same as the design's intent.
// ---------------------------------------------------------------------------

export interface PendingJoinRequest extends CommunityMember {
  user: { display_name: string; username: string; avatar_url: string | null } | null
}

export async function getPendingJoinRequests(communityId: string): Promise<PendingJoinRequest[]> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data, error } = await db
    .from('community_members')
    .select('*, user:user_profiles(display_name, username, avatar_url)')
    .eq('community_id', communityId)
    .eq('status', 'pending')
    .order('requested_at', { ascending: true })

  if (error) {
    console.error('[getPendingJoinRequests]', error.message)
    return []
  }

  return (data ?? []) as PendingJoinRequest[]
}

// ---------------------------------------------------------------------------
// getCommunityMemberCount
// ---------------------------------------------------------------------------

export async function getCommunityMemberCount(communityId: string): Promise<number> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { count } = await db
    .from('community_members')
    .select('id', { count: 'exact', head: true })
    .eq('community_id', communityId)
    .eq('status', 'approved')

  return count ?? 0
}

// ---------------------------------------------------------------------------
// getApprovedCommunities — public browse-all read for /circles. No auth
// required (communities_select_public_or_own has no `TO authenticated`
// restriction on the status='approved' branch, matching the platform's
// other public discovery pages). Member counts are batched in one extra
// query rather than fetched per-community.
// ---------------------------------------------------------------------------

export interface CommunityWithMemberCount extends Community {
  memberCount: number
}

export async function getApprovedCommunities(filters?: {
  city?: string
  category?: string
}): Promise<CommunityWithMemberCount[]> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  let query = db.from('communities').select('*').eq('status', 'approved').order('created_at', { ascending: false })
  if (filters?.city) query = query.eq('city', filters.city)
  if (filters?.category) query = query.eq('category', filters.category)

  const { data, error } = await query

  if (error) {
    console.error('[getApprovedCommunities]', error.message)
    return []
  }

  const communities = (data ?? []) as Community[]
  if (communities.length === 0) return []

  const ids = communities.map((c) => c.id)
  const { data: membersRaw } = await db
    .from('community_members')
    .select('community_id')
    .eq('status', 'approved')
    .in('community_id', ids)

  const countMap: Record<string, number> = {}
  for (const m of (membersRaw ?? [])) {
    countMap[m.community_id] = (countMap[m.community_id] ?? 0) + 1
  }

  return communities.map((c) => ({ ...c, memberCount: countMap[c.id] ?? 0 }))
}

// ---------------------------------------------------------------------------
// getCommunitiesForUser — "My Circles": communities the user has an approved
// membership row in
// ---------------------------------------------------------------------------

export async function getCommunitiesForUser(userId: string): Promise<Community[]> {
  const { user } = await requireAuth()
  if (user.id !== userId) return []

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data, error } = await db
    .from('community_members')
    .select('community:communities(*)')
    .eq('user_id', userId)
    .eq('status', 'approved')

  if (error) {
    console.error('[getCommunitiesForUser]', error.message)
    return []
  }

  return (data ?? [])
    .map((row: { community: Community | null }) => row.community)
    .filter((c: Community | null): c is Community => c !== null)
}

// ---------------------------------------------------------------------------
// getAdminCommunityQueue — admin review queue read
// ---------------------------------------------------------------------------

export async function getAdminCommunityQueue(
  status: string = 'pending',
): Promise<{ data: AdminCommunityRow[] | null; error?: string }> {
  await requireAdmin()
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any

  let query = db
    .from('communities')
    .select('*, creator:user_profiles(display_name, username)')
    .order('created_at', { ascending: false })

  if (status !== 'all') query = query.eq('status', status)

  const { data, error } = await query
  if (error) return { data: null, error: error.message }

  const rows: AdminCommunityRow[] = (data ?? []).map(
    (r: Community & { creator: { display_name: string; username: string } | null }) => ({
      ...r,
      creator_name: r.creator?.display_name ?? 'Unknown',
      creator_username: r.creator?.username ?? '',
    }),
  )

  return { data: rows }
}
