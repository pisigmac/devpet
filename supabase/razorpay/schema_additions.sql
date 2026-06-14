
-- DevPet Razorpay Schema Additions (append to schema.sql)

-- Razorpay orders & payments
CREATE TABLE public.razorpay_orders (
  id TEXT PRIMARY KEY, -- Razorpay order ID
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  product_id TEXT REFERENCES public.products(id) NOT NULL,
  price_id TEXT REFERENCES public.prices(id) NOT NULL,
  amount INTEGER NOT NULL, -- paise
  currency TEXT DEFAULT 'INR',
  status TEXT DEFAULT 'created' CHECK (status IN ('created','paid','failed','refunded')),
  receipt TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.razorpay_payments (
  id TEXT PRIMARY KEY, -- Razorpay payment ID
  order_id TEXT REFERENCES public.razorpay_orders(id) NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('captured','failed','refunded')),
  method TEXT,
  captured_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add payment_provider preference to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'stripe' CHECK (payment_provider IN ('stripe','razorpay'));

-- RLS
ALTER TABLE public.razorpay_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.razorpay_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own orders" ON public.razorpay_orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users read own payments" ON public.razorpay_payments FOR SELECT USING (auth.uid() = user_id);
