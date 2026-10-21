-- ==============================================================================
-- FIX: Restore get_owner_dashboard_data RPC function
-- Fixes: "column p.price_per_night does not exist"
-- Run this in Supabase SQL Editor
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_owner_dashboard_data(
  p_owner_id UUID,
  p_is_superadmin BOOLEAN DEFAULT FALSE
)
RETURNS JSON 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
  -- 0. Get owner metadata
  SELECT json_build_object(
    'id', o.id,
    'name', o.name,
    'free_tier_enabled', COALESCE(o.free_tier_enabled, false),
    'created_at', o.created_at
  ) INTO v_owner_meta
  FROM public.owners o
  WHERE o.id = p_owner_id;

  SELECT o.user_id INTO v_user_id FROM public.owners o WHERE o.id = p_owner_id;

  -- 1. Properties: Safe projection using p.* reflecting actual properties schema
  IF p_is_superadmin THEN
    SELECT json_agg(p.*) INTO v_properties 
    FROM (SELECT * FROM public.properties LIMIT 100) p;
  ELSE
    SELECT json_agg(p.*) INTO v_properties 
    FROM (SELECT * FROM public.properties WHERE owner_id = p_owner_id) p;
  END IF;

  -- 2. Leads: Explicit column projection with safety limit of 200
  IF p_is_superadmin THEN
    SELECT json_agg(json_build_object(
      'id', l.id,
      'guest_name', l.guest_name,
      'phone_number', l.phone_number,
      'checkin_date', l.checkin_date,
      'checkout_date', l.checkout_date,
      'marking', l.marking,
      'status', l.status,
      'property_id', l.property_id,
      'owner_id', l.owner_id,
      'created_at', l.created_at,
      'source', l.source
    ) ORDER BY l.created_at DESC) INTO v_leads 
    FROM public.leads l 
    LIMIT 200;
  ELSE
    SELECT json_agg(json_build_object(
      'id', l.id,
      'guest_name', l.guest_name,
      'phone_number', l.phone_number,
      'checkin_date', l.checkin_date,
      'checkout_date', l.checkout_date,
      'marking', l.marking,
      'status', l.status,
      'property_id', l.property_id,
      'owner_id', l.owner_id,
      'created_at', l.created_at,
      'source', l.source
    ) ORDER BY l.created_at DESC) INTO v_leads 
    FROM public.leads l 
    LEFT JOIN public.properties pr ON l.property_id = pr.id
    WHERE l.owner_id = p_owner_id OR pr.owner_id = p_owner_id
    LIMIT 200;
  END IF;

  -- 3. Guest Check-ins: Explicit projection (with joined property name and identities)
  IF p_is_superadmin THEN
    SELECT json_agg(json_build_object(
      'id', gc.id,
      'guest_name', gc.guest_name,
      'guest_phone', gc.guest_phone,
      'num_people', gc.num_people,
      'checkin_date', gc.checkin_date,
      'checkout_date', gc.checkout_date,
      'vehicle_number', gc.vehicle_number,
      'status', gc.status,
      'property_id', gc.property_id,
      'room_number', gc.room_number,
      'source', gc.source,
      'register_date', gc.register_date,
      'id_documents', gc.id_documents,
      'identities', (SELECT COALESCE(json_agg(gi.*), '[]'::json) FROM public.guest_identity gi WHERE gi.checkin_id = gc.id),
      'created_at', gc.created_at,
      'uid', gc.uid,
      'properties', json_build_object('name', pr.name)
    ) ORDER BY gc.created_at DESC) INTO v_checkins 
    FROM public.guest_checkins gc
    LEFT JOIN public.properties pr ON gc.property_id = pr.id
    LIMIT 200;
  ELSE
    SELECT json_agg(json_build_object(
      'id', gc.id,
      'guest_name', gc.guest_name,
      'guest_phone', gc.guest_phone,
      'num_people', gc.num_people,
      'checkin_date', gc.checkin_date,
      'checkout_date', gc.checkout_date,
      'vehicle_number', gc.vehicle_number,
      'status', gc.status,
      'property_id', gc.property_id,
      'room_number', gc.room_number,
      'source', gc.source,
      'register_date', gc.register_date,
      'register_image_url', gc.register_image_url,
      'id_documents', gc.id_documents,
      'identities', (SELECT COALESCE(json_agg(gi.*), '[]'::json) FROM public.guest_identity gi WHERE gi.checkin_id = gc.id),
      'created_at', gc.created_at,
      'uid', gc.uid,
      'properties', json_build_object('name', pr.name)
    ) ORDER BY gc.created_at DESC) INTO v_checkins 
    FROM public.guest_checkins gc
    LEFT JOIN public.properties pr ON gc.property_id = pr.id
    WHERE gc.owner_id = p_owner_id OR pr.owner_id = p_owner_id
    LIMIT 200;
  END IF;

  -- 4. Wallet Transactions (recent 50)
  IF p_is_superadmin THEN
    SELECT json_agg(json_build_object(
      'id', wt.id,
      'amount', wt.amount,
      'type', wt.type,
      'status', wt.status,
      'description', wt.description,
      'created_at', wt.created_at
    ) ORDER BY wt.created_at DESC) INTO v_wallet_transactions 
    FROM public.wallet_transactions wt 
    LIMIT 50;
  ELSIF v_user_id IS NOT NULL THEN
    SELECT json_agg(json_build_object(
      'id', wt.id,
      'amount', wt.amount,
      'type', wt.type,
      'status', wt.status,
      'description', wt.description,
      'created_at', wt.created_at
    ) ORDER BY wt.created_at DESC) INTO v_wallet_transactions 
    FROM public.wallet_transactions wt 
    WHERE wt.user_id = v_user_id
    LIMIT 50;
  END IF;

  -- 5. Payout Requests (recent 50)
  IF p_is_superadmin THEN
    SELECT json_agg(json_build_object(
      'id', pr.id,
      'amount', pr.amount,
      'status', pr.status,
      'bank_details', pr.bank_details,
      'created_at', pr.created_at
    ) ORDER BY pr.created_at DESC) INTO v_payout_requests 
    FROM public.payout_requests pr 
    LIMIT 50;
  ELSIF v_user_id IS NOT NULL THEN
    SELECT json_agg(json_build_object(
      'id', pr.id,
      'amount', pr.amount,
      'status', pr.status,
      'bank_details', pr.bank_details,
      'created_at', pr.created_at
    ) ORDER BY pr.created_at DESC) INTO v_payout_requests 
    FROM public.payout_requests pr 
    WHERE pr.user_id = v_user_id
    LIMIT 50;
  END IF;

  -- 6. Subscription
  SELECT json_build_object(
    'status', os.status,
    'end_date', os.end_date,
    'plan_name', COALESCE(os.plan_name, 'Pro'),
    'is_active', (os.status = 'active' AND os.end_date > NOW())
  ) INTO v_subscription
  FROM public.owner_subscriptions os
  WHERE os.owner_id = p_owner_id
  ORDER BY os.created_at DESC
  LIMIT 1;

  -- 7. Influencer Requests
  IF p_is_superadmin THEN
    SELECT json_agg(ipr.* ORDER BY ipr.created_at DESC) INTO v_influencer_requests 
    FROM public.influencer_promotion_requests ipr 
    LIMIT 50;
  ELSE
    SELECT json_agg(ipr.* ORDER BY ipr.created_at DESC) INTO v_influencer_requests 
    FROM public.influencer_promotion_requests ipr
    WHERE ipr.property_id IN (SELECT id FROM public.properties WHERE owner_id = p_owner_id)
    LIMIT 50;
  END IF;

  -- 8. Property Rooms
  IF p_is_superadmin THEN
    SELECT json_agg(r.*) INTO v_property_rooms 
    FROM public.property_rooms r 
    LIMIT 500;
  ELSE
    SELECT json_agg(r.*) INTO v_property_rooms 
    FROM public.property_rooms r 
    WHERE r.property_id IN (SELECT id FROM public.properties WHERE owner_id = p_owner_id);
  END IF;

  -- Return consolidated JSON response
  RETURN json_build_object(
    'properties', COALESCE(v_properties, '[]'::json),
    'leads', COALESCE(v_leads, '[]'::json),
    'checkins', COALESCE(v_checkins, '[]'::json),
    'wallet_transactions', COALESCE(v_wallet_transactions, '[]'::json),
    'payout_requests', COALESCE(v_payout_requests, '[]'::json),
    'subscription', v_subscription,
    'influencer_requests', COALESCE(v_influencer_requests, '[]'::json),
    'property_rooms', COALESCE(v_property_rooms, '[]'::json),
    'owner', v_owner_meta
  );
END;
$$;
