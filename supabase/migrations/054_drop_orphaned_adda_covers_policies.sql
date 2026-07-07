-- Migration 054: drop orphaned adda-covers storage policies
--
-- The adda-covers bucket was deleted (superseded by venue-covers earlier in
-- the Adda -> Venue rename). These RLS policies on storage.objects filtered
-- on bucket_id = 'adda-covers', which no longer exists — dead policies with
-- no effect, dropped for hygiene.
--
-- Equivalent policies for venue-covers were NOT recreated here. All current
-- reads go through the public bucket URL (bypasses RLS) and all writes go
-- through the service-role admin client (bypasses RLS), so nothing is
-- functionally broken by their absence today. Tracked as known debt in
-- CLAUDE.md — recreate before any authenticated non-admin client-side
-- storage access is added for this bucket.

DROP POLICY IF EXISTS "adda_covers_select_public" ON storage.objects;
DROP POLICY IF EXISTS "adda_covers_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "adda_covers_update_own" ON storage.objects;
DROP POLICY IF EXISTS "adda_covers_delete_own" ON storage.objects;
