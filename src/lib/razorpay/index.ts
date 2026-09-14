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
  RazorpayOrderTransfer,
  RazorpayPayment,
  RazorpayRefund,
  RazorpayTransfer,
  RazorpayTransferCollection,
  RazorpayTransferReversal,
  RazorpayItem,
  RazorpayAddress,
  RazorpayLinkedAccount,
  RazorpayStakeholder,
  RazorpayProductConfiguration,
  RazorpayProductRequirement,
  NormalisedPaymentStatus,
} from '@/types/events'

export type { RazorpayOrderTransfer } from '@/types/events'

const RAZORPAY_BASE = 'https://api.razorpay.com/v1'
// v2 base — Route / Linked Accounts (KYC Track B). Used by createLinkedAccount
// / createStakeholder below (Product Configuration is a later, separate task).
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
 * Formats a RazorpayApiError's `code`/`description`/`field` into a single
 * human-readable string — for writing into `linked_accounts.rejection_reason`
 * (or any other caller-facing surface) instead of a generic "request failed".
 * Falls back to the bare error message if the body isn't Razorpay's standard
 * `{ error: { code, description, field } }` envelope.
 */
export function describeRazorpayError(err: unknown): string {
  if (!(err instanceof RazorpayApiError)) {
    return err instanceof Error ? err.message : String(err)
  }

  const body = err.body as { error?: { code?: string; description?: string; field?: string } } | null
  const e = body?.error
  if (!e) return err.message

  const parts = [e.code, e.field ? `field: ${e.field}` : null, e.description]
    .filter((p): p is string => Boolean(p))

  return parts.length ? parts.join(' — ') : err.message
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
 * Used by the Route / Linked Accounts calls (createLinkedAccount, createStakeholder).
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
 * `transfers` (Razorpay Route, Phase 2) embeds one or more split-payment
 * transfers directly in this same order-creation call — confirmed live,
 * there is no separate "create transfer" endpoint. Whenever `transfers` is
 * non-empty, `partial_payment: false` is set explicitly (Route transfers
 * require it) rather than left to whatever Razorpay's or a future caller's
 * default would be — see the plan doc's Phase 2 hard constraints. Callers
 * are responsible for only ever including transfers whose target account is
 * `activated` (see `buildVenueRouteTransfer` in `./route-transfers` —
 * Razorpay's own API does not enforce this and will silently accept a
 * transfer to a non-activated account).
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
  transfers?: RazorpayOrderTransfer[]
}): Promise<RazorpayOrder> {
  // Razorpay receipt field max length is 40 chars.
  const receipt = params.receipt.slice(0, 40)

  const body: Record<string, unknown> = {
    amount: params.amount,
    currency: params.currency,
    receipt,
    notes: params.notes,
    // payment_capture: 1 → auto-capture immediately after authorization.
    // This means we don't need a separate capture step; the webhook fires
    // payment.captured (not payment.authorized) when funds are received.
    payment_capture: 1,
  }

  if (params.transfers?.length) {
    body.transfers = params.transfers
    // Explicit, not assumed absent — a Route order must never accidentally
    // inherit partial_payment: true from some other order type/caller.
    body.partial_payment = false
  }

  return rzFetch<RazorpayOrder>('/orders', {
    method: 'POST',
    body: JSON.stringify(body),
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
 * Fetches the raw payment entity from Razorpay — `GET /v1/payments/:id`.
 *
 * Exported (not just used internally by `fetchPaymentStatus`) because Route
 * Phase 3's proportional-reversal math (see `computeProportionalReversalAmount`
 * in ./route-refunds.ts) needs the payment's own `amount` — the original
 * captured total a refund and its transfers are both proportions of.
 */
export async function fetchPayment(paymentId: string): Promise<RazorpayPayment> {
  return rzFetch<RazorpayPayment>(`/payments/${paymentId}`)
}

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
  const payment = await fetchPayment(paymentId)

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
 * `reverseAll` (Razorpay Route, Phase 3): pass `true` on a FULL refund of a
 * payment that has Route transfers attached — confirmed live, `reverse_all:
 * true` auto-reverses every transfer associated with the payment in this
 * same call, no separate Transfer Reversal call needed. Confirmed live that
 * `reverse_all` cannot be combined with a partial `amount` — Razorpay
 * rejects it; never pass both. Existing callers (cancelEvent,
 * reconcile-payments' failed-refund retry) omit this and are unaffected —
 * see route-refunds.ts for the Route-aware partial-refund path, which
 * computes and submits reversals separately since Razorpay won't do it for
 * them.
 *
 * @param paymentId  - Razorpay payment ID (pay_xxx).
 * @param amount     - Optional amount to refund in paise. Omit for full refund.
 * @param reverseAll - Full refunds only. Auto-reverses associated Route transfers.
 * @returns `{ refund_id }` on success, `{ refund_id: '', error }` on failure.
 */
export async function refundPayment(
  paymentId: string,
  amount?: number,
  reverseAll?: boolean,
): Promise<{ refund_id: string; error?: string }> {
  try {
    const body: Record<string, unknown> = {
      // 'optimum' attempts instant refund if supported, falls back to normal.
      speed: 'optimum',
    }
    if (amount !== undefined) body.amount = amount
    if (reverseAll) body.reverse_all = true

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
// fetchPaymentTransfers / createTransferReversal — Razorpay Route (Phase 3)
// ---------------------------------------------------------------------------

/**
 * Fetches every transfer created against a payment — `GET
 * /v1/payments/:id/transfers`.
 *
 * Deliberately fetched fresh rather than reading any locally-stored transfer
 * id: Phase 2 (order-time transfer attachment) does not persist the
 * resulting `trf_...` id anywhere, and this response's `amount_reversed` is
 * needed live anyway (plan Phase 3 hard gate — never reverse against a
 * transfer without first confirming, via a fresh fetch, how much of it is
 * already reversed). See `reverseTransfersForPartialRefund` in
 * ./route-refunds.ts, the only caller.
 */
export async function fetchPaymentTransfers(paymentId: string): Promise<RazorpayTransfer[]> {
  const res = await rzFetch<RazorpayTransferCollection>(`/payments/${paymentId}/transfers`)
  return res.items
}

/**
 * Reverses (all or part of) a single transfer — `POST
 * /v1/transfers/:id/reversals`.
 *
 * Confirmed live (plan Phase 3): the response's `customer_refund_id` is
 * always `null`, even for a reversal performed specifically to compensate a
 * refund — Razorpay does not link the two. Callers must record the
 * refund↔transfer↔reversal link themselves; see migration 085
 * (`route_transfer_reversals`) and `reverseTransfersForPartialRefund`.
 *
 * `amount` is required here (unlike a bare reversal call, which would
 * default to reversing the transfer's full remaining amount) — every caller
 * in this codebase computes a specific proportional amount first and must
 * pass it explicitly, never rely on the endpoint's own default.
 *
 * Razorpay's behavior when the linked account's floating balance is
 * insufficient to cover a reversal is NOT YET CONFIRMED (plan Open Decision
 * #9) — this throws `RazorpayApiError` like any other failed call; callers
 * must not assume a specific error shape for that case.
 */
export async function createTransferReversal(
  transferId: string,
  amount: number,
  notes?: Record<string, string>,
): Promise<RazorpayTransferReversal> {
  return rzFetch<RazorpayTransferReversal>(`/transfers/${transferId}/reversals`, {
    method: 'POST',
    body: JSON.stringify({ amount, ...(notes ? { notes } : {}) }),
  })
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

// ---------------------------------------------------------------------------
// createLinkedAccount / createStakeholder — Razorpay Route (v2)
//
// Phase 1 of the Route integration plan: KYC onboarding for a creator's or
// venue's Linked Account. See supabase/migrations/083_linked_accounts.sql
// for the row this writes into, and the plan doc's "Validated Findings" for
// how these shapes were confirmed against the live v2 API (not assumed from
// docs alone).
// ---------------------------------------------------------------------------

/**
 * Creates a Razorpay Route Linked Account — `POST /v2/accounts`.
 *
 * Caller must have already validated `pan` against `businessType` locally
 * (see `validatePanMatchesBusinessType`) — Razorpay's own 400 on a mismatch
 * is a confirmed but late signal; failing fast client-side avoids a wasted
 * round trip on a predictable error.
 *
 * `category`/`subcategory` are not yet confirmed for a real ticketing
 * business (plan Finding #6) — callers currently get Razorpay's own
 * example placeholders via `ROUTE_CATEGORY`/`ROUTE_SUBCATEGORY` below.
 */
export async function createLinkedAccount(params: {
  email: string
  phone: string
  referenceId: string
  legalBusinessName: string
  businessType: string
  contactName: string
  registeredAddress: RazorpayAddress
  pan: string
  gst?: string
}): Promise<RazorpayLinkedAccount> {
  return rzFetchV2<RazorpayLinkedAccount>('/accounts', {
    method: 'POST',
    body: JSON.stringify({
      email: params.email,
      phone: params.phone,
      type: 'route',
      reference_id: params.referenceId,
      legal_business_name: params.legalBusinessName,
      business_type: params.businessType,
      contact_name: params.contactName,
      profile: {
        // TODO: confirm real category/subcategory for a ticketing business
        // with Razorpay support (plan Phase 0 / Finding #6) — these are
        // Razorpay's own documented example values, not WIMC-specific.
        category: 'healthcare',
        subcategory: 'clinic',
        addresses: {
          registered: params.registeredAddress,
        },
      },
      legal_info: {
        pan: params.pan,
        ...(params.gst ? { gst: params.gst } : {}),
      },
    }),
  })
}

/**
 * Creates the (single, Route-limited) Stakeholder on a Linked Account —
 * `POST /v2/accounts/:account_id/stakeholders`.
 *
 * Only call this once `accountId` (an `acc_...` id from `createLinkedAccount`)
 * exists — Route requires the account before a stakeholder can attach to it.
 */
export async function createStakeholder(
  accountId: string,
  params: {
    name: string
    email: string
    residentialAddress: RazorpayAddress
    pan: string
  },
): Promise<RazorpayStakeholder> {
  return rzFetchV2<RazorpayStakeholder>(`/accounts/${accountId}/stakeholders`, {
    method: 'POST',
    body: JSON.stringify({
      name: params.name,
      email: params.email,
      addresses: {
        residential: params.residentialAddress,
      },
      kyc: {
        pan: params.pan,
      },
    }),
  })
}

// ---------------------------------------------------------------------------
// PAN ↔ business_type validation
//
// The Income Tax Dept's PAN structure encodes the holder's entity category
// in the 4th character. Razorpay cross-validates this against the account's
// declared `business_type` and hard-400s on a mismatch (plan Finding #3) —
// this check exists to catch that locally, before ever calling Razorpay.
//
// Only 'partnership' → 'F' has been confirmed against Razorpay's specific
// validation via live testing (Finding #3). The rest follow the standard
// CBDT PAN category codes but are NOT yet confirmed against Razorpay's exact
// business_type enum — entity types with a genuinely ambiguous PAN category
// (society/ngo/trust can each legally hold 'A' or 'T' PANs; 'llp' can hold
// either the pre-2018 'F' or the dedicated 'E' code) are intentionally left
// unchecked here rather than guessing and producing a false-positive
// rejection. Confirm the full mapping with Razorpay support before treating
// this as exhaustive (see plan Phase 0).
// ---------------------------------------------------------------------------

/** Razorpay's documented `business_type` values for a Route Linked Account. */
export const ROUTE_BUSINESS_TYPES = [
  'individual',
  'proprietorship',
  'partnership',
  'private_limited',
  'public_limited',
  'llp',
  'huf',
  'trust',
  'society',
  'ngo',
  'not_yet_registered',
  'education',
  'other',
] as const

export type RouteBusinessType = (typeof ROUTE_BUSINESS_TYPES)[number]

/** business_type → expected PAN 4th-character(s). Omitted = no local check (see comment above). */
const PAN_FOURTH_CHAR_BY_BUSINESS_TYPE: Partial<Record<RouteBusinessType, string[]>> = {
  individual: ['P'],
  proprietorship: ['P'],
  partnership: ['F'],   // confirmed live — plan Finding #3
  private_limited: ['C'],
  public_limited: ['C'],
  llp: ['E', 'F'],
  huf: ['H'],
  not_yet_registered: ['P'],
}

/**
 * Fails fast if `pan`'s 4th character doesn't match what `businessType`
 * predicts, mirroring Razorpay's own server-side check (plan Finding #3).
 * Returns `{ ok: true }` (no opinion) for business types with no confirmed
 * 1:1 PAN-category mapping — see the comment block above.
 */
export function validatePanMatchesBusinessType(
  pan: string,
  businessType: string,
): { ok: true } | { ok: false; error: string } {
  const expected = PAN_FOURTH_CHAR_BY_BUSINESS_TYPE[businessType as RouteBusinessType]
  if (!expected) return { ok: true }

  const actual = pan.toUpperCase().charAt(3)
  if (!expected.includes(actual)) {
    return {
      ok: false,
      error: `PAN "${pan}" (4th character "${actual}") does not match business_type "${businessType}" (expected ${expected.join(' or ')}). Razorpay will hard-reject this at Create Linked Account.`,
    }
  }
  return { ok: true }
}

// ---------------------------------------------------------------------------
// requestProductConfiguration / updateProductConfiguration — Razorpay Route (v2)
//
// Phase 1, second half: attaches the Route product to a Linked Account and
// submits settlement (bank) details. See the plan doc's Validated Findings
// #8-#14 for the confirmed, sometimes-surprising behavior these wrap:
// idempotent-but-not-resettable Request, a hard retry ceiling on Update with
// no distinct error code, and async/non-deterministic activation_status.
// ---------------------------------------------------------------------------

/**
 * Requests a Product Configuration — `POST /v2/accounts/:account_id/products`.
 *
 * CRITICAL (plan Finding #9): this is idempotent per account, not a way to
 * get a fresh config. Calling it again on an account that already has a
 * product_config_id returns the SAME config (possibly already retry-locked)
 * — it does not reset anything. Callers must only invoke this when they
 * don't already have a product_config_id on file; see
 * `requestProductConfigurationAction` in route-linked-accounts.ts.
 */
export async function requestProductConfiguration(
  accountId: string,
): Promise<RazorpayProductConfiguration> {
  return rzFetchV2<RazorpayProductConfiguration>(`/accounts/${accountId}/products`, {
    method: 'POST',
    body: JSON.stringify({
      product_name: 'route',
      tnc_accepted: true,
    }),
  })
}

/**
 * Submits settlement (bank) details onto an existing Product Configuration —
 * `PATCH /v2/accounts/:account_id/products/:product_config_id`.
 *
 * Has a confirmed, hard, per-config retry ceiling (observed at 2 failed
 * submissions — plan Finding #8) with no recovery path other than a brand
 * new Linked Account (Finding #9) — callers must gate on the account's
 * current status before ever reaching this call; see
 * `updateProductConfigurationAction`.
 */
export async function updateProductConfiguration(
  accountId: string,
  productConfigId: string,
  settlements: { accountNumber: string; beneficiaryName: string; ifscCode: string },
): Promise<RazorpayProductConfiguration> {
  return rzFetchV2<RazorpayProductConfiguration>(
    `/accounts/${accountId}/products/${productConfigId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        settlements: {
          account_number: settlements.accountNumber,
          beneficiary_name: settlements.beneficiaryName,
          ifsc_code: settlements.ifscCode,
        },
      }),
    },
  )
}

/**
 * Reads the current Product Configuration state — `GET
 * /v2/accounts/:account_id/products/:product_config_id`.
 *
 * NOT a source of truth for activation (plan Finding #11 — the same
 * account/config was observed flipping needs_clarification -> under_review
 * -> needs_clarification across consecutive reads with no API call from us
 * in between). Only for manual/admin "check now" tooling; never write this
 * response's `activation_status` into `linked_accounts.status` as if it
 * were authoritative — only a webhook can be.
 */
export async function fetchProductConfiguration(
  accountId: string,
  productConfigId: string,
): Promise<RazorpayProductConfiguration> {
  return rzFetchV2<RazorpayProductConfiguration>(
    `/accounts/${accountId}/products/${productConfigId}`,
  )
}

/**
 * True if any requirement's `description` indicates the account's retry
 * ceiling on settlement submission has been exceeded. There is no distinct
 * `reason_code` for this case (confirmed live — plan Finding #8); the only
 * signal is this substring in `description`, shared with the ordinary
 * user-fixable `needs_clarification` reason_code. Case-insensitive substring
 * match, matching how this was actually observed in testing.
 */
export function isConfigLockedResponse(requirements: RazorpayProductRequirement[]): boolean {
  return requirements.some((r) => /max retry exceeded/i.test(r.description ?? ''))
}

/** Joins requirement descriptions into one string for `rejection_reason`. */
export function summarizeRequirements(requirements: RazorpayProductRequirement[]): string {
  return requirements.map((r) => r.description).filter(Boolean).join('; ')
}
