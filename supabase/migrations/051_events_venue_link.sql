-- Migration 051: events.venue_id (fixes a live production bug)
--
-- Application code (initiateRSVP in rsvp.ts, getPayableEvents in payouts.ts,
-- venue-tiers.ts, venue-analytics.ts, venue-dashboard.ts, venue-payouts.ts,
-- venue.ts, explorer.ts, events.ts, and database.ts's own types) has
-- referenced `events.venue_adda_id` since at least migration 009 — but no
-- migration ever actually created this column. Every query that selects or
-- filters on it throws `42703 column does not exist`, which is currently
-- swallowed into misleading generic errors in initiateRSVP ("Event not
-- found.") and getPayableEvents (raw Postgres error surfaced to the
-- creator). This breaks ticket purchases and creator payout requests for
-- every event, not just venue-linked ones.
--
-- Named venue_id directly (not adda_id) since it never existed under the
-- old name in a working state, and the Adda -> Venue rename is already
-- in progress across the rest of the codebase.

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS venue_id uuid REFERENCES public.adda_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_events_venue_id ON public.events(venue_id);

COMMENT ON COLUMN public.events.venue_id IS
  'Linked venue (adda_profiles.id) for events hosted at a formal venue listing. Null for self-organised events using the free-text venue_name/venue_address fields.';
