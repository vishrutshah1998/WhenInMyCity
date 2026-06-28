-- Migration 031: Onboarding v3 — additional profile columns for 9-screen flow
-- Safe to re-run; all additions use IF NOT EXISTS guards.

-- user_profiles: Maker/Explorer intent & contact fields
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS explorer_scene            TEXT,
  ADD COLUMN IF NOT EXISTS explorer_creator_intent   TEXT[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS business_categories       TEXT[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS wimc_goals                TEXT[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS target_audience           TEXT[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS contact_whatsapp          TEXT,
  ADD COLUMN IF NOT EXISTS contact_email             TEXT,
  ADD COLUMN IF NOT EXISTS website_url               TEXT;

-- adda_profiles: Venue availability & event-preference fields
ALTER TABLE adda_profiles
  ADD COLUMN IF NOT EXISTS event_preferences  TEXT[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS available_days     TEXT[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS preferred_times    TEXT[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS lead_time_weeks    INTEGER DEFAULT 2;

-- Indexes useful for the matching engine
CREATE INDEX IF NOT EXISTS idx_adda_city_events
  ON adda_profiles USING GIN (event_preferences);

CREATE INDEX IF NOT EXISTS idx_user_creator_city
  ON user_profiles (creator_type, city);
