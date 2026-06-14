-- 1. Create property_rooms table
CREATE TABLE IF NOT EXISTS public.property_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  room_number TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(property_id, room_number)
);

-- 2. Add room_number column to guest_checkins
ALTER TABLE public.guest_checkins ADD COLUMN IF NOT EXISTS room_number TEXT;

-- 3. Enable RLS on property_rooms
ALTER TABLE public.property_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can manage rooms for their properties" ON public.property_rooms;
CREATE POLICY "Owners can manage rooms for their properties"
ON public.property_rooms
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    JOIN public.owners o ON p.owner_id = o.id
    WHERE p.id = property_rooms.property_id
    AND (o.user_id = auth.uid() OR o.email = auth.jwt() ->> 'email')
  )
);

-- 4. Update the owner dashboard data RPC to include property_rooms
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
  v_property_rooms JSON;
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
    SELECT json_agg(p.*) INTO v_properties FROM public.properties p LIMIT 100;
  ELSE
    SELECT json_agg(p.*) INTO v_properties FROM public.properties p WHERE p.owner_id = p_owner_id;
  END IF;

  -- 2. Get leads
  IF p_is_superadmin THEN
    SELECT json_agg(l.* ORDER BY l.created_at DESC) INTO v_leads FROM public.leads l LIMIT 200;
  ELSE
    SELECT json_agg(l.* ORDER BY l.created_at DESC) INTO v_leads 
    FROM public.leads l 
    LEFT JOIN public.properties pr ON l.property_id = pr.id
    WHERE l.owner_id = p_owner_id OR pr.owner_id = p_owner_id;
  END IF;

  -- 3. Get checkins
  IF p_is_superadmin THEN
    SELECT json_agg(
      (row_to_json(gc.*)::jsonb || 
       jsonb_build_object(
         'properties', (SELECT json_build_object('name', pr.name) FROM public.properties pr WHERE pr.id = gc.property_id),
         'identities', (SELECT COALESCE(json_agg(gi.*), '[]'::json) FROM public.guest_identity gi WHERE gi.checkin_id = gc.id)
       )
      ) ORDER BY gc.created_at DESC
    ) INTO v_checkins 
    FROM (SELECT * FROM public.guest_checkins ORDER BY created_at DESC LIMIT 200) gc;
  ELSE
    SELECT json_agg(
      (row_to_json(gc.*)::jsonb || 
       jsonb_build_object(
         'properties', (SELECT json_build_object('name', pr.name) FROM public.properties pr WHERE pr.id = gc.property_id),
         'identities', (SELECT COALESCE(json_agg(gi.*), '[]'::json) FROM public.guest_identity gi WHERE gi.checkin_id = gc.id)
       )
      ) ORDER BY gc.created_at DESC
    ) INTO v_checkins 
    FROM (
      SELECT gc.* 
      FROM public.guest_checkins gc
      LEFT JOIN public.properties pr ON gc.property_id = pr.id
      WHERE gc.owner_id = p_owner_id OR pr.owner_id = p_owner_id
      ORDER BY gc.created_at DESC
    ) gc;
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
  ORDER BY s.created_at DESC
  LIMIT 1;

  -- 7. Get property rooms
  IF p_is_superadmin THEN
    SELECT json_agg(r.* ORDER BY r.room_number ASC) INTO v_property_rooms FROM public.property_rooms r;
  ELSE
    SELECT json_agg(r.* ORDER BY r.room_number ASC) INTO v_property_rooms 
    FROM public.property_rooms r
    JOIN public.properties p ON r.property_id = p.id
    WHERE p.owner_id = p_owner_id;
  END IF;

  RETURN json_build_object(
    'owner', COALESCE(v_owner_meta, json_build_object('free_tier_enabled', false, 'created_at', null)),
    'properties', COALESCE(v_properties, '[]'::json),
    'leads', COALESCE(v_leads, '[]'::json),
    'checkins', COALESCE(v_checkins, '[]'::json),
    'influencer_requests', COALESCE(v_influencer_requests, '[]'::json),
    'wallet_transactions', COALESCE(v_wallet_transactions, '[]'::json),
    'payout_requests', COALESCE(v_payout_requests, '[]'::json),
    'subscription', COALESCE(v_subscription, json_build_object('status', 'none', 'is_active', false)),
    'property_rooms', COALESCE(v_property_rooms, '[]'::json)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
