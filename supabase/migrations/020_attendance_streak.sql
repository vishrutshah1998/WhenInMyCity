-- Migration 020 — Attendance streak tracking on user_profiles
--
-- attendance_streak:     current consecutive-week streak (weeks with ≥1 check-in)
-- streak_freeze_tokens:  stored freeze charges; consuming one bridges a missed week
-- last_streak_week:      ISO date of the Monday that starts the last counted week

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS attendance_streak      integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_freeze_tokens   integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_streak_week       date;

COMMENT ON COLUMN public.user_profiles.attendance_streak    IS 'Consecutive calendar weeks in which the explorer attended ≥1 event.';
COMMENT ON COLUMN public.user_profiles.streak_freeze_tokens IS 'Remaining freeze charges; each one bridges a single missed week. Granted when reaching Local tier.';
COMMENT ON COLUMN public.user_profiles.last_streak_week     IS 'Monday date (YYYY-MM-DD) of the most recent week that counted toward the streak.';
