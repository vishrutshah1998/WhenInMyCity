-- =============================================================================
-- Migration 018: Adda tier ladder
-- =============================================================================
-- Adds the trust-axis tier (Open → Verified → Beloved → Legendary) and the
-- time-bound Trending overlay to adda_profiles, along with the denormalised
-- metric columns that the monthly evaluate-adda-tiers cron writes.
-- =============================================================================

ALTER TABLE public.adda_profiles
  ADD COLUMN IF NOT EXISTS adda_tier                  text         NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS trending_until             timestamptz,
  ADD COLUMN IF NOT EXISTS on_time_rate               numeric(4,3) NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS complaint_rate             numeric(4,3) NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS repeat_attendee_rate       numeric(4,3) NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS unique_lantern_beacon_hosts integer     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS beloved_since              timestamptz;

ALTER TABLE public.adda_profiles
  ADD CONSTRAINT adda_profiles_adda_tier_check
  CHECK (adda_tier IN ('open', 'verified', 'beloved', 'legendary'));

COMMENT ON COLUMN public.adda_profiles.adda_tier                  IS 'Trust-axis tier. Separate from the time-bound Trending overlay (trending_until).';
COMMENT ON COLUMN public.adda_profiles.trending_until             IS 'If set and in the future, the Adda carries the Trending badge. Cleared when velocity criteria are no longer met.';
COMMENT ON COLUMN public.adda_profiles.on_time_rate               IS 'Fraction of events that started on time (first check-in within 15 min of starts_at). Updated by evaluate-adda-tiers cron.';
COMMENT ON COLUMN public.adda_profiles.complaint_rate             IS 'Fraction of events with a formal complaint. Updated manually or via future complaints system.';
COMMENT ON COLUMN public.adda_profiles.repeat_attendee_rate       IS 'Fraction of unique attendees who attended more than one event at this Adda. Updated by cron.';
COMMENT ON COLUMN public.adda_profiles.unique_lantern_beacon_hosts IS 'Count of distinct Lantern/Beacon creators who have hosted an accepted event here. Updated by cron.';
COMMENT ON COLUMN public.adda_profiles.beloved_since              IS 'Timestamp when the Adda first reached Beloved tier. Used to track the 2-year tenure required for Legendary.';
