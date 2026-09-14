-- Adds an opt-in "shortlisting" / application-approval gate for free (casual
-- RSVP) events. A host can require applicants who select "Going" to be
-- reviewed before they count as an attendee.
--
-- payment_status is intentionally left completely untouched for free-event
-- rows, even while an application is pending — there's no money involved,
-- so there's nothing to hold. Gating is done entirely through the new,
-- orthogonal application_status column below, same pattern as casual_intent
-- (migration 074): NULL means "not gated" (a normal ticketed booking, or a
-- casual RSVP on an event that doesn't require approval, or a 'maybe'/
-- 'not_going' response — only 'going' is ever gated).

ALTER TABLE public.events
  ADD COLUMN requires_approval    boolean NOT NULL DEFAULT false,
  ADD COLUMN application_question text CHECK (char_length(application_question) <= 200);

COMMENT ON COLUMN public.events.requires_approval    IS 'If true, a casual "going" RSVP is held as rsvps.application_status = ''pending'' until the host approves it. Added in migration 079.';
COMMENT ON COLUMN public.events.application_question IS 'Optional single custom question shown to applicants when requires_approval is true. Not a form builder — one free-text question, max 200 chars. Added in migration 079.';

ALTER TABLE public.rsvps
  ADD COLUMN application_status     text CHECK (application_status IN ('pending', 'approved', 'declined', 'waitlisted')),
  ADD COLUMN application_answer     text CHECK (char_length(application_answer) <= 500),
  ADD COLUMN application_decided_at timestamptz,
  ADD COLUMN application_decided_by uuid REFERENCES public.user_profiles(id),
  -- Mirrors the checked_in_requires_timestamp pattern (migration 001): a row
  -- that has actually been decided (anything other than NULL/'pending') must
  -- carry a decided_at timestamp.
  ADD CONSTRAINT application_decided_at_requires_decision CHECK (
    (application_status IS NULL OR application_status = 'pending') OR (application_decided_at IS NOT NULL)
  );

COMMENT ON COLUMN public.rsvps.application_status     IS 'NULL = not gated (ticketed booking, ungated casual RSVP, or maybe/not_going). Set only for a ''going'' casual RSVP on an event with requires_approval. Added in migration 079.';
COMMENT ON COLUMN public.rsvps.application_answer     IS 'Applicant''s answer to events.application_question, if one was set. Added in migration 079.';
COMMENT ON COLUMN public.rsvps.application_decided_at IS 'When the host approved/declined/waitlisted this application. Added in migration 079.';
COMMENT ON COLUMN public.rsvps.application_decided_by IS 'Host (user_profiles.id) who made the decision. Added in migration 079.';

-- Review-queue lookups filter by event + application_status.
CREATE INDEX idx_rsvps_event_application_status ON public.rsvps (event_id, application_status);

-- ---------------------------------------------------------------------------
-- RLS hardening — same pattern as migration 010.
--
-- Without this, a direct client insert could set application_status =
-- 'approved' on itself, bypassing the review queue entirely. A fresh insert
-- may only ever be un-gated (NULL) or freshly pending — 'approved' /
-- 'declined' / 'waitlisted' must come from decideApplication (service_role,
-- bypasses RLS).
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "rsvps_insert_anyone_constrained" ON public.rsvps;

CREATE POLICY "rsvps_insert_anyone_constrained_v2"
  ON public.rsvps
  FOR INSERT
  WITH CHECK (
    payment_status = 'pending'
    AND (amount_paid IS NULL OR amount_paid = 0)
    AND qr_code_token IS NULL
    AND (application_status IS NULL OR application_status = 'pending')
  );
