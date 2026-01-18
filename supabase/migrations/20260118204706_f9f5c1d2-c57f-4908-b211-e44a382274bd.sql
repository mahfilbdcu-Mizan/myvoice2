-- Grant execute permission to authenticated users for the usage stats function
GRANT EXECUTE ON FUNCTION public.get_user_usage_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_usage_stats() TO service_role;