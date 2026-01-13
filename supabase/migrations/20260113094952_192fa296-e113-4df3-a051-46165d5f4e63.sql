-- Drop the duplicate function with integer type and keep only the numeric one
DROP FUNCTION IF EXISTS public.save_user_api_key_secure_admin(uuid, text, text, boolean, integer);

-- Ensure we have only the numeric version
CREATE OR REPLACE FUNCTION public.save_user_api_key_secure_admin(
  p_user_id uuid,
  p_provider text,
  p_api_key text,
  p_is_valid boolean DEFAULT true,
  p_remaining_credits numeric DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  enc_key bytea;
  encrypted text;
  result_id text;
BEGIN
  -- Generate encryption key from a secure passphrase
  enc_key := decode(md5('lovable_secure_api_key_encryption_2026'), 'hex');
  
  -- Encrypt the API key
  encrypted := encode(pgp_sym_encrypt(p_api_key, encode(enc_key, 'base64')), 'base64');
  
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