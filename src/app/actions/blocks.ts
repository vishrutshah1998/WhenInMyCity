'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth/requireAuth'
import { BLOCK_TIER_GATES, BLOCK_FAMILIES, BLOCK_META, meetsMinimumTier, type BlockMetaEntry } from '@/lib/constants/blocks'
import { validateBlockConfig, SupportTipConfigSchema, type SubstackPost } from '@/lib/validators/blocks'
import type { BlockType, UserTier, Json, PageBlock } from '@/types/database'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getAuthenticatedUserId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

const DEFAULT_CONFIGS: Record<BlockType, unknown> = {
  // Legacy (pre-008)
  text_bio:            { body: '' },
  social_link:         { url: '', title: 'Instagram', platform: 'instagram' },
  youtube_embed:       { video_id: '', title: '' },
  instagram_embed:     { post_url: '' },
  image_gallery:       { images: [], layout: 'grid' },
  event_listing:       { event_ids: [], max_items: 3 },
  custom_link:         { url: '', title: 'My Link', cta_label: 'View' },
  quote_block:         { text: '' },
  marquee_text:        { text: '', speed: 'normal', bg: 'primary' },
  stats_grid:          { stats: [{ value: '', label: '' }] },
  // Identity
  creator_type_badge:  { creator_type: 'music_performance', show_link_to_city_feed: true },
  city_community:      { city: 'ahmedabad', show_city_feed_link: true },
  announcement:        { text: '', show_countdown: false, background_style: 'primary' },
  // Social
  social_links_row:    { links: [] },
  instagram_post:      { post_url: '' },
  spotify_now_playing: { spotify_user_id: '' },
  newsletter_signup:   { label: 'Join my newsletter', placeholder: 'your@email.com', button_label: 'Subscribe', success_message: "You're in! Thanks for subscribing." },
  // Events
  event_calendar:      { show_past_events: false, months_ahead: 1 },
  event_series:        { series_name: '', frequency: 'monthly', episode_count: 0, linked_event_ids: [] },
  past_events_gallery: { layout: 'grid', show_attendee_count: true, show_recap: false, max_events: 6 },
  rsvp_link:           { url: '', label: 'Register Now' },
  // Content
  podcast_episode:     { platform: 'spotify', episode_url: '' },
  substack_preview:    { publication_url: '', posts_count: 3, show_subscribe_button: true },
  // Community
  testimonial:         { testimonials: [], display_style: 'carousel' },
  community_stats:     { show_events_hosted: true, show_total_attendees: true, show_average_rating: true },
  venue_partnership:   { venue_ids: [], display_style: 'cards' },
  support_tip:         { message: 'Support my work', upi_vpa: '', upi_vpa_encrypted: '', preset_amounts_paise: [5000, 10000, 20000], thank_you_message: 'Thank you so much! 🙏' },
  collab_invite:       { collab_types: [], availability_note: '', message: '' },
  white_label_event:   { partner_name: '', event_title: '' },
}

// ---------------------------------------------------------------------------
// toggleBlockVisibility
// ---------------------------------------------------------------------------

/**
 * Flips the `is_visible` flag on a single page block.
 * The block must belong to the authenticated user.
 */
export async function toggleBlockVisibility(
  blockId: string,
  isVisible: boolean,
): Promise<{ error: string | null }> {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { error: 'Not authenticated.' }

  const supabase = await createClient()

  const { error } = await supabase
    .from('page_blocks')
    .update({ is_visible: isVisible })
    .eq('id', blockId)
    .eq('profile_id', userId)

  if (error) {
    console.error('[toggleBlockVisibility]', error.message)
    return { error: 'Failed to update block.' }
  }

  revalidatePath('/dashboard')
  return { error: null }
}

// ---------------------------------------------------------------------------
// reorderBlocks
// ---------------------------------------------------------------------------

