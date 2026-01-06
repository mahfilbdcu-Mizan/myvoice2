-- Add CHECK constraint to prevent negative credits
ALTER TABLE public.profiles 
ADD CONSTRAINT credits_non_negative 
CHECK (credits >= 0);

-- Create atomic credit deduction function
CREATE OR REPLACE FUNCTION public.deduct_credits_atomic(
  _user_id UUID,
  _amount INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _updated INTEGER;
BEGIN
  -- Atomic update with credit check in WHERE clause
  UPDATE public.profiles
  SET credits = credits - _amount,
      updated_at = now()
  WHERE id = _user_id 
    AND credits >= _amount;
  
  GET DIAGNOSTICS _updated = ROW_COUNT;
  
  RETURN _updated > 0;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.deduct_credits_atomic(UUID, INTEGER) TO authenticated;

-- Also grant to service role for Edge Functions
GRANT EXECUTE ON FUNCTION public.deduct_credits_atomic(UUID, INTEGER) TO service_role;