-- ============================================================
-- Migration 067 — Enable Realtime on creator_messages
-- Retrofits the Creator Hub DM thread (previously poll/fetch-only)
-- to receive live inserts, matching booking_messages (migration 066).
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'creator_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.creator_messages;
  END IF;
END $$;
