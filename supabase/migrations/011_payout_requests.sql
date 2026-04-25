-- =============================================================================
-- Migration 011: Payout requests
--
-- Creators can request a payout for completed/past events. Each request
-- captures the event IDs, the gross ticket revenue, and the creator's share
-- (after platform fee as determined by their tier's revenue split).
--
-- Bank account / UPI details are stored on the request row so that creators
-- can change payment details between payouts without affecting history.
--
-- Status flow: pending → approved → paid
--          or: pending → rejected  (creator may re-request)
-- =============================================================================

CREATE TABLE public.payout_requests (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id       uuid        NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,

  -- Events included in this request (must not overlap any non-rejected prior request)
  event_ids        uuid[]      NOT NULL,

  -- Amounts in paise (₹1 = 100 paise)
  gross_paise      bigint      NOT NULL CHECK (gross_paise > 0),   -- sum of amount_paid on captured RSVPs
  maker_paise      bigint      NOT NULL CHECK (maker_paise > 0),   -- creator's share after platform fee
  platform_paise   bigint      NOT NULL CHECK (platform_paise >= 0),

  -- Payment method (at least one must be provided)
  bank_name        text,
  bank_account     text,
  bank_ifsc        text,
  upi_id           text,

  -- Lifecycle
  status           text        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
  notes            text,                           -- admin notes / rejection reason
  requested_at     timestamptz NOT NULL DEFAULT now(),
  processed_at     timestamptz,

  CONSTRAINT payout_has_payment_method
    CHECK (bank_account IS NOT NULL OR upi_id IS NOT NULL)
);

-- ---------------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

-- Creators can only see their own requests
CREATE POLICY "payout_requests_select_own"
  ON public.payout_requests
  FOR SELECT
  USING (creator_id = auth.uid());

-- Creators can submit new requests (only with status='pending')
CREATE POLICY "payout_requests_insert_own"
  ON public.payout_requests
  FOR INSERT
  WITH CHECK (
    creator_id = auth.uid()
    AND status = 'pending'
  );

-- No client-side UPDATE or DELETE — status changes happen via admin / service_role only
