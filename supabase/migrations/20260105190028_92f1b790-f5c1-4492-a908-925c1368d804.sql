-- Create the admin user with email/password authentication
-- Note: This inserts into auth.users which requires the password to be set via Supabase
-- We'll use the auth.admin functions approach

-- First, let's ensure the admin email gets admin role when they sign up via any method
-- Update the trigger to handle password-based signups too

CREATE OR REPLACE FUNCTION public.check_and_grant_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if this is the admin email
  IF NEW.email = 'mahfilbdcu@gmail.com' THEN
    -- Insert admin role if not exists
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;