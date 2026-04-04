-- 1. Owner Subscriptions Table
CREATE TABLE IF NOT EXISTS public.owner_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.owners(id) ON DELETE CASCADE,
    plan_name TEXT NOT NULL, -- 'Monthly', 'Quarterly', '6-Months', 'Yearly'
    start_date TIMESTAMPTZ DEFAULT NOW(),
    end_date TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'active', -- 'active', 'expired', 'pending'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(owner_id)
);

-- 2. Owner Payments Table (Manual/Admin-recorded)
CREATE TABLE IF NOT EXISTS public.owner_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.owners(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    payment_date TIMESTAMPTZ DEFAULT NOW(),
    payment_method TEXT, -- 'Razorpay', 'Bank Transfer', 'Cash'
    payment_ref TEXT, -- Razorpay ID, UTR Number, or Screenshot URL
    plan_duration_months INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.owner_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_payments ENABLE ROW LEVEL SECURITY;

-- Admins (superadmin@fixstay.com) can manage everything
CREATE POLICY "Admins manage subscriptions" 
ON public.owner_subscriptions FOR ALL TO authenticated
USING (auth.jwt() ->> 'email' = 'superadmin@fixstay.com');

CREATE POLICY "Admins manage owner_payments" 
ON public.owner_payments FOR ALL TO authenticated
USING (auth.jwt() ->> 'email' = 'superadmin@fixstay.com');

-- Owners can view their own data
CREATE POLICY "Owners view their own subscriptions" 
ON public.owner_subscriptions FOR SELECT TO authenticated
USING (owner_id IN (SELECT id FROM public.owners WHERE user_id = auth.uid()));

CREATE POLICY "Owners view their own payments" 
ON public.owner_payments FOR SELECT TO authenticated
USING (owner_id IN (SELECT id FROM public.owners WHERE user_id = auth.uid()));
