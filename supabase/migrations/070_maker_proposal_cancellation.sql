-- =============================================================================
-- Migration 070 — Maker cancellation of confirmed venue bookings
--
-- Until now, an 'accepted' maker_venue_proposals row had no way back —
-- withdrawProposal() only covers 'pending'/'counter_offered'. A Maker whose
-- confirmed venue booking falls through (illness, venue issue, change of
-- plan) had no in-app path to release it; the venue would just be
-- unreachable and never told. This adds a 'cancelled' status plus the
-- metadata to record who cancelled and why.
--
-- Deliberately does NOT touch the linked `events` row (if one exists) —
-- cancelling the venue side of a booking is a separate decision from
-- cancelling the public event/refunding attendees, which stays the existing
-- cancelEvent() flow in src/app/actions/events.ts.
-- =============================================================================

ALTER TABLE public.maker_venue_proposals DROP CONSTRAINT IF EXISTS maker_adda_proposals_status_check;
ALTER TABLE public.maker_venue_proposals DROP CONSTRAINT IF EXISTS maker_venue_proposals_status_check;

ALTER TABLE public.maker_venue_proposals
  ADD CONSTRAINT maker_venue_proposals_status_check
  CHECK (status IN ('pending', 'counter_offered', 'accepted', 'declined', 'expired', 'withdrawn', 'cancelled'));

ALTER TABLE public.maker_venue_proposals
  ADD COLUMN IF NOT EXISTS cancelled_at        timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_reason  text,
  ADD COLUMN IF NOT EXISTS cancelled_by         text CHECK (cancelled_by IN ('maker', 'venue'));

COMMENT ON COLUMN public.maker_venue_proposals.cancelled_at        IS 'When an already-accepted booking was cancelled (status -> cancelled). NULL for proposals never accepted or withdrawn pre-acceptance.';
COMMENT ON COLUMN public.maker_venue_proposals.cancellation_reason IS 'Free-text reason supplied by whoever cancelled a confirmed booking.';
COMMENT ON COLUMN public.maker_venue_proposals.cancelled_by         IS 'Who cancelled a confirmed booking — maker or venue. Only the maker-side cancel action exists today; venue kept as a valid value for a future symmetric action.';