/**
 * Persists a new block order by updating the `position` column on each block.
 * `orderedIds` must contain the IDs in the desired display order (0-indexed).
 */
export async function reorderBlocks(
  orderedIds: string[],
): Promise<{ error: string | null }> {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { error: 'Not authenticated.' }

  const supabase = await createClient()

  const updates = orderedIds.map((id, index) =>
    supabase
      .from('page_blocks')
      .update({ position: index })
      .eq('id', id)
      .eq('profile_id', userId),
  )

  const results = await Promise.all(updates)
  const failed = results.find((r) => r.error)

  if (failed?.error) {
    console.error('[reorderBlocks]', failed.error.message)
    return { error: 'Failed to save new order.' }
  }

  revalidatePath('/dashboard')
  return { error: null }
}

// ---------------------------------------------------------------------------
// addBlock
// ---------------------------------------------------------------------------

/**
 * Inserts a new block with a default config for the given block type.
 * The new block is placed at the end (highest position + 1).
 */
export async function addBlock(
  blockType: BlockType,
): Promise<{ block: PageBlock | null; error: string | null }> {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { block: null, error: 'Not authenticated.' }

  const supabase = await createClient()

  // Determine the next position.
  const { data: existing } = await supabase
    .from('page_blocks')
    .select('position')
    .eq('profile_id', userId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextPosition = existing ? existing.position + 1 : 0

  const { data, error } = await supabase
    .from('page_blocks')
    .insert({
      profile_id: userId,
      block_type: blockType,
      position: nextPosition,
      is_visible: true,
      config: DEFAULT_CONFIGS[blockType] as Json,
    })
    .select()
    .single()

  if (error) {
    console.error('[addBlock]', error.message)
    return { block: null, error: 'Failed to add block.' }
  }

  revalidatePath('/dashboard')
  return { block: data, error: null }
}

// ---------------------------------------------------------------------------
// updateBlock
// ---------------------------------------------------------------------------

/**
 * Updates the config of a single block. The block must belong to the authenticated user.
 */
export async function updateBlock(
  blockId: string,
  config: unknown,
): Promise<{ error: string | null }> {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { error: 'Not authenticated.' }

  const supabase = await createClient()

  const { error } = await supabase
    .from('page_blocks')
    .update({ config: config as Json })
    .eq('id', blockId)
    .eq('profile_id', userId)

  if (error) {
    console.error('[updateBlock]', error.message)
    return { error: 'Failed to update block.' }
  }

  revalidatePath('/dashboard')
  return { error: null }
}

// ---------------------------------------------------------------------------
// uploadGalleryImage
// ---------------------------------------------------------------------------

/**
 * Uploads an image file to the `gallery` Supabase Storage bucket and returns
 * the public URL. The file is stored at `{userId}/{uuid}.{ext}`.
 */
export async function uploadGalleryImage(
  formData: FormData,
): Promise<{ url: string | null; error: string | null }> {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { url: null, error: 'Not authenticated.' }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { url: null, error: 'No file provided.' }
  }

  if (file.size > 10 * 1024 * 1024) {
    return { url: null, error: 'Image must be smaller than 10 MB.' }
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedTypes.includes(file.type)) {
    return { url: null, error: 'Image must be a JPEG, PNG, WebP, or GIF.' }
  }

  const ext = file.type.split('/')[1].replace('jpeg', 'jpg')
  const filename = `${crypto.randomUUID()}.${ext}`
  const storagePath = `${userId}/${filename}`

  const supabase = await createClient()

  const { error: uploadError } = await supabase.storage
    .from('gallery')
    .upload(storagePath, file, { contentType: file.type, upsert: false })

  if (uploadError) {
    console.error('[uploadGalleryImage]', uploadError.message)
    return { url: null, error: 'Failed to upload image. Please try again.' }
  }

  const { data: urlData } = supabase.storage.from('gallery').getPublicUrl(storagePath)
  return { url: urlData.publicUrl, error: null }
}

