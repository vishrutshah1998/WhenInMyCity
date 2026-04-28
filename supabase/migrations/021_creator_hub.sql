-- ============================================================
-- Migration 021 — Creator Hub
-- creator_connections + creator_messages tables
-- ============================================================

-- Connection requests between Lantern/Beacon creators
CREATE TABLE IF NOT EXISTS public.creator_connections (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id  uuid        NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  recipient_id  uuid        NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  status        text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (requester_id, recipient_id)
);

ALTER TABLE public.creator_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select own connections" ON public.creator_connections
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

CREATE POLICY "insert connection request" ON public.creator_connections
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "update own connections" ON public.creator_connections
  FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

-- Messages within accepted connections
CREATE TABLE IF NOT EXISTS public.creator_messages (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid        NOT NULL REFERENCES public.creator_connections(id) ON DELETE CASCADE,
  sender_id     uuid        NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  body          text        NOT NULL,
  sent_at       timestamptz NOT NULL DEFAULT now(),
  read_at       timestamptz
);

ALTER TABLE public.creator_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select connection messages" ON public.creator_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.creator_connections cc
      WHERE cc.id = connection_id
        AND (cc.requester_id = auth.uid() OR cc.recipient_id = auth.uid())
    )
  );

CREATE POLICY "insert connection messages" ON public.creator_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.creator_connections cc
      WHERE cc.id = connection_id
        AND (cc.requester_id = auth.uid() OR cc.recipient_id = auth.uid())
        AND cc.status = 'accepted'
    )
  );

CREATE POLICY "update message read_at" ON public.creator_messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.creator_connections cc
      WHERE cc.id = connection_id
        AND (cc.requester_id = auth.uid() OR cc.recipient_id = auth.uid())
    )
  );
