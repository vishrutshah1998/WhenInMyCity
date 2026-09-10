-- Migration 080: Paid-event application approval (Phase B)
--
-- Adds the pre-payment "shortlisting" flow for PAID gated events, as a
-- companion to migration 079's free/casual gating. Approval does NOT touch
-- Razorpay or reserve a spot — it only opens a time-limited window in which
-- the guest can pay through the existing, unmodified initiateRSVP flow.
--
-- event_applications is intentionally a separate table from rsvps: Phase A's
-- gating (migration 079) lives on rsvps because a free casual RSVP row IS
-- the booking. Here the booking (an rsvps row) doesn't exist until payment
-- succeeds, so there is nothing on rsvps to gate — event_applications tracks
-- the entire pre-payment phase on its own, and an approved application
-- becomes linked to a real rsvps row (via rsvp_id) only once payment
-- succeeds.
--
-- Capacity is deliberately NOT checked anywhere in this table or its
-- surrounding actions — only initiateRSVP enforces capacity, at the moment
-- someone actually pays. A host may approve more applicants than remaining
-- capacity; late payers will simply hit initiateRSVP's existing "sold out" /
-- "only N spots left" errors. This is intentional, expected behavior.

ALTER TABLE public.events
  ADD COLUMN application_payment_window_minutes integer
    CHECK (application_payment_window_minutes IS NULL OR application_payment_window_minutes BETWEEN 60 AND 10080);

COMMENT ON COLUMN public.events.application_payment_window_minutes IS
  'Minutes an approved applicant has to pay before their approval expires (60-10080, i.e. 1 hour to 7 days). NULL = not a paid-gated event, or the creator has not set one yet. The 24h/1440-minute default is applied by the UI/application layer, not this column — there is deliberately no DB default. Added in migration 080.';

-- ---------------------------------------------------------------------------
-- event_applications
-- ---------------------------------------------------------------------------

