-- ============================================================
-- Migration 058 — Booking Inquiries: accepted_at
-- Adds a separate accept/unaccept toggle to booking_inquiries,
-- independent of the existing status column.
-- ============================================================

ALTER TABLE public.booking_inquiries
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz NULL DEFAULT NULL;
