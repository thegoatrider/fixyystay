-- RPC to fetch all owner dashboard data (Properties, Leads, Checkins, Wallet, Subscription)
-- Clear any existing versions with different return signatures
DROP FUNCTION IF EXISTS public.get_owner_dashboard_data(UUID, BOOLEAN);
DROP FUNCTION IF EXISTS get_owner_dashboard_data(UUID, BOOLEAN);

-- Ensure dependent columns exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='leads' AND column_name='owner_id') THEN
    ALTER TABLE public.leads ADD COLUMN owner_id UUID REFERENCES public.owners(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='guest_checkins' AND column_name='owner_id') THEN
    ALTER TABLE public.guest_checkins ADD COLUMN owner_id UUID REFERENCES public.owners(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='owners' AND column_name='free_tier_enabled') THEN
    ALTER TABLE public.owners ADD COLUMN free_tier_enabled BOOLEAN DEFAULT false;
  END IF;
END $$;

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
  -- 0. Get owner metadata (Including created_at for trial logic)
  SELECT json_build_object(
    'id', o.id,
    'free_tier_enabled', COALESCE(o.free_tier_enabled, false),
    'created_at', o.created_at
  ) INTO v_owner_meta
  FROM public.owners o
  WHERE o.id = p_owner_id;

  -- Fetch the owner's user_id once to avoid repeated subqueries below
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
    'wallet_transactions', COALESCE(v_wallet_transactions, '[]'::json),
    'payout_requests', COALESCE(v_payout_requests, '[]'::json),
    'subscription', COALESCE(v_subscription, json_build_object('status', 'none', 'is_active', false))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
