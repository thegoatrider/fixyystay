-- RPC to fetch all influencer dashboard data in a single call
CREATE OR REPLACE FUNCTION get_influencer_dashboard_data(
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
    SELECT json_agg(p.*) INTO v_properties
    FROM properties p;
  ELSE
    SELECT json_agg(p.*) INTO v_properties
    FROM properties p
    JOIN influencer_properties ip ON ip.property_id = p.id
    WHERE ip.influencer_id = p_influencer_id;
  END IF;

  -- 2. Get click stats
  IF p_is_super_admin THEN
    SELECT json_agg(c.*) INTO v_clicks
    FROM influencer_clicks c;
  ELSE
    SELECT json_agg(c.*) INTO v_clicks
    FROM influencer_clicks c
    WHERE c.influencer_id = p_influencer_id;
  END IF;

  -- 3. Get booking stats
  IF p_is_super_admin THEN
    SELECT json_agg(b.*) INTO v_bookings
    FROM bookings b;
  ELSE
    SELECT json_agg(b.*) INTO v_bookings
    FROM bookings b
    WHERE b.influencer_id = p_influencer_id;
  END IF;

  -- 4. Get wallet transactions (User ID matches Auth ID for influencers)
  IF p_is_super_admin THEN
    SELECT json_agg(t.*) INTO v_wallet_transactions
    FROM wallet_transactions t
    ORDER BY t.created_at DESC;
  ELSE
    SELECT json_agg(t.*) INTO v_wallet_transactions
    FROM wallet_transactions t
    WHERE t.user_id = p_influencer_id
    ORDER BY t.created_at DESC;
  END IF;

  -- 5. Get payout requests
  IF p_is_super_admin THEN
    SELECT json_agg(pr.*) INTO v_payout_requests
    FROM payout_requests pr
    ORDER BY pr.created_at DESC;
  ELSE
    SELECT json_agg(pr.*) INTO v_payout_requests
    FROM payout_requests pr
    WHERE pr.user_id = p_influencer_id
    ORDER BY pr.created_at DESC;
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
