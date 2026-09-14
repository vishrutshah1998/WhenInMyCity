-- =============================================================================
-- Migration 084: Route transfer skip tracking on rsvps
--
-- Razorpay Route (Phase 2, see src/lib/razorpay/route-transfers.ts) attaches
-- a transfer for the venue's share to an order at creation time, but only
-- when the venue's linked_accounts row (migration 083) is status='activated'.
-- When it isn't, buildVenueRouteTransfer() deliberately skips the transfer
-- rather than failing the ticket purchase (see that file's doc comment) --
-- but until now the reason was only a console.log line with no durable
-- trace, so there was no way to later answer "which RSVPs had their venue
-- transfer skipped, and why" without re-deriving it from logs that may
-- already be gone.
--
-- One column is enough: buildVenueRouteTransfer()'s skippedReason string
-- already differentiates the cause -- 'no_linked_account' (no
-- razorpay_account_id on file yet), or `not_activated:<status>` with the
-- linked_accounts.status value embedded (e.g. 'not_activated:
-- needs_clarification', 'not_activated:under_review',
-- 'not_activated:config_locked'). A separate status column would be
-- redundant with what's already inside this string. Storing this value at
-- skip-time (not deriving it later from linked_accounts) matters because
-- linked_accounts.status is not itself timestamped per-order and can change
-- afterward -- this column is the only record of what it was when this
-- particular RSVP happened.
--
-- NULL means "no skip occurred" (either no venue, or the transfer attached
-- successfully) -- never "unknown". Purely additive; does not touch the
-- locked revenue-split columns (platform_fee_paise / maker_payout_paise /
-- venue_fee_paise / split_tier, migration 017).
--
-- No RLS change needed: all rsvps inserts/updates go through server actions
-- using the service-role client (bypasses RLS), same as migration 050.
-- =============================================================================

ALTER TABLE public.rsvps
  ADD COLUMN route_transfer_skip_reason text;

COMMENT ON COLUMN public.rsvps.route_transfer_skip_reason IS
  'Set by buildVenueRouteTransfer() (src/lib/razorpay/route-transfers.ts) at order-creation time when the venue''s Route transfer was skipped: ''no_linked_account'', or ''not_activated:<linked_accounts.status at skip-time>''. NULL means no skip occurred (no venue on this event, or the transfer attached successfully) -- not "unknown".';
