-- 🚀 Fix Influencer Dashboard: Consolidated Database RPC & Cleanup
-- 📥 RUN THIS IN YOUR SUPABASE SQL EDITOR

-- 1. Ensure a unique case-insensitive index on email to prevent duplicate signups
-- First delete the existing unique index if we want to replace it, or just add one.
CREATE UNIQUE INDEX IF NOT EXISTS idx_influencers_lower_email ON public.influencers (LOWER(email));

-- 2. Update the get_influencer_dashboard_data_v2 RPC
-- This RPC resolves user_id to influencer table id and aggregates requests & manual assignments.
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
  v_auth_user_id UUID;
BEGIN
  -- 0. Get the real public.influencers.id and user_id representing this user
  SELECT i.id, i.user_id INTO v_real_influencer_id, v_auth_user_id 
  FROM public.influencers i 
  WHERE i.user_id = p_influencer_id OR i.id = p_influencer_id 
  LIMIT 1;

  -- Fallback for auth user ID if not found in profiles yet
  IF v_auth_user_id IS NULL THEN
    v_auth_user_id := p_influencer_id;
  END IF;

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

  -- 3. Get My Requests (combining actual requests + manual influencer_properties assignments)
  SELECT json_agg(item ORDER BY item->>'created_at' DESC) INTO v_my_requests
  FROM (
    SELECT json_build_object(
      'id', r.id,
      'influencer_id', r.influencer_id,
      'property_id', r.property_id,
      'proposal_text', r.proposal_text,
      'status', r.status,
      'rejection_reason', r.rejection_reason,
      'created_at', r.created_at,
      'updated_at', r.updated_at
    ) AS item
    FROM public.influencer_promotion_requests r
    WHERE r.influencer_id = v_real_influencer_id

    UNION ALL

    SELECT json_build_object(
      'id', ip.id,
      'influencer_id', ip.influencer_id,
      'property_id', ip.property_id,
      'proposal_text', 'Manually assigned by administrator.',
      'status', 'accepted',
      'rejection_reason', null,
      'created_at', ip.created_at,
      'updated_at', ip.created_at
    ) AS item
    FROM public.influencer_properties ip
    WHERE ip.influencer_id = v_real_influencer_id
    AND NOT EXISTS (
      SELECT 1 FROM public.influencer_promotion_requests r 
      WHERE r.influencer_id = ip.influencer_id 
      AND r.property_id = ip.property_id
    )
  ) sub;

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
  SELECT json_agg(t.* ORDER BY t.created_at DESC) INTO v_wallet_transactions FROM public.wallet_transactions t WHERE t.user_id = v_auth_user_id;
  SELECT json_agg(pr.* ORDER BY pr.created_at DESC) INTO v_payout_requests FROM public.payout_requests pr WHERE pr.user_id = v_auth_user_id;

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
