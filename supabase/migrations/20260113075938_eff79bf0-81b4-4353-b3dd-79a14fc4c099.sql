-- Create admin function to set API key for any user
CREATE OR REPLACE FUNCTION public.save_user_api_key_secure_admin(
  p_user_id uuid,
  p_provider text, 
  p_api_key text, 
  p_is_valid boolean DEFAULT true, 
  p_remaining_credits integer DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
  v_encrypted_key text;
BEGIN
  -- Encrypt the API key
  v_encrypted_key := public.encrypt_api_key(p_api_key);
  
  -- Upsert the key for the specified user
  INSERT INTO public.user_api_keys (user_id, provider, encrypted_key, is_valid, remaining_credits)
  VALUES (p_user_id, p_provider, v_encrypted_key, p_is_valid, p_remaining_credits)
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