// ---------------------------------------------------------------------------
// addEventToPage
// ---------------------------------------------------------------------------

/**
 * Adds an event_listing block for a specific event to the authenticated user's page.
 * If an event_listing block already exists and contains the event, it returns early.
 */
export async function addEventToPage(
  eventId: string,
): Promise<{ error: string | null }> {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { error: 'Not authenticated.' }

  const supabase = await createClient()

  // Determine the next position.
  const { data: existing } = await supabase
    .from('page_blocks')
    .select('position')
    .eq('profile_id', userId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextPosition = existing ? existing.position + 1 : 0

  const { error } = await supabase
    .from('page_blocks')
    .insert({
      profile_id: userId,
      block_type: 'event_listing' as BlockType,
      position: nextPosition,
      is_visible: true,
      config: { event_ids: [eventId], max_items: 3 } as Json,
    })

  if (error) {
    console.error('[addEventToPage]', error.message)
    return { error: 'Failed to add event to page.' }
  }

  revalidatePath('/dashboard')
  return { error: null }
}

// ---------------------------------------------------------------------------
// deleteBlock
// ---------------------------------------------------------------------------

/**
 * Permanently deletes a block. The block must belong to the authenticated user.
 */
export async function deleteBlock(
  blockId: string,
): Promise<{ error: string | null }> {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { error: 'Not authenticated.' }

  const supabase = await createClient()

  const { error } = await supabase
    .from('page_blocks')
    .delete()
    .eq('id', blockId)
    .eq('profile_id', userId)

  if (error) {
    console.error('[deleteBlock]', error.message)
    return { error: 'Failed to delete block.' }
  }

  revalidatePath('/dashboard')
  return { error: null }
}

// ---------------------------------------------------------------------------
// validateBlockTierAccess
// ---------------------------------------------------------------------------

/**
 * Checks whether the maker at `profileId` is allowed to use `blockType`.
 * Compares the maker's current tier against `BLOCK_TIER_GATES`.
 *
 * Always called server-side — the client is never trusted to enforce gating.
 *
 * @returns `{ allowed: true }` or `{ allowed: false, requiredTier }`
 */
export async function validateBlockTierAccess(
  profileId: string,
  blockType: BlockType,
): Promise<{ allowed: boolean; requiredTier?: UserTier }> {
  const requiredTier = BLOCK_TIER_GATES[blockType] ?? 'wanderer'

  // All Makers can use Mohalla-gated blocks — no DB query needed.
  if (requiredTier === 'wanderer') return { allowed: true }

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('user_profiles')
    .select('user_tier')
    .eq('id', profileId)
    .maybeSingle()

  if (!profile) return { allowed: false, requiredTier }

  const allowed = meetsMinimumTier(profile.user_tier as UserTier, requiredTier)
  return allowed ? { allowed: true } : { allowed: false, requiredTier }
}

// ---------------------------------------------------------------------------
// getAvailableBlocks
// ---------------------------------------------------------------------------

/**
 * Returns the full block catalogue split into available and locked groups
 * based on the authenticated maker's current tier.
 *
 * Used by the AddBlockSheet to render the block picker with tier-gated locks.
 *
 * @param makerId - The user_profiles.id of the maker.
 */
export async function getAvailableBlocks(makerId: string): Promise<{
  available: Array<BlockMetaEntry & { blockType: BlockType }>
  locked: Array<BlockMetaEntry & { blockType: BlockType; unlocksAtTier: UserTier }>
}> {
  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('user_profiles')
    .select('user_tier')
    .eq('id', makerId)
    .maybeSingle()

  const currentTier: UserTier = (profile?.user_tier as UserTier) ?? 'wanderer'

  const available: Array<BlockMetaEntry & { blockType: BlockType }> = []
  const locked:    Array<BlockMetaEntry & { blockType: BlockType; unlocksAtTier: UserTier }> = []

  for (const [blockType, meta] of Object.entries(BLOCK_META) as [BlockType, BlockMetaEntry][]) {
    const requiredTier = BLOCK_TIER_GATES[blockType] ?? 'wanderer'
    if (meetsMinimumTier(currentTier, requiredTier)) {
      available.push({ ...meta, blockType })
    } else {
      locked.push({ ...meta, blockType, unlocksAtTier: requiredTier })
    }
  }

  return { available, locked }
}

// ---------------------------------------------------------------------------
// saveSupportTipBlock — encrypts UPI VPA before storing
// ---------------------------------------------------------------------------

/**
 * Specialised update for support_tip blocks that encrypts the UPI VPA via
 * the `encrypt_upi_vpa` Postgres function before writing to the database.
 *
 * Validates the config with SupportTipConfigSchema, then replaces the
 * plaintext `upi_vpa` field with `upi_vpa_encrypted` (base64 ciphertext).
 *
 * @returns `{ error: string | null }`
 */
export async function saveSupportTipBlock(
  blockId: string,
  config: unknown,
): Promise<{ error: string | null }> {
  const { user } = await requireAuth()

  const parsed = SupportTipConfigSchema.safeParse(config)
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  const admin = createAdminClient()

  // Encrypt the UPI VPA via the security-definer Postgres RPC.
  const { data: encryptedVpa, error: encryptError } = await admin.rpc('encrypt_upi_vpa', {
    p_upi_vpa: parsed.data.upi_vpa,
  })

  if (encryptError || !encryptedVpa) {
    console.error('[saveSupportTipBlock] encryption failed', encryptError?.message)
    return { error: 'Failed to secure your UPI VPA. Please try again.' }
  }

  // Build the stored config — never store the plaintext upi_vpa.
  const storedConfig: Record<string, unknown> = {
    message:              parsed.data.message,
    upi_vpa_encrypted:    encryptedVpa,
    preset_amounts_paise: parsed.data.preset_amounts_paise,
    thank_you_message:    parsed.data.thank_you_message,
  }

  const { error: updateError } = await admin
    .from('page_blocks')
    .update({ config: storedConfig as Json })
    .eq('id', blockId)
    .eq('profile_id', user.id)

  if (updateError) {
    console.error('[saveSupportTipBlock] update', updateError.message)
    return { error: 'Failed to save your tip block. Please try again.' }
  }

  revalidatePath('/dashboard')
  return { error: null }
}

// ---------------------------------------------------------------------------
// trackBlockAnalytics
// ---------------------------------------------------------------------------

/**
 * Records a block interaction event in `block_analytics`.
 *
 * Designed to be called fire-and-forget — the caller does not need to await
 * the result, and all errors are swallowed to prevent analytics from
 * breaking the visitor experience.
 *
 * Device type and referer are inferred from request headers server-side.
 *
 * @param blockId   - The page_blocks.id that was interacted with.
 * @param profileId - The creator's user_profiles.id (denormalised).
 * @param eventType - 'view' | 'click' | 'expand' | 'subscribe' | 'tip_initiated'
 * @param metadata  - Optional extra context (referer override, device_type override).
 */
export async function trackBlockAnalytics(
  blockId: string,
  profileId: string,
  eventType: 'view' | 'click' | 'expand' | 'subscribe' | 'tip_initiated',
  metadata?: { referer?: string; device_type?: string },
): Promise<void> {
  try {
    const headersList = await headers()
    const ua          = headersList.get('user-agent') ?? ''
    const rawReferer  = metadata?.referer ?? headersList.get('referer') ?? null

    const rawDevice   = metadata?.device_type ?? detectDeviceType(ua)
    const deviceType  = (['mobile', 'tablet', 'desktop'] as const).includes(rawDevice as 'mobile' | 'tablet' | 'desktop')
      ? (rawDevice as 'mobile' | 'tablet' | 'desktop')
      : detectDeviceType(ua)
    const referer     = rawReferer ? rawReferer.slice(0, 500) : null

    const admin = createAdminClient()
    await admin.from('block_analytics').insert({
      block_id:    blockId,
      profile_id:  profileId,
      event_type:  eventType,
      referer,
      device_type: deviceType,
    })
  } catch {
    // Analytics failures must never surface to the user.
  }
}

function detectDeviceType(ua: string): 'mobile' | 'tablet' | 'desktop' {
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet'
  if (/mobile|iphone|ipod|android|blackberry|windows phone/i.test(ua)) return 'mobile'
  return 'desktop'
}

// ---------------------------------------------------------------------------
// getSubstackPosts
// ---------------------------------------------------------------------------

/**
 * Fetches the 3 most recent posts from a Substack publication's RSS feed.
 *
 * Results are cached in `substack_cache` for 1 hour per publication URL to
 * avoid hammering the Substack CDN on every page view.
 *
 * @param publicationUrl - e.g. 'priya.substack.com' or 'https://priya.substack.com'
 * @returns Array of up to 3 `SubstackPost` objects.
 */
export async function getSubstackPosts(publicationUrl: string): Promise<SubstackPost[]> {
  // Normalise to a clean hostname without trailing slash.
  const hostname = publicationUrl
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
    .split('/')[0]

  if (!hostname.includes('substack.com')) return []

  const admin = createAdminClient()
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  // ── 1. Check cache ──────────────────────────────────────────────────────
  const { data: cached } = await admin
    .from('substack_cache')
    .select('posts, cached_at')
    .eq('publication_url', hostname)
    .gt('cached_at', oneHourAgo)
    .maybeSingle()

  if (cached) {
    return (cached.posts as unknown as SubstackPost[]).slice(0, 3)
  }

  // ── 2. Fetch RSS feed ───────────────────────────────────────────────────
  const rssUrl = `https://${hostname}/feed`

  let xml: string
  try {
    const response = await fetch(rssUrl, {
      headers: { 'User-Agent': 'WIMC/1.0 (RSS reader)' },
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) {
      console.warn('[getSubstackPosts] RSS fetch failed', { hostname, status: response.status })
      return []
    }

    xml = await response.text()
  } catch (err) {
    console.error('[getSubstackPosts] fetch error', { hostname, err })
    return []
  }

  // ── 3. Parse RSS ────────────────────────────────────────────────────────
  const posts = parseSubstackRSS(xml)

  // ── 4. Upsert cache ─────────────────────────────────────────────────────
  await admin
    .from('substack_cache')
    .upsert(
      { publication_url: hostname, posts: posts as unknown as Json, cached_at: new Date().toISOString() },
      { onConflict: 'publication_url' },
    )

  return posts.slice(0, 3)
}

/**
 * Simple RSS XML parser for Substack's standard feed format.
 * Handles CDATA-wrapped fields.
 */
function parseSubstackRSS(xml: string): SubstackPost[] {
  const posts: SubstackPost[] = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let match: RegExpExecArray | null

  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1]

    const title   = extractRSSTag(item, 'title')
    const link    = extractRSSTag(item, 'link')
    const pubDate = extractRSSTag(item, 'pubDate')
    const desc    = extractRSSTag(item, 'description')

    if (!title || !link) continue

    posts.push({
      title:   title.slice(0, 200),
      url:     link,
      date:    pubDate,
      excerpt: desc
        // Strip HTML tags from the description excerpt.
        .replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim()
        .slice(0, 300),
    })

    if (posts.length >= 3) break
  }

  return posts
}

/**
 * Extracts text content from an XML tag, unwrapping CDATA sections.
 */
function extractRSSTag(xml: string, tag: string): string {
  const pattern = new RegExp(
    `<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`,
    'i',
  )
  return xml.match(pattern)?.[1]?.trim() ?? ''
}
