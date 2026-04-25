-- Migration 013: Add 'refund_failed' to payment_status enum
--
-- When cancelEvent issues a Razorpay refund that fails, the RSVP is now
-- marked 'refund_failed' so the cron reconciler can retry it automatically.

ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'refund_failed';
