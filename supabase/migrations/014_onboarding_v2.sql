-- =============================================================================
-- WIMC — Onboarding v2: new creator categories + profile columns
-- Migration: 014_onboarding_v2.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extend creator_type enum with v2 categories
-- (old values kept for backward compatibility with existing profiles)
-- ---------------------------------------------------------------------------

ALTER TYPE public.creator_type ADD VALUE IF NOT EXISTS 'music';
ALTER TYPE public.creator_type ADD VALUE IF NOT EXISTS 'comedy_theatre';
ALTER TYPE public.creator_type ADD VALUE IF NOT EXISTS 'video_content';
ALTER TYPE public.creator_type ADD VALUE IF NOT EXISTS 'teaching_coaching';
ALTER TYPE public.creator_type ADD VALUE IF NOT EXISTS 'lifestyle_wellness';
ALTER TYPE public.creator_type ADD VALUE IF NOT EXISTS 'business_brand';
ALTER TYPE public.creator_type ADD VALUE IF NOT EXISTS 'professional_portfolio';
ALTER TYPE public.creator_type ADD VALUE IF NOT EXISTS 'community_impact';
ALTER TYPE public.creator_type ADD VALUE IF NOT EXISTS 'exploring';

-- ---------------------------------------------------------------------------
-- New columns on user_profiles
-- ---------------------------------------------------------------------------

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS sub_types        text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS offline_activities text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.user_profiles.sub_types IS
  'Category-specific sub-type selections (e.g. "Originals", "Live gigs" for Music)';

COMMENT ON COLUMN public.user_profiles.offline_activities IS
  'Offline activity preferences selected during onboarding (e.g. "Gigs & performances")';
