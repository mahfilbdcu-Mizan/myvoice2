-- Add is_blocked and has_received_free_credits columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS has_received_free_credits BOOLEAN NOT NULL DEFAULT true;

-- Mark existing users as having received free credits (they got 100 on signup)
UPDATE public.profiles SET has_received_free_credits = true WHERE has_received_free_credits IS NULL;

-- Create function to check if user is blocked
CREATE OR REPLACE FUNCTION public.is_user_blocked(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_blocked FROM public.profiles WHERE id = _user_id),
    false
  )
$$;

-- Create function for admin to block/unblock users
CREATE OR REPLACE FUNCTION public.admin_toggle_user_block(_target_user_id uuid, _is_blocked boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin_id uuid;
BEGIN
  _admin_id := auth.uid();
  
  -- Check if caller is admin
  IF NOT public.has_role(_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  -- Update user's blocked status
  UPDATE public.profiles
  SET is_blocked = _is_blocked,
      updated_at = now()
  WHERE id = _target_user_id;
  
  -- Log the action
  INSERT INTO public.admin_audit_log (admin_user_id, target_user_id, action, details)
  VALUES (
    _admin_id,
    _target_user_id,
    CASE WHEN _is_blocked THEN 'block_user' ELSE 'unblock_user' END,
    jsonb_build_object('is_blocked', _is_blocked)
  );
  
  RETURN true;
END;
$$;

-- Update handle_new_user to set has_received_free_credits = true
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public 
AS $$
DECLARE
  _full_name TEXT;
  _avatar_url TEXT;
BEGIN
  -- Extract and validate full name
  _full_name := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name', 
    NEW.raw_user_meta_data ->> 'name'
  );
  
  -- Truncate to reasonable length (100 chars) and strip HTML tags
  IF _full_name IS NOT NULL THEN
    _full_name := LEFT(_full_name, 100);
    _full_name := regexp_replace(_full_name, '<[^>]*>', '', 'g');
  END IF;
  
  -- Validate avatar URL
  _avatar_url := NEW.raw_user_meta_data ->> 'avatar_url';
  
  -- Only allow HTTPS URLs and truncate length
  IF _avatar_url IS NOT NULL THEN
    IF _avatar_url !~ '^https://' THEN
      _avatar_url := NULL;
    ELSE
      _avatar_url := LEFT(_avatar_url, 500);
    END IF;
  END IF;
  
  INSERT INTO public.profiles (id, email, full_name, avatar_url, credits, has_received_free_credits, is_blocked)
  VALUES (
    NEW.id,
    NEW.email,
    _full_name,
    _avatar_url,
    100,
    true,
    false
  );
  RETURN NEW;
END;
$$;

-- RLS: Admins can view all user_api_keys
CREATE POLICY "Admins can view all api keys"
  ON public.user_api_keys FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));