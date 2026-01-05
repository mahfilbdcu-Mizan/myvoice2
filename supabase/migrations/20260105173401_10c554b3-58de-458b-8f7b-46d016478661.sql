-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  credits INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, credits)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.raw_user_meta_data ->> 'avatar_url',
    100
  );
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create voices table for voice library cache
CREATE TABLE public.voices (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  accent TEXT,
  gender TEXT,
  age TEXT,
  languages TEXT[],
  category TEXT,
  preview_url TEXT,
  provider TEXT NOT NULL DEFAULT 'elevenlabs',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS - voices are public read
ALTER TABLE public.voices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Voices are publicly readable"
  ON public.voices FOR SELECT
  USING (true);

-- Create generation tasks table
CREATE TABLE public.generation_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  input_text TEXT NOT NULL,
  voice_id TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'elevenlabs',
  model TEXT,
  settings JSONB,
  audio_url TEXT,
  error_message TEXT,
  words_count INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.generation_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks"
  ON public.generation_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tasks"
  ON public.generation_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
  ON public.generation_tasks FOR UPDATE
  USING (auth.uid() = user_id);

-- Create credit orders table
CREATE TABLE public.credit_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  credits INTEGER NOT NULL,
  amount_usdt DECIMAL(10,2) NOT NULL,
  txid TEXT,
  wallet_address TEXT,
  network TEXT DEFAULT 'TRC20',
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.credit_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders"
  ON public.credit_orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own orders"
  ON public.credit_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create user API keys table
CREATE TABLE public.user_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL,
  encrypted_key TEXT NOT NULL,
  is_valid BOOLEAN DEFAULT true,
  remaining_credits INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- Enable RLS
ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own API keys"
  ON public.user_api_keys FOR ALL
  USING (auth.uid() = user_id);

-- Create app role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Users can view their own roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Only admins can manage roles
CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can view all orders
CREATE POLICY "Admins can view all orders"
  ON public.credit_orders FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update orders
CREATE POLICY "Admins can update orders"
  ON public.credit_orders FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_api_keys_updated_at
  BEFORE UPDATE ON public.user_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample voices data
INSERT INTO public.voices (id, name, accent, gender, age, languages, category, provider) VALUES
  ('CwhRBWXzGAHq8TQ4Fs17', 'Roger', 'British', 'Male', 'Middle-aged', ARRAY['English'], 'Narration', 'elevenlabs'),
  ('EXAVITQu4vr4xnSDxMaL', 'Sarah', 'American', 'Female', 'Young', ARRAY['English'], 'Conversational', 'elevenlabs'),
  ('FGY2WhTYpPnrIDTdsKH5', 'Laura', 'American', 'Female', 'Young', ARRAY['English', 'Spanish'], 'News', 'elevenlabs'),
  ('IKne3meq5aSn9XLyUdCD', 'Charlie', 'Australian', 'Male', 'Young', ARRAY['English'], 'Conversational', 'elevenlabs'),
  ('JBFqnCBsd6RMkjVDRZzb', 'George', 'British', 'Male', 'Senior', ARRAY['English'], 'Audiobook', 'elevenlabs'),
  ('N2lVS1w4EtoT3dr4eOWO', 'Callum', 'American', 'Male', 'Young', ARRAY['English'], 'Gaming', 'elevenlabs'),
  ('SAz9YHcvj6GT2YYXdXww', 'River', 'American', 'Female', 'Young', ARRAY['English'], 'Documentary', 'elevenlabs'),
  ('TX3LPaxmHKxFdv7VOQHJ', 'Liam', 'Irish', 'Male', 'Young', ARRAY['English'], 'Conversational', 'elevenlabs'),
  ('Xb7hH8MSUJpSbSDYk0k2', 'Alice', 'British', 'Female', 'Young', ARRAY['English', 'French'], 'Corporate', 'elevenlabs'),
  ('XrExE9yKIg1WjnnlVkGX', 'Matilda', 'American', 'Female', 'Middle-aged', ARRAY['English'], 'Narration', 'elevenlabs'),
  ('bIHbv24MWmeRgasZH58o', 'Will', 'American', 'Male', 'Middle-aged', ARRAY['English'], 'Documentary', 'elevenlabs'),
  ('cgSgspJ2msm6clMCkdW9', 'Jessica', 'American', 'Female', 'Middle-aged', ARRAY['English'], 'Corporate', 'elevenlabs');
