-- ============================================================
-- Migration 025 — Booking Inquiries
-- booking_inquiries table for the booking_request block
-- ============================================================

-- Stores "book me for your event" form submissions from visitors.
-- Each row is tied to a creator (creator_id) and the specific block (block_id)
-- that rendered the form, so creators can see which block drove each inquiry.
CREATE TABLE IF NOT EXISTS public.booking_inquiries (
  id                uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id        uuid        NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  block_id          uuid        NOT NULL,
  requester_name    text        NOT NULL,
  requester_email   text        NOT NULL,
  event_type        text,
  message           text,
  status            text        NOT NULL DEFAULT 'new',
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_inquiries ENABLE ROW LEVEL SECURITY;

-- Creators can read their own inquiries
CREATE POLICY "booking_inquiries_creator_select"
  ON public.booking_inquiries FOR SELECT
  USING (auth.uid() = creator_id);

-- Anyone (including anon visitors) can submit an inquiry
CREATE POLICY "booking_inquiries_public_insert"
  ON public.booking_inquiries FOR INSERT
  WITH CHECK (true);

-- Index for dashboard lookup
CREATE INDEX IF NOT EXISTS booking_inquiries_creator_id_idx
  ON public.booking_inquiries (creator_id, created_at DESC);
