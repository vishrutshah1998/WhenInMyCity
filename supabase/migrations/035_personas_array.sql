-- Add personas array to user_profiles
-- Keeps existing `persona` column untouched for backwards compat

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS personas text[] NOT NULL DEFAULT '{}';

-- Seed existing users: copy their current persona value into the array
-- user_role maps to persona: 'maker' -> 'creator', 'explorer' -> 'explorer'
UPDATE user_profiles
  SET personas = CASE
    WHEN user_role = 'maker'    THEN ARRAY['creator']
    WHEN user_role = 'explorer' THEN ARRAY['explorer']
    ELSE ARRAY[]::text[]
  END
  WHERE (personas IS NULL OR array_length(personas, 1) IS NULL OR array_length(personas, 1) = 0);

-- Index for array membership queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_personas
  ON user_profiles USING GIN (personas);
