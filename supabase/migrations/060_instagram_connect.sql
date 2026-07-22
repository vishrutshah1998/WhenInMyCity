-- ============================================================
-- Migration 060 — Instagram Connect
-- Lets a creator authorize WIMC (via the Instagram API with Instagram
-- Login, graph.instagram.com) to read their own Instagram Business/
-- Creator account media, so real post thumbnails can be shown in the
-- instagram_post / instagram_embed block instead of the static
-- fallback card. See src/app/actions/instagram.ts for the OAuth flow
-- and media sync that populate these.
-- ============================================================

-- ---------------------------------------------------------------------------
-- 1. user_profiles — connection state + encrypted long-lived token
-- ---------------------------------------------------------------------------
-- user_profiles SELECT RLS is public (USING (true)) — per migration 059's
-- precedent, instagram_access_token_encrypted must only ever be read via
-- createAdminClient() server-side, never through a client-exposed select().
-- The token itself is pgcrypto-encrypted (see get_decrypted_instagram_token
-- below), so even a leaked row is not directly usable.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS instagram_connected boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS instagram_access_token_encrypted text NULL,
  ADD COLUMN IF NOT EXISTS instagram_token_expires_at timestamptz NULL;

COMMENT ON COLUMN public.user_profiles.instagram_access_token_encrypted IS
  'pgcrypto PGP-encrypted (base64) long-lived Instagram Graph API access token. Never store plaintext. Decrypt only via get_decrypted_instagram_token().';

-- ---------------------------------------------------------------------------
-- 2. instagram_thumbnail_cache — synced media, keyed by post permalink
-- ---------------------------------------------------------------------------
-- Mirrors substack_cache's shape. Populated by syncInstagramMedia() after
-- OAuth connect and on the daily refresh cron — never by a live per-request
-- external call (Instagram's oEmbed endpoint cannot supply thumbnails at
-- all; see src/app/actions/instagram.ts for why this exists instead).

CREATE TABLE IF NOT EXISTS public.instagram_thumbnail_cache (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_url      text        UNIQUE NOT NULL,
  thumbnail_url text        NOT NULL,
  cached_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.instagram_thumbnail_cache IS
  'Thumbnails synced from a creator''s own connected Instagram media. No RLS — service_role only.';

CREATE INDEX IF NOT EXISTS idx_instagram_thumbnail_cache_url ON public.instagram_thumbnail_cache (post_url);

-- No RLS on instagram_thumbnail_cache — only the service_role (admin client) reads/writes it.

-- ---------------------------------------------------------------------------
-- 3. INSTAGRAM TOKEN ENCRYPTION — pgcrypto security definer functions
-- ---------------------------------------------------------------------------
-- Structurally identical to encrypt_upi_vpa / get_decrypted_upi_vpa
-- (migration 008), but with a dedicated key so an Instagram token leak
-- can't be used to decrypt UPI VPAs or vice versa.
--
-- The symmetric encryption key must be set as a Postgres configuration
-- parameter before these functions are called:
--   ALTER DATABASE postgres SET app.instagram_encryption_key = 'your-32-char-secret';
--   OR set it in Supabase Dashboard → Database → Settings → pg_settings.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.encrypt_instagram_token(p_token text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_enc_key text;
BEGIN
  v_enc_key := current_setting('app.instagram_encryption_key', true);
  IF v_enc_key IS NULL OR v_enc_key = '' THEN
    RAISE EXCEPTION 'Instagram encryption key not configured (app.instagram_encryption_key).';
  END IF;

  RETURN encode(
    pgp_sym_encrypt(p_token, v_enc_key)::bytea,
    'base64'
  );
END;
$$;

COMMENT ON FUNCTION public.encrypt_instagram_token(text) IS
  'Encrypts a plaintext Instagram access token using pgp_sym_encrypt with app.instagram_encryption_key. Returns base64 ciphertext.';

-- get_decrypted_instagram_token: only the profile owner or service_role may call this.
CREATE OR REPLACE FUNCTION public.get_decrypted_instagram_token(p_profile_id uuid)
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
    RAISE EXCEPTION 'Access denied: you may only retrieve your own Instagram token.';
  END IF;

  SELECT instagram_access_token_encrypted
  INTO   v_encrypted
  FROM   public.user_profiles
  WHERE  id = p_profile_id;

  IF v_encrypted IS NULL OR v_encrypted = '' THEN
    RETURN NULL;
  END IF;

  v_enc_key := current_setting('app.instagram_encryption_key', true);
  IF v_enc_key IS NULL OR v_enc_key = '' THEN
    RAISE EXCEPTION 'Instagram encryption key not configured (app.instagram_encryption_key).';
  END IF;

  RETURN pgp_sym_decrypt(
    decode(v_encrypted, 'base64')::bytea,
    v_enc_key
  );
END;
$$;

COMMENT ON FUNCTION public.get_decrypted_instagram_token(uuid) IS
  'Decrypts the Instagram access token stored on the given profile. Access restricted to the profile owner and service_role. Never expose this directly to clients.';
