-- Migration 036: Google Places enrichment columns for adda_profiles
-- Adds columns to store data auto-fetched from Google Places during onboarding.
-- Photos are stored in Supabase Storage (adda-covers bucket) and their URLs
-- flow through the existing gallery_images column.

ALTER TABLE public.adda_profiles
  ADD COLUMN IF NOT EXISTS google_place_id  text,
  ADD COLUMN IF NOT EXISTS google_name      text,
  ADD COLUMN IF NOT EXISTS phone            text,
  ADD COLUMN IF NOT EXISTS website          text,
  ADD COLUMN IF NOT EXISTS google_rating    numeric(2,1),
  ADD COLUMN IF NOT EXISTS google_reviews   jsonb NOT NULL DEFAULT '[]';

COMMENT ON COLUMN public.adda_profiles.google_place_id IS 'Google Places place_id for this venue — used for deep-linking and re-enrichment.';
COMMENT ON COLUMN public.adda_profiles.google_name     IS 'Business name as it appears on Google Maps.';
COMMENT ON COLUMN public.adda_profiles.phone           IS 'Phone number sourced from Google Places during onboarding.';
COMMENT ON COLUMN public.adda_profiles.website         IS 'Website URL sourced from Google Places during onboarding.';
COMMENT ON COLUMN public.adda_profiles.google_rating   IS 'Google Maps average rating at time of onboarding (1.0–5.0).';
COMMENT ON COLUMN public.adda_profiles.google_reviews  IS 'Up to 5 Google reviews at onboarding time. Shape: [{author_name, rating, text, time, profile_photo_url}].';
