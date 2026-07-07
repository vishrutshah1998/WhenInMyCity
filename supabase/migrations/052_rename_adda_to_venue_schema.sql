-- =============================================================================
-- Migration 052: Rename Adda -> Venue across the DB schema
--
-- Final step of the Adda -> Venue product rename. Tables/columns/enum
-- literals only — no business logic changes. Revenue split calculation and
-- per-RSVP stored values are untouched (those live in rsvps.venue_fee_paise,
-- already correctly named, and calculateRevenueSplit()'s logic).
--
-- adda_event_revenue is deliberately NOT part of this migration — it was
-- never actually created by any prior migration despite being typed in
-- database.ts (see migration 051's commit message for the investigation).
-- Nothing queries it; recreating it here would be scope creep, not a rename.
--
-- Table/column renames automatically update every dependent FK, CHECK, and
-- RLS policy definition in place (Postgres tracks these by OID, not name) —
-- the ALTER ... RENAME CONSTRAINT / RENAME TO statements below are renaming
-- labels only, for readability, not re-establishing any relationship.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. TABLE RENAMES
-- ---------------------------------------------------------------------------

ALTER TABLE public.adda_profiles         RENAME TO venue_profiles;
ALTER TABLE public.adda_availability     RENAME TO venue_availability;
ALTER TABLE public.adda_availability_rules RENAME TO venue_availability_rules;
ALTER TABLE public.maker_adda_proposals  RENAME TO maker_venue_proposals;
ALTER TABLE public.adda_payout_requests  RENAME TO venue_payout_requests;

-- ---------------------------------------------------------------------------
-- 2. COLUMN RENAMES
-- ---------------------------------------------------------------------------

ALTER TABLE public.venue_profiles          RENAME COLUMN adda_type TO venue_type;
ALTER TABLE public.venue_profiles          RENAME COLUMN adda_tier TO venue_tier;

ALTER TABLE public.venue_availability      RENAME COLUMN adda_id TO venue_id;

ALTER TABLE public.venue_availability_rules RENAME COLUMN adda_id TO venue_id;

ALTER TABLE public.maker_venue_proposals   RENAME COLUMN adda_id TO venue_id;
ALTER TABLE public.maker_venue_proposals   RENAME COLUMN adda_response_note TO venue_response_note;

ALTER TABLE public.venue_payout_requests   RENAME COLUMN adda_id TO venue_id;
ALTER TABLE public.venue_payout_requests   RENAME COLUMN adda_share_paise TO venue_share_paise;

-- ---------------------------------------------------------------------------
-- 3. CONSTRAINT RENAMES (cosmetic — data/relationships already moved with
--    the table/column renames above; this just keeps introspected names
--    consistent with the new schema). Wrapped so a naming guess that
--    doesn't match reality skips instead of aborting the whole migration.
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  ALTER TABLE public.venue_profiles RENAME CONSTRAINT adda_profiles_pkey TO venue_profiles_pkey;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.venue_profiles RENAME CONSTRAINT adda_profiles_auth_user_id_fkey TO venue_profiles_auth_user_id_fkey;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.venue_profiles RENAME CONSTRAINT adda_profiles_adda_tier_check TO venue_profiles_venue_tier_check;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.venue_profiles RENAME CONSTRAINT adda_profiles_payout_kyc_status_check TO venue_profiles_payout_kyc_status_check;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.venue_availability RENAME CONSTRAINT adda_availability_pkey TO venue_availability_pkey;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.venue_availability RENAME CONSTRAINT adda_availability_adda_id_fkey TO venue_availability_venue_id_fkey;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.venue_availability RENAME CONSTRAINT adda_availability_event_id_fkey TO venue_availability_event_id_fkey;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.venue_availability_rules RENAME CONSTRAINT adda_availability_rules_pkey TO venue_availability_rules_pkey;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.venue_availability_rules RENAME CONSTRAINT adda_availability_rules_adda_id_fkey TO venue_availability_rules_venue_id_fkey;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.venue_availability_rules RENAME CONSTRAINT adda_availability_rules_rule_type_check TO venue_availability_rules_rule_type_check;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.maker_venue_proposals RENAME CONSTRAINT maker_adda_proposals_pkey TO maker_venue_proposals_pkey;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.maker_venue_proposals RENAME CONSTRAINT maker_adda_proposals_maker_id_fkey TO maker_venue_proposals_maker_id_fkey;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.maker_venue_proposals RENAME CONSTRAINT maker_adda_proposals_adda_id_fkey TO maker_venue_proposals_venue_id_fkey;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.maker_venue_proposals RENAME CONSTRAINT maker_adda_proposals_event_id_fkey TO maker_venue_proposals_event_id_fkey;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.venue_payout_requests RENAME CONSTRAINT adda_payout_requests_pkey TO venue_payout_requests_pkey;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.venue_payout_requests RENAME CONSTRAINT adda_payout_requests_adda_id_fkey TO venue_payout_requests_venue_id_fkey;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.venue_payout_requests RENAME CONSTRAINT adda_payout_requests_payment_method_check TO venue_payout_requests_payment_method_check;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.venue_payout_requests RENAME CONSTRAINT adda_payout_requests_status_check TO venue_payout_requests_status_check;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 4. INDEX RENAMES
-- ---------------------------------------------------------------------------

DO $$ BEGIN ALTER INDEX adda_profiles_city_idx RENAME TO venue_profiles_city_idx; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER INDEX adda_profiles_is_active_idx RENAME TO venue_profiles_is_active_idx; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER INDEX adda_profiles_pricing_model_idx RENAME TO venue_profiles_pricing_model_idx; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER INDEX adda_availability_adda_id_date_idx RENAME TO venue_availability_venue_id_date_idx; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER INDEX adda_availability_status_idx RENAME TO venue_availability_status_idx; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER INDEX maker_adda_proposals_maker_id_idx RENAME TO maker_venue_proposals_maker_id_idx; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER INDEX maker_adda_proposals_adda_id_idx RENAME TO maker_venue_proposals_venue_id_idx; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER INDEX maker_adda_proposals_status_idx RENAME TO maker_venue_proposals_status_idx; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER INDEX idx_adda_city_events RENAME TO idx_venue_city_events; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 5. RLS POLICY RENAMES
-- ---------------------------------------------------------------------------

DO $$ BEGIN ALTER POLICY "adda_profiles_select_public" ON public.venue_profiles RENAME TO "venue_profiles_select_public"; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER POLICY "adda_profiles_insert_own" ON public.venue_profiles RENAME TO "venue_profiles_insert_own"; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER POLICY "adda_profiles_update_own" ON public.venue_profiles RENAME TO "venue_profiles_update_own"; EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN ALTER POLICY "adda_availability_select_public" ON public.venue_availability RENAME TO "venue_availability_select_public"; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER POLICY "adda_availability_insert_own" ON public.venue_availability RENAME TO "venue_availability_insert_own"; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER POLICY "adda_availability_update_own" ON public.venue_availability RENAME TO "venue_availability_update_own"; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER POLICY "adda_availability_delete_own" ON public.venue_availability RENAME TO "venue_availability_delete_own"; EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN ALTER POLICY "proposals_select_maker_or_adda" ON public.maker_venue_proposals RENAME TO "proposals_select_maker_or_venue"; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER POLICY "proposals_update_maker_or_adda" ON public.maker_venue_proposals RENAME TO "proposals_update_maker_or_venue"; EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN ALTER POLICY "Adda owners manage their availability rules" ON public.venue_availability_rules RENAME TO "Venue owners manage their availability rules"; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER POLICY "Adda owners manage their payout requests" ON public.venue_payout_requests RENAME TO "Venue owners manage their payout requests"; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 6. COLUMN / TABLE COMMENTS (cosmetic, for anyone reading the schema)
-- ---------------------------------------------------------------------------

COMMENT ON COLUMN public.venue_profiles.slug IS 'URL-safe slug used in /venue/[slug]';
COMMENT ON COLUMN public.venue_profiles.venue_tier IS 'Trust-axis tier. Separate from the time-bound Trending overlay (trending_until).';
COMMENT ON COLUMN public.venue_profiles.trending_until IS 'If set and in the future, the Venue carries the Trending badge. Cleared when velocity criteria are no longer met.';
COMMENT ON COLUMN public.venue_profiles.on_time_rate IS 'Fraction of events that started on time (first check-in within 15 min of starts_at). Updated by evaluate-venue-tiers cron.';
COMMENT ON COLUMN public.venue_profiles.repeat_attendee_rate IS 'Fraction of unique attendees who attended more than one event at this Venue. Updated by cron.';
COMMENT ON COLUMN public.venue_profiles.beloved_since IS 'Timestamp when the Venue first reached Beloved tier. Used to track the 2-year tenure required for Legendary.';
