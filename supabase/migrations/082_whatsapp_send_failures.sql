-- sendWhatsAppTemplate() (src/lib/whatsapp.ts) used to swallow every send
-- failure internally (console.error only, resolved void) — callers had no
-- way to know a send failed short of grepping server logs. It now
-- throws/rejects on a non-OK Meta response or a fetch exception, so callers
-- can react. This table is the reaction for the small set of templates that
-- are actually critical to a human's expectations (an applicant told "we'll
-- notify you" who never hears back, a creator/venue owed a payout who never
-- gets the payout notice) — NOT every template in the codebase. Lower-stakes
-- sends (tier-change notices, review prompts, event reminders) stay
-- console.error-only by deliberate scope cut; this is a targeted fix for the
-- templates a human on the other end is actually depending on, not a
-- general-purpose delivery log.
--
-- No retry logic here by design — a caught, persisted failure with no retry
-- is the intended behavior for this pass. Retrying is a separate decision.
--
-- context_id is intentionally a bare uuid with no FK: which table it points
-- into depends on template_name —
--   rsvp_application_received_v1                       -> rsvps.id
--   rsvp_application_approved_v1 / rsvp_application_decline (via rsvp.ts)
--                                                        -> rsvps.id
--   rsvp_application_approved_paid_v1 / rsvp_application_decline
--     (via event-applications.ts)                       -> event_applications.id
--   rsvp_application_expired_v1                         -> event_applications.id
--   payout_notice                                       -> payout_requests.id
-- event_id is the events row when the send is event-scoped (every template
-- above except payout_notice, which isn't tied to a single event).

CREATE TABLE public.whatsapp_send_failures (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name    text        NOT NULL,
  recipient_phone  text        NOT NULL,
  error_detail     text        NOT NULL,
  event_id         uuid        REFERENCES public.events(id) ON DELETE SET NULL,
  context_id       uuid,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_whatsapp_send_failures_created_at ON public.whatsapp_send_failures (created_at DESC);

COMMENT ON TABLE  public.whatsapp_send_failures            IS 'Failed sends for the small set of WhatsApp templates critical enough to need visibility (see migration comment) — written from each call site''s catch block. No retry; admin-visible only, at /admin/whatsapp-failures.';
COMMENT ON COLUMN public.whatsapp_send_failures.context_id IS 'Polymorphic, no FK — the row this send was about (rsvps.id, event_applications.id, or payout_requests.id depending on template_name). See table comment for the mapping.';

-- ---------------------------------------------------------------------------
-- RLS — admin-only. Every current caller writes via the service-role admin
-- client, which bypasses RLS entirely, but the venue-covers storage bucket
-- (see CLAUDE.md Known Debt) and migration 081's onboarding_drafts comment
-- both make the same point: skipping RLS on a "only service-role touches
-- this" assumption is a silent access-control gap the moment that
-- assumption stops holding. There's no legitimate owner-read case here
-- (an applicant/creator has no reason to see this table), so this is
-- admin-only rather than owner-or-admin.
-- ---------------------------------------------------------------------------

ALTER TABLE public.whatsapp_send_failures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "whatsapp_send_failures_select_admin"
  ON public.whatsapp_send_failures
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = public.get_user_id() AND is_admin = true
    )
  );

-- No client-side INSERT/UPDATE/DELETE policy — every write happens from a
-- catch block via the service-role admin client (bypasses RLS), same as
-- payout_requests' admin-only status transitions.
