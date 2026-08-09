-- ============================================================
-- Migration 068 — Maker counter-offers
-- Lets a Maker respond to a Venue's counter-offer with their own
-- adjusted terms (instead of only accept/decline/withdraw), so a
-- proposal can negotiate back and forth instead of dead-ending.
-- ============================================================

-- Pre-existing gap found while touching this table: withdrawProposal()
-- (src/app/actions/venue.ts) has written status = 'withdrawn' since it was
-- added, but no prior migration ever added 'withdrawn' to this CHECK
-- constraint — every withdraw attempt has been failing at the DB layer.
-- Fixed here since 'declined' (used by the new decline action below) needs
-- the same constraint touched anyway. The constraint was never renamed off
-- its original 'adda' name in migration 052 either, so both names are
-- dropped defensively.
ALTER TABLE public.maker_venue_proposals DROP CONSTRAINT IF EXISTS maker_adda_proposals_status_check;
ALTER TABLE public.maker_venue_proposals DROP CONSTRAINT IF EXISTS maker_venue_proposals_status_check;

ALTER TABLE public.maker_venue_proposals
  ADD CONSTRAINT maker_venue_proposals_status_check
  CHECK (status IN ('pending', 'counter_offered', 'accepted', 'declined', 'expired', 'withdrawn'));

-- counter_offer_by tracks who authored the current counter_offer, so both
-- sides know whose turn it is to respond while status stays
-- 'counter_offered' (a Venue counter and a Maker counter-back share the same
-- counter_offer/status columns — this column is what disambiguates them).
-- maker_counter_message is the Maker's note attached to their counter-back,
-- kept separate from `message` (the Maker's original ask) and
-- `venue_response_note` (the Venue's note on their own counter).
ALTER TABLE public.maker_venue_proposals
  ADD COLUMN counter_offer_by text CHECK (counter_offer_by IN ('venue', 'maker')),
  ADD COLUMN maker_counter_message text;

-- Backfill: every counter_offer written before this migration was set by a
-- Venue (maker counter-offers didn't exist yet).
UPDATE public.maker_venue_proposals
SET counter_offer_by = 'venue'
WHERE counter_offer IS NOT NULL AND counter_offer != '{}'::jsonb;

COMMENT ON COLUMN public.maker_venue_proposals.counter_offer_by IS 'Who authored the current counter_offer (venue or maker) — determines whose turn it is to respond while status = counter_offered.';
COMMENT ON COLUMN public.maker_venue_proposals.maker_counter_message IS 'Maker''s message accompanying their counter-offer back to the Venue.';
