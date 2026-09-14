-- =============================================================================
-- Migration 078: Add explorer_scene / explorer_creator_intent to explorer_profiles
--
-- Follow-up to migration 075 (creator/brand profile split). The Phase 2a
-- write-path work found these two columns only exist on user_profiles
-- (added in migration 031, "Maker/Explorer intent & contact fields") —
-- explorer_profiles never got its own copy. Adding them here so
-- completeExplorerOnboarding() can stop writing this persona-specific data
-- to the shared user_profiles row, matching the rest of the split.
--
-- Types/defaults mirror migration 031's original definition exactly:
--   explorer_scene            TEXT            (nullable, no default)
--   explorer_creator_intent   TEXT[] DEFAULT '{}'
-- No CHECK constraints existed on either column on user_profiles, so none
-- are added here.
-- =============================================================================

ALTER TABLE public.explorer_profiles
  ADD COLUMN IF NOT EXISTS explorer_scene          text,
  ADD COLUMN IF NOT EXISTS explorer_creator_intent text[] DEFAULT '{}';

COMMENT ON COLUMN public.explorer_profiles.explorer_scene          IS 'Explorer''s selected "scene" from onboarding v3 (migration 031). Moved here from user_profiles in migration 078 — see that migration''s header.';
COMMENT ON COLUMN public.explorer_profiles.explorer_creator_intent IS 'Explorer''s stated creator intent from onboarding v3 (migration 031). Moved here from user_profiles in migration 078 — see that migration''s header.';
