-- =============================================================================
-- Migration 023 — Long-Tenure Recognition
--
-- Adds lantern_since / beacon_since timestamps to user_profiles.
-- These are set once (on first upgrade to that tier) and never cleared,
-- so a downgraded creator retains their seniority if they climb back.
-- =============================================================================

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS lantern_since timestamptz,
  ADD COLUMN IF NOT EXISTS beacon_since  timestamptz;

COMMENT ON COLUMN public.user_profiles.lantern_since IS 'Timestamp of the user''s first ever upgrade to Lantern tier. Never cleared on downgrade.';
COMMENT ON COLUMN public.user_profiles.beacon_since  IS 'Timestamp of the user''s first ever upgrade to Beacon tier. Never cleared on downgrade.';
