-- =============================================================================
-- Migration 050: RSVP discovery_source tracking
--
-- Beta-phase instrumentation: tags each RSVP with how the attendee arrived at
-- the booking flow, so cross-creator explorer retention (RSVPs sourced from
-- platform discovery surfaces, not a creator's own promotion) can be measured
-- during Phase 1. Purely additive -- does not touch the locked revenue-split
-- columns (platform_fee_paise / maker_payout_paise / venue_fee_paise /
-- split_tier, migration 017).
--
-- No RLS change needed: all rsvps inserts go through server actions using the
-- service-role client (bypasses RLS); the column's own CHECK constraint is
-- the only enforcement required.
-- =============================================================================

ALTER TABLE public.rsvps
  ADD COLUMN discovery_source text NOT NULL DEFAULT 'direct'
    CHECK (discovery_source IN ('creator_link', 'platform_discovery', 'direct'));

ALTER TABLE public.rsvps ALTER COLUMN discovery_source DROP DEFAULT;

COMMENT ON COLUMN public.rsvps.discovery_source IS
  'How the attendee arrived at this booking: creator_link = creator''s own shared link/public page, platform_discovery = Explore feed / Hall of Lights / Map of Legends / Adda page, direct = no tracked referrer (typed URL, external share, bookmark).';
