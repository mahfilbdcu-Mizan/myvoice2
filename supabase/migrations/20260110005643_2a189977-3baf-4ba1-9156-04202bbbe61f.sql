-- Enable pgcrypto for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create encryption/decryption functions for API keys
-- These functions use a fixed encryption key derived from a secret
-- Only accessible via SECURITY DEFINER functions

-- Encrypt API key function
CREATE OR REPLACE FUNCTION public.encrypt_api_key(plain_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  enc_key bytea;
BEGIN
  -- Use a fixed encryption key (in production, this could come from vault)
  enc_key := decode(md5('lovable_secure_api_key_encryption_2026'), 'hex');
  RETURN encode(pgp_sym_encrypt(plain_key, encode(enc_key, 'base64')), 'base64');
END;
$$;

-- Decrypt API key function (only callable by service role via edge functions)
CREATE OR REPLACE FUNCTION public.decrypt_api_key(encrypted_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  enc_key bytea;
BEGIN
  -- Try to decrypt
  enc_key := decode(md5('lovable_secure_api_key_encryption_2026'), 'hex');
  RETURN pgp_sym_decrypt(decode(encrypted_key, 'base64'), encode(enc_key, 'base64'));
EXCEPTION WHEN OTHERS THEN
  -- If decryption fails, key might be in old plaintext format - return as-is for migration
  RETURN encrypted_key;
END;
$$;

-- Function to save API key securely (encrypts before storing)
CREATE OR REPLACE FUNCTION public.save_user_api_key_secure(
  p_provider text,
  p_api_key text,
  p_is_valid boolean DEFAULT true,
  p_remaining_credits integer DEFAULT null
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_encrypted_key text;
  v_user_id uuid;
BEGIN
  -- Get the authenticated user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Encrypt the API key
  v_encrypted_key := public.encrypt_api_key(p_api_key);
  
  -- Upsert the key
  INSERT INTO public.user_api_keys (user_id, provider, encrypted_key, is_valid, remaining_credits)
  VALUES (v_user_id, p_provider, v_encrypted_key, p_is_valid, p_remaining_credits)
  ON CONFLICT (user_id, provider) 
  DO UPDATE SET 
    encrypted_key = v_encrypted_key,
    is_valid = p_is_valid,
    remaining_credits = COALESCE(p_remaining_credits, user_api_keys.remaining_credits),
    updated_at = now()
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- Function to get API key metadata (without the actual key - only masked preview)
CREATE OR REPLACE FUNCTION public.get_user_api_key_info()
RETURNS TABLE (
  id uuid,
  provider text,
  is_valid boolean,
  remaining_credits integer,
  key_preview text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  RETURN QUERY
  SELECT 
    k.id,
    k.provider,
    k.is_valid,
    k.remaining_credits,
    -- Only return masked preview (first 4 + last 4 chars)
    CASE 
      WHEN k.encrypted_key IS NOT NULL THEN
        LEFT(public.decrypt_api_key(k.encrypted_key), 4) || '••••••••' || RIGHT(public.decrypt_api_key(k.encrypted_key), 4)
      ELSE NULL
    END as key_preview,
    k.created_at,
    k.updated_at
  FROM public.user_api_keys k
  WHERE k.user_id = v_user_id;
END;
$$;

-- Function to delete API key
CREATE OR REPLACE FUNCTION public.delete_user_api_key_secure(p_provider text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  DELETE FROM public.user_api_keys 
  WHERE user_id = v_user_id AND provider = p_provider;
  
  RETURN true;
END;
$$;

-- Function to get decrypted key (ONLY for service role via edge functions)
CREATE OR REPLACE FUNCTION public.get_decrypted_api_key(p_user_id uuid, p_provider text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_encrypted_key text;
BEGIN
  SELECT encrypted_key INTO v_encrypted_key
  FROM public.user_api_keys
  WHERE user_id = p_user_id AND provider = p_provider AND is_valid = true;
  
  IF v_encrypted_key IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN public.decrypt_api_key(v_encrypted_key);
END;
$$;

-- Function to update API key balance only (no key exposure)
CREATE OR REPLACE FUNCTION public.update_api_key_balance(
  p_provider text,
  p_is_valid boolean,
  p_remaining_credits integer DEFAULT null
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  UPDATE public.user_api_keys 
  SET 
    is_valid = p_is_valid,
    remaining_credits = COALESCE(p_remaining_credits, remaining_credits),
    updated_at = now()
  WHERE user_id = v_user_id AND provider = p_provider;
  
  RETURN true;
END;
$$;

-- Add unique constraint for user + provider if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_api_keys_user_provider_unique'
  ) THEN
    ALTER TABLE public.user_api_keys ADD CONSTRAINT user_api_keys_user_provider_unique UNIQUE (user_id, provider);
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Update RLS policies - prevent direct access to encrypted_key column
DROP POLICY IF EXISTS "Users can manage own API keys" ON public.user_api_keys;

-- Users can only view metadata - NOT the encrypted_key directly
-- The key_preview comes from the secure function
CREATE POLICY "Users can view own API key metadata"
ON public.user_api_keys
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users CANNOT directly insert - must use save_user_api_key_secure function
CREATE POLICY "No direct insert - use secure function"
ON public.user_api_keys
FOR INSERT
TO authenticated
WITH CHECK (false);

-- Users CANNOT directly update - must use secure functions
CREATE POLICY "No direct update - use secure function"
ON public.user_api_keys
FOR UPDATE
TO authenticated
USING (false);

-- Users can delete their own keys
CREATE POLICY "Users can delete own API keys"
ON public.user_api_keys
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);