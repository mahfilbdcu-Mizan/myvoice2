CREATE TABLE public.voice_clones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  voice_id text NOT NULL,
  voice_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, voice_id)
);

GRANT SELECT, INSERT, DELETE ON public.voice_clones TO authenticated;
GRANT ALL ON public.voice_clones TO service_role;

ALTER TABLE public.voice_clones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own voice clones"
  ON public.voice_clones FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR is_staff(auth.uid()));

CREATE POLICY "Users can insert own voice clones"
  ON public.voice_clones FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own voice clones"
  ON public.voice_clones FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_voice_clones_user ON public.voice_clones (user_id);