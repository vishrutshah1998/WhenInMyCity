-- Remove the 5-tag cap on interest_tags.
-- The UI previously enforced a max-5 selection limit which has since been removed
-- to allow users to pick as many interests as they like (min 3 still enforced in app).
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS interest_tags_max;
