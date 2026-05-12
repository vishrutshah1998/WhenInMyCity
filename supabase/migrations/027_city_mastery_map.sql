-- Migration 027: City mastery map opt-in sharing flag
-- Lets explorers share their neighbourhood attendance history on their public profile

alter table public.user_profiles
  add column if not exists show_city_mastery boolean not null default false;