CREATE TABLE public.event_applications (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id           uuid        NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  applicant_user_id  uuid        REFERENCES public.user_profiles(id),  -- NULL = guest, mirrors rsvps.attendee_user_id
  applicant_name     text        NOT NULL,
  applicant_phone    text        NOT NULL,
  answer             text        CHECK (char_length(answer) <= 500),
  -- Matches events.ticket_tiers[].id. Required at apply-time when the event
  -- has ticket_tiers configured (enforced in applyToEvent — tier existence
  -- can't be validated in a CHECK against a jsonb array).
  ticket_tier_id     text,
  status             text        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending', 'approved', 'declined', 'waitlisted', 'expired')),
  -- Deliberately no separate approved_at column. decided_at already records
  -- the moment of approval, and the (future) expiry sweep must NOT touch
  -- decided_at/decided_by when it transitions a row to 'expired' — so
  -- decided_at survives the expired transition unchanged and remains a
  -- correct, permanent "approved at" timestamp even after expiry. A second
  -- column would always hold an identical value to decided_at, since the
  -- only writer of either is the approval decision itself.
  decided_at         timestamptz,
  decided_by         uuid        REFERENCES public.user_profiles(id),
  -- Computed once at approval: decided_at + events.application_payment_window_minutes.
  -- Never recomputed.
  payment_deadline   timestamptz,
  -- Set only by the expiry sweep cron (not built in this pass) when
  -- payment_deadline elapses on an 'approved' row. A row that reaches
  -- 'expired' is a permanent terminal state — never reset back to
  -- 'approved'/'pending'. A guest who misses the window must submit a
  -- brand new application (a fresh row), not reuse this one.
  expired_at         timestamptz,
  -- The rsvps row created once payment succeeds via initiateRSVP.
  rsvp_id            uuid        REFERENCES public.rsvps(id),
  created_at         timestamptz NOT NULL DEFAULT now(),

  -- Mirrors migration 079's application_decided_at_requires_decision: any
  -- row that has left 'pending' must carry a decided_at timestamp.
  CONSTRAINT event_applications_decided_at_requires_decision CHECK (
    status = 'pending' OR decided_at IS NOT NULL
  )
);

COMMENT ON TABLE public.event_applications IS
  'Pre-payment application/shortlisting phase for PAID gated events (Phase B). Separate from rsvps — an approved row here becomes an rsvps row only once the applicant pays via the existing initiateRSVP flow. Companion to migration 079, which gates free/casual RSVPs directly on rsvps. Added in migration 080.';
COMMENT ON COLUMN public.event_applications.applicant_user_id IS 'NULL = guest applicant, mirrors rsvps.attendee_user_id. Added in migration 080.';
COMMENT ON COLUMN public.event_applications.ticket_tier_id    IS 'Selected tier id (events.ticket_tiers[].id), captured at application time. Required when the event has ticket_tiers configured. Added in migration 080.';
COMMENT ON COLUMN public.event_applications.status            IS 'Same vocabulary as rsvps.application_status (migration 079) plus ''expired'' — a terminal state reached only via the expiry sweep, never reset. A guest who misses payment_deadline must submit a new application. Added in migration 080.';
COMMENT ON COLUMN public.event_applications.decided_at        IS 'Timestamp of the host''s decision. For an approved row this doubles as the approval timestamp and is preserved even after the row later transitions to ''expired'' — the expiry sweep must not touch it. Added in migration 080.';
COMMENT ON COLUMN public.event_applications.decided_by        IS 'Host (user_profiles.id) who made the decision. Never set by the expiry sweep. Added in migration 080.';
COMMENT ON COLUMN public.event_applications.payment_deadline  IS 'decided_at + events.application_payment_window_minutes, computed once at approval and never recomputed. Added in migration 080.';
COMMENT ON COLUMN public.event_applications.expired_at        IS 'Set only by the expiry sweep cron (not built in this pass) when payment_deadline passes on an ''approved'' row. Added in migration 080.';
COMMENT ON COLUMN public.event_applications.rsvp_id           IS 'The rsvps row created once payment succeeds via initiateRSVP. Added in migration 080.';

-- Review-queue lookups filter by event + status, same pattern as
-- idx_rsvps_event_application_status (migration 079).
CREATE INDEX idx_event_applications_event_status ON public.event_applications (event_id, status);

-- The exact predicate the (future) expiry sweep cron will query: approved
-- rows whose payment window has elapsed.
CREATE INDEX idx_event_applications_status_deadline ON public.event_applications (status, payment_deadline)
  WHERE status = 'approved';

-- ---------------------------------------------------------------------------
-- RLS — same shape as rsvps (migration 001, hardened in 010/079)
-- ---------------------------------------------------------------------------

ALTER TABLE public.event_applications ENABLE ROW LEVEL SECURITY;

-- Event creator sees all applications for their events.
-- A logged-in applicant sees only their own applications.
-- Guest applications (applicant_user_id IS NULL) are invisible via client —
-- managed server-side with the service_role key, same as guest rsvps.
CREATE POLICY "event_applications_select_creator_or_own"
  ON public.event_applications
  FOR SELECT
  USING (
    event_id IN (
      SELECT id FROM public.events WHERE creator_id = public.get_user_id()
    )
    OR applicant_user_id = public.get_user_id()
  );

-- Anyone (including guests) can apply. A direct client insert may only ever
-- create a fresh 'pending' row — decision/payment fields must come from
-- decidePaidApplication / initiatePaymentForApplication (service_role,
-- bypasses RLS). Same defense-in-depth pattern as
-- rsvps_insert_anyone_constrained_v2 (migration 079).
CREATE POLICY "event_applications_insert_anyone_constrained"
  ON public.event_applications
  FOR INSERT
  WITH CHECK (
    status = 'pending'
    AND decided_at IS NULL
    AND decided_by IS NULL
    AND payment_deadline IS NULL
    AND expired_at IS NULL
    AND rsvp_id IS NULL
  );

-- Decisions (approve/decline/waitlist), payment linkage, and the future
-- expiry sweep are all performed exclusively by the service_role key.
-- No client-side UPDATE allowed — same pattern as rsvps_update_service_role_only.
CREATE POLICY "event_applications_update_service_role_only"
  ON public.event_applications
  FOR UPDATE
  USING (false)
  WITH CHECK (false);
