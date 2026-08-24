-- Communities: notice-board style groups (creator + explorer membership).
--
-- Two independent approval layers — do not conflate:
--   1. Community existence: admin-approved (communities.status)
--   2. Community membership: creator/owner-approved (community_members.status)
--
-- Membership is open to both Creators and Explorers (personas), like a run
-- club with organisers + participants. Only Creator-persona members may add
-- events or share events into the feed — see is_approved_creator_member().
-- If this assumption is wrong, only the RLS checks below need to change.

-- ── communities ─────────────────────────────────────────────────────────────

CREATE TABLE communities (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                   text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  slug                   text        NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9\-]{3,80}$'),
  description            text            CHECK (description IS NULL OR char_length(description) <= 1000),
  cover_image_url        text,
  city                   text,
  category               text,
  status                 text        NOT NULL DEFAULT 'pending'
                                     CHECK (status IN ('pending','approved','rejected')),
  created_by             uuid        NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  admin_reviewed_by      uuid            REFERENCES user_profiles(id) ON DELETE SET NULL,
  admin_reviewed_at      timestamptz,
  admin_rejection_reason text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN communities.status IS
  'pending: awaiting admin review; approved: publicly listed; rejected: admin-rejected.';

CREATE TRIGGER trg_communities_updated_at
  BEFORE UPDATE ON communities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── community_members ───────────────────────────────────────────────────────

CREATE TABLE community_members (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid        NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  role         text        NOT NULL DEFAULT 'member' CHECK (role IN ('owner','member')),
  status       text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  approved_at  timestamptz,
  approved_by  uuid            REFERENCES user_profiles(id) ON DELETE SET NULL,
  UNIQUE (community_id, user_id)
);

COMMENT ON COLUMN community_members.status IS
  'Independent of communities.status. The community owner (or an admin, via adminReviewCommunity) approves join requests.';

-- ── community_posts ─────────────────────────────────────────────────────────

CREATE TABLE community_posts (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid        NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  author_id    uuid        NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  content      text        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  post_type    text        NOT NULL DEFAULT 'update' CHECK (post_type IN ('update','event_share')),
  event_id     uuid            REFERENCES events(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CHECK (post_type <> 'event_share' OR event_id IS NOT NULL)
);

-- ── community_events ────────────────────────────────────────────────────────
-- Deliberately decoupled from community_posts — this is the source of truth
-- for the calendar view. A share writes a community_events row and,
-- optionally, a matching community_posts row (post_type='event_share').

CREATE TABLE community_events (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid        NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  event_id     uuid        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  added_by     uuid        NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  added_via    text        NOT NULL CHECK (added_via IN ('dashboard_share','community_direct')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (community_id, event_id)
);

-- ── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX communities_status_idx          ON communities (status) WHERE status = 'approved';
CREATE INDEX communities_created_by_idx      ON communities (created_by);
CREATE INDEX community_members_community_idx ON community_members (community_id);
CREATE INDEX community_members_user_idx      ON community_members (user_id);
CREATE INDEX community_posts_community_idx   ON community_posts (community_id, created_at DESC);
CREATE INDEX community_events_community_idx  ON community_events (community_id, created_at DESC);
CREATE INDEX community_events_event_idx      ON community_events (event_id);

-- ── Helper functions (SECURITY DEFINER — same idiom as has_creator_role()) ──

CREATE OR REPLACE FUNCTION public.has_creator_persona()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = (SELECT auth.uid()) AND personas @> ARRAY['creator']::text[]
  )
$$;

CREATE OR REPLACE FUNCTION public.is_approved_community_member(p_community_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.community_members
    WHERE community_id = p_community_id
      AND user_id = (SELECT auth.uid())
      AND status = 'approved'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_approved_creator_member(p_community_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.is_approved_community_member(p_community_id) AND public.has_creator_persona()
$$;

CREATE OR REPLACE FUNCTION public.is_community_owner(p_community_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.community_members
    WHERE community_id = p_community_id
      AND user_id = (SELECT auth.uid())
      AND role = 'owner'
      AND status = 'approved'
  )
$$;

-- ── Row-Level Security ───────────────────────────────────────────────────────

ALTER TABLE communities       ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_events  ENABLE ROW LEVEL SECURITY;

-- communities: public read once approved; creator can also see their own
-- pending/rejected requests. Insert always lands as 'pending'. Status
-- transitions (approve/reject) are admin-only, done via the service-role
-- client in adminReviewCommunity() — never exposed to authenticated UPDATE.
CREATE POLICY "communities_select_public_or_own" ON communities
  FOR SELECT USING (status = 'approved' OR created_by = (SELECT auth.uid()));

CREATE POLICY "communities_insert_own" ON communities
  FOR INSERT TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()) AND status = 'pending');

CREATE POLICY "communities_service_all" ON communities
  FOR ALL USING (auth.role() = 'service_role');

-- community_members: member list is part of the public notice-board once the
-- community is approved; a requester can also see their own row regardless.
-- Insert = join request (always 'pending'). Approve/reject is owner-only.
CREATE POLICY "community_members_select_public_or_own" ON community_members
  FOR SELECT USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM communities c WHERE c.id = community_id AND c.status = 'approved')
  );

CREATE POLICY "community_members_insert_own" ON community_members
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) AND status = 'pending')
;

CREATE POLICY "community_members_update_owner" ON community_members
  FOR UPDATE TO authenticated
  USING (public.is_community_owner(community_id))
  WITH CHECK (public.is_community_owner(community_id));

CREATE POLICY "community_members_service_all" ON community_members
  FOR ALL USING (auth.role() = 'service_role');

-- community_posts: readable once the community is approved. Any approved
-- member may post an 'update'; only Creator-persona approved members may
-- post 'event_share', and only for an event they own.
CREATE POLICY "community_posts_select_public" ON community_posts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM communities c WHERE c.id = community_id AND c.status = 'approved')
  );

CREATE POLICY "community_posts_insert_member" ON community_posts
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND public.is_approved_community_member(community_id)
    AND (
      post_type = 'update'
      OR (
        post_type = 'event_share'
        AND public.has_creator_persona()
        AND EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND e.creator_id = (SELECT auth.uid()))
      )
    )
  );

CREATE POLICY "community_posts_service_all" ON community_posts
  FOR ALL USING (auth.role() = 'service_role');

-- community_events: readable once the community is approved. Insert
-- restricted to approved Creator-persona members, for an event they own.
CREATE POLICY "community_events_select_public" ON community_events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM communities c WHERE c.id = community_id AND c.status = 'approved')
  );

CREATE POLICY "community_events_insert_creator_member" ON community_events
  FOR INSERT TO authenticated
  WITH CHECK (
    added_by = (SELECT auth.uid())
    AND public.is_approved_creator_member(community_id)
    AND EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND e.creator_id = (SELECT auth.uid()))
  );

CREATE POLICY "community_events_service_all" ON community_events
  FOR ALL USING (auth.role() = 'service_role');
