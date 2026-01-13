-- Fix the get_decrypted_api_key function to return key even if is_valid is false
-- This is needed because when admin sets the API key, is_valid starts as false
-- and we need to check the balance to validate it

CREATE OR REPLACE FUNCTION public.get_decrypted_api_key(p_user_id uuid, p_provider text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_encrypted_key text;
BEGIN
  -- Get the encrypted key - don't check is_valid here
  -- The balance check will set is_valid properly
  SELECT encrypted_key INTO v_encrypted_key
  FROM public.user_api_keys
  WHERE user_id = p_user_id AND provider = p_provider;
  
  IF v_encrypted_key IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN public.decrypt_api_key(v_encrypted_key);
END;
$$;