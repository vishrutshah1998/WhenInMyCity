-- ============================================================
-- Migration 066 — Booking messages
-- Real-time messaging between a venue owner and a maker on a
-- specific booking proposal (maker_venue_proposals row).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.booking_messages (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid        NOT NULL REFERENCES public.maker_venue_proposals(id) ON DELETE CASCADE,
  sender_id   uuid        NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  body        text        NOT NULL,
  sent_at     timestamptz NOT NULL DEFAULT now(),
  read_at     timestamptz
);

CREATE INDEX IF NOT EXISTS booking_messages_proposal_id_idx
  ON public.booking_messages (proposal_id, sent_at);

ALTER TABLE public.booking_messages ENABLE ROW LEVEL SECURITY;

-- A caller may read/write messages on a proposal only if they are the
-- maker who sent it or the owner of the venue it was sent to.
CREATE POLICY "select own booking messages" ON public.booking_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.maker_venue_proposals mvp
      JOIN public.venue_profiles vp ON vp.id = mvp.venue_id
      WHERE mvp.id = proposal_id
        AND (mvp.maker_id = auth.uid() OR vp.auth_user_id = auth.uid())
    )
  );

CREATE POLICY "insert own booking messages" ON public.booking_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.maker_venue_proposals mvp
      JOIN public.venue_profiles vp ON vp.id = mvp.venue_id
      WHERE mvp.id = proposal_id
        AND (mvp.maker_id = auth.uid() OR vp.auth_user_id = auth.uid())
    )
  );

CREATE POLICY "update booking message read_at" ON public.booking_messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.maker_venue_proposals mvp
      JOIN public.venue_profiles vp ON vp.id = mvp.venue_id
      WHERE mvp.id = proposal_id
        AND (mvp.maker_id = auth.uid() OR vp.auth_user_id = auth.uid())
    )
  );

-- Live delivery: ensure this table is part of the Realtime publication.
-- Guarded so this is a no-op if the publication already covers all tables
-- (e.g. a default FOR ALL TABLES publication) instead of erroring.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'booking_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_messages;
  END IF;
END $$;
