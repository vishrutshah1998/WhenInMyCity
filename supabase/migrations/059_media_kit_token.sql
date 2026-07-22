-- ============================================================
-- Migration 059 — Media Kit token
-- Adds a shareable, regenerable token to user_profiles that gates
-- access to the public /media-kit/[token] sponsor one-pager.
-- ============================================================

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS media_kit_token uuid NULL DEFAULT NULL;

COMMENT ON COLUMN public.user_profiles.media_kit_token IS
  'Shareable token gating /media-kit/[token]. NULL until first requested from the dashboard. Regenerating overwrites this value, invalidating the previous link. Never expose via a client-side select() — user_profiles SELECT RLS is public (USING (true)), so this column must only be read through createAdminClient() server-side.';

CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_media_kit_token_idx
  ON public.user_profiles (media_kit_token)
  WHERE media_kit_token IS NOT NULL;
