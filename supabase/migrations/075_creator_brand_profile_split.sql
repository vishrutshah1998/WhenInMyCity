-- =============================================================================
-- Migration 075: Creator/Brand profile split — fix multi-persona field collision
--
-- PROBLEM: user_profiles is a single shared row per account. Creator, Brand,
-- and Explorer onboarding/Studio actions all write persona-specific content
-- (bio, city, creator_type, interest_tags, avatar_url, instagram_handle,
-- page_theme, username) onto that ONE row, keyed only by account id with no
-- persona discriminator. An account with 2+ personas silently overwrites one
-- persona's content with another's on every onboarding re-run or Studio edit.
--
-- FIX (this migration, schema only — no app code touched):
--   1. New creator_profiles / brand_profiles tables, mirroring the existing
--      venue_profiles / explorer_profiles precedent (one table per persona,
--      keyed by auth_user_id, RLS scoped to the owner).
--   2. page_theme, currently shared and live-edited by all four persona
--      Studios via the same updateProfileTheme() call, is added to
--      venue_profiles and explorer_profiles too (they didn't have their own
--      copy) so every persona ends up with its own page_theme.
--   3. page_blocks gets a nullable persona_type discriminator column, since
--      Creator/Brand/Venue/Explorer Studios all currently read/write the
--      same block rows keyed only by profile_id (confirmed via
--      seedPersonaDefaultBlocks('creator'|'brand'|'venue'|'explorer', ...)
--      in src/app/actions/blocks.ts).
--
-- NOT done here (later, reviewed phases):
--   - No write-path or read-path application code changes.
--   - No columns dropped or renamed on user_profiles — this migration is
--     purely additive so the old shared-row data remains intact as a
--     reference/rollback source until the write/read-path phases are
--     verified against the new tables.
--   - username stays SOLELY on user_profiles (not duplicated into
--     creator_profiles/brand_profiles). Cross-table UNIQUE constraints
--     aren't a native Postgres feature, and duplicating username per-table
--     would let two different accounts silently claim the same public
--     /{city}/{username} slug — worse than the bug being fixed. The
--     existing /[username]/[slug]/page.tsx router (venue -> brand -> creator
--     priority) still resolves one slug to one account; which of that
--     account's persona pages a shared slug displays is an explicit product
--     decision for a later phase, not something this migration decides.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. CREATE TABLE creator_profiles
--    Mirrors venue_profiles/explorer_profiles conventions exactly.
-- ---------------------------------------------------------------------------

