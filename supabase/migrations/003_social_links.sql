-- Add social_links jsonb column to user_profiles
-- Stores { instagram, twitter, youtube, tiktok, spotify, linkedin } as full URLs
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS social_links jsonb NOT NULL DEFAULT '{}'::jsonb;
