-- Razorpay Route transfer-reversal linkage (Phase 3 of the Route integration
-- plan). Tracks which Transfer Reversal(s) were performed to compensate for
-- which refund, on which transfer — a link Razorpay itself does not provide.
--
-- Confirmed via live testing (plan Phase 3 Validated Findings): a Transfer
-- Reversal's response has `customer_refund_id: null` even when the reversal
-- was performed specifically to compensate for a refund — there is no
-- system-enforced connection between a refund and the reversal(s) it caused.
-- This table is that connection, written by the app at the point each
-- reversal succeeds (see reverseTransfersForPartialRefund in
-- src/lib/razorpay/route-refunds.ts).
--
-- Only exists for the partial-refund path. A full refund (reverse_all: true,
-- POST /v1/payments/:id/refund) auto-reverses every associated transfer on
-- Razorpay's side in one step — Razorpay does not return the reversal IDs it
-- creates as part of that call, so there is nothing to record here for that
-- case. Only the partial-refund path, where the app itself calls
-- POST /v1/transfers/:id/reversals once per affected transfer, produces a
-- reversal ID the app actually holds — see route-refunds.ts.
--
-- UNIQUE (refund_id, transfer_id) is the idempotency guard: the same refund
-- can only produce one recorded reversal against a given transfer. Combined
-- with reverseTransfersForPartialRefund's live amount_reversed check before
-- ever calling the reversal endpoint, this stops a retried refund action
-- from double-reversing the same transfer.

CREATE TABLE public.route_transfer_reversals (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  refund_id    text        NOT NULL,   -- rfnd_...
  transfer_id  text        NOT NULL,   -- trf_...
  reversal_id  text        NOT NULL UNIQUE,   -- rvrsl_...
  amount       integer     NOT NULL CHECK (amount > 0),   -- paise, the reversal's own amount

  created_at   timestamptz NOT NULL DEFAULT now(),

  UNIQUE (refund_id, transfer_id)
);

CREATE INDEX idx_route_transfer_reversals_refund_id   ON public.route_transfer_reversals (refund_id);
CREATE INDEX idx_route_transfer_reversals_transfer_id ON public.route_transfer_reversals (transfer_id);

COMMENT ON TABLE  public.route_transfer_reversals             IS 'Links a partial refund (rfnd_...) to the Transfer Reversal(s) (rvrsl_...) performed to compensate for it, per affected transfer (trf_...) — a connection Razorpay does not itself expose. See table-level migration comment. Written by reverseTransfersForPartialRefund() at the point each reversal succeeds.';
COMMENT ON COLUMN public.route_transfer_reversals.refund_id   IS 'Razorpay refund id (rfnd_...) that triggered this reversal.';
COMMENT ON COLUMN public.route_transfer_reversals.transfer_id IS 'Razorpay transfer id (trf_...) that was reversed.';
COMMENT ON COLUMN public.route_transfer_reversals.reversal_id IS 'Razorpay Transfer Reversal id (rvrsl_...) returned by POST /v1/transfers/:id/reversals.';
COMMENT ON COLUMN public.route_transfer_reversals.amount      IS 'This reversal''s own amount in paise (the proportional amount computed from the refund, not the full transfer or full refund amount).';

-- ---------------------------------------------------------------------------
-- RLS — admin-only, same reasoning as whatsapp_send_failures (migration 082):
-- there is no legitimate owner-read case (a creator/venue has no reason to
-- see Route reversal bookkeeping), and every write happens from a
-- service-role admin client (bypasses RLS) inside reverseTransfersForPartialRefund.
-- ---------------------------------------------------------------------------

ALTER TABLE public.route_transfer_reversals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "route_transfer_reversals_select_admin"
  ON public.route_transfer_reversals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = public.get_user_id() AND is_admin = true
    )
  );

-- No client-side INSERT/UPDATE/DELETE policy — every write happens from
-- reverseTransfersForPartialRefund() via the service-role admin client.
