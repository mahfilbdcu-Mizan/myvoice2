ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS credits_expires_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS credits_granted_at timestamptz;

CREATE OR REPLACE FUNCTION public.deduct_credits_atomic(_user_id uuid, _amount integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _updated integer;
BEGIN
  UPDATE public.profiles
  SET credits = credits - _amount
  WHERE id = _user_id
    AND credits >= _amount
    AND (credits_expires_at IS NULL OR credits_expires_at > now());
  GET DIAGNOSTICS _updated = ROW_COUNT;
  RETURN _updated > 0;
END;
$$;