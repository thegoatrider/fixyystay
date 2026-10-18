-- ======================================================================================
-- FixyStays Database Performance Optimization & RLS Indexing Migration
-- (DO NOT AUTO-APPLY: Review and execute in Supabase SQL Editor)
--
-- This migration addresses:
-- 1. Missing indexes on foreign keys, filtering columns (.eq, .in), and ordering columns (.order).
-- 2. Performance optimization of RLS policies: rewrites auth.uid() as (SELECT auth.uid())
--    so Postgres evaluates authentication once per query execution (InitPlan) rather
--    than once per row (SubPlan).
-- 3. Security & operational gaps: adds missing UPDATE RLS policy on guest_checkins for owners.
-- 4. Optimized column selection in get_owner_dashboard_data RPC (eliminating SELECT *).
-- ======================================================================================

-- --------------------------------------------------------------------------------------
-- PART 1: MISSING INDEXES ON FOREIGN KEYS, FILTERING & SORTING COLUMNS
-- --------------------------------------------------------------------------------------

-- 1. Owners: Indexed on user_id (FK to auth.users).
-- Critical for every auth lookup and every RLS subquery across the entire application.
CREATE INDEX IF NOT EXISTS idx_owners_user_id 
  ON public.owners(user_id);

-- 2. Properties: Composite index on owner_id and created_at DESC for owner dashboard list view.
CREATE INDEX IF NOT EXISTS idx_properties_owner_created 
  ON public.properties(owner_id, created_at DESC);

-- 3. Property Rooms: FK to properties(id) and room_number search.
CREATE INDEX IF NOT EXISTS idx_property_rooms_property_id 
  ON public.property_rooms(property_id);

CREATE INDEX IF NOT EXISTS idx_property_rooms_property_room 
  ON public.property_rooms(property_id, room_number);

-- 4. Leads:
-- (a) Composite index for owner leads ordered by created_at DESC.
CREATE INDEX IF NOT EXISTS idx_leads_owner_created 
  ON public.leads(owner_id, created_at DESC);

-- (b) Composite index for property leads with date filtering.
CREATE INDEX IF NOT EXISTS idx_leads_property_dates_status 
  ON public.leads(property_id, checkin_date, checkout_date, status);

-- 5. Guest Check-ins:
-- (a) Composite index for owner checkins ordered by created_at DESC.
CREATE INDEX IF NOT EXISTS idx_guest_checkins_owner_created 
  ON public.guest_checkins(owner_id, created_at DESC);

-- (b) Index for property checkins filtering active stays.
CREATE INDEX IF NOT EXISTS idx_guest_checkins_property_status 
  ON public.guest_checkins(property_id, status);

-- (c) Composite index for date range collision checks & calendar occupancy grid.
CREATE INDEX IF NOT EXISTS idx_guest_checkins_stay_dates 
  ON public.guest_checkins(property_id, checkin_date, checkout_date);

-- 6. Wallet Transactions: Composite index for user transactions ordered by created_at DESC.
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_created 
  ON public.wallet_transactions(user_id, created_at DESC);

-- 7. Payout Requests: Composite index for user payout requests ordered by created_at DESC.
CREATE INDEX IF NOT EXISTS idx_payout_requests_user_created 
  ON public.payout_requests(user_id, created_at DESC);

-- 8. Owner Subscriptions: Index on owner_id and status.
CREATE INDEX IF NOT EXISTS idx_owner_subscriptions_owner_status 
  ON public.owner_subscriptions(owner_id, status);

-- 9. Guest Hub Settings: Composite index for property lookup and subscription verification.
CREATE INDEX IF NOT EXISTS idx_guest_hub_settings_property_sub 
  ON public.guest_hub_settings(property_id, subscription_status);

-- 10. Employees & Attendance:
CREATE INDEX IF NOT EXISTS idx_employees_owner_id 
  ON public.employees(owner_id);

CREATE INDEX IF NOT EXISTS idx_employees_property_id 
  ON public.employees(property_id);

CREATE INDEX IF NOT EXISTS idx_employee_attendance_emp_date 
  ON public.employee_attendance(employee_id, date DESC);

-- 11. Influencer Promotion Requests: Index for pending request badge queries.
CREATE INDEX IF NOT EXISTS idx_influencer_requests_property_status 
  ON public.influencer_promotion_requests(property_id, status);


