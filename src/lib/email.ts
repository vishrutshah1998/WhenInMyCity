// =============================================================================
// WIMC — Email delivery via Resend
//
// Required env vars:
//   RESEND_API_KEY    — API key from resend.com
//   RESEND_FROM_EMAIL — verified sender address, e.g. "WIMC <noreply@wheninmycity.com>"
//
// Graceful degradation: if either var is absent the email is logged and
// silently skipped — callers are unaffected during local development.
// =============================================================================

import 'server-only'

export interface EmailPayload {
  to:      string | string[]
  subject: string
  html:    string
  text?:   string
}

/**
 * Sends an email via Resend.
 * Fails silently — notifications must never crash the caller.
 */
export async function sendEmail(payload: EmailPayload): Promise<void> {
  const apiKey  = process.env.RESEND_API_KEY
  const from    = process.env.RESEND_FROM_EMAIL ?? 'WIMC <noreply@wheninmycity.com>'

  if (!apiKey) {
    console.log('[NOTIFY:Email]', { to: payload.to, subject: payload.subject })
    return
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to:      Array.isArray(payload.to) ? payload.to : [payload.to],
        subject: payload.subject,
        html:    payload.html,
        ...(payload.text ? { text: payload.text } : {}),
      }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error('[sendEmail] Resend API error', {
        status: res.status, to: payload.to, body,
      })
    }
  } catch (err) {
    console.error('[sendEmail] fetch failed', String(err))
  }
}

// ---------------------------------------------------------------------------
// HTML templates
// ---------------------------------------------------------------------------

/** Booking confirmation email sent to the attendee after payment capture. */
export function bookingConfirmationHtml(opts: {
  attendeeName:  string
  eventTitle:    string
  eventDate:     string   // pre-formatted, e.g. "Saturday, 26 Apr 2026 · 7:00 PM"
  venueName:     string
  venueAddress:  string
  ticketPrice:   string   // pre-formatted, e.g. "₹499"
  qrCodeUrl:     string   // URL to a QR code image
  eventPageUrl:  string
}): string {
  const { attendeeName, eventTitle, eventDate, venueName, venueAddress, ticketPrice, qrCodeUrl, eventPageUrl } = opts
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Your ticket for ${eventTitle}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0b;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#f0f0f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0b;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#141414;border-radius:16px;overflow:hidden;border:1px solid #2a2a2a;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,rgba(232,112,90,0.3) 0%,rgba(77,210,177,0.1) 100%);padding:32px 40px;text-align:center;">
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#e8705a;">When In My City</p>
              <h1 style="margin:0;font-size:26px;font-weight:800;color:#ffffff;">You&rsquo;re going! 🎉</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              <p style="margin:0 0 24px;font-size:15px;color:#b0b0b0;">Hi ${attendeeName},</p>
              <p style="margin:0 0 24px;font-size:15px;color:#b0b0b0;">Your booking for <strong style="color:#f0f0f0;">${eventTitle}</strong> is confirmed. Here are your details:</p>

              <!-- Event card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#1e1e1e;border-radius:12px;margin-bottom:24px;">
                <tr><td style="padding:20px 24px;">
                  <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#888;">Event</p>
                  <p style="margin:0 0 16px;font-size:18px;font-weight:700;color:#ffffff;">${eventTitle}</p>

                  <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#888;">Date &amp; Time</p>
                  <p style="margin:0 0 16px;font-size:14px;color:#f0f0f0;">${eventDate}</p>

                  <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#888;">Venue</p>
                  <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#f0f0f0;">${venueName}</p>
                  <p style="margin:0 0 16px;font-size:13px;color:#888;">${venueAddress}</p>

                  <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#888;">Amount Paid</p>
                  <p style="margin:0;font-size:16px;font-weight:700;color:#4dd2b1;">${ticketPrice}</p>
                </td></tr>
              </table>

              <!-- QR code -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#1e1e1e;border-radius:12px;margin-bottom:24px;text-align:center;">
                <tr><td style="padding:24px;">
                  <p style="margin:0 0 12px;font-size:13px;color:#b0b0b0;">Show this QR code at the door</p>
                  <img src="${qrCodeUrl}" alt="Your ticket QR code" width="160" height="160" style="border-radius:8px;" />
                  <p style="margin:12px 0 0;font-size:11px;color:#666;">This is your unique entry pass. Do not share it.</p>
                </td></tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <a href="${eventPageUrl}" style="display:inline-block;padding:14px 32px;background:#e8705a;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;">View Event Details</a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#666;text-align:center;">
                Questions? Reply to this email or contact the creator via their WIMC page.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #2a2a2a;text-align:center;">
              <p style="margin:0;font-size:11px;color:#444;">© ${new Date().getFullYear()} When In My City · Made with ❤️ for India&rsquo;s Tier-2 cities</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/** 24-hour event reminder email. */
export function eventReminderHtml(opts: {
  attendeeName: string
  eventTitle:   string
  eventDate:    string
  venueName:    string
  venueAddress: string
  eventPageUrl: string
}): string {
  const { attendeeName, eventTitle, eventDate, venueName, venueAddress, eventPageUrl } = opts
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>See you tomorrow at ${eventTitle}</title></head>
<body style="margin:0;padding:0;background:#0a0a0b;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#f0f0f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0b;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#141414;border-radius:16px;overflow:hidden;border:1px solid #2a2a2a;">
        <tr>
          <td style="background:linear-gradient(135deg,rgba(77,210,177,0.2) 0%,rgba(232,112,90,0.08) 100%);padding:32px 40px;text-align:center;">
            <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#4dd2b1;">When In My City · Reminder</p>
            <h1 style="margin:0;font-size:24px;font-weight:800;color:#ffffff;">See you tomorrow! 🌟</h1>
          </td>
        </tr>
        <tr><td style="padding:32px 40px;">
          <p style="margin:0 0 24px;font-size:15px;color:#b0b0b0;">Hi ${attendeeName}, this is your 24-hour reminder for:</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#1e1e1e;border-radius:12px;margin-bottom:24px;">
            <tr><td style="padding:20px 24px;">
              <p style="margin:0 0 4px;font-size:18px;font-weight:700;color:#ffffff;">${eventTitle}</p>
              <p style="margin:0 0 12px;font-size:14px;color:#b0b0b0;">${eventDate}</p>
              <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#f0f0f0;">${venueName}</p>
              <p style="margin:0;font-size:13px;color:#888;">${venueAddress}</p>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr><td align="center">
              <a href="${eventPageUrl}" style="display:inline-block;padding:14px 32px;background:#4dd2b1;color:#0a0a0b;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;">View Event &amp; QR Code</a>
            </td></tr>
          </table>
          <p style="margin:0;font-size:13px;color:#666;text-align:center;">Don&rsquo;t forget to bring your QR code for entry!</p>
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid #2a2a2a;text-align:center;">
          <p style="margin:0;font-size:11px;color:#444;">© ${new Date().getFullYear()} When In My City</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
