'use server'

// =============================================================================
// WIMC — Guest RSVP phone verification
//
// Lightweight phone-OTP check for unauthenticated ("guest") RSVP checkout —
// deliberately NOT Supabase Auth's phone sign-in (that creates a full account
// + session, which guest checkout exists to avoid). This generates its own
// code, stores it in the same Upstash Redis already used for rate limiting
// (src/lib/ratelimit.ts), and delivers it via the existing MSG91 SMS sender
// (src/lib/msg91.ts) — reusing infra rather than adding a new provider.
//
// On successful verification, a short-lived "verified" flag is set for the
// phone number. initiateRSVP (src/app/actions/rsvp.ts) checks this flag for
// any booking where attendeeUserId is null, so a phone must be freshly
// OTP-verified before a guest booking can be created. Authenticated bookings
// are unaffected — they're already OTP-verified via Supabase sign-in.
// =============================================================================

import { z } from 'zod'
import { getRedis, checkGuestRsvpOtpRateLimit } from '@/lib/ratelimit'
import { sendOtpSms } from '@/lib/msg91'

const PhoneSchema = z
  .string()
  .regex(/^\+91[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian mobile number.')

const OTP_TTL_SECONDS = 5 * 60
const VERIFIED_TTL_SECONDS = 15 * 60

function otpKey(phone: string): string {
  return `wimc:guest-rsvp-otp:${phone}`
}
function verifiedKey(phone: string): string {
  return `wimc:guest-rsvp-verified:${phone}`
}

// ---------------------------------------------------------------------------
// In-memory fallback store — used only when Upstash isn't configured (local
// dev without env vars). Mirrors the "app still works without Redis" graceful
// degradation already used throughout src/lib/ratelimit.ts.
// ---------------------------------------------------------------------------

const memOtpStore = new Map<string, { code: string; expiresAt: number }>()
const memVerifiedStore = new Map<string, number>()

export async function sendRsvpGuestOtp(phone: string): Promise<{ success: boolean; error: string | null }> {
  const parsedPhone = PhoneSchema.safeParse(phone)
  if (!parsedPhone.success) {
    return { success: false, error: parsedPhone.error.errors[0].message }
  }

  const rl = await checkGuestRsvpOtpRateLimit()
  if (!rl.success) return { success: false, error: rl.error! }

  const code = Math.floor(100000 + Math.random() * 900000).toString()
  const redis = getRedis()

  if (redis) {
    await redis.set(otpKey(phone), code, { ex: OTP_TTL_SECONDS })
  } else {
    memOtpStore.set(phone, { code, expiresAt: Date.now() + OTP_TTL_SECONDS * 1000 })
    console.warn('[sendRsvpGuestOtp] Upstash not configured — using in-memory OTP store (dev only)')
  }

  try {
    await sendOtpSms(phone, code)
  } catch (err) {
    console.error('[sendRsvpGuestOtp] SMS delivery failed', String(err))
    return { success: false, error: 'Could not send a verification code. Please check the number and try again.' }
  }

  return { success: true, error: null }
}

export async function verifyRsvpGuestOtp(phone: string, code: string): Promise<{ success: boolean; error: string | null }> {
  const parsedPhone = PhoneSchema.safeParse(phone)
  const parsedCode = z.string().regex(/^\d{6}$/).safeParse(code)
  if (!parsedPhone.success || !parsedCode.success) {
    return { success: false, error: 'Enter the 6-digit code sent to your phone.' }
  }

  const rl = await checkGuestRsvpOtpRateLimit()
  if (!rl.success) return { success: false, error: rl.error! }

  const redis = getRedis()

  let stored: string | null = null
  if (redis) {
    // The Upstash client JSON-deserializes on read, so a numeric-looking
    // string like "628821" comes back as the JS number 628821, not a
    // string — String() it back before comparing against `code`.
    const raw = await redis.get<string | number>(otpKey(phone))
    stored = raw === null || raw === undefined ? null : String(raw)
  } else {
    const entry = memOtpStore.get(phone)
    stored = entry && entry.expiresAt > Date.now() ? entry.code : null
  }

  if (!stored || stored !== code) {
    return { success: false, error: 'Incorrect or expired code. Please try again.' }
  }

  if (redis) {
    await redis.del(otpKey(phone))
    await redis.set(verifiedKey(phone), '1', { ex: VERIFIED_TTL_SECONDS })
  } else {
    memOtpStore.delete(phone)
    memVerifiedStore.set(phone, Date.now() + VERIFIED_TTL_SECONDS * 1000)
  }

  return { success: true, error: null }
}

/** Used by initiateRSVP to confirm a guest's phone was OTP-verified recently. */
export async function isGuestPhoneVerified(phone: string): Promise<boolean> {
  const redis = getRedis()
  if (redis) {
    // Same Upstash auto-deserialization quirk as verifyRsvpGuestOtp above —
    // the stored '1' can come back as the number 1, not the string '1'.
    const flag = await redis.get<string | number>(verifiedKey(phone))
    return flag !== null && flag !== undefined && String(flag) === '1'
  }
  const expiresAt = memVerifiedStore.get(phone)
  return !!expiresAt && expiresAt > Date.now()
}
