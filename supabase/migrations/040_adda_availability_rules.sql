-- Adda availability rules: recurring closures, holiday blocks, booking windows
CREATE TABLE IF NOT EXISTS adda_availability_rules (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  adda_id          UUID        NOT NULL REFERENCES adda_profiles(id) ON DELETE CASCADE,
  rule_type        TEXT        NOT NULL CHECK (rule_type IN ('recurring_closed', 'holiday_block', 'booking_window')),

  -- recurring_closed: which days-of-week and optional time window are always closed
  day_of_week      INTEGER[],   -- 0=Sun … 6=Sat
  time_start       TIME,
  time_end         TIME,

  -- holiday_block: named date range
  date_start       DATE,
  date_end         DATE,
  label            TEXT,        -- e.g. "Diwali break"

  -- booking_window: advance booking constraints
  min_advance_days INTEGER,
  max_advance_days INTEGER,

  is_active        BOOLEAN     NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE adda_availability_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Adda owners manage their availability rules"
  ON adda_availability_rules
  FOR ALL
  USING (
    adda_id IN (SELECT id FROM adda_profiles WHERE auth_user_id = auth.uid())
  );
