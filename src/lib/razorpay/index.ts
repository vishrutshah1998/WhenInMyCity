// =============================================================================
// WIMC — Razorpay API client
//
// All calls are server-side only (never import this in client components).
// Credentials come from environment variables — the secret key is never
// exposed to the browser.
//
// UPI note: this backend creates standard Razorpay orders. The frontend
// configures UPI Intent (Turbo UPI) via Razorpay Checkout.js:
//   { method: 'upi', flow: 'intent' }  → opens GP / PhonePe / Paytm in-app
//   { method: 'upi', flow: 'qr' }      → QR code fallback (no VPA input)
// UPI Collect (manual VPA entry) is NOT used — deprecated by NPCI Feb 28 2026.
// =============================================================================

import 'server-only'

import { createHmac, timingSafeEqual } from 'crypto'
import type {
  RazorpayOrder,
  RazorpayPayment,
  RazorpayRefund,
  RazorpayItem,
  NormalisedPaymentStatus,
} from '@/types/events'

const RAZORPAY_BASE = 'https://api.razorpay.com/v1'
// v2 base — Route / Linked Accounts (KYC Track B). Not called anywhere yet.
const RAZORPAY_BASE_V2 = 'https://api.razorpay.com/v2'

// ---------------------------------------------------------------------------
// Internal HTTP helpers
// ---------------------------------------------------------------------------

/**
 * Returns a Basic Auth header value for the Razorpay API.
 * Throws if credentials are missing so callers fail loudly at startup rather
 * than silently during a live payment.
 */
function authHeader(): string {
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET

  if (!keyId || !keySecret) {
    throw new Error(
      'RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in environment variables',
    )
  }

  return 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64')
}

/** Typed error class so callers can distinguish Razorpay failures from bugs. */
export class RazorpayApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body: unknown,
  ) {
    super(message)
    this.name = 'RazorpayApiError'
  }
}

/**
 * Thin wrapper around `fetch` for Razorpay API calls.
 * Adds auth, sets JSON headers, and throws `RazorpayApiError` on non-2xx.
 */
async function rzFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  return rzFetchBase<T>(RAZORPAY_BASE, path, options)
}

/**
 * Same auth/error handling as `rzFetch`, but against the Razorpay v2 base.
 * Plumbing only for now — Route / Linked Accounts calls land in Track B.
 */
async function rzFetchV2<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  return rzFetchBase<T>(RAZORPAY_BASE_V2, path, options)
}

async function rzFetchBase<T>(
  base: string,
  path: string,
  options: RequestInit,
): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  const body = await res.json().catch(() => null)

  if (!res.ok) {
    const message: string =
      (body as { error?: { description?: string } })?.error?.description ??
      `Razorpay ${res.status}`
    throw new RazorpayApiError(res.status, message, body)
  }

  return body as T
}

// ---------------------------------------------------------------------------
// createRazorpayOrder
// ---------------------------------------------------------------------------

/**
 * Creates a Razorpay order — the first step of every paid checkout.
 *
 * An order represents the "intent to pay" and locks the amount on Razorpay's
 * side.  The order ID is passed to the frontend Checkout.js widget.  We store
 * it in the RSVP row (`razorpay_order_id`) BEFORE the user pays so that the
 * webhook can match the payment back to the booking (order-first pattern).
 *
 * `receipt` is a unique idempotency key per order (max 40 chars).  If the same
 * receipt is submitted twice Razorpay returns the existing order, preventing
 * duplicate charges.
 *
 * @example
 * const order = await createRazorpayOrder({
 *   amount: 29900,
 *   currency: 'INR',
 *   receipt: 'rsvp_abc123_usr_xyz',
 *   notes: { event_id: 'uuid', user_id: 'uuid' },
 * })
 */
export async function createRazorpayOrder(params: {
  amount: number
  currency: 'INR'
  receipt: string
  notes: Record<string, string>
}): Promise<RazorpayOrder> {
  // Razorpay receipt field max length is 40 chars.
  const receipt = params.receipt.slice(0, 40)

  return rzFetch<RazorpayOrder>('/orders', {
    method: 'POST',
    body: JSON.stringify({
      amount: params.amount,
      currency: params.currency,
      receipt,
      notes: params.notes,
      // payment_capture: 1 → auto-capture immediately after authorization.
      // This means we don't need a separate capture step; the webhook fires
      // payment.captured (not payment.authorized) when funds are received.
      payment_capture: 1,
    }),
  })
}

// ---------------------------------------------------------------------------
// verifyPaymentSignature
// ---------------------------------------------------------------------------

/**
 * Verifies the Razorpay payment signature sent by the frontend after a
 * successful payment.
 *
 * Razorpay signs the response with:
 *   HMAC_SHA256(RAZORPAY_KEY_SECRET, "<order_id>|<payment_id>")
 *
 * We recompute and compare using `timingSafeEqual` to prevent timing attacks.
 * Never skip this check — a malicious client could craft a fake confirmation.
 *
 * @returns `true` only when the signature is cryptographically valid.
 */
