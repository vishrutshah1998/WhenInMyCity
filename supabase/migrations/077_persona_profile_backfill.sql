-- =============================================================================
-- Migration 077: Backfill creator_profiles / brand_profiles / page_blocks
--                 persona_type / user_role from existing user_profiles rows.
--
-- Depends on 075_creator_brand_profile_split.sql and
-- 076_drop_interest_tags_cap.sql. Entirely additive and idempotent (safe to
-- re-run: ON CONFLICT DO NOTHING / WHERE-guarded UPDATEs).
--
-- DATA-LOSS NOTE (explicitly accepted, not this migration's problem to solve):
-- Per the investigation, whichever persona's onboarding/Studio edit ran LAST
-- on a given account is the only value the shared row still has — an
-- earlier persona's original bio/city/creator_type/etc., if it differed, is
-- already gone with no way to reconstruct which persona it belonged to. This
-- backfill copies forward whatever value currently sits in user_profiles as
-- the seed for the new per-persona tables. It does not attempt to guess or
-- repair pre-existing overwrites — see migration 075's header and the prior
-- investigation for why that's unrecoverable.
--
-- The final SELECTs in this file are the manual-review output requested for
-- ambiguous cases (2+ personas colliding on the same page_blocks rows, or
-- an account with 2+ personas generally) — run this migration, then read
-- their output before any later phase treats persona_type as reliable.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Backfill creator_profiles for every account with 'creator' in personas
-- ---------------------------------------------------------------------------

INSERT INTO public.creator_profiles (
  auth_user_id, bio, avatar_url, city, neighbourhood, creator_type,
  sub_types, offline_activities, interest_tags, social_links,
  instagram_handle, page_theme, show_city_mastery, created_at, updated_at
)
SELECT
  id, bio, avatar_url, city, neighbourhood, creator_type,
  sub_types, offline_activities, interest_tags, social_links,
  instagram_handle, page_theme, COALESCE(show_city_mastery, true),
  created_at, updated_at
FROM public.user_profiles
WHERE 'creator' = ANY(personas)
ON CONFLICT (auth_user_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Backfill brand_profiles for every account with 'brand' in personas
--    business_name seeds from the current (possibly Creator/Explorer-
--    overwritten) display_name — a reasonable starting point, editable
--    afterward. NULL is also valid (falls back to display_name at read time
--    per migration 075's column comment) but seeding it avoids every
--    existing Brand account appearing to have lost their name outright.
-- ---------------------------------------------------------------------------

INSERT INTO public.brand_profiles (
  auth_user_id, business_name, bio, avatar_url, city, business_categories,
  wimc_goals, target_audience, contact_whatsapp, contact_email, website_url,
  instagram_handle, page_theme, created_at, updated_at
)
SELECT
  id, display_name, bio, avatar_url, city, business_categories,
  wimc_goals, target_audience, contact_whatsapp, contact_email, website_url,
  instagram_handle, page_theme, created_at, updated_at
FROM public.user_profiles
WHERE 'brand' = ANY(personas)
ON CONFLICT (auth_user_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Carry the current shared page_theme into venue_profiles/explorer_profiles
--    (columns added in migration 075, default '{}'). Without this, an
--    account's existing theme choice would appear to reset the moment a
--    later phase starts reading from these new columns instead of the old
--    shared one. Guarded so it only fills in rows still at the default.
-- ---------------------------------------------------------------------------

UPDATE public.venue_profiles vp
SET page_theme = up.page_theme
FROM public.user_profiles up
WHERE vp.auth_user_id = up.id
  AND vp.page_theme = '{}'::jsonb
  AND up.page_theme <> '{}'::jsonb;

UPDATE public.explorer_profiles ep
SET page_theme = up.page_theme
FROM public.user_profiles up
WHERE ep.auth_user_id = up.id
  AND ep.page_theme = '{}'::jsonb
  AND up.page_theme <> '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- 4. page_blocks persona_type — unambiguous case only.
--    An account's page_blocks rows can only be unambiguously attributed to
--    one persona when exactly one of {creator,brand,venue,explorer} is
--    present in personas[]. Two or more of those four -> left NULL, surfaced
--    in the review query below instead of guessed.
-- ---------------------------------------------------------------------------

WITH owner_personas AS (
  SELECT
    up.id AS profile_id,
    ARRAY(
      SELECT p FROM unnest(up.personas) AS p
      WHERE p IN ('creator', 'brand', 'venue', 'explorer')
    ) AS relevant_personas
  FROM public.user_profiles up
  WHERE EXISTS (
    SELECT 1 FROM public.page_blocks pb
    WHERE pb.profile_id = up.id AND pb.persona_type IS NULL
  )
)
UPDATE public.page_blocks pb
SET persona_type = op.relevant_personas[1]
FROM owner_personas op
WHERE pb.profile_id = op.profile_id
  AND pb.persona_type IS NULL
  AND array_length(op.relevant_personas, 1) = 1;

-- ---------------------------------------------------------------------------
-- 5. user_role — fix the write gap for Explorer-only accounts.
--    Every onboarding path currently leaves user_role at its DEFAULT
--    'maker' (see migration 007) — nothing ever writes 'explorer'. Only the
--    unambiguous case (explorer is the account's ONLY persona) is corrected
--    here; accounts with explorer + any other persona are left untouched
--    because user_role is a single scalar and can't represent "this account
--    is both a maker and an explorer" — see this migration's PR description
--    / the investigation for the recommendation to eventually replace
--    user_role reads with direct personas[] checks instead of widening this
--    column further.
-- ---------------------------------------------------------------------------

UPDATE public.user_profiles
SET user_role = 'explorer'
WHERE user_role = 'maker'
  AND personas @> ARRAY['explorer']::text[]
  AND array_length(personas, 1) = 1;

-- ---------------------------------------------------------------------------
-- 6. MANUAL REVIEW OUTPUT — run this migration, then read these two results.
-- ---------------------------------------------------------------------------

-- 6a. Accounts whose page_blocks rows are still ambiguous (2+ of
--     creator/brand/venue/explorer collide on the same block set).
SELECT
  up.id                AS account_id,
  up.username,
  up.personas,
  COUNT(pb.id)          AS block_count,
  MIN(pb.created_at)     AS blocks_created_at
FROM public.user_profiles up
JOIN public.page_blocks pb ON pb.profile_id = up.id
WHERE pb.persona_type IS NULL
GROUP BY up.id, up.username, up.personas
ORDER BY blocks_created_at;

-- 6b. All accounts with 2+ personas — the broader "which existing accounts
--     were already affected by the collision bug" question from the prior
--     investigation, answerable now that we're connected to real data.
--     creator_type/bio/city/username/page_theme/avatar_url/instagram_handle
--     on these accounts' OLD user_profiles row reflect only the
--     last-written persona; the new creator_profiles/brand_profiles rows
--     just inserted above are seeded from that same last-written value.
SELECT id AS account_id, username, personas, creator_type, user_role, created_at
FROM public.user_profiles
WHERE array_length(personas, 1) > 1
ORDER BY created_at;
