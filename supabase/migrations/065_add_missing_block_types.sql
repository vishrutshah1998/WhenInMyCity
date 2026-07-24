-- ============================================================
-- Migration 065 — Add missing block_type enum values
-- Commit 2672c76 ("feat: add Shop the Look and Instagram Feed block
-- types") added 'instagram_feed' and 'shop_the_look' throughout the
-- TypeScript layer (types, BlockEditor picker, constants, validators)
-- but never added a migration to add them to the Postgres block_type
-- enum. Result: addBlock() fails at the INSERT with an invalid-enum-
-- value error whenever a creator picks either block in the "Add a
-- block" picker, silently (see BlockEditor.tsx handleAdd).
-- ============================================================

ALTER TYPE public.block_type ADD VALUE IF NOT EXISTS 'instagram_feed';
ALTER TYPE public.block_type ADD VALUE IF NOT EXISTS 'shop_the_look';
