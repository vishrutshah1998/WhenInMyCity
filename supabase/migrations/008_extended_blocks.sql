-- =============================================================================
-- WIMC — Extended Block Taxonomy
-- Migration: 008_extended_blocks.sql
--
-- Expands the page_blocks system to 23+ block types across 5 families,
-- adds per-block tier gating, richer analytics, a newsletter subscriber system,
-- a Substack post cache, and UPI VPA encryption for support_tip blocks.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. ADD new values to the block_type enum
-- ---------------------------------------------------------------------------
-- ALTER TYPE ADD VALUE cannot run inside an explicit transaction block,
-- but Supabase migrations are run with autocommit, so this is safe.

-- Identity family
ALTER TYPE public.block_type ADD VALUE IF NOT EXISTS 'creator_type_badge';
ALTER TYPE public.block_type ADD VALUE IF NOT EXISTS 'city_community';
ALTER TYPE public.block_type ADD VALUE IF NOT EXISTS 'announcement';

-- Social family
ALTER TYPE public.block_type ADD VALUE IF NOT EXISTS 'social_links_row';

-- Events family
ALTER TYPE public.block_type ADD VALUE IF NOT EXISTS 'event_calendar';
ALTER TYPE public.block_type ADD VALUE IF NOT EXISTS 'event_series';
ALTER TYPE public.block_type ADD VALUE IF NOT EXISTS 'past_events_gallery';
ALTER TYPE public.block_type ADD VALUE IF NOT EXISTS 'rsvp_link';

-- Content family
ALTER TYPE public.block_type ADD VALUE IF NOT EXISTS 'podcast_episode';
ALTER TYPE public.block_type ADD VALUE IF NOT EXISTS 'substack_preview';
ALTER TYPE public.block_type ADD VALUE IF NOT EXISTS 'instagram_post';
ALTER TYPE public.block_type ADD VALUE IF NOT EXISTS 'spotify_now_playing';
ALTER TYPE public.block_type ADD VALUE IF NOT EXISTS 'newsletter_signup';

-- Community family
ALTER TYPE public.block_type ADD VALUE IF NOT EXISTS 'testimonial';
ALTER TYPE public.block_type ADD VALUE IF NOT EXISTS 'community_stats';
ALTER TYPE public.block_type ADD VALUE IF NOT EXISTS 'venue_partnership';
ALTER TYPE public.block_type ADD VALUE IF NOT EXISTS 'support_tip';
ALTER TYPE public.block_type ADD VALUE IF NOT EXISTS 'collab_invite';
ALTER TYPE public.block_type ADD VALUE IF NOT EXISTS 'white_label_event';

-- ---------------------------------------------------------------------------
-- 2. Extend page_blocks with family, tier gating, and analytics config
-- ---------------------------------------------------------------------------

ALTER TABLE public.page_blocks
  ADD COLUMN IF NOT EXISTS block_family text NOT NULL DEFAULT 'content'
    CHECK (block_family IN ('identity', 'social', 'events', 'content', 'community')),
  ADD COLUMN IF NOT EXISTS minimum_tier text NOT NULL DEFAULT 'mohalla'
    CHECK (minimum_tier IN ('mohalla', 'nukkad', 'chowk', 'maidan')),
  ADD COLUMN IF NOT EXISTS analytics_config jsonb NOT NULL DEFAULT '{}';
  -- { "track_clicks": true, "track_views": true }

COMMENT ON COLUMN public.page_blocks.block_family    IS 'Which family this block belongs to: identity, social, events, content, community.';
COMMENT ON COLUMN public.page_blocks.minimum_tier    IS 'Maker tier required to add this block type. Enforced server-side.';
COMMENT ON COLUMN public.page_blocks.analytics_config IS 'JSON: { track_clicks: boolean, track_views: boolean }';

