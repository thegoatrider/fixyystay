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
END $$;

CREATE OR REPLACE FUNCTION public.get_owner_dashboard_data(
  p_owner_id UUID,
  p_is_superadmin BOOLEAN DEFAULT FALSE
)
RETURNS JSON AS $$
DECLARE
  v_properties JSON;
  v_leads JSON;
  v_checkins JSON;
  v_wallet_transactions JSON;
  v_payout_requests JSON;
  v_subscription JSON;
  v_influencer_requests JSON;
BEGIN
  -- 1. Get properties
  IF p_is_superadmin THEN
    SELECT json_agg(p.*) INTO v_properties FROM public.properties p;
  ELSE
    SELECT json_agg(p.*) INTO v_properties FROM public.properties p WHERE p.owner_id = p_owner_id;
  END IF;

  -- 2. Get leads
  IF p_is_superadmin THEN
    SELECT json_agg(l.*) INTO v_leads FROM public.leads l;
  ELSE
    SELECT json_agg(l.*) INTO v_leads FROM public.leads l WHERE l.owner_id = p_owner_id;
  END IF;

  -- 3. Get checkins
  IF p_is_superadmin THEN
    SELECT json_agg(gc.*) INTO v_checkins FROM public.guest_checkins gc;
  ELSE
    SELECT json_agg(gc.*) INTO v_checkins FROM public.guest_checkins gc WHERE gc.owner_id = p_owner_id;
  END IF;

  -- 4. Get wallet (based on owner.user_id)
  IF p_is_superadmin THEN
    SELECT json_agg(t.* ORDER BY t.created_at DESC) INTO v_wallet_transactions FROM public.wallet_transactions t;
    SELECT json_agg(pr.* ORDER BY pr.created_at DESC) INTO v_payout_requests FROM public.payout_requests pr;
  ELSE
    SELECT json_agg(t.* ORDER BY t.created_at DESC) INTO v_wallet_transactions 
    FROM public.wallet_transactions t 
    WHERE t.user_id = (SELECT user_id FROM public.owners WHERE id = p_owner_id);
    
    SELECT json_agg(pr.* ORDER BY pr.created_at DESC) INTO v_payout_requests 
    FROM public.payout_requests pr 
    WHERE pr.user_id = (SELECT user_id FROM public.owners WHERE id = p_owner_id);
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
  LIMIT 1;

  RETURN json_build_object(
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
