// =============================================================================
// WIMC — WhatsApp OTP delivery via Meta's Cloud API Authentication template.
//
// Sibling to src/lib/amazesms.ts, not src/lib/whatsapp.ts: notification sends
// in whatsapp.ts fail silently by design ("notifications must never crash the
// caller"), but callers here (src/lib/otp.ts, and eventually the Send SMS
// Hook) rely on a thrown error to know delivery genuinely failed — same
// contract as amazesms.ts's sendOtpSms. Deliberately not built on top of
// sendWhatsAppTemplate() for that reason; this makes its own request.
//
// Requires an Authentication-category template (separate submission/approval
// in Meta Business Manager from the existing Utility templates whatsapp.ts
// sends) named by WHATSAPP_OTP_TEMPLATE_NAME. That template does not exist
// yet as of this writing — sendOtpWhatsApp throws loudly (not a silent
// no-op) whenever the env var is unset, so callers surface a real error to
// the user instead of believing a code was sent.
//
// Send-time request shape confirmed against Meta's own OTP sample app docs
// (WhatsApp/WhatsApp-OTP-Sample-App): despite the template's *creation-time*
// otp_type being COPY_CODE or ONE_TAP, the *send-time* button component uses
// sub_type 'url' — the same shape whatsapp.ts's WhatsAppTemplateButton
// already uses for Utility templates' dynamic URL buttons. The code is
// passed as both the body param and the button param; Meta uses the button
// param's value for the actual copy/autofill action.
// =============================================================================

import 'server-only'

const META_API_VERSION = 'v20.0'

/**
 * Sends the given OTP code to a phone number via a Meta WhatsApp Cloud API
 * Authentication template. Phone should be E.164, e.g. `+919876543210`.
 *
 * @throws If WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_API_TOKEN, or
 *   WHATSAPP_OTP_TEMPLATE_NAME is unset, or Meta reports a failure.
 */
export async function sendOtpWhatsApp(phone: string, code: string): Promise<void> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const apiToken = process.env.WHATSAPP_API_TOKEN
  const templateName = process.env.WHATSAPP_OTP_TEMPLATE_NAME

  if (!phoneNumberId || !apiToken || !templateName) {
    throw new Error(
      'WhatsApp OTP is not configured — missing one of WHATSAPP_PHONE_NUMBER_ID, ' +
      'WHATSAPP_API_TOKEN, WHATSAPP_OTP_TEMPLATE_NAME',
    )
  }

  const normalisedPhone = phone.replace(/^\+/, '').replace(/\s/g, '')

  const response = await fetch(
    `https://graph.facebook.com/${META_API_VERSION}/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: normalisedPhone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'en' },
          components: [
            {
              type: 'body',
              parameters: [{ type: 'text', text: code }],
            },
            {
              type: 'button',
              sub_type: 'url',
              index: '0',
              parameters: [{ type: 'text', text: code }],
            },
          ],
        },
      }),
    },
  )

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`WhatsApp OTP send failed: ${response.status} ${body}`)
  }
}
