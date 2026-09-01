// =============================================================================
// WIMC — Generalized app-owned OTP mechanics.
//
// Generalizes the domestic branch of the original guest-RSVP OTP design (app
// generates the code, stores it in Upstash Redis, delivers via AmazeSMS or
// WhatsApp) to a channel param, for reuse by any app-owned OTP flow. This
// module is mechanics only — code generation, storage, delivery dispatch,
// comparison. Policy (phone validation, rate limiting, which channels a given
// caller is allowed to pick) stays with the caller — see
// src/app/actions/guest-otp.ts for the guest-RSVP policy layer.
//
// Deliberately NOT used by signup/login (src/app/actions/auth.ts) — those
// stay on Supabase's native signInWithOtp/verifyOtp, which owns code
// generation, hashing, verification, and session minting end-to-end. Only
// the Send SMS Hook's delivery leg will eventually branch between SMS and
// WhatsApp for that flow, keyed off a side-channel this module does not
// manage. See the OTP unification architecture proposal for why: there is no
// supported Supabase Admin API path to mint a session for a phone identity
// verified out-of-band, so app-owned verification must never feed a WIMC
// session directly.
// =============================================================================

import 'server-only'
import { getRedis } from '@/lib/ratelimit'
import { sendOtpSms } from '@/lib/amazesms'
import { sendOtpWhatsApp } from '@/lib/whatsapp-otp'

export type OtpChannel = 'sms' | 'whatsapp'

/** Namespaces Redis keys per call site so future purposes (e.g. signup/login,
 * if ever migrated onto app-owned delivery) can't collide with guest-RSVP's. */
export type OtpPurpose = 'guest-rsvp'

const OTP_TTL_SECONDS = 5 * 60
const VERIFIED_TTL_SECONDS = 15 * 60

function otpKey(purpose: OtpPurpose, phone: string): string {
  return `wimc:otp:${purpose}:${phone}`
}
function verifiedKey(purpose: OtpPurpose, phone: string): string {
  return `wimc:otp-verified:${purpose}:${phone}`
}

// In-memory fallback — used only when Upstash isn't configured (local dev
// without env vars). Mirrors the pattern already used throughout ratelimit.ts.
const memOtpStore = new Map<string, { code: string; expiresAt: number }>()
const memVerifiedStore = new Map<string, number>()

export interface SendAppOwnedOtpParams {
  phone: string
  channel: OtpChannel
  purpose: OtpPurpose
}

export interface SendAppOwnedOtpResult {
  success: boolean
  error: string | null
  channel: OtpChannel
}

/** Generates a code, stores it, and delivers it over the requested channel. */
export async function sendAppOwnedOtp(params: SendAppOwnedOtpParams): Promise<SendAppOwnedOtpResult> {
  const { phone, channel, purpose } = params

  const code = Math.floor(100000 + Math.random() * 900000).toString()
  const redis = getRedis()

  if (redis) {
    await redis.set(otpKey(purpose, phone), code, { ex: OTP_TTL_SECONDS })
  } else {
    memOtpStore.set(`${purpose}:${phone}`, { code, expiresAt: Date.now() + OTP_TTL_SECONDS * 1000 })
    console.warn('[sendAppOwnedOtp] Upstash not configured — using in-memory OTP store (dev only)')
  }

  try {
    if (channel === 'whatsapp') {
      await sendOtpWhatsApp(phone, code)
    } else {
      await sendOtpSms(phone, code)
    }
  } catch (err) {
    console.error('[sendAppOwnedOtp] delivery failed', { channel, err: String(err) })
    return {
      success: false,
      error: 'Could not send a verification code. Please check the number and try again.',
      channel,
    }
  }

  return { success: true, error: null, channel }
}

/** Compares the entered code against the stored one and marks the phone verified. */
export async function verifyAppOwnedOtp(
  phone: string,
  code: string,
  purpose: OtpPurpose,
): Promise<{ success: boolean; error: string | null }> {
  const redis = getRedis()

  let stored: string | null = null
  if (redis) {
    // The Upstash client JSON-deserializes on read, so a numeric-looking
    // string like "628821" comes back as the JS number 628821, not a
    // string — String() it back before comparing against `code`.
    const raw = await redis.get<string | number>(otpKey(purpose, phone))
    stored = raw === null || raw === undefined ? null : String(raw)
  } else {
    const entry = memOtpStore.get(`${purpose}:${phone}`)
    stored = entry && entry.expiresAt > Date.now() ? entry.code : null
  }

  if (!stored || stored !== code) {
    return { success: false, error: 'Incorrect or expired code. Please try again.' }
  }

  if (redis) {
    await redis.del(otpKey(purpose, phone))
    await redis.set(verifiedKey(purpose, phone), '1', { ex: VERIFIED_TTL_SECONDS })
  } else {
    memOtpStore.delete(`${purpose}:${phone}`)
    memVerifiedStore.set(`${purpose}:${phone}`, Date.now() + VERIFIED_TTL_SECONDS * 1000)
  }

  return { success: true, error: null }
}

/** Whether this phone was app-owned-OTP-verified for this purpose within the last 15 minutes. */
export async function isAppOwnedOtpVerified(phone: string, purpose: OtpPurpose): Promise<boolean> {
  const redis = getRedis()
  if (redis) {
    // Same Upstash auto-deserialization quirk as verifyAppOwnedOtp above —
    // the stored '1' can come back as the number 1, not the string '1'.
    const flag = await redis.get<string | number>(verifiedKey(purpose, phone))
    return flag !== null && flag !== undefined && String(flag) === '1'
  }
  const expiresAt = memVerifiedStore.get(`${purpose}:${phone}`)
  return !!expiresAt && expiresAt > Date.now()
}
