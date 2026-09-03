REVOKE EXECUTE ON FUNCTION public.cleanup_expired_image_generations() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_image_generations() TO service_role;