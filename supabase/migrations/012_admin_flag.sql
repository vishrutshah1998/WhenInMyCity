-- =============================================================================
-- Migration 012: Admin flag on user_profiles
--
-- Adds is_admin boolean to user_profiles. Admin users can access /admin/*
-- routes which use createAdminClient() (service_role) to bypass RLS and
-- perform platform operations: approving payouts, viewing all events,
-- managing adda listings.
--
-- Set via Supabase dashboard or direct SQL:
--   UPDATE user_profiles SET is_admin = true WHERE id = '<uuid>';
-- =============================================================================

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.user_profiles.is_admin IS 'Platform admin flag. Grants access to /admin routes and service-level mutations.';
