-- Migration 032: creator follows table
-- Enables the Follow button on /{username} public profile pages.

CREATE TABLE IF NOT EXISTS public.follows (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID        NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  creator_id  UUID        NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (follower_id, creator_id)
);

-- Index for fast lookups by creator (follower count queries)
CREATE INDEX IF NOT EXISTS follows_creator_id_idx ON public.follows (creator_id);
-- Index for fast lookups by follower (is-following checks)
CREATE INDEX IF NOT EXISTS follows_follower_id_idx ON public.follows (follower_id);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Anyone can read (needed for follower counts on public pages)
CREATE POLICY "follows_select_public"
  ON public.follows FOR SELECT
  USING (true);

-- Authenticated users may only insert follows where they are the follower.
-- user_profiles.id == auth.users.id so we can check directly.
CREATE POLICY "follows_insert_own"
  ON public.follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

-- Authenticated users may only delete their own follows.
CREATE POLICY "follows_delete_own"
  ON public.follows FOR DELETE
  USING (auth.uid() = follower_id);
