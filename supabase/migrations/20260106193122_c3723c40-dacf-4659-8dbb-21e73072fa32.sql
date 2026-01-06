-- Fix 1: Replace platform_settings FOR ALL policy with explicit policies
DROP POLICY IF EXISTS "Admins can manage platform settings" ON public.platform_settings;

CREATE POLICY "Admins can view platform settings"
  ON public.platform_settings FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert platform settings"
  ON public.platform_settings FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update platform settings"
  ON public.platform_settings FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete platform settings"
  ON public.platform_settings FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Fix 2: Change has_role function to SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Ensure authenticated users can execute the function
GRANT EXECUTE ON FUNCTION public.has_role(UUID, app_role) TO authenticated;

-- Fix 3: Add credits upper bound constraint (100 million max)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS credits_range_check;
ALTER TABLE public.profiles ADD CONSTRAINT credits_range_check CHECK (credits >= 0 AND credits <= 100000000);