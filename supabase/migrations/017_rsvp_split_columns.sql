-- =============================================================================
-- Migration 017: Lock revenue split at booking time
-- =============================================================================
-- Stores the three-way fee split on each RSVP row at the moment of booking so
-- that a creator's tier upgrade/downgrade between booking and payout does not
-- retroactively change what they earn on already-sold tickets.
--
-- NULL = legacy row (pre-017); payout logic falls back to live calculation.
-- 0   = free ticket (ticket_price = 0).
-- =============================================================================

ALTER TABLE public.rsvps
  ADD COLUMN IF NOT EXISTS platform_fee_paise integer,
  ADD COLUMN IF NOT EXISTS maker_payout_paise  integer,
  ADD COLUMN IF NOT EXISTS venue_fee_paise     integer,
  ADD COLUMN IF NOT EXISTS split_tier          text;

COMMENT ON COLUMN public.rsvps.platform_fee_paise IS 'Platform commission (paise) per ticket, locked at booking time. NULL for pre-017 rows.';
COMMENT ON COLUMN public.rsvps.maker_payout_paise  IS 'Creator net payout (paise) per ticket, locked at booking time. NULL for pre-017 rows.';
COMMENT ON COLUMN public.rsvps.venue_fee_paise     IS 'Adda venue share (paise) per ticket. Zero for self-organised events.';
COMMENT ON COLUMN public.rsvps.split_tier          IS 'Creator tier at time of sale — audit record for the split used.';
