'use server'

import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth/requireAuth'
import { meetsMinimumTier } from '@/lib/constants/blocks'
import { checkNewsletterRateLimit } from '@/lib/ratelimit'
import type { MakerSubscriber, MakerTier } from '@/types/database'

// ---------------------------------------------------------------------------
// subscribeToMakerNewsletter
// ---------------------------------------------------------------------------

const EmailSchema = z.string().email('Please enter a valid email address').max(254)

/**
 * Subscribes an email address to a Maker's newsletter list.
 *
 * Called from the `newsletter_signup` block on a creator's public profile page.
 * No authentication required — the subscriber can be an anonymous visitor.
 *
 * Steps:
 *   1. Validates email format.
 *   2. Upserts a row in `maker_subscribers` (idempotent — re-subscribing
 *      an unsubscribed address sets is_active back to true).
 *   3. Logs a 'subscribe' event in `block_analytics` for the block.
 *
 * @param profileId - The creator's user_profiles.id (= auth.users.id).
 * @param email     - The subscriber's email address.
 * @param blockId   - The newsletter_signup block id (for analytics).
 * @returns `{ error: string | null }`
 */
export async function subscribeToMakerNewsletter(
  profileId: string,
  email: string,
  blockId?: string,
): Promise<{ error: string | null }> {
  const rl = await checkNewsletterRateLimit()
  if (!rl.success) return { error: rl.error! }

  const parsed = EmailSchema.safeParse(email)
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  // Validate profileId is a UUID.
  const uuidParsed = z.string().uuid().safeParse(profileId)
  if (!uuidParsed.success) {
    return { error: 'Invalid creator profile.' }
  }

  const admin = createAdminClient()

  // Confirm the maker profile exists.
  const { data: maker } = await admin
    .from('user_profiles')
    .select('id')
    .eq('id', profileId)
    .maybeSingle()

  if (!maker) {
    return { error: 'Creator not found.' }
  }

  // Upsert the subscription — reactivates if previously unsubscribed.
  const { error: upsertError } = await admin
    .from('maker_subscribers')
    .upsert(
      {
        maker_id:      profileId,
        email:         parsed.data.toLowerCase(),
        is_active:     true,
        source:        'newsletter_block',
        subscribed_at: new Date().toISOString(),
      },
      { onConflict: 'maker_id,email' },
    )

  if (upsertError) {
    console.error('[subscribeToMakerNewsletter]', upsertError.message)
    return { error: 'Failed to subscribe. Please try again.' }
  }

  // Fire analytics event (fire-and-forget — never throw).
  if (blockId) {
    try {
      await admin.from('block_analytics').insert({
        block_id:   blockId,
        profile_id: profileId,
        event_type: 'subscribe',
      })
    } catch {
      // Swallow — analytics must never break the subscriber UX.
    }
  }

  return { error: null }
}

// ---------------------------------------------------------------------------
// getMakerSubscribers
// ---------------------------------------------------------------------------

export interface SubscriberExport {
  email: string
  subscribed_at: string
}

export interface MakerSubscribersResult {
  total: number
  recent: MakerSubscriber[]
  /** Export list — populated only for Chowk+ makers. */
  exports: SubscriberExport[]
}

/**
 * Returns the subscriber list for the authenticated maker.
 *
 * - `total` — count of active subscribers.
 * - `recent` — 10 most recently subscribed active rows (dashboard preview).
 * - `exports` — full email + date export for Chowk+ makers only.
 *   Returns an empty array for Mohalla and Nukkad makers.
 *
 * @returns `MakerSubscribersResult`
 */
export async function getMakerSubscribers(): Promise<MakerSubscribersResult> {
  const empty: MakerSubscribersResult = { total: 0, recent: [], exports: [] }

  const { user } = await requireAuth()

  const admin = createAdminClient()

  // Fetch total count and tier in one go.
  const [profileResult, countResult, recentResult] = await Promise.all([
    admin
      .from('user_profiles')
      .select('maker_tier')
      .eq('id', user.id)
      .maybeSingle(),

    admin
      .from('maker_subscribers')
      .select('id', { count: 'exact', head: true })
      .eq('maker_id', user.id)
      .eq('is_active', true),

    admin
      .from('maker_subscribers')
      .select('*')
      .eq('maker_id', user.id)
      .eq('is_active', true)
      .order('subscribed_at', { ascending: false })
      .limit(10),
  ])

  const currentTier = (profileResult.data?.maker_tier ?? 'mohalla') as MakerTier
  const total       = countResult.count ?? 0
  const recent      = recentResult.data ?? []

  // Export is a Chowk+ feature.
  if (!meetsMinimumTier(currentTier, 'chowk')) {
    return { total, recent, exports: [] }
  }

  // Fetch the full export list for Chowk+ makers.
  const { data: exportRows, error: exportError } = await admin
    .from('maker_subscribers')
    .select('email, subscribed_at')
    .eq('maker_id', user.id)
    .eq('is_active', true)
    .order('subscribed_at', { ascending: false })

  if (exportError) {
    console.error('[getMakerSubscribers] export fetch', exportError.message)
    return { total, recent, exports: [] }
  }

  const exports: SubscriberExport[] = (exportRows ?? []).map((r) => ({
    email:         r.email,
    subscribed_at: r.subscribed_at,
  }))

  return { total, recent, exports }
}
