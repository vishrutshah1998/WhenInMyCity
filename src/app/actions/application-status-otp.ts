'use server'

// =============================================================================
// WIMC — Guest application-status-check phone verification
//
// Same app-owned OTP mechanics as guest-otp.ts (src/lib/otp.ts), under its
// own purpose ('application-status') so a status lookup can't consume or be
// throttled by guest-otp.ts's booking/application OTP flow ('guest-rsvp'),
// and vice versa.
//
// Used exclusively by getMyEventApplicationStatusGuest
// (src/app/actions/event-applications.ts): an unauthenticated applicant has
// no session to automatically key a status lookup on (unlike
// getMyEventApplicationStatus for authenticated users), so checking status
// is a guest-triggered "Check my application status" action, not something
// that runs on page load.
// =============================================================================

import { z } from 'zod'
import { parsePhoneNumberFromString } from 'libphonenumber-js'
import { checkApplicationStatusOtpRateLimit } from '@/lib/ratelimit'
import { sendAppOwnedOtp, verifyAppOwnedOtp, isAppOwnedOtpVerified, type OtpChannel } from '@/lib/otp'

const PURPOSE = 'application-status' as const

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

export async function sendApplicationStatusOtp(
  phone: string,
  channel: OtpChannel,
): Promise<{ success: boolean; error: string | null; channel: OtpChannel }> {
  const parsedPhone = PhoneSchema.safeParse(phone)
  if (!parsedPhone.success) {
    return { success: false, error: parsedPhone.error.errors[0].message, channel: 'sms' }
  }

  const rl = await checkApplicationStatusOtpRateLimit()
  if (!rl.success) return { success: false, error: rl.error!, channel: 'sms' }

  // Same international-number restriction as guest-otp.ts: AmazeSMS is
  // domestic-only, so WhatsApp is the only valid channel outside +91.
  const effectiveChannel: OtpChannel = isDomestic(phone) ? channel : 'whatsapp'

  return sendAppOwnedOtp({ phone, channel: effectiveChannel, purpose: PURPOSE })
}

export async function verifyApplicationStatusOtp(phone: string, code: string): Promise<{ success: boolean; error: string | null }> {
  const parsedPhone = PhoneSchema.safeParse(phone)
  const parsedCode = z.string().regex(/^\d{6}$/).safeParse(code)
  if (!parsedPhone.success || !parsedCode.success) {
    return { success: false, error: 'Enter the 6-digit code sent to your phone.' }
  }

  const rl = await checkApplicationStatusOtpRateLimit()
  if (!rl.success) return { success: false, error: rl.error! }

  return verifyAppOwnedOtp(phone, code, PURPOSE)
}

/** Used by getMyEventApplicationStatusGuest to confirm the phone was OTP-verified recently. */
export async function isApplicationStatusPhoneVerified(phone: string): Promise<boolean> {
  return isAppOwnedOtpVerified(phone, PURPOSE)
}
