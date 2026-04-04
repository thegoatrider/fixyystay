-- 🚀 SQL Migration: Razorpay Integration
-- Run this in your Supabase SQL Editor

-- 1. Update Bookings for Razorpay
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));

-- 2. Update Owners & Influencers for Payouts
ALTER TABLE public.owners ADD COLUMN IF NOT EXISTS payout_details JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.owners ADD COLUMN IF NOT EXISTS is_active_member BOOLEAN DEFAULT FALSE;

ALTER TABLE public.influencers ADD COLUMN IF NOT EXISTS payout_details JSONB DEFAULT '{}'::jsonb;

-- 3. Standalone Owner Payments (For Manual Onboarding tracking)
CREATE TABLE IF NOT EXISTS public.owner_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    plan_name TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for the new table
ALTER TABLE public.owner_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view owner payments" ON public.owner_payments FOR SELECT USING (auth.jwt() ->> 'email' = 'superadmin@fixstay.com' OR (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin'));

-- 4. Payout Requests Update
-- Ensure consistent structure for bank/upi details
COMMENT ON COLUMN public.payout_requests.bank_details IS 'Can store UPI ID or JSON string of bank account details';
