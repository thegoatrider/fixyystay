-- 🛠️ FIX: Influencer Authorization Schema
-- 📥 RUN THIS IN YOUR SUPABASE SQL EDITOR

-- 1. Add missing columns to influencers table
-- We check for existence first to avoid errors
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='influencers' AND column_name='user_id') THEN
    ALTER TABLE public.influencers ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='influencers' AND column_name='approved') THEN
    ALTER TABLE public.influencers ADD COLUMN approved BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='influencers' AND column_name='commission_rate') THEN
    ALTER TABLE public.influencers ADD COLUMN commission_rate NUMERIC DEFAULT 5;
  END IF;
END $$;

-- 2. Create index on user_id for fast lookup during login/actions
CREATE INDEX IF NOT EXISTS idx_influencers_user_id ON public.influencers(user_id);

-- 3. Update the get_influencer_dashboard_data_v2 RPC
-- This ensures the dashboard uses the correct ID mapping
CREATE OR REPLACE FUNCTION public.get_influencer_dashboard_data_v2(
  p_influencer_id UUID,
  p_is_super_admin BOOLEAN DEFAULT FALSE
)
RETURNS JSON AS $$
DECLARE
  v_influencer JSON;
  v_all_properties JSON;
  v_my_requests JSON;
  v_clicks JSON;
  v_bookings JSON;
  v_wallet_transactions JSON;
  v_payout_requests JSON;
  v_real_influencer_id UUID;
BEGIN
  -- 0. Get the real public.influencers.id representing this user (which might be the input UUID itself or its user_id)
  SELECT i.id INTO v_real_influencer_id FROM public.influencers i WHERE i.user_id = p_influencer_id OR i.id = p_influencer_id LIMIT 1;

  -- 1. Get Influencer Profile
  SELECT json_build_object(
    'id', i.id,
    'name', i.name,
    'email', i.email,
    'commission_rate', i.commission_rate,
    'approved', i.approved
  ) INTO v_influencer FROM public.influencers i WHERE i.id = v_real_influencer_id;

  -- 2. Get ALL properties for marketplace
  SELECT json_agg(p.*) INTO v_all_properties FROM public.properties p WHERE p.approved = true;

  -- 3. Get My Requests
  SELECT json_agg(r.* ORDER BY r.created_at DESC) INTO v_my_requests 
  FROM public.influencer_promotion_requests r 
  WHERE r.influencer_id = v_real_influencer_id;

  -- 4. Get click stats
  IF p_is_super_admin THEN
    SELECT json_agg(c.*) INTO v_clicks FROM public.influencer_clicks c;
  ELSE
    SELECT json_agg(c.*) INTO v_clicks
    FROM public.influencer_clicks c
    WHERE c.influencer_id = v_real_influencer_id;
  END IF;

  -- 5. Get booking stats
  IF p_is_super_admin THEN
    SELECT json_agg(b.*) INTO v_bookings FROM public.bookings b;
  ELSE
    SELECT json_agg(b.*) INTO v_bookings
    FROM public.bookings b
    WHERE b.influencer_id = v_real_influencer_id;
  END IF;

  -- 6. Get wallet + payouts (based on Auth User UUID)
  SELECT json_agg(t.* ORDER BY t.created_at DESC) INTO v_wallet_transactions FROM public.wallet_transactions t WHERE t.user_id = p_influencer_id;
  SELECT json_agg(pr.* ORDER BY pr.created_at DESC) INTO v_payout_requests FROM public.payout_requests pr WHERE pr.user_id = p_influencer_id;

  RETURN json_build_object(
    'influencer', v_influencer,
    'all_properties', COALESCE(v_all_properties, '[]'::json),
    'my_requests', COALESCE(v_my_requests, '[]'::json),
    'clicks', COALESCE(v_clicks, '[]'::json),
    'bookings', COALESCE(v_bookings, '[]'::json),
    'wallet_transactions', COALESCE(v_wallet_transactions, '[]'::json),
    'payout_requests', COALESCE(v_payout_requests, '[]'::json)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
