-- =============================================================================
-- Migration 019: Early-access window on events
-- =============================================================================
-- Allows makers to set a datetime before which only Local+ explorers can RSVP.
-- Wanderers are blocked until early_access_at passes (NULL = no gate).
-- =============================================================================

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS early_access_at timestamptz;

COMMENT ON COLUMN public.events.early_access_at IS
  'If set, Wanderer-tier explorers cannot RSVP until this timestamp passes. Locals+ bypass the gate.';
