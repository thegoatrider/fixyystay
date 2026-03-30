-- 🚀 Fix Influencer Dashboard: Consolidated Tables & Statistics Function
-- 📥 RUN THIS IN YOUR SUPABASE SQL EDITOR

-- 1. Ensure Influencer Table has required columns
ALTER TABLE public.influencers ADD COLUMN IF NOT EXISTS commission_rate numeric DEFAULT 0;
ALTER TABLE public.influencers ADD COLUMN IF NOT EXISTS approved boolean DEFAULT false;

-- 2. Create Wallet Transactions Table (if missing)
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    amount numeric NOT NULL,
    transaction_type text NOT NULL CHECK (transaction_type IN ('earning', 'payout')),
    booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
    description text,
    created_at timestamp with time zone DEFAULT now()
);

-- 3. Create Payout Requests Table (if missing)
CREATE TABLE IF NOT EXISTS public.payout_requests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    amount numeric NOT NULL,
    bank_details text NOT NULL,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
    created_at timestamp with time zone DEFAULT now()
);

-- 4. Enable RLS and Policies for Wallet
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own wallet transactions') THEN
        CREATE POLICY "Users can view their own wallet transactions" ON public.wallet_transactions FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own payout requests') THEN
        CREATE POLICY "Users can view their own payout requests" ON public.payout_requests FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own payout requests') THEN
        CREATE POLICY "Users can insert their own payout requests" ON public.payout_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- 5. THE CORE FIX: Create the Dashboard RPC Function
-- This function aggregates all data needed for the Influencer Dashboard in one call.
CREATE OR REPLACE FUNCTION public.get_influencer_dashboard_data(
  p_influencer_id UUID,
  p_is_super_admin BOOLEAN DEFAULT FALSE
)
RETURNS JSON AS $$
DECLARE
  v_properties JSON;
  v_clicks JSON;
  v_bookings JSON;
  v_wallet_transactions JSON;
  v_payout_requests JSON;
BEGIN
  -- 1. Get properties assigned
  IF p_is_super_admin THEN
    SELECT json_agg(p.*) INTO v_properties FROM public.properties p;
  ELSE
    SELECT json_agg(p.*) INTO v_properties
    FROM public.properties p
    JOIN public.influencer_properties ip ON ip.property_id = p.id
    WHERE ip.influencer_id = p_influencer_id;
  END IF;

  -- 2. Get click stats
  IF p_is_super_admin THEN
    SELECT json_agg(c.*) INTO v_clicks FROM public.influencer_clicks c;
  ELSE
    SELECT json_agg(c.*) INTO v_clicks
    FROM public.influencer_clicks c
    WHERE c.influencer_id = p_influencer_id;
  END IF;

  -- 3. Get booking stats
  IF p_is_super_admin THEN
    SELECT json_agg(b.*) INTO v_bookings FROM public.bookings b;
  ELSE
    SELECT json_agg(b.*) INTO v_bookings
    FROM public.bookings b
    WHERE b.influencer_id = p_influencer_id;
  END IF;

  -- 4. Get wallet transactions
  IF p_is_super_admin THEN
    SELECT json_agg(t.* ORDER BY t.created_at DESC) INTO v_wallet_transactions FROM public.wallet_transactions t;
  ELSE
    SELECT json_agg(t.* ORDER BY t.created_at DESC) INTO v_wallet_transactions
    FROM public.wallet_transactions t
    WHERE t.user_id = p_influencer_id;
  END IF;

  -- 5. Get payout requests
  IF p_is_super_admin THEN
    SELECT json_agg(pr.* ORDER BY pr.created_at DESC) INTO v_payout_requests FROM public.payout_requests pr;
  ELSE
    SELECT json_agg(pr.* ORDER BY pr.created_at DESC) INTO v_payout_requests
    FROM public.payout_requests pr
    WHERE pr.user_id = p_influencer_id;
  END IF;

  RETURN json_build_object(
    'properties', COALESCE(v_properties, '[]'::json),
    'clicks', COALESCE(v_clicks, '[]'::json),
    'bookings', COALESCE(v_bookings, '[]'::json),
    'wallet_transactions', COALESCE(v_wallet_transactions, '[]'::json),
    'payout_requests', COALESCE(v_payout_requests, '[]'::json)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
