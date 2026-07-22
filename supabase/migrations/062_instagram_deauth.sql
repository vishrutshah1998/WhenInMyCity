-- ============================================================
-- Migration 062 — Instagram deauthorize / data-deletion support
-- Meta's deauthorize and data-deletion callbacks (configured in the App
-- Dashboard's Business login settings) POST a signed_request identifying
-- the user only by their Instagram-scoped user_id — never our own profile
-- id. Without storing that id at connect time, those callbacks would have
-- no way to find the right profile. See src/app/actions/instagram.ts
-- (OAuth callback) and src/app/api/instagram/deauthorize|data-deletion.
-- ============================================================

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS instagram_user_id text NULL;

COMMENT ON COLUMN public.user_profiles.instagram_user_id IS
  'Instagram-scoped user id (from the OAuth code-exchange response), used to map Meta''s deauthorize/data-deletion signed_request callbacks back to a profile. Not a public identifier.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_instagram_user_id
  ON public.user_profiles (instagram_user_id)
  WHERE instagram_user_id IS NOT NULL;
