-- Traffic violation reports: extend civic_reports with vehicle_number.
--
-- vehicle_number stores the reported vehicle's registration plate.
-- This column is:
--   • Private — readable only by the row owner (user_id) via RLS.
--   • Never exposed in any public query, feed, or API.
--   • Used only to pre-fill the handoff message the reporter sends to police.
--
-- Nullable: general civic reports (pothole, garbage, etc.) leave it NULL.
-- Only traffic-violation reports (category = 'traffic', forward_target = 'traffic_police')
-- populate it.

ALTER TABLE civic_reports
  ADD COLUMN vehicle_number text;

COMMENT ON COLUMN civic_reports.vehicle_number IS
  'Registration plate of the reported vehicle. Private — never surfaced outside the owning user''s session.';
