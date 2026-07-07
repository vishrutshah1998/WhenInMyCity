-- Payout KYC scaffolding: adds inert KYC columns to both payee tables
-- (user_profiles = Maker payouts, adda_profiles = Adda/venue payouts).
--
-- This is Track A of the Razorpay Route payout-automation build — additive
-- only, no flow/UI/webhook wired up yet. Payouts remain manual/admin-approved
-- (see CLAUDE.md "Known debt") until Track B implements 194-O TDS handling.
--
-- kyc_details is for non-sensitive status/metadata only — never raw bank
-- account numbers or secrets. Existing bank-detail fields are untouched.

ALTER TABLE user_profiles
  ADD COLUMN razorpay_linked_account_id text,
  ADD COLUMN razorpay_stakeholder_id text,
  ADD COLUMN business_type text,
  ADD COLUMN payout_kyc_status text NOT NULL DEFAULT 'not_started'
    CHECK (payout_kyc_status IN ('not_started', 'pending', 'needs_clarification', 'activated', 'rejected')),
  ADD COLUMN kyc_details jsonb,
  ADD COLUMN kyc_submitted_at timestamptz,
  ADD COLUMN kyc_updated_at timestamptz;

ALTER TABLE adda_profiles
  ADD COLUMN razorpay_linked_account_id text,
  ADD COLUMN razorpay_stakeholder_id text,
  ADD COLUMN business_type text,
  ADD COLUMN payout_kyc_status text NOT NULL DEFAULT 'not_started'
    CHECK (payout_kyc_status IN ('not_started', 'pending', 'needs_clarification', 'activated', 'rejected')),
  ADD COLUMN kyc_details jsonb,
  ADD COLUMN kyc_submitted_at timestamptz,
  ADD COLUMN kyc_updated_at timestamptz;

COMMENT ON COLUMN user_profiles.kyc_details IS
  'Non-sensitive KYC status/metadata only — never raw bank account numbers or secrets.';
COMMENT ON COLUMN adda_profiles.kyc_details IS
  'Non-sensitive KYC status/metadata only — never raw bank account numbers or secrets.';
