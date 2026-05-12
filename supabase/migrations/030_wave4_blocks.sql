-- =============================================================================
-- Migration 030 — Wave 4 block tables
-- digital_purchases: tracks paid downloads from digital_product blocks
-- waitlist_entries:  collects email sign-ups from waitlist blocks
-- =============================================================================

-- ---------------------------------------------------------------------------
-- digital_purchases
-- ---------------------------------------------------------------------------

CREATE TABLE digital_purchases (
  id                   uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  block_id             uuid NOT NULL REFERENCES page_blocks(id) ON DELETE CASCADE,
  creator_id           uuid NOT NULL REFERENCES user_profiles(id),
  buyer_user_id        uuid REFERENCES user_profiles(id),
  buyer_name           text,
  buyer_email          text,
  razorpay_order_id    text NOT NULL,
  razorpay_payment_id  text,
  status               text NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'paid', 'failed')),
  amount_paise         integer NOT NULL,
  file_url             text NOT NULL,
  created_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE digital_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators and buyers can read digital purchases"
  ON digital_purchases FOR SELECT
  TO authenticated
  USING (creator_id = auth.uid() OR buyer_user_id = auth.uid());

CREATE INDEX digital_purchases_block_id_idx    ON digital_purchases(block_id);
CREATE INDEX digital_purchases_creator_id_idx  ON digital_purchases(creator_id);
CREATE INDEX digital_purchases_order_id_idx    ON digital_purchases(razorpay_order_id);

-- ---------------------------------------------------------------------------
-- waitlist_entries
-- ---------------------------------------------------------------------------

CREATE TABLE waitlist_entries (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  block_id    uuid NOT NULL REFERENCES page_blocks(id) ON DELETE CASCADE,
  creator_id  uuid NOT NULL REFERENCES user_profiles(id),
  event_id    uuid REFERENCES events(id) ON DELETE SET NULL,
  name        text,
  email       text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),

  UNIQUE (block_id, email)
);

ALTER TABLE waitlist_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can read their waitlist entries"
  ON waitlist_entries FOR SELECT
  TO authenticated
  USING (creator_id = auth.uid());

CREATE POLICY "Anyone can join a waitlist"
  ON waitlist_entries FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE INDEX waitlist_entries_block_id_idx   ON waitlist_entries(block_id);
CREATE INDEX waitlist_entries_creator_id_idx ON waitlist_entries(creator_id);
