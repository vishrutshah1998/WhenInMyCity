-- =============================================================================
-- Migration 015: Unified User Tier Ladder
-- =============================================================================
-- Replaces the creator-only Mohalla→Nukkad→Chowk→Maidan tier system with
-- a unified progression: Wanderer→Local→Lantern→Beacon.
--
-- All users now share a single tier column.
-- Wanderer (default) → Local (habitual attendee) → Lantern (host) → Beacon (pro creator)
-- =============================================================================

-- ── 1. user_profiles: rename column and update constraint ──────────────────

ALTER TABLE public.user_profiles
  RENAME COLUMN maker_tier TO user_tier;

ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_maker_tier_check;

-- Backfill BEFORE adding the new constraint so no row violates it
UPDATE public.user_profiles
SET user_tier = CASE user_tier
  WHEN 'mohalla' THEN 'wanderer'
  WHEN 'nukkad'  THEN 'local'
  WHEN 'chowk'   THEN 'lantern'
  WHEN 'maidan'  THEN 'beacon'
  ELSE user_tier
END;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_user_tier_check
  CHECK (user_tier IN ('wanderer', 'local', 'lantern', 'beacon'));

ALTER TABLE public.user_profiles
  ALTER COLUMN user_tier SET DEFAULT 'wanderer';

COMMENT ON COLUMN public.user_profiles.user_tier IS
  'Wanderer → Local → Lantern → Beacon — unified user progression tier, recalculated by evaluate-tiers cron on a rolling window.';

-- ── 2. user_profiles: add explorer-side and Beacon metric columns ──────────

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS events_attended_count   integer     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS events_saved_count      integer     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS creators_followed_count integer     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reviews_posted_count    integer     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rsvps_total_count       integer     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS no_shows_count          integer     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tier_recovery_until     timestamptz;

COMMENT ON COLUMN public.user_profiles.events_attended_count   IS 'Running count of events attended — incremented by RSVP check-in flow (Phase 2).';
COMMENT ON COLUMN public.user_profiles.reviews_posted_count    IS 'Running count of reviews posted — incremented by review flow (Phase 2).';
COMMENT ON COLUMN public.user_profiles.rsvps_total_count       IS 'Running count of all RSVPs — used with no_shows_count to compute no-show rate.';
COMMENT ON COLUMN public.user_profiles.no_shows_count          IS 'Running count of no-shows — RSVP confirmed but did not check in.';
COMMENT ON COLUMN public.user_profiles.tier_recovery_until     IS 'Beacon Recovery grace period end timestamp. While set, badge is dimmed and perks frozen, but rank is not dropped. Visible only to the creator in their own dashboard.';

-- ── 3. page_blocks: update minimum_tier constraint ────────────────────────

ALTER TABLE public.page_blocks
  DROP CONSTRAINT IF EXISTS page_blocks_minimum_tier_check;

-- Backfill BEFORE adding the new constraint
UPDATE public.page_blocks
SET minimum_tier = CASE minimum_tier
  WHEN 'mohalla' THEN 'wanderer'
  WHEN 'nukkad'  THEN 'local'
  WHEN 'chowk'   THEN 'lantern'
  WHEN 'maidan'  THEN 'beacon'
  ELSE minimum_tier
END;

ALTER TABLE public.page_blocks
  ADD CONSTRAINT page_blocks_minimum_tier_check
  CHECK (minimum_tier IN ('wanderer', 'local', 'lantern', 'beacon'));

ALTER TABLE public.page_blocks
  ALTER COLUMN minimum_tier SET DEFAULT 'wanderer';

COMMENT ON COLUMN public.page_blocks.minimum_tier IS
  'User tier required to use this block type. Enforced server-side.';

-- ── 4. Rename maker_tier_history → user_tier_history ──────────────────────

ALTER TABLE public.maker_tier_history RENAME TO user_tier_history;
ALTER TABLE public.user_tier_history  RENAME COLUMN maker_id TO user_id;

ALTER TABLE public.user_tier_history
  RENAME CONSTRAINT maker_tier_history_maker_id_fkey TO user_tier_history_user_id_fkey;

DROP   INDEX IF EXISTS maker_tier_history_maker_id_idx;
CREATE INDEX IF NOT EXISTS user_tier_history_user_id_idx ON public.user_tier_history (user_id);

COMMENT ON TABLE  public.user_tier_history IS
  'Audit log of unified user tier changes. Each row is one tier transition.';
COMMENT ON COLUMN public.user_tier_history.snapshot IS
  'JSON snapshot of tier metrics at the moment of the transition — for dispute resolution.';
