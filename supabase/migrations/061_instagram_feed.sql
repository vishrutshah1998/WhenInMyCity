-- ============================================================
-- Migration 061 — Instagram Feed block + on-demand refresh
-- Builds on migration 060's Instagram Connect. Adds account-type
-- tracking (gate out Personal accounts at connect time) and a
-- refresh-attempt timestamp (backoff for on-demand token refresh,
-- replacing the daily cron). Also repurposes instagram_thumbnail_cache
-- from a single-post static-card fallback (now obsolete — single-post
-- embeds render live via Instagram's embed.js) into the source for the
-- new instagram_feed block's "recent posts" grid, scoped per profile.
-- ============================================================

-- ---------------------------------------------------------------------------
-- 1. user_profiles — account type + refresh backoff tracking
-- ---------------------------------------------------------------------------

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS instagram_account_type text NULL,
  ADD COLUMN IF NOT EXISTS instagram_last_refresh_attempt_at timestamptz NULL;

COMMENT ON COLUMN public.user_profiles.instagram_account_type IS
  'Instagram account_type from graph.instagram.com/me at connect time: BUSINESS or MEDIA_CREATOR. PERSONAL accounts are rejected at OAuth callback and never persisted here.';

COMMENT ON COLUMN public.user_profiles.instagram_last_refresh_attempt_at IS
  'Last time an on-demand token refresh was attempted (success or failure), set by refreshInstagramTokenIfNeeded(). Used to back off retries on a broken connection instead of hammering Meta on every dashboard load.';

-- ---------------------------------------------------------------------------
-- 2. instagram_thumbnail_cache — scope to profile, add ordering for the feed
-- ---------------------------------------------------------------------------

ALTER TABLE public.instagram_thumbnail_cache
  ADD COLUMN IF NOT EXISTS profile_id uuid NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS sort_order int NOT NULL DEFAULT 0;

COMMENT ON TABLE public.instagram_thumbnail_cache IS
  'Recent media synced from a creator''s own connected Instagram account, scoped by profile_id and ordered by sort_order (0 = most recent). Powers the instagram_feed block. No RLS — service_role only.';

CREATE INDEX IF NOT EXISTS idx_instagram_thumbnail_cache_profile ON public.instagram_thumbnail_cache (profile_id, sort_order);
