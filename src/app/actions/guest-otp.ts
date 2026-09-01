'use server'

// =============================================================================
// WIMC — Guest RSVP phone verification
//
// Lightweight phone-OTP check for unauthenticated ("guest") RSVP checkout —
// deliberately NOT Supabase Auth's phone sign-in (that creates a full account
// + session, which guest checkout exists to avoid).
//
// Mechanics (code generation, Redis storage, delivery dispatch, comparison)
// live in src/lib/otp.ts, shared with any future app-owned OTP flow. This
// file is the guest-RSVP policy layer on top of it: phone validation, rate
// limiting, and which channel a given phone number is allowed to use —
//   +91 (domestic) — either channel: AmazeSMS (src/lib/amazesms.ts) for
//     'sms', Meta WhatsApp Authentication template (src/lib/whatsapp-otp.ts)
//     for 'whatsapp'.
//   everything else (international) — WhatsApp only. AmazeSMS is a DLT-gated
//     domestic-only transport, so 'sms' is not a valid choice for these
//     numbers; the channel argument is overridden to 'whatsapp' regardless
//     of what's passed. (Previously routed through MSG91's separate OTP
//     Widget product — replaced by this unified path; no SMS fallback for
//     international numbers for now.)
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
import { checkGuestRsvpOtpRateLimit } from '@/lib/ratelimit'
import { sendAppOwnedOtp, verifyAppOwnedOtp, isAppOwnedOtpVerified, type OtpChannel } from '@/lib/otp'

export type { OtpChannel }

const PURPOSE = 'guest-rsvp' as const

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

export async function sendRsvpGuestOtp(
  phone: string,
  channel: OtpChannel,
): Promise<{ success: boolean; error: string | null; channel: OtpChannel }> {
  const parsedPhone = PhoneSchema.safeParse(phone)
  if (!parsedPhone.success) {
    return { success: false, error: parsedPhone.error.errors[0].message, channel: 'sms' }
  }

  const rl = await checkGuestRsvpOtpRateLimit()
  if (!rl.success) return { success: false, error: rl.error!, channel: 'sms' }

  // International numbers can't use AmazeSMS (DLT-gated, domestic-only) —
  // WhatsApp is the only valid channel regardless of what was requested.
  const effectiveChannel: OtpChannel = isDomestic(phone) ? channel : 'whatsapp'

  return sendAppOwnedOtp({ phone, channel: effectiveChannel, purpose: PURPOSE })
}

export async function verifyRsvpGuestOtp(phone: string, code: string): Promise<{ success: boolean; error: string | null }> {
  const parsedPhone = PhoneSchema.safeParse(phone)
  const parsedCode = z.string().regex(/^\d{6}$/).safeParse(code)
  if (!parsedPhone.success || !parsedCode.success) {
    return { success: false, error: 'Enter the 6-digit code sent to your phone.' }
  }

  const rl = await checkGuestRsvpOtpRateLimit()
  if (!rl.success) return { success: false, error: rl.error! }

  return verifyAppOwnedOtp(phone, code, PURPOSE)
}

/** Used by initiateRSVP to confirm a guest's phone was OTP-verified recently. */
export async function isGuestPhoneVerified(phone: string): Promise<boolean> {
  return isAppOwnedOtpVerified(phone, PURPOSE)
}
