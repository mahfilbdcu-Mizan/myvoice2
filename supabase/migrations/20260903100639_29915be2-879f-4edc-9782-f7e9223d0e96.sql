CREATE TABLE public.image_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  external_task_id text,
  model_id text NOT NULL,
  prompt text NOT NULL,
  aspect_ratio text,
  resolution text,
  generations_count integer NOT NULL DEFAULT 1,
  credits_charged integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'processing',
  progress integer NOT NULL DEFAULT 0,
  error_message text,
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '48 hours')
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.image_generations TO authenticated;
GRANT ALL ON public.image_generations TO service_role;

ALTER TABLE public.image_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own image generations"
  ON public.image_generations FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_staff(auth.uid()));

CREATE POLICY "Users can delete own image generations"
  ON public.image_generations FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_image_generations_user_created ON public.image_generations (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.cleanup_expired_image_generations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.image_generations WHERE expires_at < now();
END;
$$;