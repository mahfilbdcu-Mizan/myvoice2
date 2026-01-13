-- Enable realtime for user_api_keys table so dashboard updates instantly
ALTER TABLE public.user_api_keys REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_api_keys;