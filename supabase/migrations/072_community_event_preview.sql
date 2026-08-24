-- Communities: expose a draft event's title/start_time to approved community
-- members, without loosening events_select_public_or_own (001) itself.
--
-- events_select_public_or_own is all-or-nothing (status='published' OR
-- creator_id=self) — a draft event linked into a community via
-- community_events is otherwise completely invisible to other members,
-- including its date, so a community calendar can't place it on the
-- correct day. This is a narrow column-level carve-out instead of widening
-- that policy: only id/title/starts_at/creator_id, and only for a caller
-- who is an approved member (any role) of a community the event is linked
-- to via community_events.

CREATE OR REPLACE FUNCTION public.get_community_event_preview(p_event_id uuid)
RETURNS TABLE (
  id         uuid,
  title      text,
  starts_at  timestamptz,
  creator_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT e.id, e.title, e.starts_at, e.creator_id
  FROM public.events e
  WHERE e.id = p_event_id
    AND EXISTS (
      SELECT 1
      FROM public.community_events ce
      JOIN public.community_members cm ON cm.community_id = ce.community_id
      WHERE ce.event_id = p_event_id
        AND cm.user_id = (SELECT auth.uid())
        AND cm.status = 'approved'
    )
$$;

COMMENT ON FUNCTION public.get_community_event_preview(uuid) IS
  'Column-level carve-out for draft events linked to a community: returns only id/title/starts_at/creator_id, and only to an approved member (any role) of a community the event is linked to via community_events. Does not expose venue, pricing, description, or RSVP data — those stay behind events_select_public_or_own until publish.';
