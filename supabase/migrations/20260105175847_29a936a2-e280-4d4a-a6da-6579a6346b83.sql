-- Create function to automatically grant admin role to specific email
CREATE OR REPLACE FUNCTION public.check_and_grant_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Grant admin role to specific admin email
  IF NEW.email = 'mahfilbdcu@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to run after profile is created
CREATE TRIGGER on_profile_created_check_admin
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.check_and_grant_admin();

-- Also grant admin to existing user if they already signed up
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  SELECT id INTO admin_user_id FROM public.profiles WHERE email = 'mahfilbdcu@gmail.com';
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;

-- Admin can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Admin can update all profiles (for credit management)
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Admin can manage voices
CREATE POLICY "Admins can manage voices"
  ON public.voices FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Admin can view all generation tasks
CREATE POLICY "Admins can view all tasks"
  ON public.generation_tasks FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));