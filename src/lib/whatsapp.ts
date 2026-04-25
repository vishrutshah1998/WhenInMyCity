// =============================================================================
// WIMC — WhatsApp Business API delivery
//
// Uses Meta Cloud API (v20.0) to send text messages.
//
// Required env vars (add to .env.local and Vercel project settings):
//   WHATSAPP_PHONE_NUMBER_ID  — the sender phone number ID from Meta Business
//   WHATSAPP_API_TOKEN        — permanent system user token or temp access token
//
// Graceful degradation: if either env var is absent the function logs the
// would-be message and returns without throwing — identical to the v1 behaviour
// so callers are unaffected during local development.
// =============================================================================

import 'server-only'

const META_API_VERSION = 'v20.0'

/**
 * Sends a plain-text WhatsApp message to the given phone number.
 *
 * Phone should be in E.164 format without the leading '+', e.g. `919876543210`.
 *
 * Fails silently — notifications must never crash the caller.
 */
export async function sendWhatsAppMessage(
  phone: string,
  message: string,
): Promise<void> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const apiToken      = process.env.WHATSAPP_API_TOKEN

  // Normalise phone: strip leading '+' and spaces
  const normalisedPhone = phone.replace(/^\+/, '').replace(/\s/g, '')

  if (!phoneNumberId || !apiToken) {
    // v1 fallback — log the would-be message
    console.log('[NOTIFY:WhatsApp]', { to: normalisedPhone, message })
    return
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/${META_API_VERSION}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${apiToken}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to:                normalisedPhone,
          type:              'text',
          text:              { body: message, preview_url: false },
        }),
      },
    )

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error('[sendWhatsAppMessage] API error', {
        status: res.status, to: normalisedPhone, body,
      })
    }
  } catch (err) {
    console.error('[sendWhatsAppMessage] fetch failed', String(err))
  }
}
