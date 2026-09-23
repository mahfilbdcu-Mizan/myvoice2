ALTER TABLE public.generation_tasks
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '48 hours');

UPDATE public.generation_tasks
SET expires_at = created_at + interval '48 hours'
WHERE expires_at IS NULL OR expires_at > created_at + interval '48 hours';

CREATE OR REPLACE FUNCTION public.cleanup_expired_generation_tasks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.generation_tasks
  WHERE COALESCE(expires_at, created_at + interval '48 hours') < now();
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_generations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.cleanup_expired_generation_tasks();
  PERFORM public.cleanup_expired_image_generations();
  PERFORM public.cleanup_expired_music_generations();
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_expired_generation_tasks() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cleanup_expired_generations() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_generation_tasks() TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_generations() TO service_role;