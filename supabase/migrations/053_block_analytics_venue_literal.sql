-- Migration 053: block_analytics owner_type literal 'adda' -> 'venue'
--
-- Migration 049 (applied alongside 052 in the same push) added
-- block_analytics.owner_type with a CHECK constraint and RLS policies that
-- hardcode the literal 'adda', not just a table reference — renaming
-- adda_profiles -> venue_profiles in migration 052 did not touch these,
-- since Postgres only auto-updates table/column *references* on rename, not
-- string literals compared against a text column.
--
-- Confirmed live: inserting { owner_type: 'venue' } was rejected with
-- `violates check constraint "block_analytics_owner_type_check"` before
-- this migration. No existing rows use owner_type = 'adda' (checked before
-- migration 052), so this is a pure constraint/policy definition change,
-- no data to migrate.

ALTER TABLE public.block_analytics
  DROP CONSTRAINT IF EXISTS block_analytics_owner_type_check;

ALTER TABLE public.block_analytics
  ADD CONSTRAINT block_analytics_owner_type_check
  CHECK (owner_type IN ('creator', 'venue'));

COMMENT ON COLUMN public.block_analytics.owner_type IS
  'creator = Creator public-page event, venue = Venue public-page event.';

DROP POLICY IF EXISTS "block_analytics_select_own" ON public.block_analytics;

CREATE POLICY "block_analytics_select_own"
  ON public.block_analytics
  FOR SELECT
  USING (
    (owner_type = 'creator' AND owner_id = public.get_user_id())
    OR (owner_type = 'venue' AND owner_id IN (
      SELECT id FROM public.venue_profiles WHERE auth_user_id = auth.uid()
    ))
  );

DROP POLICY IF EXISTS "block_analytics_insert_anyone_constrained" ON public.block_analytics;

CREATE POLICY "block_analytics_insert_anyone_constrained"
  ON public.block_analytics
  FOR INSERT
  WITH CHECK (
    event_type IN ('view', 'click', 'subscribe')
    AND (
      (owner_type = 'creator'
        AND block_id IN (SELECT id FROM public.page_blocks)
        AND owner_id IN (SELECT id FROM public.user_profiles))
      OR (owner_type = 'venue'
        AND block_id IS NULL
        AND owner_id IN (SELECT id FROM public.venue_profiles))
    )
  );
