-- ---------------------------------------------------------------------------
-- Migration 004: Add google_maps_url to events and venue_directory
-- ---------------------------------------------------------------------------

ALTER TABLE public.events
  ADD COLUMN google_maps_url text;

COMMENT ON COLUMN public.events.google_maps_url IS 'Optional Google Maps link for the venue location.';

ALTER TABLE public.venue_directory
  ADD COLUMN google_maps_url text;

COMMENT ON COLUMN public.venue_directory.google_maps_url IS 'Google Maps link for the venue.';
