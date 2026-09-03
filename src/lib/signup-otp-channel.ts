// =============================================================================
// WIMC — Signup/login OTP delivery-channel side-channel.
//
// Supabase's native signInWithOtp/verifyOtp owns code generation, hashing,
// and verification for signup/login (see src/app/actions/auth.ts) and has no
// concept of an SMS-vs-WhatsApp choice. sendPhoneOTP stashes the caller's
// channel choice here immediately before calling signInWithOtp; the Send SMS
// Hook route (src/app/api/webhooks/send-sms/route.ts) reads it back by phone
// number to pick a transport, then deletes it. Deliberately separate from
// src/lib/otp.ts's app-owned OTP mechanics — that module's own header
// comment calls this out as a side-channel it does not manage, since
// signup/login never generates or verifies its own codes.
// =============================================================================

import 'server-only'
import { getRedis } from '@/lib/ratelimit'

export type SignupOtpChannel = 'sms' | 'whatsapp'

const TTL_SECONDS = 2 * 60

// Supabase stores auth.users.phone (and thus the Send SMS Hook payload's
// user.phone) WITHOUT a leading '+', while sendPhoneOTP calls this with a
// '+'-prefixed E.164 string — strip it on both sides so the write (keyed off
// the E.164 value passed to signInWithOtp) and the read (keyed off the
// hook's payload.user.phone) always agree on one key.
function key(phone: string): string {
  return `wimc:signup-otp-channel:${phone.replace(/^\+/, '')}`
}

// In-memory fallback — used only when Upstash isn't configured (local dev
// without env vars). Mirrors the pattern in src/lib/otp.ts.
const memStore = new Map<string, { channel: SignupOtpChannel; expiresAt: number }>()

/** Called just before signInWithOtp, so the Send SMS Hook knows which transport to use. */
export async function setSignupOtpChannel(phone: string, channel: SignupOtpChannel): Promise<void> {
  const redis = getRedis()
  const k = key(phone)
  if (redis) {
    await redis.set(k, channel, { ex: TTL_SECONDS })
  } else {
    memStore.set(k, { channel, expiresAt: Date.now() + TTL_SECONDS * 1000 })
  }
}

/** Reads and deletes the channel choice for this phone. Defaults to 'sms' if missing/expired (e.g. a retry). */
export async function takeSignupOtpChannel(phone: string): Promise<SignupOtpChannel> {
  const redis = getRedis()
  const k = key(phone)
  if (redis) {
    const raw = await redis.get<string>(k)
    if (raw) await redis.del(k)
    return raw === 'whatsapp' ? 'whatsapp' : 'sms'
  }

  const entry = memStore.get(k)
  memStore.delete(k)
  return entry && entry.expiresAt > Date.now() && entry.channel === 'whatsapp' ? 'whatsapp' : 'sms'
}
