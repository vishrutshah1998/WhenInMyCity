-- Migration 056: creator poster mood
--
-- Reveal-artifacts feature (onboarding "here's yours" moment) adds a
-- user-selectable mood (moody / editorial / vivid — default vivid) for the
-- Creator's event-poster artifact, picked during onboarding (C8b) and reused
-- anywhere else the poster renders later (public profile, event pages, share
-- cards) — not a one-time onboarding-only setting.
--
-- Landed inside user_profiles.page_theme (jsonb) rather than as its own
-- column: page_theme is already documented as "colour, font, background
-- choices" (see 001_initial_schema.sql) and posterMood is exactly that kind
-- of choice — no new column needed since jsonb already carries this shape.
-- Confirmed via 001_initial_schema.sql that page_theme exists and no later
-- migration (up to 055) touches it structurally, so this is a documentation
-- + backfill migration only, no ALTER TABLE.

COMMENT ON COLUMN public.user_profiles.page_theme IS
  'JSON: {color_primary, color_bg, font_family, background_type, posterMood: "moody"|"editorial"|"vivid", ...}';

-- Backfill existing Creator profiles (rows that have actually completed
-- onboarding, i.e. carry 'creator' in personas) with the default mood so the
-- poster has a defined mood immediately, without waiting for a re-save.
UPDATE public.user_profiles
SET page_theme = page_theme || jsonb_build_object('posterMood', 'vivid')
WHERE 'creator' = ANY(personas)
  AND NOT (page_theme ? 'posterMood');
