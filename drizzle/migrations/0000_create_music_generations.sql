CREATE TABLE public.music_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  external_task_id text,
  provider text NOT NULL DEFAULT 'suno',
  model text,
  create_mode text NOT NULL DEFAULT 'simple',
  title text,
  idea text,
  lyrics text,
  tags text,
  vocal_gender text,
  instrumental boolean NOT NULL DEFAULT false,
  credits_charged integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'processing',
  progress integer NOT NULL DEFAULT 0,
  error_message text,
  tracks jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '48 hours')
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.music_generations TO authenticated;
GRANT ALL ON public.music_generations TO service_role;

ALTER TABLE public.music_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own music generations"
  ON public.music_generations FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_staff(auth.uid()));

CREATE POLICY "Users can delete own music generations"
  ON public.music_generations FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_music_generations_user_created ON public.music_generations (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.cleanup_expired_music_generations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.music_generations WHERE expires_at < now();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cleanup_expired_music_generations() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_music_generations() TO service_role;