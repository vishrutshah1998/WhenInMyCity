'use server'

// =============================================================================
// WIMC — Guest RSVP phone verification
//
// Lightweight phone-OTP check for unauthenticated ("guest") RSVP checkout —
// deliberately NOT Supabase Auth's phone sign-in (that creates a full account
// + session, which guest checkout exists to avoid).
//
// Two delivery paths, split by country code:
//   +91 (domestic) — the app generates its own code, stores it in the same
//     Upstash Redis already used for rate limiting (src/lib/ratelimit.ts),
//     and delivers it via AmazeSMS (src/lib/amazesms.ts). Unchanged from the
//     original MSG91-backed design other than the transport swap.
//   everything else (international) — MSG91's separate "OTP Widget" product
//     (src/lib/msg91-international.ts) manages the whole code lifecycle
//     itself, same shape as the Twilio Verify integration this replaced.
//     There is no locally-generated code for this path — verification goes
//     through MSG91's own check, not Redis. Channel (WhatsApp vs SMS) is
//     mostly dashboard-configured on MSG91's side, not chosen per call — see
//     src/lib/msg91-international.ts for the one exception ("Try SMS
//     instead", which forces SMS via their resend/retry API).
//
// On successful verification (either path), a short-lived "verified" flag is
// set in Redis for the phone number. initiateRSVP (src/app/actions/rsvp.ts)
// checks this flag for any booking where attendeeUserId is null, so a phone
// must be freshly OTP-verified before a guest booking can be created.
// Authenticated bookings are unaffected — they're already OTP-verified via
// Supabase sign-in (main /signin stays +91-only, see CLAUDE.md Known Debt).
// =============================================================================

import { z } from 'zod'
import { parsePhoneNumberFromString } from 'libphonenumber-js'
import { getRedis, checkGuestRsvpOtpRateLimit } from '@/lib/ratelimit'
import { sendOtpSms } from '@/lib/amazesms'
import { sendInternationalOtp, resendInternationalOtpAsSms, checkInternationalOtp } from '@/lib/msg91-international'

/** 'whatsapp' means "normal send" (channel is MSG91-dashboard-configured); 'sms' forces the SMS-specific resend/retry path. */
export type OtpChannel = 'sms' | 'whatsapp'

const PhoneSchema = z
  .string()
  .refine((phone) => {
    if (/^\+91[6-9]\d{9}$/.test(phone)) return true
    const parsed = parsePhoneNumberFromString(phone)
    return !!parsed && parsed.isValid() && parsed.country !== 'IN'
  }, 'Please enter a valid phone number.')

function isDomestic(phone: string): boolean {
  return phone.startsWith('+91')
}

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

/** Shared by both the domestic (Redis-compared) and international (Twilio-checked) paths. */
async function markVerified(phone: string): Promise<void> {
  const redis = getRedis()
  if (redis) {
    await redis.del(otpKey(phone))
    await redis.set(verifiedKey(phone), '1', { ex: VERIFIED_TTL_SECONDS })
  } else {
    memOtpStore.delete(phone)
    memVerifiedStore.set(phone, Date.now() + VERIFIED_TTL_SECONDS * 1000)
  }
}

export async function sendRsvpGuestOtp(
  phone: string,
  channel: OtpChannel = 'whatsapp',
): Promise<{ success: boolean; error: string | null; channel: OtpChannel }> {
  const parsedPhone = PhoneSchema.safeParse(phone)
  if (!parsedPhone.success) {
    return { success: false, error: parsedPhone.error.errors[0].message, channel: 'sms' }
  }

  const rl = await checkGuestRsvpOtpRateLimit()
  if (!rl.success) return { success: false, error: rl.error!, channel: 'sms' }

  // ── International: MSG91's OTP Widget manages code generation + delivery ───
  if (!isDomestic(phone)) {
    try {
      if (channel === 'sms') {
        await resendInternationalOtpAsSms(phone)
      } else {
        await sendInternationalOtp(phone)
      }
    } catch (err) {
      console.error('[sendRsvpGuestOtp] MSG91 international send failed', String(err))
      return { success: false, error: 'Could not send a verification code. Please check the number and try again.', channel }
    }
    return { success: true, error: null, channel }
  }

  // ── Domestic: app-generated code, Redis-stored, delivered via AmazeSMS ──────
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
    return { success: false, error: 'Could not send a verification code. Please check the number and try again.', channel: 'sms' }
  }

  return { success: true, error: null, channel: 'sms' }
}

export async function verifyRsvpGuestOtp(phone: string, code: string): Promise<{ success: boolean; error: string | null }> {
  const parsedPhone = PhoneSchema.safeParse(phone)
  const parsedCode = z.string().regex(/^\d{6}$/).safeParse(code)
  if (!parsedPhone.success || !parsedCode.success) {
    return { success: false, error: 'Enter the 6-digit code sent to your phone.' }
  }

  const rl = await checkGuestRsvpOtpRateLimit()
  if (!rl.success) return { success: false, error: rl.error! }

  // ── International: MSG91 owns verification state, nothing to compare locally ──
  if (!isDomestic(phone)) {
    let approved: boolean
    try {
      approved = await checkInternationalOtp(phone, code)
    } catch (err) {
      console.error('[verifyRsvpGuestOtp] MSG91 international check failed', String(err))
      return { success: false, error: 'Could not verify the code. Please try again.' }
    }
    if (!approved) return { success: false, error: 'Incorrect or expired code. Please try again.' }
    await markVerified(phone)
    return { success: true, error: null }
  }

  // ── Domestic: compare against the app-generated code stored in Redis ───────
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

  await markVerified(phone)

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
