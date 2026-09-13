-- Razorpay Route Linked Accounts — schema only (Phase 1 of the Route
-- integration plan). Tracks the KYC/onboarding state of a creator's or
-- venue's Razorpay Linked Account (acc_...) and its Product Configuration
-- (acc_prd_...), so Phase 2 (order-time transfers) has an activation_status
-- to check before attaching a transfer.
--
-- owner_type/owner_id is the same polymorphic pattern as block_analytics
-- (migration 049) — no FK, since owner_id points at user_profiles.id when
-- owner_type='creator' or venue_profiles.id when owner_type='venue'.
-- Deliberately NOT split into two tables the way payout_requests /
-- venue_payout_requests are: this table must be the single place
-- payout-eligibility status lives (see the creator_type dual-write lesson —
-- do not let a second source of truth for activation status appear later).
--
-- Two distinct PAN fields, not one: business_pan is legal_info.pan
-- (account-level, the business's own PAN) and stakeholder kyc.pan (the
-- individual's PAN) is intentionally NOT stored here — the stakeholder
-- record lives at Razorpay, referenced only by stakeholder_id. Confirmed by
-- live Postman testing that these are two distinct fields Razorpay
-- validates independently; conflating them was the original plan draft's
-- mistake.
--
-- status has two "stuck" states that look similar but are not:
-- needs_clarification is user-fixable by resubmitting the existing
-- product_config_id. config_locked is NOT fixable by resubmitting — it's
-- what needs_clarification means once retries are exhausted (identified by
-- parsing requirements[].description for "Max retry exceeded", there is no
-- distinct reason_code for it per live testing) — recovery requires
-- abandoning this row's razorpay_account_id/product_config_id and creating
-- a brand-new Linked Account. The app layer must branch on config_locked
-- specifically rather than treating it as another needs_clarification retry.
--
-- Status is driven primarily by the Route webhook, not by polling this
-- table's own writers — activation_status transitions were observed live to
-- change asynchronously (needs_clarification -> under_review ->
-- needs_clarification with no intervening API call from us). Do not build
-- app logic that assumes a status written here stays authoritative until
-- the next write we make.
--
-- Never store a full bank account number or full PAN past the moment
-- they're submitted to Razorpay — bank_account_last4 only, and no PAN
-- column for the number itself, only business_pan (needed to detect the
-- business_type mismatch class of error before submitting).

CREATE TABLE public.linked_accounts (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  owner_type               text        NOT NULL CHECK (owner_type IN ('creator', 'venue')),
  owner_id                 uuid        NOT NULL,

  razorpay_account_id      text        UNIQUE,   -- acc_...
  stakeholder_id           text,                  -- exactly one per account (Route constraint)
  product_config_id        text        UNIQUE,   -- acc_prd_...

  status                   text        NOT NULL DEFAULT 'not_started'
    CHECK (status IN (
      'not_started', 'pending_kyc', 'requested', 'under_review',
      'activated', 'needs_clarification', 'config_locked',
      'suspended', 'rejected'
    )),
  rejection_reason         text,

  legal_name               text,
  business_type            text,
  business_pan             text,     -- legal_info.pan (business-level) — NOT the stakeholder's PAN

  bank_account_last4       text,     -- display only; full number never stored
  bank_ifsc                text,
  bank_beneficiary_name    text,     -- should match legal_name — see table comment on Finding #13

  cooling_period_ends_at   timestamptz,   -- created_at + 24h; transfers blocked until this passes
  submitted_at             timestamptz,
  activated_at             timestamptz,

  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),

  UNIQUE (owner_type, owner_id)
);

CREATE INDEX idx_linked_accounts_status ON public.linked_accounts (status);

COMMENT ON TABLE  public.linked_accounts                       IS 'Razorpay Route Linked Account KYC/activation state, one row per (owner_type, owner_id). Source of truth for payout-eligibility status — see table-level migration comment. status is webhook-driven, not derived by polling.';
COMMENT ON COLUMN public.linked_accounts.owner_id               IS 'user_profiles.id when owner_type=creator, venue_profiles.id when owner_type=venue. Not FK-constrained (two possible target tables), same pattern as block_analytics.owner_id.';
COMMENT ON COLUMN public.linked_accounts.product_config_id      IS 'Current acc_prd_... to PATCH. Re-requesting a Product Configuration on an account is idempotent (returns the existing, possibly locked, config) — this column exists so app logic always knows which config to act on without re-deriving it.';
COMMENT ON COLUMN public.linked_accounts.status                 IS 'config_locked is distinct from needs_clarification: it means retries on product_config_id are exhausted and this account cannot be recovered by resubmitting — a new razorpay_account_id must be created. See table comment for how to detect it.';
COMMENT ON COLUMN public.linked_accounts.business_pan            IS 'legal_info.pan — the business''s own PAN, cross-validated by Razorpay against business_type (4th char must match). Distinct from the stakeholder''s individual PAN, which is not stored in this table.';
COMMENT ON COLUMN public.linked_accounts.bank_beneficiary_name   IS 'Should match legal_name (the business''s registered legal name), not a personal name — plausible but unconfirmed rejection trigger observed in live testing (Finding #13). Validate client-side as a soft warning, not a hard block, until confirmed with Razorpay support.';
COMMENT ON COLUMN public.linked_accounts.cooling_period_ends_at  IS 'created_at + 24h. A newly created Linked Account cannot receive transfers before this passes — surface explicitly to the owner, do not silently hold transfers with no explanation.';

CREATE TRIGGER trg_linked_accounts_updated_at
  BEFORE UPDATE ON public.linked_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS — owner-only SELECT, no client-side INSERT/UPDATE/DELETE.
--
-- Unlike payout_requests (where the creator's own INSERT creates the row),
-- a linked_accounts row is only ever created/advanced by a server action
-- that calls the Razorpay Route API (needs the service-role key regardless,
-- since it also holds legal_name/business_pan/bank_beneficiary_name — not
-- data a client should be able to set directly) or by the Route webhook
-- handler. Same reasoning as payout_requests' "status changes happen via
-- admin / service_role only", extended here to cover every column since
-- there is no creator-initiated INSERT step at all in this flow.
-- ---------------------------------------------------------------------------

ALTER TABLE public.linked_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "linked_accounts_select_own"
  ON public.linked_accounts
  FOR SELECT
  USING (
    (owner_type = 'creator' AND owner_id = public.get_user_id())
    OR (owner_type = 'venue' AND owner_id IN (
      SELECT id FROM public.venue_profiles WHERE auth_user_id = auth.uid()
    ))
  );

-- No INSERT/UPDATE/DELETE policy — every write happens from a service-role
-- server action (Route API calls) or the Route webhook handler, both of
-- which bypass RLS. See migration comment.
