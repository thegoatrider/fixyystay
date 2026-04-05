-- 🚀 Influencer Promotion Request System: Database Schema
-- 📥 RUN THIS IN YOUR SUPABASE SQL EDITOR

-- 1. Create the Requests Table
CREATE TABLE IF NOT EXISTS public.influencer_promotion_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    influencer_id UUID REFERENCES public.influencers(id) ON DELETE CASCADE,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    proposal_text TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(influencer_id, property_id)
);

-- 2. Enable RLS
ALTER TABLE public.influencer_promotion_requests ENABLE ROW LEVEL SECURITY;

-- 3. Policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Influencers can view own requests') THEN
        CREATE POLICY "Influencers can view own requests" 
        ON public.influencer_promotion_requests 
        FOR SELECT 
        USING (auth.uid() IN (SELECT user_id FROM public.influencers WHERE id = influencer_id));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Influencers can create requests') THEN
        CREATE POLICY "Influencers can create requests" 
        ON public.influencer_promotion_requests 
        FOR INSERT 
        WITH CHECK (auth.uid() IN (SELECT user_id FROM public.influencers WHERE id = influencer_id));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Owners can view requests for their properties') THEN
        CREATE POLICY "Owners can view requests for their properties" 
        ON public.influencer_promotion_requests 
        FOR SELECT 
        USING (auth.uid() IN (SELECT user_id FROM public.owners o JOIN public.properties p ON p.owner_id = o.id WHERE p.id = property_id));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Owners can update requests') THEN
        CREATE POLICY "Owners can update requests" 
        ON public.influencer_promotion_requests 
        FOR UPDATE 
        USING (auth.uid() IN (SELECT user_id FROM public.owners o JOIN public.properties p ON p.owner_id = o.id WHERE p.id = property_id));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all requests') THEN
        CREATE POLICY "Admins can view all requests" 
        ON public.influencer_promotion_requests 
        FOR SELECT 
        USING (auth.jwt() ->> 'email' = 'superadmin@fixstay.com' OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
    END IF;
END $$;

-- 4. Automated Assignment Trigger
-- When a request is accepted, automatically link the influencer to the property
CREATE OR REPLACE FUNCTION public.handle_accepted_promotion()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
        INSERT INTO public.influencer_properties (influencer_id, property_id)
        VALUES (NEW.influencer_id, NEW.property_id)
        ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_promotion_accepted ON public.influencer_promotion_requests;
CREATE TRIGGER on_promotion_accepted
    AFTER UPDATE ON public.influencer_promotion_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_accepted_promotion();

-- 5. Updated Dashboard RPC for Influencers
-- This version returns ALL properties (with their request status) for the marketplace
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
BEGIN
  -- 0. Get Influencer Profile
  SELECT json_build_object(
    'id', i.id,
    'name', i.name,
    'email', i.email,
    'commission_rate', i.commission_rate,
    'approved', i.approved
  ) INTO v_influencer FROM public.influencers i WHERE i.id = p_influencer_id OR i.user_id = p_influencer_id;

  -- 1. Get ALL properties for marketplace
  SELECT json_agg(p.*) INTO v_all_properties FROM public.properties p WHERE p.approved = true;

  -- 2. Get My Requests
  SELECT json_agg(r.*) INTO v_my_requests FROM public.influencer_promotion_requests r WHERE r.influencer_id = (v_influencer->>'id')::UUID;

  -- 3. Get click stats
  IF p_is_super_admin THEN
    SELECT json_agg(c.*) INTO v_clicks FROM public.influencer_clicks c;
  ELSE
    SELECT json_agg(c.*) INTO v_clicks
    FROM public.influencer_clicks c
    WHERE c.influencer_id = (v_influencer->>'id')::UUID;
  END IF;

  -- 4. Get booking stats
  IF p_is_super_admin THEN
    SELECT json_agg(b.*) INTO v_bookings FROM public.bookings b;
  ELSE
    SELECT json_agg(b.*) INTO v_bookings
    FROM public.bookings b
    WHERE b.influencer_id = (v_influencer->>'id')::UUID;
  END IF;

  -- 5. Get wallet + payouts
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
