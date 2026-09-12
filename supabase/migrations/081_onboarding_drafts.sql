-- Server-side persistence for onboarding wizard resume. Until now, every
-- field a user fills in during onboarding (creator/business/explorer) lives
-- only in sessionStorage — closing the tab wipes it and bounces the user
-- back to their persona's first step regardless of how far they'd gotten
-- (see the resume-behavior investigation this migration follows up on).
--
-- Deliberately NOT reusing auth.users.raw_user_meta_data (the dead
-- savePersonaScreen()/saveOnboardingScreen() precedent) — user_metadata is
-- embedded directly in the JWT access token, so writing draft form data
-- there on every keystroke would bloat the token sent on every authenticated
-- request app-wide, not just onboarding's. A dedicated table keeps this data
-- where it belongs and off the request-path.
--
-- Composite PK (auth_user_id, persona) rather than auth_user_id alone: a
-- user can hold more than one persona's onboarding state over time (finish
-- Creator, later start Business) without one draft clobbering the other.

CREATE TABLE public.onboarding_drafts (
  auth_user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  persona         text        NOT NULL CHECK (persona IN ('creator', 'business', 'explorer')),
  draft           jsonb       NOT NULL DEFAULT '{}',
  last_step_path  text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (auth_user_id, persona)
);

COMMENT ON TABLE  public.onboarding_drafts               IS 'In-progress onboarding wizard state, keyed per (user, persona), so a returning user can resume instead of restarting. Flat key/value mirror of the client-side wimc_ob_* sessionStorage keys (session-keys.ts SK), without the wimc_ob_ prefix. Deleted once that persona''s onboarding completes.';
COMMENT ON COLUMN public.onboarding_drafts.draft          IS 'Merged via merge_onboarding_draft() (jsonb || patch) — never overwritten wholesale from the client, so concurrent debounced field saves cannot lose each other''s keys.';
COMMENT ON COLUMN public.onboarding_drafts.last_step_path IS 'Most recent /onboarding/... step route the user reached for this persona. Drives the explicit "Resume where you left off?" prompt at /onboarding.';

CREATE TRIGGER trg_onboarding_drafts_updated_at
  BEFORE UPDATE ON public.onboarding_drafts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS — owner-only, even though every current caller writes via the
-- service-role admin client with its own explicit auth.getUser() check
-- (src/app/actions/onboarding-draft.ts). Defense-in-depth: the venue-covers
-- storage bucket shipped with no RLS policies on the same "only service-role
-- ever touches it" reasoning, and that became a silent access-control gap
-- the moment that assumption might stop holding. Don't repeat it on a new
-- table holding per-user draft data.
-- ---------------------------------------------------------------------------

ALTER TABLE public.onboarding_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "onboarding_drafts_select_own"
  ON public.onboarding_drafts
  FOR SELECT
  USING (auth_user_id = public.get_user_id());

CREATE POLICY "onboarding_drafts_insert_own"
  ON public.onboarding_drafts
  FOR INSERT
  WITH CHECK (auth_user_id = public.get_user_id());

CREATE POLICY "onboarding_drafts_update_own"
  ON public.onboarding_drafts
  FOR UPDATE
  USING (auth_user_id = public.get_user_id())
  WITH CHECK (auth_user_id = public.get_user_id());

CREATE POLICY "onboarding_drafts_delete_own"
  ON public.onboarding_drafts
  FOR DELETE
  USING (auth_user_id = public.get_user_id());

-- ---------------------------------------------------------------------------
-- merge_onboarding_draft — DB-side jsonb merge (draft = draft || p_patch),
-- NOT client-side read-merge-write. Debounced saves from different fields in
-- the same step can land close together; without an atomic merge, whichever
-- write loses the race would silently drop the other's keys. An empty
-- p_patch ('{}') is a no-op merge — used when a call only needs to update
-- last_step_path (e.g. the per-step-navigation write from onboarding/layout.tsx).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.merge_onboarding_draft(
  p_auth_user_id   uuid,
  p_persona        text,
  p_patch          jsonb,
  p_last_step_path text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.onboarding_drafts (auth_user_id, persona, draft, last_step_path)
  VALUES (p_auth_user_id, p_persona, p_patch, p_last_step_path)
  ON CONFLICT (auth_user_id, persona) DO UPDATE SET
    draft          = public.onboarding_drafts.draft || EXCLUDED.draft,
    last_step_path = COALESCE(EXCLUDED.last_step_path, public.onboarding_drafts.last_step_path);
END;
$$;

COMMENT ON FUNCTION public.merge_onboarding_draft IS
  'Upserts + jsonb-merges a patch into onboarding_drafts.draft for (auth_user_id, persona), optionally updating last_step_path. Always called from the service-role admin client (src/app/actions/onboarding-draft.ts), which already bypasses RLS — plain SECURITY INVOKER is sufficient, no elevation needed.';
