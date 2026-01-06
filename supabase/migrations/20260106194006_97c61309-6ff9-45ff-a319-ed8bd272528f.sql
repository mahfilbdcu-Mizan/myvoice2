-- =====================================================
-- Security Fix: Rate Limiting Table for Edge Functions
-- =====================================================
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  request_count INTEGER NOT NULL DEFAULT 1,
  UNIQUE(user_id, endpoint, window_start)
);

-- Enable RLS on rate_limits
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only allow service role to manage rate limits (via Edge Functions)
CREATE POLICY "Service role can manage rate limits"
  ON public.rate_limits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Auto-cleanup old rate limit entries (older than 5 minutes)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.rate_limits 
  WHERE window_start < now() - interval '5 minutes';
END;
$$;

-- =====================================================
-- Security Fix: Move admin email from hardcoded trigger to platform_settings
-- =====================================================

-- Insert admin email into platform_settings (encrypted/secret)
INSERT INTO public.platform_settings (key, value, is_secret, description)
VALUES ('admin_email', 'mahfilbdcu@gmail.com', true, 'Email address that gets auto-granted admin role on signup')
ON CONFLICT (key) DO NOTHING;

-- Update the check_and_grant_admin function to read from platform_settings
CREATE OR REPLACE FUNCTION public.check_and_grant_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  admin_email_value TEXT;
BEGIN
  -- Get admin email from secure configuration (not hardcoded)
  SELECT value INTO admin_email_value 
  FROM public.platform_settings 
  WHERE key = 'admin_email' AND is_secret = true;
  
  -- Only grant admin if email matches configured admin email
  IF admin_email_value IS NOT NULL AND NEW.email = admin_email_value THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- =====================================================
-- Security Fix: Input validation in handle_new_user trigger
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
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
  
  INSERT INTO public.profiles (id, email, full_name, avatar_url, credits)
  VALUES (
    NEW.id,
    NEW.email,
    _full_name,
    _avatar_url,
    100
  );
  RETURN NEW;
END;
$$;

-- =====================================================
-- Security Fix: Add constraints for input validation
-- =====================================================
DO $$
BEGIN
  -- Add full_name length constraint if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'full_name_length' AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles 
      ADD CONSTRAINT full_name_length CHECK (length(full_name) <= 100);
  END IF;
  
  -- Add avatar_url length constraint if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'avatar_url_length' AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles 
      ADD CONSTRAINT avatar_url_length CHECK (length(avatar_url) <= 500);
  END IF;
  
  -- Add avatar_url format constraint if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'avatar_url_format' AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT avatar_url_format CHECK (
        avatar_url IS NULL OR 
        avatar_url ~* '^https://'
      );
  END IF;
END;
$$;

-- =====================================================
-- Security Fix: Admin audit log for sensitive operations
-- =====================================================
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  action TEXT NOT NULL,
  target_user_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on admin_audit_log
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
  ON public.admin_audit_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Only service role can insert audit logs (via Edge Functions)
CREATE POLICY "Service role can insert audit logs"
  ON public.admin_audit_log
  FOR INSERT
  TO service_role
  WITH CHECK (true);