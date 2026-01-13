-- Enable pgcrypto extension for encryption functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Recreate encrypt function to ensure it uses pgcrypto properly
CREATE OR REPLACE FUNCTION public.encrypt_api_key(plain_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'extensions'
AS $$
DECLARE
  enc_key bytea;
BEGIN
  -- Use a fixed encryption key 
  enc_key := decode(md5('lovable_secure_api_key_encryption_2026'), 'hex');
  RETURN encode(extensions.pgp_sym_encrypt(plain_key, encode(enc_key, 'base64')), 'base64');
EXCEPTION WHEN OTHERS THEN
  -- Fallback: try without schema prefix
  RETURN encode(pgp_sym_encrypt(plain_key, encode(enc_key, 'base64')), 'base64');
END;
$$;

-- Recreate decrypt function to ensure it uses pgcrypto properly
CREATE OR REPLACE FUNCTION public.decrypt_api_key(encrypted_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'extensions'
AS $$
DECLARE
  enc_key bytea;
BEGIN
  enc_key := decode(md5('lovable_secure_api_key_encryption_2026'), 'hex');
  RETURN extensions.pgp_sym_decrypt(decode(encrypted_key, 'base64'), encode(enc_key, 'base64'));
EXCEPTION WHEN OTHERS THEN
  -- Fallback: try without schema prefix or return as-is for migration
  BEGIN
    RETURN pgp_sym_decrypt(decode(encrypted_key, 'base64'), encode(enc_key, 'base64'));
  EXCEPTION WHEN OTHERS THEN
    RETURN encrypted_key;
  END;
END;
$$;

-- Recreate save_user_api_key_secure_admin function
CREATE OR REPLACE FUNCTION public.save_user_api_key_secure_admin(
  p_user_id uuid, 
  p_provider text, 
  p_api_key text, 
  p_is_valid boolean DEFAULT true, 
  p_remaining_credits numeric DEFAULT NULL::numeric
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'extensions'
AS $$
DECLARE
  enc_key bytea;
  encrypted text;
  result_id text;
BEGIN
  -- Generate encryption key from a secure passphrase
  enc_key := decode(md5('lovable_secure_api_key_encryption_2026'), 'hex');
  
  -- Encrypt the API key
  encrypted := encode(extensions.pgp_sym_encrypt(p_api_key, encode(enc_key, 'base64')), 'base64');
  
  -- Upsert the API key record
  INSERT INTO user_api_keys (user_id, provider, encrypted_key, is_valid, remaining_credits, updated_at)
  VALUES (p_user_id, p_provider, encrypted, p_is_valid, p_remaining_credits::integer, now())
  ON CONFLICT (user_id, provider) 
  DO UPDATE SET 
    encrypted_key = EXCLUDED.encrypted_key,
    is_valid = EXCLUDED.is_valid,
    remaining_credits = EXCLUDED.remaining_credits,
    updated_at = now()
  RETURNING id::text INTO result_id;
  
  RETURN result_id;
END;
$$;