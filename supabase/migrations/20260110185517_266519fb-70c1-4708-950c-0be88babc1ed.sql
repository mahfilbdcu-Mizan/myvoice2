-- Allow users to delete their own generation tasks
CREATE POLICY "Users can delete their own tasks" 
ON public.generation_tasks 
FOR DELETE 
USING (auth.uid() = user_id);