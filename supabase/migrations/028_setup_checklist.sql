-- Migration 028: Setup checklist dismissed flags per task
-- Stores task IDs that the user has manually marked as done
-- (non-auto-detectable tasks: 'theme', 'share')

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS setup_checklist_dismissed text[] NOT NULL DEFAULT '{}';
