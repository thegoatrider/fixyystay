-- 🚀 PERFORMANCE OPTIMIZATION MIGRATION
-- 📥 RUN THIS IN YOUR SUPABASE SQL EDITOR

-- 1. ADD MISSING INDEXES (Critical for speed)
-- These prevent "Full Table Scans" and ensure lookups on Owner/Influencer dashboards are instant.

-- Owner Dashboard Lookups
CREATE INDEX IF NOT EXISTS idx_properties_owner_id ON public.properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_leads_owner_id ON public.leads(owner_id);
CREATE INDEX IF NOT EXISTS idx_guest_checkins_owner_id ON public.guest_checkins(owner_id);
CREATE INDEX IF NOT EXISTS idx_owner_subscriptions_owner_id ON public.owner_subscriptions(owner_id);

-- Wallet & Payouts (Commonly used by both Owners and Influencers)
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON public.wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_user_id ON public.payout_requests(user_id);

-- Influencer Dashboard Lookups
CREATE INDEX IF NOT EXISTS idx_influencer_promotion_requests_influencer_id ON public.influencer_promotion_requests(influencer_id);
CREATE INDEX IF NOT EXISTS idx_influencer_promotion_requests_property_id ON public.influencer_promotion_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_bookings_influencer_id ON public.bookings(influencer_id);
CREATE INDEX IF NOT EXISTS idx_influencer_clicks_influencer_id ON public.influencer_clicks(influencer_id);

-- 2. OPTIMIZED OWNER DASHBOARD RPC
-- We fix the subquery logic and ensure lookups are using the new indexes.

CREATE OR REPLACE FUNCTION public.get_owner_dashboard_data(
  p_owner_id UUID,
  p_is_superadmin BOOLEAN DEFAULT FALSE
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_properties JSON;
  v_leads JSON;
  v_checkins JSON;
  v_wallet_transactions JSON;
  v_payout_requests JSON;
  v_subscription JSON;
  v_influencer_requests JSON;
  v_owner_meta JSON;
BEGIN
  -- Fetch the owner's user_id and metadata
  SELECT json_build_object(
    'id', o.id,
    'free_tier_enabled', COALESCE(o.free_tier_enabled, false),
    'created_at', o.created_at
  ) INTO v_owner_meta
  FROM public.owners o
  WHERE o.id = p_owner_id;

  SELECT o.user_id INTO v_user_id FROM public.owners o WHERE o.id = p_owner_id;

  -- 1. Get properties
  IF p_is_superadmin THEN
    SELECT json_agg(p.*) INTO v_properties FROM public.properties p LIMIT 100; -- Safety limit for admin
  ELSE
    SELECT json_agg(p.*) INTO v_properties FROM public.properties p WHERE p.owner_id = p_owner_id;
  END IF;

  -- 2. Get leads
  IF p_is_superadmin THEN
    SELECT json_agg(l.* ORDER BY l.created_at DESC) INTO v_leads FROM public.leads l LIMIT 200;
  ELSE
    SELECT json_agg(l.* ORDER BY l.created_at DESC) INTO v_leads FROM public.leads l WHERE l.owner_id = p_owner_id;
  END IF;

  -- 3. Get checkins
  IF p_is_superadmin THEN
    SELECT json_agg(gc.* ORDER BY gc.created_at DESC) INTO v_checkins FROM public.guest_checkins gc LIMIT 200;
  ELSE
    SELECT json_agg(gc.* ORDER BY gc.created_at DESC) INTO v_checkins FROM public.guest_checkins gc WHERE gc.owner_id = p_owner_id;
  END IF;

  -- 4. Get wallet (using the v_user_id we fetched earlier)
  IF p_is_superadmin THEN
    SELECT json_agg(t.* ORDER BY t.created_at DESC) INTO v_wallet_transactions FROM public.wallet_transactions t LIMIT 100;
    SELECT json_agg(pr.* ORDER BY pr.created_at DESC) INTO v_payout_requests FROM public.payout_requests pr LIMIT 100;
  ELSE
    SELECT json_agg(t.* ORDER BY t.created_at DESC) INTO v_wallet_transactions 
    FROM public.wallet_transactions t 
    WHERE t.user_id = v_user_id;
    
    SELECT json_agg(pr.* ORDER BY pr.created_at DESC) INTO v_payout_requests 
    FROM public.payout_requests pr 
    WHERE pr.user_id = v_user_id;
  END IF;

  -- 5. Get influencer requests
  IF p_is_superadmin THEN
    SELECT json_agg(ir_complex) INTO v_influencer_requests
    FROM (
      SELECT ir.*, 
             json_build_object('id', i.id, 'name', i.name, 'email', i.email) as influencers,
             json_build_object('id', pr.id, 'name', pr.name) as properties
      FROM public.influencer_promotion_requests ir
      JOIN public.influencers i ON ir.influencer_id = i.id
      JOIN public.properties pr ON ir.property_id = pr.id
      ORDER BY ir.created_at DESC
      LIMIT 100
    ) ir_complex;
  ELSE
    SELECT json_agg(ir_complex) INTO v_influencer_requests
    FROM (
      SELECT ir.*, 
             json_build_object('id', i.id, 'name', i.name, 'email', i.email) as influencers,
             json_build_object('id', pr.id, 'name', pr.name) as properties
      FROM public.influencer_promotion_requests ir
      JOIN public.influencers i ON ir.influencer_id = i.id
      JOIN public.properties pr ON ir.property_id = pr.id
      WHERE pr.owner_id = p_owner_id
      ORDER BY ir.created_at DESC
    ) ir_complex;
  END IF;

  -- 6. Get CURRENT subscription status
  SELECT json_build_object(
    'plan_name', s.plan_name,
    'end_date', s.end_date,
    'status', s.status,
    'is_active', (s.status = 'active' AND s.end_date > NOW())
  ) INTO v_subscription
  FROM public.owner_subscriptions s
  WHERE s.owner_id = p_owner_id
  ORDER BY s.created_at DESC -- Ensure we get the latest one
  LIMIT 1;

  RETURN json_build_object(
    'owner', COALESCE(v_owner_meta, json_build_object('free_tier_enabled', false, 'created_at', null)),
    'properties', COALESCE(v_properties, '[]'::json),
    'leads', COALESCE(v_leads, '[]'::json),
    'checkins', COALESCE(v_checkins, '[]'::json),
    'influencer_requests', COALESCE(v_influencer_requests, '[]'::json),
    'wallet', json_build_object(
      'transactions', COALESCE(v_wallet_transactions, '[]'::json),
      'payout_requests', COALESCE(v_payout_requests, '[]'::json)
    ),
    'subscription', COALESCE(v_subscription, json_build_object('status', 'none', 'is_active', false))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
