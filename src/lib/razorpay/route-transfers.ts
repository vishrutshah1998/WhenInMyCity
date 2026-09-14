// =============================================================================
// WIMC — Razorpay Route order-transfer logic (Phase 2)
//
// Builds the `transfers[]` entry attached to an order at creation time (see
// `createRazorpayOrder` in ./index.ts) for a venue's share of a ticketed
// event's revenue. Does NOT compute the split itself — `venueSharePaise` is
// expected to already be `calculateRevenueSplit()`'s `venuePaise` (the same
// number written to `rsvps.venue_fee_paise` and used by every existing
// manual venue-payout path in venue-payouts.ts/payouts.ts). Reusing that
// number, rather than deriving a separate figure from the venue-booking
// negotiation system (`booking_proposals.counter_offer` — a different
// concept: negotiated rental/door-split/minimum-spend terms for the venue
// booking itself, not the per-ticket revenue split), keeps Route transfers
// in agreement with what manual payouts would compute for the same event.
//
// Deliberately NOT implemented here: settlement-hold scheduling (Hold
// Settlements For Transfers / Modify Transfer Settlement Hold), refunds/
// reversals, or the 24-hour cooling-period check from Phase 1 — those are
// separate, later tasks. `on_hold`/`on_hold_until` exist on the transfer
// shape (RazorpayOrderTransfer) but are not populated by this function.
// =============================================================================

import type { RazorpayOrderTransfer } from '@/types/events'

/** The subset of a `linked_accounts` row this function needs to decide. */
export interface RouteTransferLinkedAccount {
  razorpay_account_id: string | null
  status: string
}

export interface BuildVenueRouteTransferInput {
  linkedAccount: RouteTransferLinkedAccount | null
  /** Total venue share for this order, in paise — see module doc above for source. */
  venueSharePaise: number
  eventId: string
  venueId: string
}

export interface BuildVenueRouteTransferResult {
  transfer: RazorpayOrderTransfer | null
  /** Non-null whenever `transfer` is null and there WAS a venue share to route — for logging. */
  skippedReason: 'no_linked_account' | `not_activated:${string}` | null
}

/**
 * Builds the Route transfer for a venue's share of an order, or explicitly
 * declines to (returning a reason) when the venue isn't ready to receive one.
 *
 * CRITICAL, non-negotiable (plan Phase 2 Finding #3): confirmed via live
 * testing that Razorpay's Create Order API does NOT validate that a
 * `transfers[].account` is `activated` — it will accept and create a
 * transfer against a non-activated Linked Account with no error, and the
 * failure surfaces much later (delayed settlement) or never (silently).
 * This function is the *only* enforcement point for that gate; nothing
 * downstream re-checks it, so every call site must go through here rather
 * than building a transfer object by hand.
 *
 * Decision — skip the transfer, never fail the order: when the venue has no
 * Linked Account yet, or one that isn't `activated`, this returns
 * `transfer: null` rather than throwing. The order is still created for the
 * full amount (status quo, pre-Route behavior); the venue's share stays
 * with the platform account and is paid out via the existing manual
 * admin-approved flow (`venue_payout_requests` / `/admin/venue-payouts`),
 * same as every venue today before Route activation. Failing the whole
 * ticket purchase because a venue hasn't finished Route KYC would make
 * every such event unbookable — a severe, unnecessary regression of the
 * ticketing path for a purely additive automation feature. Callers should
 * log `skippedReason` for visibility, not surface it to the buyer.
 */
export function buildVenueRouteTransfer(
  input: BuildVenueRouteTransferInput,
): BuildVenueRouteTransferResult {
  const { linkedAccount, venueSharePaise, eventId, venueId } = input

  if (venueSharePaise <= 0) {
    return { transfer: null, skippedReason: null }
  }

  if (!linkedAccount?.razorpay_account_id) {
    return { transfer: null, skippedReason: 'no_linked_account' }
  }

  if (linkedAccount.status !== 'activated') {
    return { transfer: null, skippedReason: `not_activated:${linkedAccount.status}` }
  }

  const transfer: RazorpayOrderTransfer = {
    account: linkedAccount.razorpay_account_id,
    // TODO: confirm fee absorption model with Razorpay support before
    // finalizing payout amount math (plan Finding #6). Razorpay deducts its
    // own `fees` from the transfer amount itself; whether the venue's net
    // receipt is (venueSharePaise - fees) or the platform absorbs the fee
    // separately (topping up the transfer) is not yet confirmed. Until
    // resolved, this passes venueSharePaise through unadjusted.
    amount: venueSharePaise,
    currency: 'INR',
    notes: { event_id: eventId, venue_id: venueId },
  }

  return { transfer, skippedReason: null }
}