-- ---------------------------------------------------------------------------
-- 3. CREATE block_analytics (replaces link_clicks for rich event tracking)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.block_analytics (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id    uuid        NOT NULL REFERENCES public.page_blocks(id) ON DELETE CASCADE,
  profile_id  uuid        NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  event_type  text        NOT NULL
    CHECK (event_type IN ('view', 'click', 'expand', 'subscribe', 'tip_initiated')),
  explorer_id uuid        REFERENCES public.explorer_profiles(id),
  referer     text        CHECK (char_length(referer) <= 500),
  country     text,
  city        text,
  device_type text        CHECK (device_type IN ('mobile', 'desktop', 'tablet')),
  occurred_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.block_analytics            IS 'Rich per-block event analytics (view, click, expand, subscribe, tip_initiated).';
COMMENT ON COLUMN public.block_analytics.event_type IS 'view=block visible in viewport, click=link tapped, expand=accordion opened, subscribe=email collected, tip_initiated=UPI intent opened.';
COMMENT ON COLUMN public.block_analytics.profile_id IS 'Denormalised creator id — avoids JOIN on analytics read queries.';

CREATE INDEX IF NOT EXISTS idx_block_analytics_block_id    ON public.block_analytics (block_id);
CREATE INDEX IF NOT EXISTS idx_block_analytics_profile_id  ON public.block_analytics (profile_id);
CREATE INDEX IF NOT EXISTS idx_block_analytics_occurred_at ON public.block_analytics (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_block_analytics_event_type  ON public.block_analytics (profile_id, event_type, occurred_at DESC);

ALTER TABLE public.block_analytics ENABLE ROW LEVEL SECURITY;

-- Anyone (anon visitor) can insert analytics events.
CREATE POLICY "block_analytics_insert_anyone"
  ON public.block_analytics
  FOR INSERT
  WITH CHECK (true);

-- Creators can read only their own analytics.
CREATE POLICY "block_analytics_select_own"
  ON public.block_analytics
  FOR SELECT
  USING (profile_id = public.get_user_id());

-- ---------------------------------------------------------------------------
-- 4. CREATE maker_subscribers — newsletter/community list
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.maker_subscribers (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  maker_id      uuid        NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  email         text        NOT NULL CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  subscribed_at timestamptz NOT NULL DEFAULT now(),
  is_active     boolean     NOT NULL DEFAULT true,
  source        text        NOT NULL DEFAULT 'newsletter_block'
    CHECK (source IN ('newsletter_block', 'rsvp_confirmation')),

  UNIQUE (maker_id, email)
);

COMMENT ON TABLE  public.maker_subscribers        IS 'Email subscribers collected via newsletter_signup blocks or RSVP confirmation flows.';
COMMENT ON COLUMN public.maker_subscribers.source IS 'newsletter_block = subscriber signed up from the block; rsvp_confirmation = captured post-payment.';

CREATE INDEX IF NOT EXISTS idx_maker_subscribers_maker_id  ON public.maker_subscribers (maker_id, subscribed_at DESC);
CREATE INDEX IF NOT EXISTS idx_maker_subscribers_is_active ON public.maker_subscribers (maker_id, is_active);

ALTER TABLE public.maker_subscribers ENABLE ROW LEVEL SECURITY;

-- Anyone can subscribe (anonymous visitors).
CREATE POLICY "subscribers_insert_anyone"
  ON public.maker_subscribers
  FOR INSERT
  WITH CHECK (true);

-- Makers can read their own subscriber list.
CREATE POLICY "subscribers_select_own"
  ON public.maker_subscribers
  FOR SELECT
  USING (maker_id = public.get_user_id());

-- Makers can mark subscribers inactive (unsubscribe management).
CREATE POLICY "subscribers_update_own"
  ON public.maker_subscribers
  FOR UPDATE
  USING (maker_id = public.get_user_id())
  WITH CHECK (maker_id = public.get_user_id());

-- ---------------------------------------------------------------------------
-- 5. CREATE substack_cache — server-side RSS post cache
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.substack_cache (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_url  text        UNIQUE NOT NULL,
  posts            jsonb       NOT NULL DEFAULT '[]',
  -- [{ title, url, date, excerpt }]
  cached_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.substack_cache IS 'One-hour server-side cache for Substack RSS feeds. No RLS — service_role only.';

CREATE INDEX IF NOT EXISTS idx_substack_cache_url       ON public.substack_cache (publication_url);
CREATE INDEX IF NOT EXISTS idx_substack_cache_cached_at ON public.substack_cache (cached_at);

-- No RLS on substack_cache — only the service_role (admin client) reads/writes it.

-- ---------------------------------------------------------------------------
-- 6. UPI VPA ENCRYPTION — pgcrypto security definer functions
-- ---------------------------------------------------------------------------
-- The UPI VPA for support_tip blocks is stored as a pgcrypto PGP-encrypted
-- base64 string in page_blocks.config->>'upi_vpa_encrypted'.
--
-- The symmetric encryption key must be set as a Postgres configuration
-- parameter before these functions are called:
--   ALTER DATABASE postgres SET app.upi_encryption_key = 'your-32-char-secret';
--   OR set it in Supabase Dashboard → Database → Settings → pg_settings.
-- ---------------------------------------------------------------------------

-- encrypt_upi_vpa: called from the TypeScript action to encrypt before storing.
CREATE OR REPLACE FUNCTION public.encrypt_upi_vpa(p_upi_vpa text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_enc_key text;
BEGIN
  v_enc_key := current_setting('app.upi_encryption_key', true);
  IF v_enc_key IS NULL OR v_enc_key = '' THEN
    RAISE EXCEPTION 'UPI encryption key not configured (app.upi_encryption_key).';
  END IF;

  RETURN encode(
    pgp_sym_encrypt(p_upi_vpa, v_enc_key)::bytea,
    'base64'
  );
END;
$$;

COMMENT ON FUNCTION public.encrypt_upi_vpa(text) IS
  'Encrypts a plaintext UPI VPA using pgp_sym_encrypt with app.upi_encryption_key. Returns base64 ciphertext.';

-- get_decrypted_upi_vpa: called to decrypt the stored VPA for UPI intent URLs.
-- Only the profile owner or service_role may call this.
CREATE OR REPLACE FUNCTION public.get_decrypted_upi_vpa(p_profile_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_encrypted text;
  v_enc_key   text;
  v_caller_id uuid;
BEGIN
  v_caller_id := (SELECT auth.uid());

  -- Service_role has no auth.uid(); authenticated callers must match the profile.
  IF v_caller_id IS NOT NULL AND v_caller_id != p_profile_id THEN
    RAISE EXCEPTION 'Access denied: you may only retrieve your own UPI VPA.';
  END IF;

  SELECT config->>'upi_vpa_encrypted'
  INTO   v_encrypted
  FROM   public.page_blocks
  WHERE  profile_id = p_profile_id
    AND  block_type = 'support_tip'
  LIMIT  1;

  IF v_encrypted IS NULL OR v_encrypted = '' THEN
    RETURN NULL;
  END IF;

  v_enc_key := current_setting('app.upi_encryption_key', true);
  IF v_enc_key IS NULL OR v_enc_key = '' THEN
    RAISE EXCEPTION 'UPI encryption key not configured (app.upi_encryption_key).';
  END IF;

  RETURN pgp_sym_decrypt(
    decode(v_encrypted, 'base64')::bytea,
    v_enc_key
  );
END;
$$;

COMMENT ON FUNCTION public.get_decrypted_upi_vpa(uuid) IS
  'Decrypts the UPI VPA stored in the support_tip block for the given profile. Access restricted to the profile owner and service_role. Never expose this directly to clients.';
