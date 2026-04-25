-- Migration: 005_new_block_types.sql
-- Add three new block_type enum values (quote_block, marquee_text, stats_grid).
-- IF NOT EXISTS (PostgreSQL 9.6+) makes this idempotent without a DO block.
-- ALTER TYPE ADD VALUE cannot run inside a PL/pgSQL function body or DO block.

ALTER TYPE public.block_type ADD VALUE IF NOT EXISTS 'quote_block';
ALTER TYPE public.block_type ADD VALUE IF NOT EXISTS 'marquee_text';
ALTER TYPE public.block_type ADD VALUE IF NOT EXISTS 'stats_grid';
