INSERT INTO public.platform_settings (key, value, description, is_secret) VALUES
  ('payment_bkash_number', '01757914726', 'bKash payment number', false),
  ('payment_nagad_number', '01757914726', 'Nagad payment number', false),
  ('payment_rocket_number', '01757914726', 'Rocket payment number', false)
ON CONFLICT (key) DO NOTHING;