-- --------------------------------------------------------------------------------------
-- PART 2: RLS POLICIES REWRITE WITH (SELECT auth.uid())
-- --------------------------------------------------------------------------------------

-- 1. Table: public.owners
DROP POLICY IF EXISTS "Owners can view own record" ON public.owners;
CREATE POLICY "Owners can view own record" ON public.owners 
  FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Owners can update own record" ON public.owners;
CREATE POLICY "Owners can update own record" ON public.owners 
  FOR UPDATE USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can link themselves to existing owner records" ON public.owners;
CREATE POLICY "Users can link themselves to existing owner records" ON public.owners 
  FOR UPDATE USING (user_id IS NULL) WITH CHECK (user_id = (SELECT auth.uid()));

-- 2. Table: public.properties
DROP POLICY IF EXISTS "Owners can manage own properties" ON public.properties;
CREATE POLICY "Owners can manage own properties" ON public.properties 
  FOR ALL USING (
    owner_id IN (
      SELECT id FROM public.owners WHERE user_id = (SELECT auth.uid())
    )
  );

-- 3. Table: public.property_rooms
DROP POLICY IF EXISTS "Owners can manage rooms for their properties" ON public.property_rooms;
CREATE POLICY "Owners can manage rooms for their properties" ON public.property_rooms 
  FOR ALL TO authenticated USING (
    property_id IN (
      SELECT p.id FROM public.properties p 
      WHERE p.owner_id IN (
        SELECT o.id FROM public.owners o WHERE o.user_id = (SELECT auth.uid())
      )
    )
  );

-- 4. Table: public.leads
DROP POLICY IF EXISTS "Owners can view and manage leads for their properties" ON public.leads;
CREATE POLICY "Owners can view and manage leads for their properties" ON public.leads 
  FOR ALL USING (
    owner_id IN (
      SELECT id FROM public.owners WHERE user_id = (SELECT auth.uid())
    )
    OR property_id IN (
      SELECT p.id FROM public.properties p
      WHERE p.owner_id IN (
        SELECT o.id FROM public.owners o WHERE o.user_id = (SELECT auth.uid())
      )
    )
  );

-- 5. Table: public.guest_checkins
DROP POLICY IF EXISTS "Owners can view checkins for their properties" ON public.guest_checkins;
CREATE POLICY "Owners can view checkins for their properties" ON public.guest_checkins 
  FOR SELECT USING (
    owner_id IN (
      SELECT id FROM public.owners WHERE user_id = (SELECT auth.uid())
    )
    OR property_id IN (
      SELECT p.id FROM public.properties p
      WHERE p.owner_id IN (
        SELECT o.id FROM public.owners o WHERE o.user_id = (SELECT auth.uid())
      )
    )
  );

-- GAP FIX: Add UPDATE policy so owners can assign rooms and check out guests via authenticated client
DROP POLICY IF EXISTS "Owners can update checkins for their properties" ON public.guest_checkins;
CREATE POLICY "Owners can update checkins for their properties" ON public.guest_checkins 
  FOR UPDATE USING (
    owner_id IN (
      SELECT id FROM public.owners WHERE user_id = (SELECT auth.uid())
    )
    OR property_id IN (
      SELECT p.id FROM public.properties p
      WHERE p.owner_id IN (
        SELECT o.id FROM public.owners o WHERE o.user_id = (SELECT auth.uid())
      )
    )
  );

-- 6. Table: public.wallet_transactions
DROP POLICY IF EXISTS "Users can view their own wallet transactions" ON public.wallet_transactions;
CREATE POLICY "Users can view their own wallet transactions" ON public.wallet_transactions 
  FOR SELECT USING (user_id = (SELECT auth.uid()));

-- 7. Table: public.payout_requests
DROP POLICY IF EXISTS "Users can view their own payout requests" ON public.payout_requests;
CREATE POLICY "Users can view their own payout requests" ON public.payout_requests 
  FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own payout requests" ON public.payout_requests;
CREATE POLICY "Users can insert their own payout requests" ON public.payout_requests 
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

