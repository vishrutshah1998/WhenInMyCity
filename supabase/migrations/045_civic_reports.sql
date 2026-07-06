-- Civic reporting: capture-and-forward layer for citizen issue reports.
-- WIMC stores the report and forwards to the relevant government channel.
-- WIMC never owns resolution; forward_status reflects hand-off state only.

-- ── Enums ─────────────────────────────────────────────────────────────────────

CREATE TYPE civic_forward_target AS ENUM (
  'swachhata',      -- Swachhata SBM Platform (garbage, sanitation)
  'amc_channel',    -- AMC Grievance Portal (roads, lights, water, trees)
  'traffic_police'  -- Ahmedabad Traffic Police (signals, parking, blockage)
);

CREATE TYPE civic_forward_status AS ENUM (
  'pending',        -- saved locally; not yet forwarded (Swachhata creds absent or queued)
  'forwarded',      -- successfully submitted to the downstream channel
  'handoff_shown',  -- user was shown a deep-link / manual-handoff screen
  'failed'          -- forwarding attempt made but downstream returned an error
);

-- ── Table ──────────────────────────────────────────────────────────────────────

CREATE TABLE civic_reports (
  id                 uuid                 PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid                 NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category           text                 NOT NULL,
  subcategory        text,
  description        text,
  -- Storage path within the 'civic-reports' bucket (not a public URL).
  -- Kept as a path so the admin service can issue signed URLs or delete on request.
  photo_ref          text,
  lat                numeric(10, 7),
  lng                numeric(10, 7),
  -- Which City edition generated this report (matches city_attractions.city_id).
  edition            text                 NOT NULL DEFAULT 'ahmedabad-gandhinagar',
  forward_target     civic_forward_target NOT NULL,
  forward_status     civic_forward_status NOT NULL DEFAULT 'pending',
  -- Reference number returned by the downstream channel (Swachhata complaint ID, etc.).
  -- Null until forwarded; shown to the user verbatim when present.
  external_reference text,
  created_at         timestamptz          NOT NULL DEFAULT now()
);

-- ── Row-Level Security ────────────────────────────────────────────────────────

ALTER TABLE civic_reports ENABLE ROW LEVEL SECURITY;

-- Users can submit their own reports.
CREATE POLICY "civic_reports_user_insert"
  ON civic_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can read only their own reports (for the "my reports" future view).
CREATE POLICY "civic_reports_user_select"
  ON civic_reports FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can update forward_status and external_reference (forwarding worker / webhook).
-- INSERT and SELECT are excluded from this policy; service role can still bypass RLS when needed.
CREATE POLICY "civic_reports_service_update"
  ON civic_reports FOR UPDATE
  USING (auth.role() = 'service_role');

-- ── Storage bucket ────────────────────────────────────────────────────────────
-- civic-reports bucket must NOT be public — photos may contain PII (faces, plates).
-- The admin/service-role client is used for upload and signed-URL generation.
-- Run this once in the Supabase dashboard or uncomment here if your migration runner
-- has access to storage.buckets:
--
--   INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
--   VALUES (
--     'civic-reports', 'civic-reports', false, 10485760,
--     ARRAY['image/jpeg','image/png','image/webp']
--   ) ON CONFLICT (id) DO NOTHING;
