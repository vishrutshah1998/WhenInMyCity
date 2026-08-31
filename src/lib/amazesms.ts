// =============================================================================
// WIMC — AmazeSMS SMS delivery (plain transactional SMS, not an OTP-widget
// product — the caller already has the OTP; this just delivers it).
//
// Replaces src/lib/msg91.ts as the domestic (+91) SMS transport — MSG91's
// Flow OTP template was never actually approved/working. AmazeSMS has a real,
// DLT-linked template under our entity. Same send-side contract as msg91.ts
// (`sendOtpSms`), so callers (the Supabase Send SMS Hook and the guest-RSVP
// OTP flow) are unaffected by the transport swap.
//
// Required env vars:
//   AMAZESMS_API_KEY — from the AmazeSMS dashboard.
//   AMAZESMS_API_PASSWORD — from the AmazeSMS dashboard.
//
// Unlike src/lib/whatsapp.ts, this does NOT fail silently: callers rely on a
// thrown error to know delivery genuinely failed, so `sendOtpSms` throws on
// any failure.
// =============================================================================

import 'server-only'

const AMAZESMS_URL = 'https://api.amazesms.com/api/sms'
const AMAZESMS_SENDER_ID = 'WHENIN'
const AMAZESMS_TEMPLATE_ID = '1077267380009382091'
const AMAZESMS_ENTITY_ID = '1001909029710525506'

/**
 * Sends a DLT-approved transactional SMS containing the given OTP to an
 * Indian mobile number via AmazeSMS.
 *
 * @param phone - E.164 phone number, e.g. `+919876543210`.
 * @param otp - The OTP code to deliver.
 * @throws If required env vars are missing or AmazeSMS reports a failure.
 */
export async function sendOtpSms(phone: string, otp: string): Promise<void> {
  const apiKey = process.env.AMAZESMS_API_KEY
  const apiPassword = process.env.AMAZESMS_API_PASSWORD

  if (!apiKey || !apiPassword) {
    throw new Error('AmazeSMS is not configured — missing AMAZESMS_API_KEY or AMAZESMS_API_PASSWORD')
  }

  // AmazeSMS expects the mobile number without the leading '+'.
  const mobile = phone.replace(/^\+/, '')

  const body = `Your journey to finding your tribe begins here. Use ${otp} to log in to When In My City. Valid for 10 mins. Keep it private!`

  const params = new URLSearchParams({
    key: apiKey,
    password: apiPassword,
    from: AMAZESMS_SENDER_ID,
    to: mobile,
    templateid: AMAZESMS_TEMPLATE_ID,
    entityid: AMAZESMS_ENTITY_ID,
    body,
  })

  const response = await fetch(`${AMAZESMS_URL}?${params.toString()}`, {
    method: 'GET',
  })

  const result = await response.text().catch(() => null)

  if (!response.ok) {
    throw new Error(`AmazeSMS send failed: ${response.status} ${result}`)
  }
}
