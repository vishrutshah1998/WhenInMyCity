-- Reactions on community_posts. Deliberately a separate table from
-- post_reactions (033_creator_posts.sql) rather than a generalized/shared
-- one — post_reactions' FK is hard-wired to creator_posts, and creator
-- posts vs. community posts are different domains that happen to look the
-- same in the UI. Same emoji set and unique-constraint convention as
-- post_reactions: one reaction per (post, user, emoji) — a user can react
-- with multiple different emoji on the same post.

CREATE TABLE public.community_post_reactions (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  community_post_id uuid        NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id           uuid        NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  emoji             text        NOT NULL CHECK (emoji IN ('🔥', '❤️', '👏', '🎉', '💭')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (community_post_id, user_id, emoji)
);

CREATE INDEX community_post_reactions_post_idx ON public.community_post_reactions (community_post_id);

ALTER TABLE public.community_post_reactions ENABLE ROW LEVEL SECURITY;

-- Readable by anyone who can read the parent post (i.e. the community is
-- approved) — matches community_posts_select_public's own condition.
CREATE POLICY "community_post_reactions_select_public" ON community_post_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM community_posts cp
      JOIN communities c ON c.id = cp.community_id
      WHERE cp.id = community_post_id AND c.status = 'approved'
    )
  );

-- Insert restricted to approved community members, reacting as themselves.
CREATE POLICY "community_post_reactions_insert_own" ON community_post_reactions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM community_posts cp
      WHERE cp.id = community_post_id
        AND public.is_approved_community_member(cp.community_id)
    )
  );

CREATE POLICY "community_post_reactions_delete_own" ON community_post_reactions
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "community_post_reactions_service_all" ON community_post_reactions
  FOR ALL USING (auth.role() = 'service_role');