CREATE TABLE public.creator_profiles (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id        uuid        UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bio                 text        CHECK (char_length(bio) <= 160),
  avatar_url          text,
  city                text        NOT NULL,
  neighbourhood       text,
  creator_type        public.creator_type NOT NULL,
  sub_types           text[]      NOT NULL DEFAULT '{}',
  offline_activities  text[]      NOT NULL DEFAULT '{}',
  interest_tags       text[]      NOT NULL DEFAULT '{}',
  social_links        jsonb       NOT NULL DEFAULT '{}',
  instagram_handle    text,
  page_theme          jsonb       NOT NULL DEFAULT '{}',
  show_city_mastery   boolean     NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.creator_profiles             IS 'Creator persona data. One row per account that has completed Creator onboarding. Split out of user_profiles in migration 075 — see that migration''s header comment for why.';
COMMENT ON COLUMN public.creator_profiles.avatar_url   IS 'Creator-specific photo. user_profiles.avatar_url remains as a generic account-level fallback (e.g. leaderboards) — this column is the source of truth for the Creator public page.';
COMMENT ON COLUMN public.creator_profiles.page_theme   IS 'JSON: {color_primary, color_bg, font_family, background_type, ...} — Creator''s own copy, no longer shared with Brand/Venue/Explorer.';

CREATE INDEX creator_profiles_city_idx ON public.creator_profiles (city);
CREATE INDEX creator_profiles_creator_type_city_idx ON public.creator_profiles (creator_type, city);

CREATE TRIGGER trg_creator_profiles_updated_at
  BEFORE UPDATE ON public.creator_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. CREATE TABLE brand_profiles
-- ---------------------------------------------------------------------------

CREATE TABLE public.brand_profiles (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id        uuid        UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name       text,
  -- Business name is intentionally separate from user_profiles.display_name
  -- (which stays shared/account-wide for Creator+Explorer, a person's name).
  -- NULL falls back to user_profiles.display_name at read time (later phase).
  bio                 text        CHECK (char_length(bio) <= 400),
  -- Longer cap than creator_profiles.bio's 160: that limit on the old shared
  -- column was really scoped for a Creator-style one-line bio, and Brand
  -- descriptions read as longer marketing copy in the existing onboarding UI.
  avatar_url          text,
  city                text        NOT NULL,
  business_categories text[]      NOT NULL DEFAULT '{}',
  wimc_goals          text[]      NOT NULL DEFAULT '{}',
  target_audience     text[]      NOT NULL DEFAULT '{}',
  contact_whatsapp    text,
  contact_email       text,
  website_url         text,
  instagram_handle    text,
  page_theme          jsonb       NOT NULL DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.brand_profiles              IS 'Brand persona data. One row per account that has completed Brand onboarding. Split out of user_profiles in migration 075.';
COMMENT ON COLUMN public.brand_profiles.avatar_url    IS 'Brand logo. user_profiles.avatar_url remains a generic account-level fallback only.';
COMMENT ON COLUMN public.brand_profiles.business_name IS 'NULL means "use user_profiles.display_name" — see table comment.';

CREATE INDEX brand_profiles_city_idx ON public.brand_profiles (city);

CREATE TRIGGER trg_brand_profiles_updated_at
  BEFORE UPDATE ON public.brand_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. page_theme parity for venue_profiles / explorer_profiles
--
--    Both already exist as separate tables, but never got their own
--    page_theme column — Venue Studio and Explorer Studio call the same
--    updateProfileTheme() as Creator/Brand, which only ever writes
--    user_profiles.page_theme. Confirmed live (not just at onboarding) via
--    VenueStudioClient.tsx, ExplorerStudioClient.tsx, BrandPageEditorClient.tsx,
--    and StudioClient.tsx all calling updateProfileTheme(). Adding these
--    columns now closes the collision for all four personas in one pass
--    instead of Creator/Brand now and Venue/Explorer in a follow-up.
-- ---------------------------------------------------------------------------

ALTER TABLE public.venue_profiles
  ADD COLUMN IF NOT EXISTS page_theme jsonb NOT NULL DEFAULT '{}';

ALTER TABLE public.explorer_profiles
  ADD COLUMN IF NOT EXISTS page_theme jsonb NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.venue_profiles.page_theme    IS 'JSON theme payload — see creator_profiles.page_theme comment. Added migration 075.';
COMMENT ON COLUMN public.explorer_profiles.page_theme IS 'JSON theme payload — see creator_profiles.page_theme comment. Added migration 075.';

-- ---------------------------------------------------------------------------
-- 4. page_blocks persona scoping
--
--    Nullable, no default: existing rows get backfilled explicitly in
--    migration 077 (unambiguous cases only); NULL means "not yet assigned,
--    needs manual review" rather than silently defaulting to one persona,
--    which would just reproduce this migration's own bug under a new name.
--    A later application-code phase is expected to make persona_type
--    NOT NULL once every row has been assigned and all write paths supply it.
-- ---------------------------------------------------------------------------

ALTER TABLE public.page_blocks
  ADD COLUMN IF NOT EXISTS persona_type text
    CHECK (persona_type IN ('creator', 'brand', 'venue', 'explorer'));

COMMENT ON COLUMN public.page_blocks.persona_type IS 'Which persona''s Studio owns this block. NULL = pre-migration-075 row not yet assigned (see migration 077 backfill + manual-review output). Values match seedPersonaDefaultBlocks()''s persona parameter in src/app/actions/blocks.ts.';

CREATE INDEX page_blocks_profile_id_persona_type_idx
  ON public.page_blocks (profile_id, persona_type);

-- ---------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY — mirrors venue_profiles/explorer_profiles exactly
-- ---------------------------------------------------------------------------

ALTER TABLE public.creator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_profiles   ENABLE ROW LEVEL SECURITY;

-- ── creator_profiles ───────────────────────────────────────────────────────

-- Public — Creator pages are discoverable, same as user_profiles today.
CREATE POLICY "creator_profiles_select_public"
  ON public.creator_profiles
  FOR SELECT
  USING (true);

CREATE POLICY "creator_profiles_insert_own"
  ON public.creator_profiles
  FOR INSERT
  WITH CHECK (auth_user_id = public.get_user_id());

CREATE POLICY "creator_profiles_update_own"
  ON public.creator_profiles
  FOR UPDATE
  USING (auth_user_id = public.get_user_id())
  WITH CHECK (auth_user_id = public.get_user_id());

-- ── brand_profiles ─────────────────────────────────────────────────────────

-- Public — Brand pages are discoverable (/brand/[slug], /{city}/{username}).
CREATE POLICY "brand_profiles_select_public"
  ON public.brand_profiles
  FOR SELECT
  USING (true);

CREATE POLICY "brand_profiles_insert_own"
  ON public.brand_profiles
  FOR INSERT
  WITH CHECK (auth_user_id = public.get_user_id());

CREATE POLICY "brand_profiles_update_own"
  ON public.brand_profiles
  FOR UPDATE
  USING (auth_user_id = public.get_user_id())
  WITH CHECK (auth_user_id = public.get_user_id());
