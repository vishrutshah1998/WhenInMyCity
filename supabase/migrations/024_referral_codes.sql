-- =============================================================================
-- Migration 024 — Bring-a-Wanderer Referral Codes
--
-- Local+ creators can generate one free-ticket referral code per calendar
-- quarter for a specific event.  The attendee enters the code in the RSVP
-- flow to claim a free seat regardless of the event's ticket price.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.referral_codes (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text        UNIQUE NOT NULL,          -- e.g. "AB3X9Z"
  issuer_id       uuid        NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  event_id        uuid        NOT NULL REFERENCES public.events(id)        ON DELETE CASCADE,
  redeemed_at     timestamptz,
  redeemed_rsvp_id uuid,                                -- populated after RSVP created
  issued_at       timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz NOT NULL                  -- end of current calendar quarter
);

-- Prevent issuing more than one code per event (creator can re-share the same code)
CREATE UNIQUE INDEX IF NOT EXISTS referral_codes_issuer_event_key
  ON public.referral_codes (issuer_id, event_id);

-- Fast lookup by code at RSVP time
CREATE INDEX IF NOT EXISTS referral_codes_code_idx ON public.referral_codes (code);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

-- Issuer can view their own codes
CREATE POLICY "issuers_select_own"
  ON public.referral_codes FOR SELECT
  USING (issuer_id = auth.uid());

-- Issuer can create codes
CREATE POLICY "issuers_insert"
  ON public.referral_codes FOR INSERT
  WITH CHECK (issuer_id = auth.uid());

-- Anyone (even unauthenticated) can look up a code by its value for validation
-- We expose only non-sensitive columns via a view rather than blanket SELECT;
-- for simplicity we allow authenticated reads and rely on the server action to
-- use the admin client for the final redemption update.
CREATE POLICY "authenticated_read_by_code"
  ON public.referral_codes FOR SELECT
  TO authenticated
  USING (true);
