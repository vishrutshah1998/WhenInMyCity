-- Migration 037: Extended adda profile fields
-- Adds alcohol_license, sound_curfew_time, google_place_types

ALTER TABLE adda_profiles
  ADD COLUMN IF NOT EXISTS alcohol_license   boolean   NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sound_curfew_time text      DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS google_place_types text[]   NOT NULL DEFAULT '{}';
