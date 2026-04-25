-- =============================================================================
-- Migration 010: Security hardening
--
-- Fixes the rsvps INSERT RLS policy (was WITH CHECK (true) — allowed direct
-- Supabase-API inserts with any payment_status, qr_code_token, or amount_paid,
-- bypassing the server action's sanitisation).
--
-- New policy restricts client-side inserts to:
--   - payment_status = 'pending' only
--   - amount_paid = 0 (must be null/0 — set by the server after Razorpay)
--   - qr_code_token must be null (generated server-side after capture)
--
-- The service_role (webhook handler, cron, server actions) bypasses RLS
-- entirely, so these constraints only restrict direct anon/authenticated API
-- calls (the attack surface the review identified).
-- =============================================================================

-- Drop the permissive insert policy.
DROP POLICY IF EXISTS "rsvps_insert_anyone" ON public.rsvps;

-- Replace with a constrained policy that still allows guest + auth checkout
-- but prevents a direct API caller from injecting payment_status != 'pending',
-- a fake amount_paid, or a pre-set qr_code_token.
CREATE POLICY "rsvps_insert_anyone_constrained"
  ON public.rsvps
  FOR INSERT
  WITH CHECK (
    -- Only 'pending' status is allowed on insert — 'captured' must come from
    -- the webhook handler (service_role, bypasses RLS) or confirmRSVPPayment.
    payment_status = 'pending'
    -- amount_paid must be 0 or NULL at insert time — the real amount is set
    -- by the server action after creating the Razorpay order.
    AND (amount_paid IS NULL OR amount_paid = 0)
    -- qr_code_token must be NULL at insert — generated server-side on capture.
    AND qr_code_token IS NULL
  );

-- ---------------------------------------------------------------------------
-- Tighten block_analytics INSERT policy (was WITH CHECK (true))
-- Allows stat inflation attacks — a bot can fake click counts to game the
-- tier system (monthly_page_visitors drives Mohalla→Nukkad→Chowk→Maidan).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "block_analytics_insert_anyone" ON public.block_analytics;

-- Recreate with basic sanity constraints.
CREATE POLICY "block_analytics_insert_anyone_constrained"
  ON public.block_analytics
  FOR INSERT
  WITH CHECK (
    -- block_id must reference an existing page_blocks row.
    block_id IN (SELECT id FROM public.page_blocks)
    -- event_type must be one of the known values.
    AND event_type IN ('view', 'click', 'subscribe')
  );

-- ---------------------------------------------------------------------------
-- Tighten maker_subscribers INSERT policy (was WITH CHECK (true))
-- Allows newsletter list poisoning (unlimited fake subscribers).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "subscribers_insert_anyone" ON public.maker_subscribers;

-- Recreate requiring the maker profile to exist.
CREATE POLICY "subscribers_insert_anyone_constrained"
  ON public.maker_subscribers
  FOR INSERT
  WITH CHECK (
    -- maker_id must reference an existing user_profiles row.
    maker_id IN (SELECT id FROM public.user_profiles)
    -- Only active subscribers can be inserted directly; unsubscribes go
    -- through the server action which uses service_role.
    AND is_active = true
  );
