-- =============================================================================
-- WIMC — Migration: 006_link_clicks.sql
-- Link-click analytics for creator link-in-bio pages.
--
-- Every tap on a link/embed block on a creator's public profile is recorded
-- here.  Creators can see per-block click counts in their dashboard.
--
-- Design decisions:
--   - `block_id` cascades on delete so stale rows are auto-pruned when a
--     creator removes a block.
--   - `creator_id` is denormalised onto every row so analytics queries for
--     a given creator scan only that creator's rows (no JOIN needed).
--   - `device` is detected server-side from the User-Agent string.
--   - `referrer` is capped at 500 chars to prevent abuse; NULL for direct.
--   - RLS: anyone can INSERT (visitors are anonymous); creators can SELECT
--     only their own rows.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.link_clicks (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id    uuid        NOT NULL REFERENCES public.page_blocks(id) ON DELETE CASCADE,
  creator_id  uuid        NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  clicked_at  timestamptz NOT NULL DEFAULT now(),
  referrer    text        CHECK (char_length(referrer) <= 500),
  device      text        CHECK (device IN ('mobile', 'tablet', 'desktop'))
);

COMMENT ON TABLE  public.link_clicks                 IS 'Per-block link-tap analytics for creator profile pages.';
COMMENT ON COLUMN public.link_clicks.block_id        IS 'The page_block that was clicked. Cascades on delete.';
COMMENT ON COLUMN public.link_clicks.creator_id      IS 'Denormalised owner — avoids JOIN on read-heavy analytics queries.';
COMMENT ON COLUMN public.link_clicks.clicked_at      IS 'Wall-clock time of the tap (UTC).';
COMMENT ON COLUMN public.link_clicks.referrer        IS 'document.referrer at click time; NULL if direct / private.';
COMMENT ON COLUMN public.link_clicks.device          IS 'Device class inferred from User-Agent: mobile | tablet | desktop.';

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

-- Primary analytics read pattern: "give me all clicks for creator X in period Y"
CREATE INDEX IF NOT EXISTS link_clicks_creator_period_idx
  ON public.link_clicks (creator_id, clicked_at DESC);

-- Supports per-block aggregation
CREATE INDEX IF NOT EXISTS link_clicks_block_id_idx
  ON public.link_clicks (block_id);

-- ---------------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE public.link_clicks ENABLE ROW LEVEL SECURITY;

-- Visitors (anon) can record clicks — no auth required.
CREATE POLICY "anyone_can_insert_link_clicks"
  ON public.link_clicks
  FOR INSERT
  WITH CHECK (true);

-- Creators can only read their own analytics.
CREATE POLICY "creator_can_read_own_link_clicks"
  ON public.link_clicks
  FOR SELECT
  USING (creator_id = public.get_user_id());
