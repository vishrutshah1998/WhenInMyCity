// =============================================================================
// WIMC — Razorpay Route refund creation + transfer reversal (Phase 3)
//
// Extends the existing refund flow (`refundPayment` in ./index.ts, used
// today by `cancelEvent` in src/app/actions/events.ts and the
// reconcile-payments cron's failed-refund retry — both always full refunds)
// to be Route-aware:
//
//   - Full refund:    `reverse_all: true` on the refund call itself.
//     Confirmed live — Razorpay auto-reverses every transfer associated
//     with the payment in that same call. Nothing further to do.
//   - Partial refund: `reverse_all` cannot be combined with a partial
//     `amount` (confirmed live, Razorpay rejects it), and confirmed via
//     live testing that a partial refund does NOT auto-reverse transfers on
//     its own — the app must separately compute and submit a proportional
//     Transfer Reversal for each transfer on that payment.
//
// Deliberately NOT implemented here: any UI, any RSVP-row status transition
// for a partial refund (rsvps.payment_status has no "partially refunded"
// value — see the enum in migration 001/013 — and this file makes no
// decision about adding one; see the Phase 3 summary for why this was left
// open), and any recovery flow for a reversal that fails due to insufficient
// floating balance (Razorpay's error shape for that case is unconfirmed —
// see the TODO on the reversal call below, plan Open Decision #9).
// =============================================================================

import { createAdminClient } from '@/lib/supabase/admin'
import {
  refundPayment,
  fetchPayment,
  fetchPaymentTransfers,
  createTransferReversal,
  describeRazorpayError,
} from './index'

// ---------------------------------------------------------------------------
// computeProportionalReversalAmount
// ---------------------------------------------------------------------------

/**
 * Computes how much of a single transfer to reverse for a partial refund,
 * proportional to that transfer's share of the original payment.
 *
 * Formula (plan Phase 3, confirmed via live testing that this math is the
 * app's own responsibility — Razorpay does not compute or apply it for a
 * partial refund):
 *
 *   reversal = refundAmount × (transferAmount / paymentAmount)
 *
 * Worked example: a ₹1,000 order (paymentAmountPaise = 100000) has a ₹300
 * venue transfer attached (transferAmountPaise = 30000 — 30% of the order).
 * The buyer gets a ₹200 partial refund (refundAmountPaise = 20000). The
 * venue's transfer should give back that same 30% share of the refund:
 *   20000 × (30000 / 100000) = 20000 × 0.3 = 6000 paise (₹60).
 *
 * Rounded to the nearest paise (`Math.round`) since Razorpay amounts are
 * always integer paise — there's no fractional-paise unit to carry a
 * remainder into, so this is a plain round-to-nearest with no compensating
 * remainder tracking across calls.
 *
 * Capped at `remainingReversiblePaise` — `transfer.amount - transfer.amount_reversed`,
 * fetched fresh by the caller immediately before this is called — so a
 * transfer already partly reversed by an earlier partial refund on the same
 * payment is never over-reversed past what it has left to give back.
 */
export function computeProportionalReversalAmount(params: {
  refundAmountPaise: number
  paymentAmountPaise: number
  transferAmountPaise: number
  remainingReversiblePaise: number
}): number {
  const { refundAmountPaise, paymentAmountPaise, transferAmountPaise, remainingReversiblePaise } = params

  if (paymentAmountPaise <= 0) return 0

  const proportional = Math.round((refundAmountPaise * transferAmountPaise) / paymentAmountPaise)

  return Math.max(0, Math.min(proportional, remainingReversiblePaise))
}

// ---------------------------------------------------------------------------
// reverseTransfersForPartialRefund
// ---------------------------------------------------------------------------

export interface TransferReversalResult {
  transferId: string
  reversalId: string | null
  amount: number
  error: string | null
  skipped: 'already_fully_reversed' | 'zero_amount' | 'already_recorded' | null
}

/**
 * Reverses each transfer on `paymentId`, proportional to `refundAmountPaise`,
 * and writes the refund↔transfer↔reversal linkage (migration 085) at the
 * point each reversal succeeds — Razorpay itself does not track this link
 * (a reversal's `customer_refund_id` is always `null`, confirmed live).
 *
 * Hard gate (plan Phase 3 point 4): `amount_reversed` is read from a FRESH
 * fetch of the payment's transfers, never from a locally cached value, and a
 * transfer with nothing left to reverse is skipped outright — never
 * blindly resent.
 *
 * Idempotent per (refundId, transferId): if a prior call already recorded a
 * reversal for this exact pair (migration 085's `UNIQUE (refund_id,
 * transfer_id)`), that row is reused rather than calling Razorpay again —
 * this function may be retried (network failure, caller retry, etc.) and
 * must not assume it runs exactly once.
 */
