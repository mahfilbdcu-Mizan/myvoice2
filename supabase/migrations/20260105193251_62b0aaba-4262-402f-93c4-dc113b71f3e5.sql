-- Create platform_settings table for storing admin-configurable settings
CREATE TABLE public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text,
  description text,
  is_secret boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage settings
CREATE POLICY "Admins can manage platform settings"
ON public.platform_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_platform_settings_updated_at
BEFORE UPDATE ON public.platform_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings
INSERT INTO public.platform_settings (key, value, description, is_secret) VALUES
  ('ai33_api_key', '', 'AI33.pro API Key for voice generation', true),
  ('usdt_wallet_trc20', '', 'USDT TRC20 wallet address for payments', false),
  ('free_credits_signup', '100', 'Free credits given on signup', false),
  ('hero_title', 'Transform Text Into Natural Speech', 'Homepage hero title', false),
  ('hero_subtitle', 'Create lifelike voiceovers, podcasts, and audio content with our state-of-the-art AI voice generation platform.', 'Homepage hero subtitle', false);