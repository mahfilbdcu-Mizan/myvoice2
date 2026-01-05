-- Add table for storing user API keys with encryption
-- user_api_keys table already exists, let's add remaining_credits field if not exists
ALTER TABLE public.user_api_keys 
ADD COLUMN IF NOT EXISTS key_name TEXT DEFAULT 'AI33 API Key',
ADD COLUMN IF NOT EXISTS last_balance_check TIMESTAMP WITH TIME ZONE;

-- Create generation_tasks table for background processing with 72-hour download window
-- First drop existing table if constraints need changing
DROP TABLE IF EXISTS public.generation_tasks;

CREATE TABLE public.generation_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  voice_id TEXT NOT NULL,
  voice_name TEXT,
  input_text TEXT NOT NULL,
  words_count INTEGER NOT NULL DEFAULT 0,
  model TEXT DEFAULT 'eleven_multilingual_v2',
  settings JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  progress INTEGER DEFAULT 0,
  error_message TEXT,
  audio_url TEXT,
  file_size INTEGER,
  provider TEXT DEFAULT 'ai33',
  external_task_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '72 hours')
);

-- Enable RLS
ALTER TABLE public.generation_tasks ENABLE ROW LEVEL SECURITY;

-- Users can only see their own tasks
CREATE POLICY "Users can view their own tasks"
ON public.generation_tasks
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own tasks
CREATE POLICY "Users can create their own tasks"
ON public.generation_tasks
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own tasks
CREATE POLICY "Users can update their own tasks"
ON public.generation_tasks
FOR UPDATE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_generation_tasks_user_status ON public.generation_tasks(user_id, status);
CREATE INDEX idx_generation_tasks_expires ON public.generation_tasks(expires_at);

-- Enable realtime for task updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.generation_tasks;