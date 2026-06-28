-- Adda venue payout requests
CREATE TABLE IF NOT EXISTS adda_payout_requests (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  adda_id             UUID        NOT NULL REFERENCES adda_profiles(id) ON DELETE CASCADE,
  booking_ids         UUID[]      NOT NULL DEFAULT '{}',
  gross_paise         BIGINT      NOT NULL DEFAULT 0,
  platform_fee_paise  BIGINT      NOT NULL DEFAULT 0,
  adda_share_paise    BIGINT      NOT NULL DEFAULT 0,
  payment_method      TEXT        NOT NULL CHECK (payment_method IN ('bank', 'upi')),
  bank_account_name   TEXT,
  bank_account_number TEXT,
  bank_ifsc           TEXT,
  upi_id              TEXT,
  status              TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
  rejection_reason    TEXT,
  requested_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at        TIMESTAMPTZ
);

ALTER TABLE adda_payout_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Adda owners manage their payout requests"
  ON adda_payout_requests
  FOR ALL
  USING (
    adda_id IN (SELECT id FROM adda_profiles WHERE auth_user_id = auth.uid())
  );
