-- =============================================================================
-- WIMC — Webhook event idempotency log
-- Migration: 002_webhook_events.sql
-- =============================================================================
--
-- Razorpay can deliver a webhook multiple times (retries on non-2xx, network
-- blips, etc.).  We use the `x-razorpay-event-id` header as a stable, unique
-- identifier per event delivery and record it here BEFORE applying any DB
-- mutations.  If we've already processed a given event_id we return 200 OK
-- immediately without re-running the handler.
--
-- This table is ONLY ever written/read by the service_role (webhook handler).
-- No RLS policy is created — service_role bypasses RLS entirely.

CREATE TABLE public.webhook_events (
  -- The unique event delivery ID from the x-razorpay-event-id header.
  id            text        PRIMARY KEY,

  -- Razorpay event type, e.g. 'payment.captured', 'refund.processed'.
  event_type    text        NOT NULL,

  -- ISO-8601 timestamp of when we first processed this event.
  processed_at  timestamptz NOT NULL DEFAULT now(),

  -- Full webhook payload stored for audit / replay debugging.
  payload       jsonb       NOT NULL DEFAULT '{}'
);

COMMENT ON TABLE  public.webhook_events IS
  'Idempotency log for inbound Razorpay webhooks. Prevents double-processing on retries.';

COMMENT ON COLUMN public.webhook_events.id IS
  'Populated from the x-razorpay-event-id request header.';

-- Fast lookup by recency for housekeeping / audit queries.
CREATE INDEX webhook_events_processed_at_idx ON public.webhook_events (processed_at DESC);
