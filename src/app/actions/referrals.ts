'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/requireAuth'

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  const array = new Uint8Array(8)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array)
    for (const byte of array) code += chars[byte % chars.length]
  } else {
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export interface ReferralStats {
  total:    number
  redeemed: number
}

/**
 * Gets or creates a URL-based referral tracking code for the creator + event pair.
 * Unlike the Bring-a-Wanderer code in referral.ts, this has no quarterly quota —
 * it is purely for link sharing and conversion tracking.
 */
export async function getOrCreateReferralLink(
  eventId: string,
): Promise<{ code: string | null; error?: string }> {
  const { user } = await requireAuth()
  const supabase = await createClient()

  // Check for existing URL-tracking code (not yet redeemed)
  const { data: existing } = await supabase
    .from('referral_codes')
    .select('code')
    .eq('event_id', eventId)
    .eq('issuer_id', user.id)
    .is('redeemed_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) return { code: existing.code }

  // Verify ownership
  const { data: event } = await supabase
    .from('events')
    .select('id, creator_id')
    .eq('id', eventId)
    .maybeSingle()

  if (!event || event.creator_id !== user.id) {
    return { code: null, error: 'Event not found or access denied.' }
  }

  // Generate unique code
  let code = generateCode()
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: collision } = await supabase
      .from('referral_codes')
      .select('id')
      .eq('code', code)
      .maybeSingle()
    if (!collision) break
    code = generateCode()
  }

  // No expires_at needed for URL referral links — set far future
  const farFuture = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString()

  const { error: insertError } = await supabase
    .from('referral_codes')
    .insert({ code, issuer_id: user.id, event_id: eventId, expires_at: farFuture })

  if (insertError) return { code: null, error: 'Could not create referral link. Try again.' }
  return { code }
}

/**
 * Returns stats for all referral codes the creator has generated for this event.
 */
export async function getReferralLinkStats(eventId: string): Promise<ReferralStats> {
  const { user } = await requireAuth()
  const supabase = await createClient()

  const { data } = await supabase
    .from('referral_codes')
    .select('redeemed_at')
    .eq('event_id', eventId)
    .eq('issuer_id', user.id)

  const total    = data?.length ?? 0
  const redeemed = data?.filter((c) => c.redeemed_at !== null).length ?? 0
  return { total, redeemed }
}

/**
 * Returns all published events for the creator with their referral stats.
 */
export async function getCreatorReferralOverview(): Promise<
  Array<{ id: string; title: string; starts_at: string; total: number; redeemed: number; code: string | null }>
> {
  const { user } = await requireAuth()
  const supabase = await createClient()

  const { data: events } = await supabase
    .from('events')
    .select('id, title, starts_at')
    .eq('creator_id', user.id)
    .eq('status', 'published')
    .order('starts_at', { ascending: false })
    .limit(10)

  if (!events?.length) return []

  const eventIds = events.map((e) => e.id)

  const { data: codes } = await supabase
    .from('referral_codes')
    .select('event_id, code, redeemed_at')
    .eq('issuer_id', user.id)
    .in('event_id', eventIds)

  return events.map((ev) => {
    const eventCodes = (codes ?? []).filter((c) => c.event_id === ev.id)
    const total      = eventCodes.length
    const redeemed   = eventCodes.filter((c) => c.redeemed_at !== null).length
    const unredeemed = eventCodes.find((c) => c.redeemed_at === null)
    return {
      id:         ev.id,
      title:      ev.title,
      starts_at:  ev.starts_at,
      total,
      redeemed,
      code:       unredeemed?.code ?? null,
    }
  })
}
