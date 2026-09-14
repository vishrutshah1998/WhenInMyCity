'use server'

// =============================================================================
// WIMC — Razorpay Route refund actions (Phase 3)
//
// Thin, admin-gated wrapper around createRouteAwareRefund (src/lib/razorpay/
// route-refunds.ts) — the actual refund + transfer-reversal mechanics live
// there; see that file's module doc for the full/partial behavior and the
// linkage table (migration 085) it writes.
//
// Keyed on the Razorpay payment id directly, not an rsvps row, and makes no
// decision about rsvps.payment_status for a partial refund — there is no
// "partially refunded" value in that enum (migrations 001/013), and this
// file does not add one. Wiring this into a specific RSVP's cancellation
// flow (which row to update, what status a partial refund should leave it
// in) is left to whichever task actually builds that UI — see the Phase 3
// summary for why this was deliberately left open rather than guessed at.
//
// No UI calls this yet.
// =============================================================================

import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/requireAuth'
import { createRouteAwareRefund, type TransferReversalResult } from '@/lib/razorpay/route-refunds'

const CreateRouteRefundInputSchema = z
  .object({
    paymentId: z.string().trim().regex(/^pay_[A-Za-z0-9]+$/, 'Invalid Razorpay payment id'),
    refundType: z.enum(['full', 'partial']),
    amountPaise: z.number().int().positive().optional(),
  })
  .refine((v) => v.refundType === 'full' || v.amountPaise != null, {
    message: 'amountPaise is required for a partial refund.',
    path: ['amountPaise'],
  })

export type CreateRouteRefundInput = z.infer<typeof CreateRouteRefundInputSchema>

export interface CreateRouteRefundResult {
  refundId: string | null
  error: string | null
  reversals: TransferReversalResult[]
  reversalError: string | null
}

/**
 * Creates a Route-aware refund (full or partial) for a Razorpay payment and,
 * for a partial refund, reverses the proportional share of every attached
 * Route transfer. Admin-only — this moves real money and, for a partial
 * refund, triggers a second money-moving call (Transfer Reversal) with no
 * built-in undo on either side.
 */
export async function createRouteRefund(
  input: CreateRouteRefundInput,
): Promise<CreateRouteRefundResult> {
  await requireAdmin()

  const parsed = CreateRouteRefundInputSchema.safeParse(input)
  if (!parsed.success) {
    return {
      refundId: null,
      error: parsed.error.issues[0]?.message ?? 'Invalid input.',
      reversals: [],
      reversalError: null,
    }
  }

  const { paymentId, refundType, amountPaise } = parsed.data

  return createRouteAwareRefund({ paymentId, refundType, amountPaise })
}
