-- WIMC — Creator category refresh: add 7 new v3 creator types
-- Migration: 038_creator_category_refresh.sql
-- Removes no existing values (backward compat); old values remain valid for existing profiles.
-- ============================================================================

ALTER TYPE public.creator_type ADD VALUE IF NOT EXISTS 'dance';
ALTER TYPE public.creator_type ADD VALUE IF NOT EXISTS 'food_culinary';
ALTER TYPE public.creator_type ADD VALUE IF NOT EXISTS 'fitness_wellness';
ALTER TYPE public.creator_type ADD VALUE IF NOT EXISTS 'spirituality';
ALTER TYPE public.creator_type ADD VALUE IF NOT EXISTS 'travel_adventure';
ALTER TYPE public.creator_type ADD VALUE IF NOT EXISTS 'literature_poetry';
ALTER TYPE public.creator_type ADD VALUE IF NOT EXISTS 'crafts_making';
