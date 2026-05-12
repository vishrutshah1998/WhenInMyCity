-- Migration 026: Add neighbourhood to user_profiles
-- Enables micro-local leaderboards on /explore/city

alter table public.user_profiles
  add column if not exists neighbourhood text default null;
