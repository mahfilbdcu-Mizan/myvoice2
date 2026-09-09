REVOKE ALL ON FUNCTION public.deduct_credits_atomic(uuid, integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_credits_atomic(uuid, integer) TO service_role;