ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS credits_used integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.deduct_credits_atomic(_user_id uuid, _amount integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _updated integer;
BEGIN
  UPDATE public.profiles
  SET credits = credits - _amount,
      credits_used = COALESCE(credits_used, 0) + _amount
  WHERE id = _user_id
    AND credits >= _amount
    AND (credits_expires_at IS NULL OR credits_expires_at > now());
  GET DIAGNOSTICS _updated = ROW_COUNT;
  RETURN _updated > 0;
END;
$function$;

CREATE OR REPLACE FUNCTION public.refund_credits_atomic(_user_id uuid, _amount integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.profiles
  SET credits = credits + _amount,
      credits_used = GREATEST(COALESCE(credits_used, 0) - _amount, 0)
  WHERE id = _user_id;
  RETURN FOUND;
END;
$function$;

REVOKE ALL ON FUNCTION public.refund_credits_atomic(uuid, integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_credits_atomic(uuid, integer) TO service_role;

-- Backfill from past usage (successful voice tasks + charged image generations)
WITH usage AS (
  SELECT user_id, SUM(words_count)::bigint AS total
  FROM public.generation_tasks
  WHERE status <> 'failed'
  GROUP BY user_id
), img AS (
  SELECT user_id, SUM(credits_charged)::bigint AS total
  FROM public.image_generations
  WHERE status <> 'failed'
  GROUP BY user_id
), combined AS (
  SELECT COALESCE(u.user_id, i.user_id) AS user_id,
         COALESCE(u.total, 0) + COALESCE(i.total, 0) AS total
  FROM usage u
  FULL OUTER JOIN img i ON i.user_id = u.user_id
)
UPDATE public.profiles p
SET credits_used = LEAST(c.total, 2147483647)::integer
FROM combined c
WHERE p.id = c.user_id;

CREATE OR REPLACE FUNCTION public.get_user_usage_stats()
 RETURNS TABLE(user_id uuid, total_words_used bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.id AS user_id, COALESCE(p.credits_used, 0)::bigint AS total_words_used
  FROM public.profiles p;
$function$;