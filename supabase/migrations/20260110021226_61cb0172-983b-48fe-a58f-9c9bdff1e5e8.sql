-- Allow all authenticated users to read non-secret platform settings
CREATE POLICY "Authenticated users can read public platform settings"
ON public.platform_settings
FOR SELECT
TO authenticated
USING (is_secret = false);