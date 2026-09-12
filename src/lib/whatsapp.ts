// =============================================================================
// WIMC — WhatsApp Business API delivery
//
// Uses Meta Cloud API (v20.0).
//
// Required env vars (add to .env.local and Netlify project settings):
//   WHATSAPP_PHONE_NUMBER_ID  — the sender phone number ID from Meta Business
//   WHATSAPP_API_TOKEN        — permanent system user token or temp access token
//
// Two send functions, not interchangeable:
//   sendWhatsAppMessage()  — free-form text. WhatsApp only allows this to a
//     recipient inside an open 24-hour customer-service window, which opens
//     only when THEY message the business number first. Safe for replies
//     inside that window; will be rejected by Meta (error 131047) for any
//     business-initiated message to a recipient who hasn't messaged in.
//   sendWhatsAppTemplate() — a pre-approved template message. Required for
//     every business-initiated send (RSVP confirmations, reminders, etc.)
//     since the recipient has never messaged in first. Template must show
//     APPROVED status in Meta Business Manager before use, or the send fails.
//
// Graceful degradation: if either env var is absent both functions log the
// would-be message and return without throwing — identical to the v1 behaviour
// so callers are unaffected during local development.
// =============================================================================

import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'

const META_API_VERSION = 'v20.0'

/**
 * Persists a failed send for the small set of templates critical enough to
 * need admin visibility (see migration 082's comment for the full list and
 * reasoning) — call this from a catch block after sendWhatsAppTemplate
 * rejects. Best-effort: never throws, so a broken failure-log write can
 * never mask or compound the original send failure.
 */
export async function recordWhatsAppSendFailure(params: {
  templateName:   string
  recipientPhone: string
  error:          unknown
  eventId?:       string | null
  contextId?:     string | null
}): Promise<void> {
  try {
    const admin = createAdminClient()
    await admin.from('whatsapp_send_failures').insert({
      template_name:   params.templateName,
      recipient_phone: params.recipientPhone,
      error_detail:    params.error instanceof Error ? params.error.message : String(params.error),
      event_id:        params.eventId ?? null,
      context_id:      params.contextId ?? null,
    })
  } catch (err) {
    console.error('[recordWhatsAppSendFailure] failed to persist WhatsApp send failure', String(err))
  }
}

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

/**
 * A dynamic URL button on an approved template. Meta templates configure a
 * fixed base URL per button at creation time (e.g. `wheninmycity.com/{{1}}`);
 * `urlParameter` supplies only the dynamic suffix (e.g. `events/my-event`),
 * not the full URL. `index` is the button's 0-based position in the template.
 */
export interface WhatsAppTemplateButton {
  index:        number
  urlParameter: string
}

/**
 * Sends a pre-approved WhatsApp template message to the given phone number.
 *
 * Required for business-initiated messages (the recipient hasn't messaged
 * the business number first, so no free-form text window is open). The
 * template must already exist and show APPROVED status in Meta Business
 * Manager under `templateName`/`languageCode` — sending against a template
 * that is still PENDING or was REJECTED will fail.
 *
 * Phone should be in E.164 format without the leading '+', e.g. `919876543210`.
 * `params` are mapped positionally to the template body's {{1}}, {{2}}, ... placeholders.
 * `buttons`, if the template defines any dynamic URL buttons, supplies their suffixes.
 *
 * Rejects on a non-OK Meta response or a network/fetch exception — every
 * caller must handle the rejection (try/catch or .catch()). Notifications
 * must still never crash a caller outright, so this is a contract on
 * callers, not a guarantee the function makes itself; the env-var-absent
 * fallback path above is the one case that still resolves normally.
 */
export async function sendWhatsAppTemplate(
  phone: string,
  templateName: string,
  languageCode: string,
  params: string[],
  buttons?: WhatsAppTemplateButton[],
): Promise<void> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const apiToken      = process.env.WHATSAPP_API_TOKEN

  const normalisedPhone = phone.replace(/^\+/, '').replace(/\s/g, '')

  if (!phoneNumberId || !apiToken) {
    console.log('[NOTIFY:WhatsApp:template]', { to: normalisedPhone, templateName, params, buttons })
    return
  }

  const components = [
    {
      type:       'body',
      parameters: params.map((text) => ({ type: 'text', text })),
    },
    ...(buttons ?? []).map((button) => ({
      type:       'button',
      sub_type:   'url',
      index:      String(button.index),
      parameters: [{ type: 'text', text: button.urlParameter }],
    })),
  ]

  let res: Response
  try {
    res = await fetch(
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
          type:              'template',
          template: {
            name:     templateName,
            language: { code: languageCode },
            components,
          },
        }),
      },
    )
  } catch (err) {
    console.error('[sendWhatsAppTemplate] fetch failed', String(err))
    throw err
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error('[sendWhatsAppTemplate] API error', {
      status: res.status, to: normalisedPhone, templateName, body,
    })
    throw new Error(`WhatsApp template send failed (${res.status}): ${body || res.statusText}`)
  }
}
