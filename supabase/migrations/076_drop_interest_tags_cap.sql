-- =============================================================================
-- Migration 076: Drop the 5-tag cap on creator_profiles.interest_tags
--
-- creator_profiles (migration 075) is already live. This removes the
-- CHECK constraint it shipped with; 075 itself has been edited in the same
-- commit so a fresh rebuild of this schema elsewhere won't reintroduce it.
-- =============================================================================

ALTER TABLE public.creator_profiles
  DROP CONSTRAINT IF EXISTS creator_profiles_interest_tags_max;
