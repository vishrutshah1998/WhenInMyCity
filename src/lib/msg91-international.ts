// =============================================================================
// WIMC — MSG91 OTP Widget (international, non-+91 guest OTP)
//
// Domestic (+91) uses AmazeSMS (src/lib/amazesms.ts) — a raw-send transport
// where the app generates/stores/compares its own code. MSG91's plain Flow
// SMS API works the same way but is DLT-gated to India, which has no bearing
// on non-Indian numbers, so it isn't reused here.
//
// International instead uses MSG91's separate "OTP Widget" product (the
// dashboard app named "OTP — Simplified OTP Platform") — a MANAGED
// verification service: MSG91 generates the code, delivers it, and checks it
// itself via its own /verify endpoint. This mirrors the dual-architecture the
// earlier (unused, now-removed) Twilio Verify integration used, just with
// MSG91's API instead — do NOT try to read back or store the code MSG91
// sends; only checkInternationalOtp's boolean result is meaningful.
//
// IMPORTANT — channel (WhatsApp vs SMS vs Voice) is NOT a per-request
// parameter on MSG91's Send OTP API. Per MSG91's docs, the primary delivery
// channel is configured per-country on the MSG91 dashboard under
// OTP → Advanced Settings → country-wise primary channels (multiple
// selections allowed, with automatic fallback if the primary channel fails).
// For the WhatsApp-first product decision to actually take effect, WhatsApp
// must be set as the primary channel for the relevant countries there — this
// code cannot force it. Confirm this is configured before assuming
// sendInternationalOtp delivers over WhatsApp.
//
// "Try SMS instead" (resendInternationalOtpAsSms) uses MSG91's separate
// Resend/Retry OTP API with retrytype=text to force SMS delivery of the SAME
// pending code — it does not generate a new code, and only works after a
// prior sendInternationalOtp call has already succeeded for that number.
//
// Dashboard setup required before ANY of this works (same class of
// prerequisite as AmazeSMS's DLT template, distinct from the abandoned
// domestic Flow template attempt in src/lib/msg91.ts):
//   1. OTP → Templates → Add template, using ##OTP## as the placeholder.
//      The message text is configured HERE on the dashboard — this code
//      does not pass a message body, unlike AmazeSMS.
//   2. OTP → Advanced Settings → set WhatsApp as the primary channel for the
//      target countries, per the note above.
//
// Required env vars:
//   MSG91_INTL_OTP_AUTHKEY     — may be the same account-wide authkey as
//                                MSG91_AUTH_KEY, but kept separate here since
//                                that one belongs to the abandoned domestic
//                                Flow template attempt (src/lib/msg91.ts).
//   MSG91_INTL_OTP_TEMPLATE_ID — the OTP-widget template ID from step 1 above.
// =============================================================================

import 'server-only'

const MSG91_OTP_SEND_URL   = 'https://control.msg91.com/api/v5/otp'
const MSG91_OTP_VERIFY_URL = 'https://control.msg91.com/api/v5/otp/verify'
const MSG91_OTP_RETRY_URL  = 'https://control.msg91.com/api/v5/otp/retry'

function getConfig(): { authkey: string; templateId: string } {
  const authkey = process.env.MSG91_INTL_OTP_AUTHKEY
  const templateId = process.env.MSG91_INTL_OTP_TEMPLATE_ID

  if (!authkey || !templateId) {
    throw new Error(
      'MSG91 international OTP is not configured — missing one of ' +
      'MSG91_INTL_OTP_AUTHKEY, MSG91_INTL_OTP_TEMPLATE_ID',
    )
  }

  return { authkey, templateId }
}

/**
 * Starts an MSG91-managed OTP verification for the given international
 * phone number. MSG91 generates the code and delivers it via whichever
 * channel is configured as primary for that country on MSG91's dashboard
 * (see the module-level note above — this is not selectable per call).
 *
 * @param phone - E.164 phone number, e.g. `+447911123456`.
 * @throws If MSG91 is not configured or the send request fails.
 */
export async function sendInternationalOtp(phone: string): Promise<void> {
  const { authkey, templateId } = getConfig()
  const mobile = phone.replace(/^\+/, '')

  const response = await fetch(MSG91_OTP_SEND_URL, {
    method: 'POST',
    headers: { authkey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ template_id: templateId, mobile }),
  })

  const result = await response.json().catch(() => null)

  if (!response.ok || result?.type !== 'success') {
    throw new Error(`MSG91 international OTP send failed: ${response.status} ${JSON.stringify(result)}`)
  }
}

/**
 * Re-delivers the SAME already-sent code via SMS specifically — the "Try SMS
 * instead" fallback. Does not generate a new code, and only works after a
 * prior sendInternationalOtp call for this number.
 *
 * @throws If MSG91 is not configured, or if the resend request fails (e.g.
 *   because no verification is currently pending for this number).
 */
export async function resendInternationalOtpAsSms(phone: string): Promise<void> {
  const { authkey } = getConfig()
  const mobile = phone.replace(/^\+/, '')

  const response = await fetch(
    `${MSG91_OTP_RETRY_URL}?mobile=${encodeURIComponent(mobile)}&retrytype=text`,
    { method: 'POST', headers: { authkey } },
  )

  const result = await response.json().catch(() => null)

  if (!response.ok || result?.type !== 'success') {
    throw new Error(`MSG91 international OTP SMS resend failed: ${response.status} ${JSON.stringify(result)}`)
  }
}

/**
 * Checks a code the user entered against MSG91's own verification state for
 * this phone number — MSG91 manages this itself; there is nothing to compare
 * locally for this path.
 *
 * @returns true if the code is correct.
 * @throws If MSG91 is not configured or the check request fails outright.
 *   Whether an incorrect code throws or returns a normal unsuccessful
 *   response is unconfirmed against MSG91's real behavior — verify live.
 */
export async function checkInternationalOtp(phone: string, code: string): Promise<boolean> {
  const { authkey } = getConfig()
  const mobile = phone.replace(/^\+/, '')

  const response = await fetch(
    `${MSG91_OTP_VERIFY_URL}?mobile=${encodeURIComponent(mobile)}&otp=${encodeURIComponent(code)}`,
    { method: 'GET', headers: { authkey } },
  )

  const result = await response.json().catch(() => null)

  return response.ok && result?.type === 'success'
}
