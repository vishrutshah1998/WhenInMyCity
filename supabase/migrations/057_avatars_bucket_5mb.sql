-- =============================================================================
-- Bump avatars bucket file_size_limit from 2 MB to 5 MB, matching the existing
-- app-level validation in uploadOnboardingAvatar() (5 * 1024 * 1024 bytes).
-- =============================================================================

UPDATE storage.buckets
SET file_size_limit = 5242880   -- 5 MB in bytes
WHERE id = 'avatars';
