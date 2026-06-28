-- Backfill 'creator' into personas[] for all maker users who are missing it.
--
-- Context: Migration 035 seeded personas for users who had an empty array at
-- the time it ran. Users who completed creator onboarding afterwards got an
-- empty personas[] (creator onboarding didn't write to personas), and then
-- brand onboarding set personas = ['brand'] — leaving 'creator' absent.
--
-- This migration uses array_append to safely add 'creator' for every
-- user_role = 'maker' profile that doesn't already have it.

UPDATE user_profiles
  SET personas = array_append(personas, 'creator')
  WHERE user_role = 'maker'
    AND NOT (personas @> ARRAY['creator']::text[]);
