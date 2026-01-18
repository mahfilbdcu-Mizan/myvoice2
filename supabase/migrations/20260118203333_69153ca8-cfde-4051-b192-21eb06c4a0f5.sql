-- Create a function to get aggregated usage per user
CREATE OR REPLACE FUNCTION public.get_user_usage_stats()
RETURNS TABLE (user_id uuid, total_words_used bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    gt.user_id,
    COALESCE(SUM(gt.words_count), 0)::bigint as total_words_used
  FROM public.generation_tasks gt
  GROUP BY gt.user_id;
$$;