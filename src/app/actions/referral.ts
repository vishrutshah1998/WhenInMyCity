'use server'

import { requireAuth } from '@/lib/auth/requireAuth'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no I/O/1/0 for readability
  let code = ''
  const array = new Uint8Array(6)
  // Use crypto.getRandomValues on Node >= 19 / edge runtime
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array)
    for (const byte of array) code += chars[byte % chars.length]
  } else {
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

/** Returns ISO string for the last moment of the current calendar quarter. */
function endOfCurrentQuarter(): string {
  const now = new Date()
  const month = now.getMonth()
  const quarterEndMonth = month < 3 ? 3 : month < 6 ? 6 : month < 9 ? 9 : 12
  return new Date(now.getFullYear(), quarterEndMonth, 0, 23, 59, 59, 999).toISOString()
}

/** Returns ISO string for the first moment of the current calendar quarter. */
function startOfCurrentQuarter(): string {
  const now = new Date()
  const month = now.getMonth()
  const quarterStartMonth = month < 3 ? 0 : month < 6 ? 3 : month < 9 ? 6 : 9
  return new Date(now.getFullYear(), quarterStartMonth, 1, 0, 0, 0, 0).toISOString()
}

// ---------------------------------------------------------------------------
// generateReferralCode
// ---------------------------------------------------------------------------

export interface ReferralCodeResult {
  success: boolean
  code?: string
  error?: string
}

/**
 * Local+ creator generates one referral code per event (one per quarter limit).
 * If a code was already issued for this event this quarter, returns the existing one.
 */
export async function generateReferralCode(eventId: string): Promise<ReferralCodeResult> {
  const { user } = await requireAuth()
  const supabase = await createClient()

  // Verify user is Local+ and owns the event
  const [profileRes, eventRes] = await Promise.all([
    supabase.from('user_profiles').select('user_tier').eq('id', user.id).single(),
    supabase.from('events').select('id, creator_id').eq('id', eventId).single(),
  ])

  if (profileRes.error || !profileRes.data) return { success: false, error: 'Profile not found.' }
  if (eventRes.error || !eventRes.data)     return { success: false, error: 'Event not found.' }

  const tier = profileRes.data.user_tier
  if (tier !== 'local' && tier !== 'lantern' && tier !== 'beacon') {
    return { success: false, error: 'Bring-a-Wanderer is available for Local tier and above.' }
  }
  if (eventRes.data.creator_id !== user.id) {
    return { success: false, error: 'You can only generate codes for your own events.' }
  }

  // Check if a code already exists for this event (upsert by event)
  const { data: existing } = await supabase
    .from('referral_codes')
    .select('code, issued_at')
    .eq('issuer_id', user.id)
    .eq('event_id', eventId)
    .maybeSingle()

  if (existing) return { success: true, code: existing.code }

  // Check quarterly quota — at most 1 code per quarter across all events
  const qStart = startOfCurrentQuarter()
  const { count } = await supabase
    .from('referral_codes')
    .select('id', { count: 'exact', head: true })
    .eq('issuer_id', user.id)
    .gte('issued_at', qStart)

  if ((count ?? 0) >= 1) {
    return {
      success: false,
      error: 'You have already used your Bring-a-Wanderer code for this quarter. You can generate a new one next quarter.',
    }
  }

  // Generate a unique code (retry on collision)
  const admin = createAdminClient()
  let code = generateCode()
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: collision } = await admin
      .from('referral_codes')
      .select('id')
      .eq('code', code)
      .maybeSingle()
    if (!collision) break
    code = generateCode()
  }

  const { error: insertError } = await supabase.from('referral_codes').insert({
    code,
    issuer_id:  user.id,
    event_id:   eventId,
    expires_at: endOfCurrentQuarter(),
  })

  if (insertError) return { success: false, error: 'Could not generate code. Try again.' }
  return { success: true, code }
}

// ---------------------------------------------------------------------------
// getMyReferralCode — for the event manage page
// ---------------------------------------------------------------------------

export interface MyReferralCode {
  code:        string
  isRedeemed:  boolean
  redeemedAt:  string | null
  expiresAt:   string
  quarterLeft: string   // human-readable "resets in N days"
}

export async function getMyReferralCode(eventId: string): Promise<MyReferralCode | null> {
  const { user } = await requireAuth()
  const supabase = await createClient()

  const { data } = await supabase
    .from('referral_codes')
    .select('code, redeemed_at, expires_at')
    .eq('issuer_id', user.id)
    .eq('event_id', eventId)
    .maybeSingle()

  if (!data) return null

  const msLeft  = new Date(data.expires_at).getTime() - Date.now()
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24))
  const quarterLeft = daysLeft > 0 ? `Resets in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}` : 'Expired'

  return {
    code:        data.code,
    isRedeemed:  !!data.redeemed_at,
    redeemedAt:  data.redeemed_at,
    expiresAt:   data.expires_at,
    quarterLeft,
  }
}

// ---------------------------------------------------------------------------
// validateReferralCode — called from the RSVP sheet before booking
// ---------------------------------------------------------------------------

export interface ValidateResult {
  valid:   boolean
  error?:  string
  eventId?: string
}

export async function validateReferralCode(code: string, eventId: string): Promise<ValidateResult> {
  const admin = createAdminClient()

  const { data } = await admin
    .from('referral_codes')
    .select('id, event_id, redeemed_at, expires_at')
    .eq('code', code.trim().toUpperCase())
    .maybeSingle()

  if (!data) return { valid: false, error: 'Code not found. Check and try again.' }
  if (data.event_id !== eventId) return { valid: false, error: 'This code is for a different event.' }
  if (data.redeemed_at) return { valid: false, error: 'This code has already been used.' }
  if (new Date(data.expires_at) < new Date()) return { valid: false, error: 'This code has expired.' }

  return { valid: true, eventId: data.event_id }
}

// ---------------------------------------------------------------------------
// redeemReferralCode — called atomically inside initiateRSVP
// ---------------------------------------------------------------------------

/**
 * Marks a code as redeemed. Uses admin client + conditional update to prevent
 * double-redemption under concurrent requests.
 * Returns false if the code was already redeemed by another request.
 */
export async function redeemReferralCode(code: string, rsvpId: string): Promise<boolean> {
  const admin = createAdminClient()

  // Only update if redeemed_at IS NULL (atomic guard)
  const { data, error } = await admin
    .from('referral_codes')
    .update({ redeemed_at: new Date().toISOString(), redeemed_rsvp_id: rsvpId })
    .eq('code', code.trim().toUpperCase())
    .is('redeemed_at', null)
    .select('id')

  if (error || !data?.length) return false
  return true
}
