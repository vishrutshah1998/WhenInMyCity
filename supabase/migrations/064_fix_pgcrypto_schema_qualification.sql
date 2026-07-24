-- ============================================================
-- Migration 064 — Fix pgcrypto schema qualification
-- Migration 063 moved encrypt_upi_vpa/get_decrypted_upi_vpa and
-- encrypt_instagram_token/get_decrypted_instagram_token to read their key
-- from Vault, which surfaced a separate pre-existing bug: pgcrypto is
-- installed in the "extensions" schema on this project, but all four
-- functions call pgp_sym_encrypt/pgp_sym_decrypt unqualified while also
-- declaring `SET search_path = ''`. With an empty search_path only
-- pg_catalog resolves unqualified names, so `pgp_sym_encrypt(...)` failed
-- with "function pgp_sym_encrypt(text, text) does not exist" — this was
-- previously masked because the app.*_key check always raised first.
--
-- Fix: schema-qualify the two pgcrypto calls as extensions.pgp_sym_encrypt
-- / extensions.pgp_sym_decrypt. No other behavior changes.
-- ============================================================

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
    extensions.pgp_sym_encrypt(p_upi_vpa, v_enc_key)::bytea,
    'base64'
  );
END;
$$;

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

  RETURN extensions.pgp_sym_decrypt(
    decode(v_encrypted, 'base64')::bytea,
    v_enc_key
  );
END;
$$;

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
    extensions.pgp_sym_encrypt(p_token, v_enc_key)::bytea,
    'base64'
  );
END;
$$;

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

  RETURN extensions.pgp_sym_decrypt(
    decode(v_encrypted, 'base64')::bytea,
    v_enc_key
  );
END;
$$;