-- 8. Table: public.owner_subscriptions
DROP POLICY IF EXISTS "Owners view their own subscriptions" ON public.owner_subscriptions;
CREATE POLICY "Owners view their own subscriptions" ON public.owner_subscriptions 
  FOR SELECT USING (
    owner_id IN (
      SELECT id FROM public.owners WHERE user_id = (SELECT auth.uid())
    )
  );

-- 9. Table: public.owner_payments
DROP POLICY IF EXISTS "Owners view their own payments" ON public.owner_payments;
CREATE POLICY "Owners view their own payments" ON public.owner_payments 
  FOR SELECT USING (
    owner_id IN (
      SELECT id FROM public.owners WHERE user_id = (SELECT auth.uid())
    )
  );

-- 10. Table: public.owner_google_tokens
DROP POLICY IF EXISTS "Owners can view their own google tokens" ON public.owner_google_tokens;
CREATE POLICY "Owners can view their own google tokens" ON public.owner_google_tokens 
  FOR SELECT USING (
    owner_id IN (
      SELECT id FROM public.owners WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Owners can insert their own google tokens" ON public.owner_google_tokens;
CREATE POLICY "Owners can insert their own google tokens" ON public.owner_google_tokens 
  FOR INSERT WITH CHECK (
    owner_id IN (
      SELECT id FROM public.owners WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Owners can update their own google tokens" ON public.owner_google_tokens;
CREATE POLICY "Owners can update their own google tokens" ON public.owner_google_tokens 
  FOR UPDATE USING (
    owner_id IN (
      SELECT id FROM public.owners WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Owners can delete their own google tokens" ON public.owner_google_tokens;
CREATE POLICY "Owners can delete their own google tokens" ON public.owner_google_tokens 
  FOR DELETE USING (
    owner_id IN (
      SELECT id FROM public.owners WHERE user_id = (SELECT auth.uid())
    )
  );

-- 11. Table: public.employees
DROP POLICY IF EXISTS "Owners can view their own employees" ON public.employees;
CREATE POLICY "Owners can view their own employees" ON public.employees 
  FOR SELECT USING (
    owner_id IN (
      SELECT id FROM public.owners WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Owners can insert their own employees" ON public.employees;
CREATE POLICY "Owners can insert their own employees" ON public.employees 
  FOR INSERT WITH CHECK (
    owner_id IN (
      SELECT id FROM public.owners WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Owners can update their own employees" ON public.employees;
CREATE POLICY "Owners can update their own employees" ON public.employees 
  FOR UPDATE USING (
    owner_id IN (
      SELECT id FROM public.owners WHERE user_id = (SELECT auth.uid())
    )
  );

-- 12. Table: public.employee_attendance
DROP POLICY IF EXISTS "Owners can view their employees attendance" ON public.employee_attendance;
CREATE POLICY "Owners can view their employees attendance" ON public.employee_attendance 
  FOR SELECT USING (
    employee_id IN (
      SELECT e.id FROM public.employees e 
      WHERE e.owner_id IN (
        SELECT o.id FROM public.owners o WHERE o.user_id = (SELECT auth.uid())
      )
    )
  );


-- --------------------------------------------------------------------------------------
-- PART 3: OPTIMIZED get_owner_dashboard_data RPC (EXPLICIT COLUMNS + PAGINATION/LIMITS)
-- --------------------------------------------------------------------------------------

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

  -- 1. Properties: Explicit column projection
  IF p_is_superadmin THEN
    SELECT json_agg(json_build_object(
      'id', p.id,
      'name', p.name,
      'title', p.title,
      'city', p.city,
      'type', p.type,
      'images', p.images,
      'cover_image', p.cover_image,
      'price_per_night', p.price_per_night,
      'owner_id', p.owner_id,
      'slug', p.slug,
      'created_at', p.created_at
    )) INTO v_properties 
    FROM public.properties p 
    LIMIT 100;
  ELSE
    SELECT json_agg(json_build_object(
      'id', p.id,
      'name', p.name,
      'title', p.title,
      'city', p.city,
      'type', p.type,
      'images', p.images,
      'cover_image', p.cover_image,
      'price_per_night', p.price_per_night,
      'owner_id', p.owner_id,
      'slug', p.slug,
      'created_at', p.created_at
    )) INTO v_properties 
    FROM public.properties p 
    WHERE p.owner_id = p_owner_id;
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

  -- 3. Guest Check-ins: Explicit projection (with joined property name)
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