export function verifyPaymentSignature(params: {
  order_id: string
  payment_id: string
  signature: string
}): boolean {
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keySecret) throw new Error('RAZORPAY_KEY_SECRET not set')

  const payload = `${params.order_id}|${params.payment_id}`

  const expected = createHmac('sha256', keySecret)
    .update(payload)
    .digest('hex')

  // Both buffers must be the same length for timingSafeEqual.
  const expectedBuf = Buffer.from(expected, 'hex')
  const receivedBuf = Buffer.from(params.signature, 'hex')

  if (expectedBuf.length !== receivedBuf.length) return false

  return timingSafeEqual(expectedBuf, receivedBuf)
}

// ---------------------------------------------------------------------------
// verifyWebhookSignature
// ---------------------------------------------------------------------------

/**
 * Verifies the Razorpay webhook signature sent in the `x-razorpay-signature`
 * header.
 *
 * Uses `RAZORPAY_WEBHOOK_SECRET` — a separate secret configured in the
 * Razorpay dashboard under Webhooks, distinct from the API key secret.
 *
 * Razorpay signs the raw request body:
 *   HMAC_SHA256(WEBHOOK_SECRET, rawBody)
 *
 * @param rawBody  - The raw request body as a string (must be byte-identical).
 * @param signature - Value of the `x-razorpay-signature` header.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
): boolean {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!webhookSecret) throw new Error('RAZORPAY_WEBHOOK_SECRET not set')

  const expected = createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex')

  const expectedBuf = Buffer.from(expected, 'hex')
  const receivedBuf = Buffer.from(signature, 'hex')

  if (expectedBuf.length !== receivedBuf.length) return false

  return timingSafeEqual(expectedBuf, receivedBuf)
}

// ---------------------------------------------------------------------------
// fetchPaymentStatus
// ---------------------------------------------------------------------------

/**
 * Fetches the current status of a payment from Razorpay.
 *
 * Used by the reconciliation cron to resolve payments that slipped through
 * the webhook (network failures, missed deliveries).
 *
 * Razorpay statuses → normalised WIMC statuses:
 *   created / authorized → 'authorized'  (payment exists but not settled)
 *   captured             → 'captured'    (funds received)
 *   failed               → 'failed'
 *   refunded             → 'refunded'
 */
export async function fetchPaymentStatus(
  paymentId: string,
): Promise<NormalisedPaymentStatus> {
  const payment = await rzFetch<RazorpayPayment>(`/payments/${paymentId}`)

  switch (payment.status) {
    case 'captured':
      return 'captured'
    case 'failed':
      return 'failed'
    case 'refunded':
      return 'refunded'
    case 'created':
    case 'authorized':
    default:
      return 'authorized'
  }
}

// ---------------------------------------------------------------------------
// refundPayment
// ---------------------------------------------------------------------------

/**
 * Initiates a refund for a captured payment.
 *
 * Partial refunds: pass `amount` in paise to refund less than the full charge.
 * Full refund: omit `amount` — Razorpay defaults to the total captured amount.
 *
 * Refunds are processed asynchronously by Razorpay (typically 5–7 business
 * days for UPI → bank account).  The `refund.processed` webhook fires when
 * the funds are returned.
 *
 * @param paymentId - Razorpay payment ID (pay_xxx).
 * @param amount    - Optional amount to refund in paise. Omit for full refund.
 * @returns `{ refund_id }` on success, `{ refund_id: '', error }` on failure.
 */
export async function refundPayment(
  paymentId: string,
  amount?: number,
): Promise<{ refund_id: string; error?: string }> {
  try {
    const body: Record<string, unknown> = {
      // 'optimum' attempts instant refund if supported, falls back to normal.
      speed: 'optimum',
    }
    if (amount !== undefined) body.amount = amount

    const refund = await rzFetch<RazorpayRefund>(
      `/payments/${paymentId}/refund`,
      { method: 'POST', body: JSON.stringify(body) },
    )

    return { refund_id: refund.id }
  } catch (err) {
    const message = err instanceof RazorpayApiError ? err.message : String(err)
    console.error(`[refundPayment] payment_id=${paymentId}`, message)
    return { refund_id: '', error: message }
  }
}

// ---------------------------------------------------------------------------
// initializeRazorpayEvent  (internal — called by createEvent server action)
// ---------------------------------------------------------------------------

/**
 * Creates a Razorpay catalog item representing this event's ticket.
 *
 * Items are reusable entities in Razorpay's catalog.  Storing the item ID
 * in `events.razorpay_event_id` lets us link all RSVP orders back to a
 * single event entity for reconciliation and reporting in the Razorpay
 * dashboard.
 *
 * Only called when `ticket_price > 0`.  Free events don't need a Razorpay
 * entity since no payment is processed.
 *
 * @returns The Razorpay item ID (item_xxx) to store in `events.razorpay_event_id`.
 */
export async function initializeRazorpayEvent(params: {
  title: string
  description?: string | null
  ticketPricePaise: number
}): Promise<string> {
  const item = await rzFetch<RazorpayItem>('/items', {
    method: 'POST',
    body: JSON.stringify({
      name: params.title.slice(0, 512),
      description: params.description?.slice(0, 2048) ?? null,
      amount: params.ticketPricePaise,
      unit: 'ticket',
      currency: 'INR',
    }),
  })

  return item.id
}
