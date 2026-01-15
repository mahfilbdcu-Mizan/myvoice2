-- Drop the existing check constraint and add new one with 'expired' status
ALTER TABLE public.generation_tasks DROP CONSTRAINT IF EXISTS generation_tasks_status_check;

ALTER TABLE public.generation_tasks ADD CONSTRAINT generation_tasks_status_check 
CHECK (status IN ('pending', 'processing', 'done', 'failed', 'expired'));