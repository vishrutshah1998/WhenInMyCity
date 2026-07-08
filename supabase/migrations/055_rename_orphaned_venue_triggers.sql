-- Migration 055: rename orphaned Adda -> Venue triggers
--
-- Migration 052 renamed tables/columns/constraints/indexes/RLS policies from
-- Adda to Venue, but had no TRIGGER rename section — these two trigger names
-- were missed. Cosmetic only (Postgres tracks triggers by OID, not name, so
-- nothing was functionally broken), fixed here for naming consistency.
--
-- Names confirmed live via pg_trigger before writing this migration:
--   trg_adda_profiles_updated_at        on venue_profiles
--   trg_maker_adda_proposals_updated_at on maker_venue_proposals

ALTER TRIGGER trg_adda_profiles_updated_at ON venue_profiles RENAME TO trg_venue_profiles_updated_at;
ALTER TRIGGER trg_maker_adda_proposals_updated_at ON maker_venue_proposals RENAME TO trg_maker_venue_proposals_updated_at;
