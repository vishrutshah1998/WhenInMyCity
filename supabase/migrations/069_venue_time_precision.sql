-- =============================================================================
-- Migration 069: Real start/end time precision for venue availability and
-- booking proposals, plus real setup/teardown buffer config.
--
-- venue_availability.slot_type and maker_venue_proposals.proposed_slot were
-- a coarse 4-value enum (morning/afternoon/evening/full_day) with no actual
-- clock-time backing. This added real start_time/end_time columns instead.
--
-- Additive only: slot_type/proposed_slot are kept as legacy, no-longer-written
-- columns so historical rows stay readable. Not dropped in this migration.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. venue_availability — add start_time/end_time
-- ---------------------------------------------------------------------------

ALTER TABLE public.venue_availability
  ADD COLUMN IF NOT EXISTS start_time time,
  ADD COLUMN IF NOT EXISTS end_time   time;

COMMENT ON COLUMN public.venue_availability.slot_type IS 'LEGACY — superseded by start_time/end_time as of migration 069. Not written by app code going forward; kept so historical rows remain readable.';

-- Backfill existing rows using the same coarse-slot -> clock-time mapping
-- app code previously used to bridge proposals to hourly pricing_rules.
UPDATE public.venue_availability SET start_time = '09:00', end_time = '13:00' WHERE slot_type = 'morning'   AND start_time IS NULL;
UPDATE public.venue_availability SET start_time = '13:00', end_time = '17:00' WHERE slot_type = 'afternoon' AND start_time IS NULL;
UPDATE public.venue_availability SET start_time = '18:00', end_time = '22:00' WHERE slot_type = 'evening'   AND start_time IS NULL;
UPDATE public.venue_availability SET start_time = '09:00', end_time = '21:00' WHERE slot_type = 'full_day'  AND start_time IS NULL;

CREATE INDEX IF NOT EXISTS venue_availability_venue_date_time_idx
  ON public.venue_availability (venue_id, date, start_time, end_time);

-- ---------------------------------------------------------------------------
-- 2. maker_venue_proposals — add start_time/end_time
-- ---------------------------------------------------------------------------

ALTER TABLE public.maker_venue_proposals
  ADD COLUMN IF NOT EXISTS start_time time,
  ADD COLUMN IF NOT EXISTS end_time   time;

COMMENT ON COLUMN public.maker_venue_proposals.proposed_slot IS 'LEGACY — superseded by start_time/end_time as of migration 069. Not written by app code going forward.';

UPDATE public.maker_venue_proposals SET start_time = '09:00', end_time = '13:00' WHERE proposed_slot = 'morning'   AND start_time IS NULL;
UPDATE public.maker_venue_proposals SET start_time = '13:00', end_time = '17:00' WHERE proposed_slot = 'afternoon' AND start_time IS NULL;
UPDATE public.maker_venue_proposals SET start_time = '18:00', end_time = '22:00' WHERE proposed_slot = 'evening'   AND start_time IS NULL;
UPDATE public.maker_venue_proposals SET start_time = '09:00', end_time = '21:00' WHERE proposed_slot = 'full_day'  AND start_time IS NULL;

-- proposed_slot has no DEFAULT today and is NOT NULL; give it one so new
-- INSERTs can omit it now that start_time/end_time are the source of truth.
ALTER TABLE public.maker_venue_proposals
  ALTER COLUMN proposed_slot SET DEFAULT 'full_day';

CREATE INDEX IF NOT EXISTS maker_venue_proposals_venue_date_time_idx
  ON public.maker_venue_proposals (venue_id, proposed_date, start_time, end_time);

-- ---------------------------------------------------------------------------
-- 3. venue_profiles — real setup/teardown buffer config
-- (previously hardcoded 30/45 minutes client-side)
-- ---------------------------------------------------------------------------

ALTER TABLE public.venue_profiles
  ADD COLUMN IF NOT EXISTS buffer_before_minutes integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS buffer_after_minutes  integer NOT NULL DEFAULT 45;

COMMENT ON COLUMN public.venue_profiles.buffer_before_minutes IS 'Minutes of setup time to visually block before a confirmed booking on the venue calendar.';
COMMENT ON COLUMN public.venue_profiles.buffer_after_minutes  IS 'Minutes of teardown time to visually block after a confirmed booking on the venue calendar.';
