-- ============================================================
-- Migration 063 — Move encryption key lookup to Supabase Vault
-- Rewrites encrypt_upi_vpa/get_decrypted_upi_vpa (migration 008) and
-- encrypt_instagram_token/get_decrypted_instagram_token (migration 060)
-- to read their symmetric key from vault.decrypted_secrets instead of
-- current_setting('app.*_key'). The app.* GUCs were never actually set
-- on this project (current_setting(..., true) returns NULL for both),
-- so both RPC pairs currently fail with "encryption key not configured".
--
-- Function signatures, SECURITY DEFINER, and all other behavior
-- (ownership checks, storage locations, ciphertext format) are
-- unchanged — only the key source changes. No caller needs to change.
-- ============================================================

-- ---------------------------------------------------------------------------
-- 1. UPI VPA encryption (migration 008) — read key from vault secret
--    'upi_encryption_key'
-- ---------------------------------------------------------------------------

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
  SELECT decrypted_secret INTO v_enc_key
  FROM vault.decrypted_secrets
  WHERE name = 'upi_encryption_key'
  LIMIT 1;

  IF v_enc_key IS NULL OR v_enc_key = '' THEN
    RAISE EXCEPTION 'UPI encryption key not configured (vault secret "upi_encryption_key").';
  END IF;

  RETURN encode(
    pgp_sym_encrypt(p_upi_vpa, v_enc_key)::bytea,
    'base64'
  );
END;
$$;

COMMENT ON FUNCTION public.encrypt_upi_vpa(text) IS
  'Encrypts a plaintext UPI VPA using pgp_sym_encrypt with the "upi_encryption_key" Vault secret. Returns base64 ciphertext.';

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

  SELECT decrypted_secret INTO v_enc_key
  FROM vault.decrypted_secrets
  WHERE name = 'upi_encryption_key'
  LIMIT 1;

  IF v_enc_key IS NULL OR v_enc_key = '' THEN
    RAISE EXCEPTION 'UPI encryption key not configured (vault secret "upi_encryption_key").';
  END IF;

  RETURN pgp_sym_decrypt(
    decode(v_encrypted, 'base64')::bytea,
    v_enc_key
  );
END;
$$;

COMMENT ON FUNCTION public.get_decrypted_upi_vpa(uuid) IS
  'Decrypts the UPI VPA stored in the support_tip block for the given profile, using the "upi_encryption_key" Vault secret. Access restricted to the profile owner and service_role. Never expose this directly to clients.';

-- ---------------------------------------------------------------------------
-- 2. Instagram token encryption (migration 060) — read key from vault secret
--    'instagram_encryption_key'
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
  SELECT decrypted_secret INTO v_enc_key
  FROM vault.decrypted_secrets
  WHERE name = 'instagram_encryption_key'
  LIMIT 1;

  IF v_enc_key IS NULL OR v_enc_key = '' THEN
    RAISE EXCEPTION 'Instagram encryption key not configured (vault secret "instagram_encryption_key").';
  END IF;

  RETURN encode(
    pgp_sym_encrypt(p_token, v_enc_key)::bytea,
    'base64'
  );
END;
$$;

COMMENT ON FUNCTION public.encrypt_instagram_token(text) IS
  'Encrypts a plaintext Instagram access token using pgp_sym_encrypt with the "instagram_encryption_key" Vault secret. Returns base64 ciphertext.';

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

  SELECT decrypted_secret INTO v_enc_key
  FROM vault.decrypted_secrets
  WHERE name = 'instagram_encryption_key'
  LIMIT 1;

  IF v_enc_key IS NULL OR v_enc_key = '' THEN
    RAISE EXCEPTION 'Instagram encryption key not configured (vault secret "instagram_encryption_key").';
  END IF;

  RETURN pgp_sym_decrypt(
    decode(v_encrypted, 'base64')::bytea,
    v_enc_key
  );
END;
$$;

COMMENT ON FUNCTION public.get_decrypted_instagram_token(uuid) IS
  'Decrypts the Instagram access token stored on the given profile, using the "instagram_encryption_key" Vault secret. Access restricted to the profile owner and service_role. Never expose this directly to clients.';

-- ---------------------------------------------------------------------------
-- 3. MANUAL STEP REQUIRED — this migration does NOT create the secrets.
-- ---------------------------------------------------------------------------
-- Secret values must never be committed in a migration file. After this
-- migration is applied, run the following once via the SQL editor (or any
-- client authenticated as a role with access to the vault schema), filling
-- in real key material for each:
--
--   select vault.create_secret(
--     '<32+ char random secret for UPI VPA encryption>',
--     'upi_encryption_key',
--     'Encryption key for support_tip UPI VPAs'
--   );
--
--   select vault.create_secret(
--     '<32+ char random secret for Instagram token encryption>',
--     'instagram_encryption_key',
--     'Encryption key for Instagram OAuth tokens'
--   );
--
-- Note: as of 2026-07-23, 'instagram_encryption_key' already exists in
-- vault.secrets on this project (created 2026-07-23) — only the
-- 'upi_encryption_key' secret still needs to be created. If either name
-- already exists, use vault.update_secret(id, new_secret) instead of
-- create_secret to rotate it; create_secret errors on a duplicate name.
-- ---------------------------------------------------------------------------
