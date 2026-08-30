-- Staff = admin or manager (manager uses existing 'moderator' role value)
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin'::app_role, 'moderator'::app_role)
  )
$$;

CREATE TABLE public.manager_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  invited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.manager_invites TO authenticated;
GRANT ALL ON public.manager_invites TO service_role;

ALTER TABLE public.manager_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage manager invites"
ON public.manager_invites FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can view manager invites"
ON public.manager_invites FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()));

CREATE TRIGGER update_manager_invites_updated_at
BEFORE UPDATE ON public.manager_invites
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Grant admin/manager role on profile creation
CREATE OR REPLACE FUNCTION public.check_and_grant_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_email_value TEXT;
BEGIN
  SELECT value INTO admin_email_value
  FROM public.platform_settings
  WHERE key = 'admin_email' AND is_secret = true;

  IF admin_email_value IS NOT NULL AND NEW.email = admin_email_value THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSIF NEW.email IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.manager_invites mi WHERE lower(mi.email) = lower(NEW.email)
  ) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'moderator')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Widen admin-only policies to staff (admin + manager)
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_log;
CREATE POLICY "Staff can view audit logs" ON public.admin_audit_log
FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Admins can update orders" ON public.credit_orders;
CREATE POLICY "Staff can update orders" ON public.credit_orders
FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all orders" ON public.credit_orders;
CREATE POLICY "Staff can view all orders" ON public.credit_orders
FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage packages" ON public.packages;
CREATE POLICY "Staff can manage packages" ON public.packages
FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete platform settings" ON public.platform_settings;
CREATE POLICY "Staff can delete platform settings" ON public.platform_settings
FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert platform settings" ON public.platform_settings;
CREATE POLICY "Staff can insert platform settings" ON public.platform_settings
FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Admins can update platform settings" ON public.platform_settings;
CREATE POLICY "Staff can update platform settings" ON public.platform_settings
FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Admins can view platform settings" ON public.platform_settings;
CREATE POLICY "Staff can view platform settings" ON public.platform_settings
FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Staff can update all profiles" ON public.profiles
FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Staff can view all profiles" ON public.profiles
FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all api keys" ON public.user_api_keys;
CREATE POLICY "Staff can view all api keys" ON public.user_api_keys
FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage voices" ON public.voices;
CREATE POLICY "Staff can manage voices" ON public.voices
FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- Staff can read roles (needed for admin UI), but only admins can change them
CREATE POLICY "Staff can view roles" ON public.user_roles
FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

-- Allow managers to block/unblock users
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

  IF NOT public.is_staff(_admin_id) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  UPDATE public.profiles
  SET is_blocked = _is_blocked, updated_at = now()
  WHERE id = _target_user_id;

  INSERT INTO public.admin_audit_log (admin_user_id, target_user_id, action, details)
  VALUES (
    _admin_id, _target_user_id,
    CASE WHEN _is_blocked THEN 'block_user' ELSE 'unblock_user' END,
    jsonb_build_object('is_blocked', _is_blocked)
  );

  RETURN true;
END;
$$;