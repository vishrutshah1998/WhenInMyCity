-- =============================================================================
-- WIMC — Explorer Personalisation Layer
-- Migration: 009_explorer_personalisation.sql
--
-- Adds:
--   1. Rating columns to events table
--   2. notifications table with RLS
--   3. update_event_rating_aggregate() RPC (SECURITY DEFINER)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. ADD RATING COLUMNS TO events
-- ---------------------------------------------------------------------------

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS average_rating numeric(3,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_count   integer      NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.events.average_rating IS 'Rolling average of Explorer ratings (1–5). Recalculated by update_event_rating_aggregate().';
COMMENT ON COLUMN public.events.rating_count   IS 'Number of Explorer ratings submitted for this event.';

-- ---------------------------------------------------------------------------
-- 2. CREATE TABLE notifications
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.notifications (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type         text        NOT NULL,
  -- Maker:    'new_follower' | 'event_rsvp' | 'tier_upgrade' | 'proposal_response' | 'new_rating'
  -- Adda:     'new_proposal' | 'event_confirmed' | 'payment_settled'
  -- Explorer: 'followed_maker_new_event' | 'event_reminder' | 'rating_prompt'
  title        text        NOT NULL,
  body         text,
  action_url   text,
  is_read      boolean     NOT NULL DEFAULT false,
  metadata     jsonb       NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient
  ON public.notifications(recipient_id, is_read, created_at DESC);

COMMENT ON TABLE public.notifications IS 'In-app notifications for all user roles.';
COMMENT ON COLUMN public.notifications.type IS 'Maker: new_follower|event_rsvp|tier_upgrade|proposal_response|new_rating. Adda: new_proposal|event_confirmed|payment_settled. Explorer: followed_maker_new_event|event_reminder|rating_prompt.';
COMMENT ON COLUMN public.notifications.metadata IS 'Arbitrary context payload (e.g. event_id, maker_id) for deep-links.';

-- ---------------------------------------------------------------------------
-- 2a. RLS for notifications
-- ---------------------------------------------------------------------------

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Recipients can read their own notifications.
CREATE POLICY "notifications_select_own"
  ON public.notifications
  FOR SELECT
  USING (recipient_id = auth.uid());

-- Only server-side code (admin client / SECURITY DEFINER functions) may insert.
CREATE POLICY "notifications_insert_service"
  ON public.notifications
  FOR INSERT
  WITH CHECK (false);  -- blocked for normal client; use admin client / RPC

-- Recipients can update (mark read) only their own rows.
CREATE POLICY "notifications_update_own"
  ON public.notifications
  FOR UPDATE
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3. RPC: update_event_rating_aggregate
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_event_rating_aggregate(
  event_id_param uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_avg   numeric(3,2);
  new_count integer;
  v_creator_id uuid;
BEGIN
  -- Recalculate average and count from all non-null ratings for this event.
  SELECT
    AVG(rating)::numeric(3,2),
    COUNT(*)
  INTO new_avg, new_count
  FROM public.explorer_event_history
  WHERE event_id = event_id_param
    AND rating IS NOT NULL;

  -- Update the event row.
  UPDATE public.events
  SET
    average_rating = COALESCE(new_avg, 0),
    rating_count   = COALESCE(new_count, 0),
    updated_at     = now()
  WHERE id = event_id_param
  RETURNING creator_id INTO v_creator_id;

  -- Update the maker's rolling average across all their rated events.
  IF v_creator_id IS NOT NULL THEN
    UPDATE public.user_profiles
    SET
      average_event_rating = COALESCE(
        (
          SELECT AVG(e.average_rating)
          FROM public.events e
          WHERE e.creator_id = v_creator_id
            AND e.rating_count > 0
        ),
        0
      ),
      updated_at = now()
    WHERE id = v_creator_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.update_event_rating_aggregate(uuid) IS
  'Recalculates events.average_rating + rating_count and rolls up to user_profiles.average_event_rating for the maker. Called by submitEventRating server action.';

-- ---------------------------------------------------------------------------
-- 4. Ensure explorer_event_history RLS covers attended flag
--    (table was created in 007; add policy if not already present)
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  -- Only explorers may read their own history rows.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'explorer_event_history'
      AND policyname = 'explorer_event_history_select_own'
  ) THEN
    CREATE POLICY "explorer_event_history_select_own"
      ON public.explorer_event_history
      FOR SELECT
      USING (
        explorer_id = (
          SELECT id FROM public.explorer_profiles
          WHERE auth_user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'explorer_event_history'
      AND policyname = 'explorer_event_history_update_own'
  ) THEN
    CREATE POLICY "explorer_event_history_update_own"
      ON public.explorer_event_history
      FOR UPDATE
      USING (
        explorer_id = (
          SELECT id FROM public.explorer_profiles
          WHERE auth_user_id = auth.uid()
        )
      );
  END IF;
END $$;
