-- Migration 042: Google Calendar sync state for Adda profiles
--
-- Stores whether a venue owner has connected their Google Calendar,
-- and the refresh token needed to re-acquire access tokens server-side.
-- The refresh token is stored in plain text; encrypt at rest via Supabase
-- Vault or pgcrypto if compliance requires it.

ALTER TABLE adda_profiles
  ADD COLUMN IF NOT EXISTS google_calendar_connected boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS google_calendar_refresh_token text;
