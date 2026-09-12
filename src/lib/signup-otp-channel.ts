// =============================================================================
// WIMC — Signup/login OTP delivery-channel side-channel.
//
// Supabase's native signInWithOtp/verifyOtp owns code generation, hashing,
// and verification for signup/login (see src/app/actions/auth.ts) and has no
// concept of an SMS-vs-WhatsApp choice. sendPhoneOTP stashes the caller's
// channel choice here immediately before calling signInWithOtp; the Send SMS
// Hook route (src/app/api/webhooks/send-sms/route.ts) reads it back by phone
// number to pick a transport, then clears it once the send attempt resolves.
// Deliberately separate from src/lib/otp.ts's app-owned OTP mechanics — that
// module's own header comment calls this out as a side-channel it does not
// manage, since signup/login never generates or verifies its own codes.
//
// Peek-then-clear-after, NOT get-then-delete: an earlier version deleted the
// key the moment it was read, before the hook even attempted the send. If
// the hook was ever invoked twice for the same OTP request (a Supabase
// 429/503 retry, or any infra-level retry), the second invocation read an
// already-deleted key and silently fell back to SMS with no signal that a
// fallback had happened — see the incident this file was rewritten for.
// Now the read is a pure peek (no delete), and the hook clears the key
// itself only after its send attempt finishes, success or failure.
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

/**
 * Reads (without clearing) the channel choice for this phone. Defaults to
 * 'sms' if missing/expired — logged, since a real occurrence of this (e.g. a
 * retried hook invocation arriving after TTL, or genuine staleness) used to
 * be an invisible silent fallback and is worth knowing about if it happens.
 * Call clearSignupOtpChannel() once the send attempt this informs has
 * resolved — don't delete on read (see file header).
 */
export async function peekSignupOtpChannel(phone: string): Promise<SignupOtpChannel> {
  const redis = getRedis()
  const k = key(phone)

  if (redis) {
    const raw = await redis.get<string>(k)
    if (raw == null) {
      console.warn('[signup-otp-channel] no preference found for key — defaulting to sms', k)
      return 'sms'
    }
    return raw === 'whatsapp' ? 'whatsapp' : 'sms'
  }

  const entry = memStore.get(k)
  if (!entry || entry.expiresAt <= Date.now()) {
    console.warn('[signup-otp-channel] no preference found for key (mem store) — defaulting to sms', k)
    return 'sms'
  }
  return entry.channel === 'whatsapp' ? 'whatsapp' : 'sms'
}

// Atomic compare-and-delete: only clears the key if it still holds the exact
// value we peeked earlier in this same hook invocation. Guards against a
// slow send (e.g. a laggy WhatsApp API call) finishing after an overlapping,
// later OTP request for the SAME phone number has already written its own
// fresh preference — without this check, our delayed cleanup could wipe out
// that newer request's value out from under it. If the value has changed,
// we leave it alone; that newer request's own hook invocation (or, worst
// case, the 120s TTL) resolves it correctly instead.
const DELETE_IF_UNCHANGED_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
else
  return 0
end
`

/** Clears the channel choice for this phone, once the send it informed has resolved (success or failure). */
export async function clearSignupOtpChannel(phone: string, channel: SignupOtpChannel): Promise<void> {
  const redis = getRedis()
  const k = key(phone)

  if (redis) {
    await redis.eval(DELETE_IF_UNCHANGED_SCRIPT, [k], [channel])
    return
  }

  const entry = memStore.get(k)
  if (entry && entry.channel === channel) {
    memStore.delete(k)
  }
}
