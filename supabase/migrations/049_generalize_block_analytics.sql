-- =============================================================================
-- Migration 049: Generalize block_analytics for Creator + Adda page analytics
--
-- block_analytics (migration 008) was designed as the intended replacement for
-- link_clicks but its only writer (trackBlockAnalytics) had zero real callers
-- until now -- Creator page click-tracking still ran through the older
-- link_clicks table. This migration makes block_analytics the one live
-- analytics-event table for BOTH personas:
--
--   - owner_type discriminates 'creator' (owner_id -> user_profiles.id) vs
--     'adda' (owner_id -> adda_profiles.id). No single FK can point at two
--     tables, so owner_id is left unconstrained at the DB level and validated
--     per-owner_type in the INSERT policy below (and in the writing server
--     action).
--   - block_id is now nullable: Adda pages don't use page_blocks at all, so
--     an Adda page-view event has no block to attach to.
--
-- link_clicks is left in place (not dropped) for audit/history purposes, but
-- is no longer written to going forward. Its history is backfilled into
-- block_analytics below so existing Creator dashboards don't go blank on
-- cutover.
-- =============================================================================

ALTER TABLE public.block_analytics
  DROP CONSTRAINT IF EXISTS block_analytics_profile_id_fkey;

ALTER TABLE public.block_analytics
  RENAME COLUMN profile_id TO owner_id;

ALTER TABLE public.block_analytics
  ALTER COLUMN block_id DROP NOT NULL;

ALTER TABLE public.block_analytics
  ADD COLUMN owner_type text NOT NULL DEFAULT 'creator'
    CHECK (owner_type IN ('creator', 'adda'));

ALTER TABLE public.block_analytics ALTER COLUMN owner_type DROP DEFAULT;

COMMENT ON COLUMN public.block_analytics.owner_id IS
  'Denormalised owner id -- user_profiles.id when owner_type=creator, adda_profiles.id when owner_type=adda. Not FK-constrained (would require two conditional FKs); validated per owner_type in the INSERT policy and in the writing server action.';
COMMENT ON COLUMN public.block_analytics.owner_type IS
  'creator = Creator public-page event, adda = Adda public-page event.';
COMMENT ON COLUMN public.block_analytics.block_id IS
  'page_blocks.id for Creator block interactions. NULL for Adda page-level events (Adda pages have no page_blocks).';

-- ---------------------------------------------------------------------------
-- Indexes: replace profile_id-based indexes with owner_type + owner_id
-- ---------------------------------------------------------------------------
DROP INDEX IF EXISTS idx_block_analytics_profile_id;
DROP INDEX IF EXISTS idx_block_analytics_event_type;

CREATE INDEX idx_block_analytics_owner
  ON public.block_analytics (owner_type, owner_id, occurred_at DESC);
CREATE INDEX idx_block_analytics_owner_event
  ON public.block_analytics (owner_type, owner_id, event_type, occurred_at DESC);

-- ---------------------------------------------------------------------------
-- RLS: SELECT -- creator reads own rows, adda owner reads own rows
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "block_analytics_select_own" ON public.block_analytics;

CREATE POLICY "block_analytics_select_own"
  ON public.block_analytics
  FOR SELECT
  USING (
    (owner_type = 'creator' AND owner_id = public.get_user_id())
    OR (owner_type = 'adda' AND owner_id IN (
      SELECT id FROM public.adda_profiles WHERE auth_user_id = auth.uid()
    ))
  );

-- ---------------------------------------------------------------------------
-- RLS: INSERT -- mirror migration 010's constraints, split by owner_type
-- ---------------------------------------------------------------------------
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
      OR (owner_type = 'adda'
        AND block_id IS NULL
        AND owner_id IN (SELECT id FROM public.adda_profiles))
    )
  );

-- ---------------------------------------------------------------------------
-- Backfill Creator click history from link_clicks so dashboards don't go
-- blank on cutover (block_analytics had zero historical rows before this).
-- ---------------------------------------------------------------------------
INSERT INTO public.block_analytics (block_id, owner_id, owner_type, event_type, referer, device_type, occurred_at)
SELECT block_id, creator_id, 'creator', 'click', referrer, device, clicked_at
FROM public.link_clicks;

COMMENT ON TABLE public.link_clicks IS
  'Deprecated -- superseded by block_analytics (owner_type=creator, event_type=click). Retained for historical audit only; no longer written to as of migration 049.';
