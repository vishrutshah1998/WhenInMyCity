-- ============================================================
-- Migration 022 — Fan Ticket Tiers
-- ticket_tiers JSONB on events; tier tracking on rsvps
-- ============================================================

-- Patreon-style ticket tier array stored on the event.
-- Each element: { id, name, price_paise, description, capacity? }
-- NULL = event uses flat ticket_price (backward-compatible).
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS ticket_tiers jsonb;

-- Track which fan tier an attendee booked.
-- NULL for events that use flat pricing.
ALTER TABLE public.rsvps
  ADD COLUMN IF NOT EXISTS ticket_tier_id   text,
  ADD COLUMN IF NOT EXISTS ticket_tier_name text;
