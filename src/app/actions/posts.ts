'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ---------------------------------------------------------------------------
// Types (creator_posts / post_reactions are not in the auto-generated DB types)
// ---------------------------------------------------------------------------

export interface CreatorPost {
  id:                 string
  creator_id:         string
  post_type:          'text' | 'photo' | 'link'
  content:            string | null
  image_url:          string | null
  link_url:           string | null
  link_title:         string | null
  link_preview:       string | null
  is_subscriber_only: boolean
  created_at:         string
  updated_at:         string
}

export interface PostReactionCount {
  emoji: string
  count: number
}

export interface CreatorPostWithReactions extends CreatorPost {
  reactions:         PostReactionCount[]
  viewerReactions:   string[]
}

export interface CreatePostInput {
  post_type:          'text' | 'photo' | 'link'
  content?:           string
  image_url?:         string
  link_url?:          string
  link_title?:        string
  link_preview?:      string
  is_subscriber_only: boolean
}

// ---------------------------------------------------------------------------
// createPost
// ---------------------------------------------------------------------------

export async function createPost(
  input: CreatePostInput,
): Promise<{ data: CreatorPost | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { data: null, error: 'Not authenticated.' }

  if (input.post_type === 'text' && !input.content?.trim())
    return { data: null, error: 'Text content is required.' }
  if (input.post_type === 'photo' && !input.image_url)
    return { data: null, error: 'A photo is required.' }
  if (input.post_type === 'link' && !input.link_url)
    return { data: null, error: 'A link URL is required.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data, error } = await db
    .from('creator_posts')
    .insert({
      creator_id:         user.id,
      post_type:          input.post_type,
      content:            input.content?.trim() ?? null,
      image_url:          input.image_url ?? null,
      link_url:           input.link_url ?? null,
      link_title:         input.link_title?.trim() ?? null,
      link_preview:       input.link_preview ?? null,
      is_subscriber_only: input.is_subscriber_only,
    })
    .select()
    .single()

  if (error) {
    console.error('[createPost]', error.message)
    return { data: null, error: 'Failed to create post.' }
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('username')
    .eq('id', user.id)
    .single()

  revalidatePath('/dashboard')
  if (profile?.username) revalidatePath(`/${profile.username}`)

  return { data: data as CreatorPost, error: null }
}

// ---------------------------------------------------------------------------
// deletePost
// ---------------------------------------------------------------------------

export async function deletePost(
  postId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Not authenticated.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { error } = await db
    .from('creator_posts')
    .delete()
    .eq('id', postId)
    .eq('creator_id', user.id)

  if (error) {
    console.error('[deletePost]', error.message)
    return { error: 'Failed to delete post.' }
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('username')
    .eq('id', user.id)
    .single()

  revalidatePath('/dashboard')
  if (profile?.username) revalidatePath(`/${profile.username}`)

  return { error: null }
}

// ---------------------------------------------------------------------------
// uploadPostImage — uses admin client for storage (same pattern as uploadAvatar)
// ---------------------------------------------------------------------------

export async function uploadPostImage(
  formData: FormData,
): Promise<{ url: string | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { url: null, error: 'Not authenticated.' }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) return { url: null, error: null }
  if (file.size > 10 * 1024 * 1024) return { url: null, error: 'Image must be under 10 MB.' }

  const allowed = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowed.includes(file.type)) return { url: null, error: 'Image must be JPEG, PNG, or WebP.' }

  const ext  = file.type.split('/')[1].replace('jpeg', 'jpg')
  const path = `${user.id}/posts/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

  const admin = createAdminClient()
  const { error: uploadError } = await admin.storage
    .from('post-images')
    .upload(path, file, { upsert: false, contentType: file.type })

  if (uploadError) {
    console.error('[uploadPostImage]', uploadError.message)
    return { url: null, error: 'Failed to upload image.' }
  }

  const { data: urlData } = admin.storage.from('post-images').getPublicUrl(path)
  return { url: urlData.publicUrl, error: null }
}

// ---------------------------------------------------------------------------
// fetchOgData — server-side OG scraper so URLs don't get exposed client-side
// ---------------------------------------------------------------------------

export async function fetchOgData(
  url: string,
): Promise<{ title: string | null; image: string | null; error: string | null }> {
  try {
    const normalized = url.startsWith('http') ? url : `https://${url}`
    const res = await fetch(normalized, {
      headers: { 'User-Agent': 'WIMCBot/1.0 (https://wheninmycity.com)' },
      signal:  AbortSignal.timeout(5000),
    })
    if (!res.ok) return { title: null, image: null, error: null }

    const html = await res.text()
    const og = (prop: string) => {
      const m = html.match(new RegExp(
        `<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']+)["']`, 'i',
      )) ?? html.match(new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${prop}["']`, 'i',
      ))
      return m?.[1]?.trim() ?? null
    }
    const titleFallback = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim() ?? null

    return { title: og('title') ?? titleFallback, image: og('image'), error: null }
  } catch {
    return { title: null, image: null, error: null }
  }
}

// ---------------------------------------------------------------------------
// getCreatorPosts — used server-side to hydrate profile and dashboard
// ---------------------------------------------------------------------------

export async function getCreatorPosts(
  creatorId:  string,
  viewerUserId: string | null,
  limit = 10,
): Promise<CreatorPostWithReactions[]> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: postsRaw } = await db
    .from('creator_posts')
    .select('*')
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (!postsRaw || postsRaw.length === 0) return []

  const postIds: string[] = postsRaw.map((p: CreatorPost) => p.id)

  // Fetch all reactions for these posts in one query
  const { data: reactionsRaw } = await db
    .from('post_reactions')
    .select('post_id, emoji')
    .in('post_id', postIds)

  // Aggregate reaction counts per post per emoji
  const reactionMap: Record<string, Record<string, number>> = {}
  for (const r of (reactionsRaw ?? [])) {
    if (!reactionMap[r.post_id]) reactionMap[r.post_id] = {}
    reactionMap[r.post_id][r.emoji] = (reactionMap[r.post_id][r.emoji] ?? 0) + 1
  }

  // Fetch viewer's own reactions if authenticated
  const viewerMap: Record<string, string[]> = {}
  if (viewerUserId) {
    const { data: viewerRaw } = await db
      .from('post_reactions')
      .select('post_id, emoji')
      .in('post_id', postIds)
      .eq('user_id', viewerUserId)

    for (const r of (viewerRaw ?? [])) {
      if (!viewerMap[r.post_id]) viewerMap[r.post_id] = []
      viewerMap[r.post_id].push(r.emoji)
    }
  }

  const EMOJIS = ['🔥', '❤️', '👏', '🎉', '💭']
  return (postsRaw as CreatorPost[]).map((p) => ({
    ...p,
    reactions: EMOJIS
      .map((emoji) => ({ emoji, count: reactionMap[p.id]?.[emoji] ?? 0 }))
      .filter((r) => r.count > 0),
    viewerReactions: viewerMap[p.id] ?? [],
  }))
}
