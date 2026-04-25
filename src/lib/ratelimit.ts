// =============================================================================
// WIMC — Rate limiting utility
//
// Uses Upstash Redis + @upstash/ratelimit for per-IP token-bucket limiting on
// anonymous-writable endpoints (OTP, newsletter, analytics, RSVP initiation).
//
// Setup: add to .env.local:
//   UPSTASH_REDIS_REST_URL=https://...
//   UPSTASH_REDIS_REST_TOKEN=...
// Get both from https://console.upstash.com — free tier covers ~500k requests/day.
//
// Graceful degradation: if env vars are not set (local dev without Redis),
// the helpers return { success: true } and log a warning. This means rate
// limiting is effectively disabled in that environment but the app still works.
// =============================================================================

import 'server-only'

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { headers } from 'next/headers'

// ---------------------------------------------------------------------------
// Singleton Redis client (lazily initialised)
// ---------------------------------------------------------------------------

let redis: Redis | null = null

function getRedis(): Redis | null {
  if (redis) return redis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  redis = new Redis({ url, token })
  return redis
}

// ---------------------------------------------------------------------------
// Rate limiter factories
// ---------------------------------------------------------------------------

// OTP: 5 requests per 60 s per IP. Supabase also rate-limits, but we add a
// layer so we can detect and alert on enumeration attacks before they cost $$.
const OTP_LIMIT = { requests: 5, window: '60 s' } as const

// Newsletter: 3 subscribes per 60 s per IP to deter list-poisoning loops.
const NEWSLETTER_LIMIT = { requests: 3, window: '60 s' } as const

// Analytics: 60 clicks per 60 s per IP. Blocks click-fraud bots while
// allowing real users browsing a profile quickly.
const ANALYTICS_LIMIT = { requests: 60, window: '60 s' } as const

// RSVP: 10 initiations per 10 min per IP. Prevents denial-of-booking attacks
// where a bot floods pending RSVPs to make an event appear sold out.
const RSVP_LIMIT = { requests: 10, window: '10 m' } as const

function makeLimiter(prefix: string, requests: number, window: `${number} ${'s' | 'm' | 'h' | 'd'}`) {
  const r = getRedis()
  if (!r) return null
  return new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(requests, window),
    prefix: `wimc:rl:${prefix}`,
  })
}

// ---------------------------------------------------------------------------
// Public helpers — call these at the top of each anonymous Server Action
// ---------------------------------------------------------------------------

/**
 * Returns the caller's IP from Vercel/Next.js request headers.
 * Falls back to 'unknown' in local dev (no x-forwarded-for).
 */
async function getIP(): Promise<string> {
  const h = await headers()
  return (
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    h.get('x-real-ip') ??
    'unknown'
  )
}

type LimitResult = { success: boolean; error?: string }

async function check(
  prefix: string,
  requests: number,
  window: `${number} ${'s' | 'm' | 'h' | 'd'}`,
  errorMessage: string,
): Promise<LimitResult> {
  const limiter = makeLimiter(prefix, requests, window)
  if (!limiter) {
    // No Redis configured — skip limiting (dev mode).
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[ratelimit] Upstash not configured — skipping ${prefix} rate limit`)
    }
    return { success: true }
  }
  const ip = await getIP()
  const { success } = await limiter.limit(ip)
  if (!success) return { success: false, error: errorMessage }
  return { success: true }
}

export async function checkOTPRateLimit(): Promise<LimitResult> {
  return check(
    'otp',
    OTP_LIMIT.requests,
    OTP_LIMIT.window,
    'Too many OTP requests. Please wait a minute before trying again.',
  )
}

export async function checkNewsletterRateLimit(): Promise<LimitResult> {
  return check(
    'newsletter',
    NEWSLETTER_LIMIT.requests,
    NEWSLETTER_LIMIT.window,
    'Too many subscription attempts. Please try again later.',
  )
}

export async function checkAnalyticsRateLimit(): Promise<LimitResult> {
  return check(
    'analytics',
    ANALYTICS_LIMIT.requests,
    ANALYTICS_LIMIT.window,
    'Rate limit exceeded.',
  )
}

export async function checkRSVPRateLimit(): Promise<LimitResult> {
  return check(
    'rsvp',
    RSVP_LIMIT.requests,
    RSVP_LIMIT.window,
    'Too many booking attempts. Please wait a few minutes before trying again.',
  )
}