export async function reverseTransfersForPartialRefund(params: {
  paymentId: string
  refundId: string
  refundAmountPaise: number
}): Promise<TransferReversalResult[]> {
  const { paymentId, refundId, refundAmountPaise } = params
  const admin = createAdminClient()

  const [payment, transfers] = await Promise.all([
    fetchPayment(paymentId),
    fetchPaymentTransfers(paymentId),
  ])

  const results: TransferReversalResult[] = []

  for (const transfer of transfers) {
    const remainingReversiblePaise = transfer.amount - transfer.amount_reversed

    if (remainingReversiblePaise <= 0) {
      results.push({
        transferId: transfer.id, reversalId: null, amount: 0, error: null,
        skipped: 'already_fully_reversed',
      })
      continue
    }

    // Idempotency check — see function doc comment.
    const { data: existing, error: existingErr } = await admin
      .from('route_transfer_reversals')
      .select('reversal_id, amount')
      .eq('refund_id', refundId)
      .eq('transfer_id', transfer.id)
      .maybeSingle()

    if (existingErr) {
      console.error('[reverseTransfersForPartialRefund] idempotency check failed', {
        refundId, transferId: transfer.id, error: existingErr.message,
      })
      results.push({
        transferId: transfer.id, reversalId: null, amount: 0,
        error: existingErr.message, skipped: null,
      })
      continue
    }

    if (existing) {
      results.push({
        transferId: transfer.id, reversalId: existing.reversal_id, amount: existing.amount,
        error: null, skipped: 'already_recorded',
      })
      continue
    }

    const amount = computeProportionalReversalAmount({
      refundAmountPaise,
      paymentAmountPaise: payment.amount,
      transferAmountPaise: transfer.amount,
      remainingReversiblePaise,
    })

    if (amount <= 0) {
      results.push({ transferId: transfer.id, reversalId: null, amount: 0, error: null, skipped: 'zero_amount' })
      continue
    }

    let reversalId: string
    try {
      // TODO: confirm floating-balance-insufficient error behavior with
      // Razorpay support before building specific recovery UX (plan Open
      // Decision #9) — this call is left to surface whatever error Razorpay
      // actually returns rather than assuming a shape for that case.
      const reversal = await createTransferReversal(transfer.id, amount, {
        refund_id: refundId,
      })
      reversalId = reversal.id
    } catch (err) {
      const message = describeRazorpayError(err)
      console.error('[reverseTransfersForPartialRefund] reversal call failed', {
        refundId, transferId: transfer.id, amount, error: message,
      })
      results.push({ transferId: transfer.id, reversalId: null, amount, error: message, skipped: null })
      continue
    }

    const { data: row, error: insertErr } = await admin
      .from('route_transfer_reversals')
      .insert({ refund_id: refundId, transfer_id: transfer.id, reversal_id: reversalId, amount })
      .select()
      .single()

    if (insertErr || !row) {
      // The reversal already happened at Razorpay — this is a real
      // partial-failure state (money moved, our record of it didn't land).
      // Logged loudly rather than swallowed; there is no automatic rollback
      // of a Razorpay reversal, so this needs manual reconciliation.
      const message = insertErr?.message ?? 'Insert into route_transfer_reversals returned no row.'
      console.error(
        '[reverseTransfersForPartialRefund] REVERSAL SUCCEEDED AT RAZORPAY BUT LINKAGE ROW FAILED TO WRITE — manual reconciliation required',
        { refundId, transferId: transfer.id, reversalId, amount, error: message },
      )
      results.push({ transferId: transfer.id, reversalId, amount, error: message, skipped: null })
      continue
    }

    results.push({ transferId: transfer.id, reversalId, amount, error: null, skipped: null })
  }

  return results
}

// ---------------------------------------------------------------------------
// createRouteAwareRefund
// ---------------------------------------------------------------------------

export interface RouteAwareRefundResult {
  refundId: string | null
  error: string | null
  /** Per-transfer reversal outcomes. Always empty for a full refund — see field doc below. */
  reversals: TransferReversalResult[]
  /**
   * Set only if reversal processing itself couldn't run after a successful
   * partial refund (e.g. the transfers fetch failed) — distinct from a
   * per-transfer failure, which lands in `reversals[].error` instead. A
   * non-null refundId with a non-null reversalError means the refund
   * succeeded but transfers may still need manual reversal.
   */
  reversalError: string | null
}

/**
 * Creates a refund for `paymentId` and, for a partial refund, reverses the
 * proportional share of every attached Route transfer.
 *
 * Full refunds pass `reverse_all: true` and rely on Razorpay to reverse
 * every transfer in the same call — `reversals` is always `[]` for a full
 * refund, not because nothing was reversed, but because Razorpay doesn't
 * return the reversal ids it created (see migration 085's table comment for
 * why that means there's nothing to record).
 */
export async function createRouteAwareRefund(params: {
  paymentId: string
  refundType: 'full' | 'partial'
  /** Required, and must be > 0, when refundType is 'partial'. Ignored for 'full'. */
  amountPaise?: number
}): Promise<RouteAwareRefundResult> {
  const { paymentId, refundType, amountPaise } = params

  if (refundType === 'partial' && (amountPaise == null || amountPaise <= 0)) {
    return {
      refundId: null,
      error: 'amountPaise is required and must be greater than 0 for a partial refund.',
      reversals: [],
      reversalError: null,
    }
  }

  const { refund_id, error: refundError } = refundType === 'full'
    ? await refundPayment(paymentId, undefined, true)
    : await refundPayment(paymentId, amountPaise)

  if (refundError || !refund_id) {
    return { refundId: null, error: refundError ?? 'Refund failed.', reversals: [], reversalError: null }
  }

  if (refundType === 'full') {
    return { refundId: refund_id, error: null, reversals: [], reversalError: null }
  }

  try {
    const reversals = await reverseTransfersForPartialRefund({
      paymentId,
      refundId: refund_id,
      refundAmountPaise: amountPaise!,
    })
    return { refundId: refund_id, error: null, reversals, reversalError: null }
  } catch (err) {
    const message = describeRazorpayError(err)
    console.error(
      '[createRouteAwareRefund] refund succeeded but reversal processing failed to run — manual reconciliation required',
      { paymentId, refundId: refund_id, error: message },
    )
    return { refundId: refund_id, error: null, reversals: [], reversalError: message }
  }
}
