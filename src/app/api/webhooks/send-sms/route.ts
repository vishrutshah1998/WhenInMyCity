// =============================================================================
// WIMC — Supabase "Send SMS" Auth Hook
//
// Supabase Auth calls this endpoint instead of its built-in SMS provider
// whenever it needs to deliver a phone-auth OTP (signInWithOtp / verifyOtp
// call sites are untouched — see src/app/actions/auth.ts). This swaps the
// delivery leg from Twilio (unreliable for Indian numbers) to MSG91, without
// changing anything else about the phone-auth flow.
//
// CRITICAL RULES for this hook specifically (per Supabase's Send SMS Hook
// contract — https://supabase.com/docs/guides/auth/auth-hooks/send-sms-hook):
//   1. Verify the Standard Webhooks signature BEFORE ever touching the
//      payload or calling MSG91. An unverified request here is a live abuse
//      vector — anyone who finds this URL could trigger arbitrary SMS sends
//      and drain the MSG91 wallet / spam real phone numbers.
//   2. Read the raw body for verification — parsing first breaks the
//      signature check (same rule as the Razorpay webhook handler).
//   3. Unlike the Razorpay handler, do NOT always return 200. Supabase's
//      contract expects an empty 200 body on success and a
//      `{ error: { http_code, message } }` shape (with a matching HTTP
//      status) on failure, so Supabase — and therefore the waiting user —
//      knows the OTP genuinely wasn't delivered instead of believing it was.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'standardwebhooks'
import { sendOtpSms } from '@/lib/msg91'

interface SendSmsHookPayload {
  user: {
    id: string
    phone?: string
  }
  sms: {
    otp: string
  }
}

function hookError(httpCode: number, message: string): NextResponse {
  console.error('[send-sms-hook]', message)
  return NextResponse.json(
    { error: { http_code: httpCode, message } },
    { status: httpCode },
  )
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ── 1. Read raw body (MUST happen before any parsing) ───────────────────
  const rawBody = await request.text()

  // ── 2. Verify Standard Webhooks signature ────────────────────────────────
  const hookSecret = process.env.SEND_SMS_HOOK_SECRET
  if (!hookSecret) {
    return hookError(500, 'SEND_SMS_HOOK_SECRET not set')
  }

  const headers = {
    'webhook-id': request.headers.get('webhook-id') ?? '',
    'webhook-timestamp': request.headers.get('webhook-timestamp') ?? '',
    'webhook-signature': request.headers.get('webhook-signature') ?? '',
  }

  let payload: SendSmsHookPayload
  try {
    const base64Secret = hookSecret.replace('v1,whsec_', '')
    const wh = new Webhook(base64Secret)
    payload = wh.verify(rawBody, headers) as SendSmsHookPayload
  } catch (err) {
    return hookError(401, `Signature verification failed: ${(err as Error).message}`)
  }

  // ── 3. Extract phone + otp and deliver via MSG91 ─────────────────────────
  const phone = payload.user?.phone
  const otp = payload.sms?.otp

  if (!phone || !otp) {
    return hookError(400, 'Payload missing user.phone or sms.otp')
  }

  try {
    await sendOtpSms(phone, otp)
  } catch (err) {
    return hookError(500, `Failed to send sms: ${(err as Error).message}`)
  }

  // ── 4. Success — empty 200 body, per hook contract ───────────────────────
  return NextResponse.json({}, { status: 200 })
}
