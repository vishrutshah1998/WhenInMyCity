-- 034_rsvp_style.sql
-- Adds rsvp_style to events table to support casual Going/Maybe/Not Going RSVP
-- for free events (open mics, community hangouts, gigs).

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS rsvp_style TEXT NOT NULL DEFAULT 'ticketed'
  CHECK (rsvp_style IN ('ticketed', 'casual'));
