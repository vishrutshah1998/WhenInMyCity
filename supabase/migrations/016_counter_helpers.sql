-- =============================================================================
-- Migration 016: Atomic user metric counter helper
-- =============================================================================
-- Provides a SECURITY DEFINER function for atomically incrementing or
-- decrementing the tier-evaluation counters added in migration 015.
-- Column names are whitelisted to prevent SQL injection via dynamic SQL.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.increment_user_metric(
  p_user_id uuid,
  p_column  text,
  p_delta   int DEFAULT 1
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_column NOT IN (
    'rsvps_total_count',
    'events_attended_count',
    'no_shows_count',
    'reviews_posted_count',
    'events_saved_count',
    'creators_followed_count'
  ) THEN
    RAISE EXCEPTION 'Column % is not a whitelisted metric counter', p_column;
  END IF;

  EXECUTE format(
    'UPDATE public.user_profiles SET %I = GREATEST(0, COALESCE(%I, 0) + $1) WHERE id = $2',
    p_column, p_column
  ) USING p_delta, p_user_id;
END;
$$;

COMMENT ON FUNCTION public.increment_user_metric IS
  'Atomically increments (or decrements with a negative delta) a whitelisted counter column on user_profiles. GREATEST(0,...) prevents counters going negative from ordering races.';
