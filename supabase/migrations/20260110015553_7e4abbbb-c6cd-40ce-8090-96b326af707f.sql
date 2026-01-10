-- Insert contact links and chatbot settings into platform_settings
INSERT INTO public.platform_settings (key, value, description, is_secret)
VALUES 
  ('contact_telegram_channel', 'https://t.me/BDYTAUTOMATION', 'Telegram channel link', false),
  ('contact_telegram_channel_name', '@BDYTAUTOMATION', 'Telegram channel display name', false),
  ('contact_telegram_support', 'https://t.me/BDTYAUTOMATIONSupport', 'Telegram support link', false),
  ('contact_telegram_support_name', '@BDTYAUTOMATIONSupport', 'Telegram support display name', false),
  ('contact_whatsapp', 'https://wa.me/8801757433586', 'WhatsApp link', false),
  ('contact_whatsapp_number', '+8801757433586', 'WhatsApp display number', false),
  ('contact_facebook', 'https://www.facebook.com/AbdusSamad2979/', 'Facebook link', false),
  ('contact_facebook_name', 'Abdus Samad', 'Facebook display name', false),
  ('contact_youtube', 'https://www.youtube.com/@BDTYAUTOMATION/videos', 'YouTube channel link', false),
  ('contact_youtube_name', '@BDTYAUTOMATION', 'YouTube channel display name', false),
  ('chatbot_enabled', 'true', 'Enable/disable chatbot widget', false),
  ('chatbot_telegram_link', 'https://t.me/BDTYAUTOMATIONSupport', 'Chatbot Telegram redirect link', false)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;