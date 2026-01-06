-- Create packages table for pricing management
CREATE TABLE public.packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  credits integer NOT NULL,
  real_price numeric(10,2) NOT NULL,
  offer_price numeric(10,2) NOT NULL,
  discount_percentage integer GENERATED ALWAYS AS (
    CASE WHEN real_price > 0 THEN ROUND(((real_price - offer_price) / real_price) * 100)::integer ELSE 0 END
  ) STORED,
  is_popular boolean DEFAULT false,
  is_active boolean DEFAULT true,
  features text[] DEFAULT '{}',
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

-- Public can read active packages
CREATE POLICY "Packages are publicly readable"
ON public.packages
FOR SELECT
USING (is_active = true);

-- Admins can manage all packages
CREATE POLICY "Admins can manage packages"
ON public.packages
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_packages_updated_at
BEFORE UPDATE ON public.packages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default packages
INSERT INTO public.packages (name, description, credits, real_price, offer_price, is_popular, features, sort_order) VALUES
('Starter', 'Perfect for trying out', 100, 10.00, 5.00, false, ARRAY['100 Credits', 'All voices access', 'Standard quality', 'Email support'], 1),
('Pro', 'Best for regular users', 500, 40.00, 25.00, true, ARRAY['500 Credits', 'All voices access', 'HD quality', 'Priority support', 'API access'], 2),
('Enterprise', 'For power users', 2000, 150.00, 80.00, false, ARRAY['2000 Credits', 'All voices access', 'Ultra HD quality', '24/7 support', 'API access', 'Custom voices'], 3);