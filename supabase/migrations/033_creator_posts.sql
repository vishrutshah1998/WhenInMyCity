-- Migration 033: Creator posts and reactions
-- Enables the WeVerse-style posts feed on creator profiles.

CREATE TABLE IF NOT EXISTS public.creator_posts (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id         UUID        NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  post_type          TEXT        NOT NULL CHECK (post_type IN ('text', 'photo', 'link')),
  content            TEXT,
  image_url          TEXT,
  link_url           TEXT,
  link_title         TEXT,
  link_preview       TEXT,
  is_subscriber_only BOOLEAN     NOT NULL DEFAULT false,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS creator_posts_creator_id_idx ON public.creator_posts (creator_id, created_at DESC);

-- Reactions: simple emoji reactions per user per post
CREATE TABLE IF NOT EXISTS public.post_reactions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID        NOT NULL REFERENCES public.creator_posts(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  emoji      TEXT        NOT NULL CHECK (emoji IN ('🔥', '❤️', '👏', '🎉', '💭')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS post_reactions_post_id_idx ON public.post_reactions (post_id);

-- RLS
ALTER TABLE public.creator_posts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reactions  ENABLE ROW LEVEL SECURITY;

-- Posts: publicly readable
CREATE POLICY "creator_posts_select_public"
  ON public.creator_posts FOR SELECT
  USING (true);

-- Posts: creators manage their own
CREATE POLICY "creator_posts_all_own"
  ON public.creator_posts FOR ALL
  USING (auth.uid() = creator_id);

-- Reactions: publicly readable
CREATE POLICY "post_reactions_select_public"
  ON public.post_reactions FOR SELECT
  USING (true);

-- Reactions: authenticated users can insert their own
CREATE POLICY "post_reactions_insert_own"
  ON public.post_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Reactions: users can delete their own
CREATE POLICY "post_reactions_delete_own"
  ON public.post_reactions FOR DELETE
  USING (auth.uid() = user_id);
