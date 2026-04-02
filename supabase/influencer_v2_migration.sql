-- 🚀 SQL Migration: Influencer System v2
-- RUN THIS IN YOUR SUPABASE SQL EDITOR

-- 1. Extend Influencers Table
ALTER TABLE public.influencers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.influencers ADD COLUMN IF NOT EXISTS commission_rate NUMERIC DEFAULT 10;
ALTER TABLE public.influencers ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT FALSE;

-- 2. Update Dashboard Data RPC
-- This version returns the influencer's own commission rate and approval status.
CREATE OR REPLACE FUNCTION public.get_influencer_dashboard_data(
  p_influencer_id UUID, -- This can be either influencer.id or influencer.user_id (handled in logic)
  p_is_super_admin BOOLEAN DEFAULT FALSE
)
RETURNS JSON AS $$
DECLARE
  v_properties JSON;
  v_clicks JSON;
  v_bookings JSON;
  v_wallet_transactions JSON;
  v_payout_requests JSON;
  v_influencer_info JSON;
  v_actual_id UUID;
BEGIN
  -- 1. Resolve actual influencer_id if p_influencer_id is a user_id
  SELECT id INTO v_actual_id FROM public.influencers WHERE id = p_influencer_id OR user_id = p_influencer_id LIMIT 1;

  -- 2. Get influencer basic info
  SELECT json_build_object(
    'id', i.id,
    'name', i.name,
    'commission_rate', i.commission_rate,
    'approved', i.approved
  ) INTO v_influencer_info 
  FROM public.influencers i 
  WHERE i.id = v_actual_id;

  -- 3. Get properties assigned
  IF p_is_super_admin THEN
    SELECT json_agg(p.*) INTO v_properties FROM public.properties p;
  ELSE
    SELECT json_agg(p.*) INTO v_properties
    FROM public.properties p
    JOIN public.influencer_properties ip ON ip.property_id = p.id
    WHERE ip.influencer_id = v_actual_id;
  END IF;

  -- 4. Get click stats
  IF p_is_super_admin THEN
    SELECT json_agg(c.*) INTO v_clicks FROM public.influencer_clicks c;
  ELSE
    SELECT json_agg(c.*) INTO v_clicks
    FROM public.influencer_clicks c
    WHERE c.influencer_id = v_actual_id;
  END IF;

  -- 5. Get booking stats
  IF p_is_super_admin THEN
    SELECT json_agg(b.*) INTO v_bookings FROM public.bookings b;
  ELSE
    SELECT json_agg(b.*) INTO v_bookings
    FROM public.bookings b
    WHERE b.influencer_id = v_actual_id;
  END IF;

  -- 6. Get wallet transactions (must use user_id!)
  IF p_is_super_admin THEN
    SELECT json_agg(t.* ORDER BY t.created_at DESC) INTO v_wallet_transactions FROM public.wallet_transactions t;
  ELSE
    SELECT json_agg(t.* ORDER BY t.created_at DESC) INTO v_wallet_transactions
    FROM public.wallet_transactions t
    WHERE t.user_id = p_influencer_id OR t.user_id = (SELECT user_id FROM public.influencers WHERE id = v_actual_id);
  END IF;

  -- 7. Get payout requests
  IF p_is_super_admin THEN
    SELECT json_agg(pr.* ORDER BY pr.created_at DESC) INTO v_payout_requests FROM public.payout_requests pr;
  ELSE
    SELECT json_agg(pr.* ORDER BY pr.created_at DESC) INTO v_payout_requests
    FROM public.payout_requests pr
    WHERE pr.user_id = p_influencer_id OR pr.user_id = (SELECT user_id FROM public.influencers WHERE id = v_actual_id);
  END IF;

  RETURN json_build_object(
    'influencer', COALESCE(v_influencer_info, '{}'::json),
    'properties', COALESCE(v_properties, '[]'::json),
    'clicks', COALESCE(v_clicks, '[]'::json),
    'bookings', COALESCE(v_bookings, '[]'::json),
    'wallet_transactions', COALESCE(v_wallet_transactions, '[]'::json),
    'payout_requests', COALESCE(v_payout_requests, '[]'::json)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Additional Indexes for performance
CREATE INDEX IF NOT EXISTS idx_influencer_user_id ON public.influencers(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_influencer_id ON public.bookings(influencer_id);

COMMENT ON TABLE public.influencers IS 'Extended to support dynamic commissions and wallet linkage.';
