-- ==============================================================================
-- MIGRATION: 20261022000000_pay_first_subscriptions_phase1.sql
-- DESCRIPTION: Phase 1 Additive Schema for Pay-First Onboarding & Per-Property Subscriptions
-- SAFETY: All operations are strictly additive. Never drops existing tables or columns.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. OWNERS TABLE UPDATES & SAFE DUPLICATE CHECK / CONSTRAINTS
-- ------------------------------------------------------------------------------

-- Phone column is NULLABLE in this phase (existing owners have none; backfilled later)
-- Reconciles with supabase/migrations/20261014000000_add_phone_to_owners.sql safely.
ALTER TABLE public.owners ADD COLUMN IF NOT EXISTS phone TEXT;
CREATE INDEX IF NOT EXISTS idx_owners_phone ON public.owners(phone);
COMMENT ON COLUMN public.owners.phone IS 'Owner contact and WhatsApp number (E.164 format, e.g. +91XXXXXXXXXX)';

-- PRE-FLIGHT DUPLICATE CHECK:
-- Fails fast with clear error message if any duplicate user_id or lower(email) exists.
-- Does NOT delete any records to prevent cascading loss of leads, check-ins, or employees.
DO $$
DECLARE
  v_dup_users TEXT;
  v_dup_emails TEXT;
BEGIN
  SELECT string_agg(user_id::text || ' (' || cnt || ' occurrences)', ', ')
  INTO v_dup_users
  FROM (
    SELECT user_id, COUNT(*) AS cnt
    FROM public.owners
    WHERE user_id IS NOT NULL
    GROUP BY user_id
    HAVING COUNT(*) > 1
  ) s;

  IF v_dup_users IS NOT NULL THEN
    RAISE EXCEPTION 'Migration aborted: Duplicate user_id found in public.owners: %. Please deduplicate manually before applying this migration.', v_dup_users;
  END IF;

  SELECT string_agg(lemail || ' (' || cnt || ' occurrences)', ', ')
  INTO v_dup_emails
  FROM (
    SELECT lower(email) AS lemail, COUNT(*) AS cnt
    FROM public.owners
    WHERE email IS NOT NULL
    GROUP BY lower(email)
    HAVING COUNT(*) > 1
  ) s;

  IF v_dup_emails IS NOT NULL THEN
    RAISE EXCEPTION 'Migration aborted: Duplicate lower(email) found in public.owners: %. Please deduplicate manually before applying this migration.', v_dup_emails;
  END IF;
END $$;

-- Plain UNIQUE constraint on user_id so ON CONFLICT (user_id) upserts work seamlessly
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_owners_user_id'
  ) THEN
    ALTER TABLE public.owners ADD CONSTRAINT uq_owners_user_id UNIQUE (user_id);
  END IF;
END $$;

-- Case-insensitive unique index for email
CREATE UNIQUE INDEX IF NOT EXISTS idx_owners_lower_email ON public.owners(lower(email)) WHERE email IS NOT NULL;


-- ------------------------------------------------------------------------------
-- 2. PROPERTIES TABLE UPDATES, APPROVAL STATUS & TWO-WAY TRIGGER
-- ------------------------------------------------------------------------------

-- Add room_count, approval metadata, and approval_status
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS room_count INTEGER;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'draft';
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Enforce constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_properties_room_count'
  ) THEN
    ALTER TABLE public.properties ADD CONSTRAINT chk_properties_room_count CHECK (room_count IS NULL OR room_count >= 1);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_properties_approval_status'
  ) THEN
    ALTER TABLE public.properties ADD CONSTRAINT chk_properties_approval_status 
    CHECK (approval_status IN ('draft', 'pending', 'approved', 'rejected'));
  END IF;
END $$;

-- Two-way bidirectional trigger: keeps approved and approval_status synchronized.
-- If legacy code writes `approved = true`, approval_status becomes 'approved'.
-- If new code writes `approval_status`, approved is mirrored accordingly.
CREATE OR REPLACE FUNCTION public.sync_property_approved_bidirectional()
RETURNS TRIGGER AS $$
BEGIN
  -- CASE 1: approval_status is being explicitly updated or set on insert
  IF (TG_OP = 'UPDATE' AND NEW.approval_status IS DISTINCT FROM OLD.approval_status)
     OR (TG_OP = 'INSERT' AND NEW.approval_status IS NOT NULL AND NEW.approval_status <> 'draft') THEN
    NEW.approved := (NEW.approval_status = 'approved');
    IF NEW.approval_status = 'approved' AND NEW.approved_at IS NULL THEN
      NEW.approved_at := NOW();
    END IF;

  -- CASE 2: approved was updated by legacy code
  ELSIF (TG_OP = 'UPDATE' AND NEW.approved IS DISTINCT FROM OLD.approved)
        OR (TG_OP = 'INSERT' AND NEW.approved IS NOT NULL) THEN
    IF NEW.approved = true AND (NEW.approval_status IS DISTINCT FROM 'approved') THEN
      NEW.approval_status := 'approved';
      NEW.approved_at := COALESCE(NEW.approved_at, NOW());
    ELSIF NEW.approved = false AND NEW.approval_status = 'approved' THEN
      NEW.approval_status := 'pending';
    END IF;

  -- CASE 3: Standard INSERT fallback
  ELSIF TG_OP = 'INSERT' THEN
    IF NEW.approved = true THEN
      NEW.approval_status := 'approved';
      NEW.approved_at := COALESCE(NEW.approved_at, NOW());
    ELSE
      NEW.approved := (NEW.approval_status = 'approved');
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_property_approved ON public.properties;
CREATE TRIGGER trg_sync_property_approved
BEFORE INSERT OR UPDATE OF approved, approval_status ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.sync_property_approved_bidirectional();

-- Backfill room_count from property_rooms count where > 0
UPDATE public.properties p
SET room_count = pr.cnt
FROM (
  SELECT property_id, COUNT(*) AS cnt
  FROM public.property_rooms
  GROUP BY property_id
  HAVING COUNT(*) > 0
) pr
WHERE p.id = pr.property_id
  AND p.room_count IS NULL;

-- Backfill approval_status:
-- 1. approved=true -> 'approved' (applies to all, including Guest Hub properties)
UPDATE public.properties
SET approval_status = 'approved',
    approved_at = COALESCE(approved_at, created_at, NOW())
WHERE approved = true;

-- 2. approved=false and owner has active subscription -> 'pending'
-- Standalone Guest Hub properties are explicitly preserved and not flipped to pending
UPDATE public.properties p
SET approval_status = 'pending',
    submitted_at = COALESCE(p.submitted_at, p.created_at, NOW())
WHERE (p.approved = false OR p.approved IS NULL)
  AND COALESCE(p.is_guest_hub_only, false) = false
  AND NOT EXISTS (
    SELECT 1 FROM public.guest_hub_settings ghs WHERE ghs.property_id = p.id
  )
  AND EXISTS (
    SELECT 1 FROM public.owner_subscriptions os
    WHERE os.owner_id = p.owner_id
      AND os.status = 'active'
      AND os.end_date > NOW()
  );

-- 3. Otherwise -> 'draft'
-- Standalone Guest Hub properties are preserved consistent with their approved flag
UPDATE public.properties
SET approval_status = 'draft'
WHERE approved = false 
  AND approval_status NOT IN ('approved', 'pending')
  AND COALESCE(is_guest_hub_only, false) = false
  AND NOT EXISTS (
    SELECT 1 FROM public.guest_hub_settings ghs WHERE ghs.property_id = properties.id
  );


-- ------------------------------------------------------------------------------
-- 3. PRICING TIERS TABLE, SEED ROWS & MONTHLY FEE FUNCTION
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.pricing_tiers (
  id SERIAL PRIMARY KEY,
  min_rooms INTEGER NOT NULL,
  max_rooms INTEGER NOT NULL,
  monthly_fee_inr NUMERIC NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_pricing_rooms CHECK (min_rooms > 0 AND max_rooms >= min_rooms)
);

-- Seed pricing tiers (prices are INCLUSIVE of GST; 100 rooms maximum for self-serve)
INSERT INTO public.pricing_tiers (min_rooms, max_rooms, monthly_fee_inr, active)
SELECT * FROM (VALUES
  (1, 6, 100::NUMERIC, true),
  (7, 12, 150::NUMERIC, true),
  (13, 20, 250::NUMERIC, true),
  (21, 30, 350::NUMERIC, true),
  (31, 50, 500::NUMERIC, true),
  (51, 75, 750::NUMERIC, true),
  (76, 100, 1000::NUMERIC, true)
) AS v(min_rooms, max_rooms, monthly_fee_inr, active)
WHERE NOT EXISTS (SELECT 1 FROM public.pricing_tiers LIMIT 1);

-- Function: monthly_fee_for(rooms int)
CREATE OR REPLACE FUNCTION public.monthly_fee_for(p_rooms INTEGER)
RETURNS NUMERIC AS $$
DECLARE
  v_fee NUMERIC;
BEGIN
  IF p_rooms IS NULL OR p_rooms < 1 THEN
    RETURN NULL;
  END IF;

  SELECT monthly_fee_inr INTO v_fee
  FROM public.pricing_tiers
  WHERE active = true
    AND p_rooms >= min_rooms
    AND p_rooms <= max_rooms
  ORDER BY min_rooms ASC
  LIMIT 1;

  RETURN v_fee; -- Returns NULL if rooms > 100 (contact us / admin manual)
END;
$$ LANGUAGE plpgsql STABLE;

-- RLS: Read-only for authenticated and anon users; writes restricted to service_role
ALTER TABLE public.pricing_tiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public and authenticated can read active pricing tiers" ON public.pricing_tiers;
CREATE POLICY "Public and authenticated can read active pricing tiers"
ON public.pricing_tiers FOR SELECT
USING (active = true);


-- ------------------------------------------------------------------------------
-- 4. OWNER PAYMENTS TABLE ADDITIONS
-- ------------------------------------------------------------------------------

ALTER TABLE public.owner_payments ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL;
ALTER TABLE public.owner_payments ADD COLUMN IF NOT EXISTS months INTEGER;
ALTER TABLE public.owner_payments ADD COLUMN IF NOT EXISTS room_count INTEGER;
ALTER TABLE public.owner_payments ADD COLUMN IF NOT EXISTS monthly_fee NUMERIC;
ALTER TABLE public.owner_payments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'paid';
ALTER TABLE public.owner_payments ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT;
ALTER TABLE public.owner_payments ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;
ALTER TABLE public.owner_payments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Relax legacy NOT NULL columns so per-property records never fail
DO $$
BEGIN
  ALTER TABLE public.owner_payments ALTER COLUMN email DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.owner_payments ALTER COLUMN plan_name DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Drop legacy constraint variations cleanly
ALTER TABLE public.owner_payments DROP CONSTRAINT IF EXISTS chk_owner_payments_status;
ALTER TABLE public.owner_payments DROP CONSTRAINT IF EXISTS owner_payments_status_check;

-- Add unified check constraint allowing all valid workflow statuses
ALTER TABLE public.owner_payments ADD CONSTRAINT chk_owner_payments_status 
CHECK (status IN ('pending', 'created', 'paid', 'failed', 'refunded'));

-- Backfill existing rows: status = 'paid'
UPDATE public.owner_payments SET status = 'paid' WHERE status IS NULL;

-- Unique partial indexes for Razorpay IDs
CREATE UNIQUE INDEX IF NOT EXISTS idx_owner_payments_razorpay_order_id 
ON public.owner_payments(razorpay_order_id) 
WHERE razorpay_order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_owner_payments_razorpay_payment_id 
ON public.owner_payments(razorpay_payment_id) 
WHERE razorpay_payment_id IS NOT NULL;


-- ------------------------------------------------------------------------------
-- 5. PROPERTY SUBSCRIPTIONS TABLE (PER-PROPERTY ACCESS ENGINE)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.property_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.owners(id) ON DELETE CASCADE,
  plan_name TEXT,
  room_count INTEGER NOT NULL DEFAULT 1 CHECK (room_count >= 1),
  monthly_fee NUMERIC NOT NULL DEFAULT 0,
  months INTEGER NOT NULL DEFAULT 1 CHECK (months >= 1),
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  source TEXT NOT NULL DEFAULT 'razorpay' CHECK (source IN ('razorpay', 'admin_manual', 'migrated')),
  payment_id UUID REFERENCES public.owner_payments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_property_subscriptions_property_id UNIQUE (property_id)
);

-- RLS on property_subscriptions (Strictly using (SELECT auth.uid()) & app_metadata role)
ALTER TABLE public.property_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners view their own property subscriptions" ON public.property_subscriptions;
CREATE POLICY "Owners view their own property subscriptions"
ON public.property_subscriptions FOR SELECT TO authenticated
USING (
  owner_id IN (SELECT id FROM public.owners WHERE user_id = (SELECT auth.uid()))
);

DROP POLICY IF EXISTS "Admins manage all property subscriptions" ON public.property_subscriptions;
CREATE POLICY "Admins manage all property subscriptions"
ON public.property_subscriptions FOR ALL TO authenticated
USING (
  ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin')
);

-- Backfill: every owner whose subscription end_date > now() gets one row per owner property
INSERT INTO public.property_subscriptions (
  property_id,
  owner_id,
  plan_name,
  room_count,
  monthly_fee,
  months,
  start_date,
  end_date,
  status,
  source,
  created_at,
  updated_at
)
SELECT
  p.id AS property_id,
  p.owner_id AS owner_id,
  COALESCE(os.plan_name, 'Migrated Plan') AS plan_name,
  COALESCE(p.room_count, 1) AS room_count,
  COALESCE(public.monthly_fee_for(COALESCE(p.room_count, 1)), 100) AS monthly_fee,
  1 AS months,
  COALESCE(os.start_date, NOW()) AS start_date,
  os.end_date,
  'active' AS status,
  'migrated' AS source,
  NOW(),
  NOW()
FROM public.properties p
JOIN public.owner_subscriptions os ON os.owner_id = p.owner_id
WHERE os.end_date > NOW()
  AND os.status = 'active'
ON CONFLICT (property_id) DO UPDATE SET
  end_date = EXCLUDED.end_date,
  status = 'active',
  source = 'migrated',
  updated_at = NOW();

-- Flip stale active-but-expired rows to 'expired'
UPDATE public.owner_subscriptions
SET status = 'expired'
WHERE status = 'active' AND end_date <= NOW();

UPDATE public.property_subscriptions
SET status = 'expired', updated_at = NOW()
WHERE status = 'active' AND end_date <= NOW();


-- ------------------------------------------------------------------------------
-- 6. SUBSCRIPTION REMINDER LOGS FK RELAXATION & PROPERTY LINK
-- ------------------------------------------------------------------------------

-- Relax subscription_id so property-based reminders can insert without owner_subscriptions FK requirement
ALTER TABLE public.subscription_reminder_logs ALTER COLUMN subscription_id DROP NOT NULL;

-- Add property_subscription_id FK
ALTER TABLE public.subscription_reminder_logs 
ADD COLUMN IF NOT EXISTS property_subscription_id UUID REFERENCES public.property_subscriptions(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_sub_reminder_logs_prop_sub_id 
ON public.subscription_reminder_logs(property_subscription_id, reminder_type, sent_at);

-- RLS updates for reminder logs using (SELECT auth.uid()) & app_metadata
DROP POLICY IF EXISTS "Owners view their own reminder logs" ON public.subscription_reminder_logs;
CREATE POLICY "Owners view their own reminder logs"
ON public.subscription_reminder_logs FOR SELECT TO authenticated
USING (
  owner_id IN (SELECT id FROM public.owners WHERE user_id = (SELECT auth.uid()))
);

DROP POLICY IF EXISTS "Admins manage reminder logs" ON public.subscription_reminder_logs;
CREATE POLICY "Admins manage reminder logs"
ON public.subscription_reminder_logs FOR ALL TO authenticated
USING (
  ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin')
);


-- ------------------------------------------------------------------------------
-- 7. ATOMIC SECURITY DEFINER FUNCTION: activate_property_payment
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.activate_property_payment(
  p_order_id TEXT,
  p_payment_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment RECORD;
  v_current_sub RECORD;
  v_base_date TIMESTAMPTZ;
  v_new_end_date TIMESTAMPTZ;
  v_property RECORD;
  v_effective_rooms INTEGER;
  v_monthly_fee NUMERIC;
BEGIN
  -- 1. Lock payment row to prevent race conditions between webhook & client callback
  SELECT * INTO v_payment
  FROM public.owner_payments
  WHERE razorpay_order_id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Fallback lookup by payment_ref for legacy orders
    SELECT * INTO v_payment
    FROM public.owner_payments
    WHERE payment_ref = p_order_id
    FOR UPDATE;
  END IF;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Payment record not found for order_id: ' || p_order_id
    );
  END IF;

  -- 2. Refuse if payment was refunded
  IF v_payment.status = 'refunded' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Payment has been marked as refunded; cannot activate subscription for order_id: ' || p_order_id
    );
  END IF;

  -- 3. Idempotency: if already marked 'paid', return success immediately
  IF v_payment.status = 'paid' THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_processed', true,
      'payment_id', v_payment.id,
      'property_id', v_payment.property_id
    );
  END IF;

  -- 4. Mark payment row as 'paid' (allows transition from 'created' or 'failed')
  UPDATE public.owner_payments
  SET status = 'paid',
      razorpay_payment_id = COALESCE(p_payment_id, razorpay_payment_id),
      updated_at = NOW()
  WHERE id = v_payment.id;

  -- If payment had no property linked, cannot create property subscription
  IF v_payment.property_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'warning', 'Payment marked as paid, but no property_id was associated with the payment record.'
    );
  END IF;

  -- 5. Lock property_subscriptions row if it exists
  SELECT * INTO v_current_sub
  FROM public.property_subscriptions
  WHERE property_id = v_payment.property_id
  FOR UPDATE;

  IF FOUND AND v_current_sub.end_date > NOW() THEN
    v_base_date := v_current_sub.end_date;
  ELSE
    v_base_date := NOW();
  END IF;

  v_new_end_date := v_base_date + (COALESCE(v_payment.months, 1) || ' months')::INTERVAL;
  v_effective_rooms := COALESCE(v_payment.room_count, v_current_sub.room_count, 1);
  v_monthly_fee := COALESCE(v_payment.monthly_fee, public.monthly_fee_for(v_effective_rooms), 100);

  -- 6. Upsert property_subscriptions
  INSERT INTO public.property_subscriptions (
    property_id,
    owner_id,
    plan_name,
    room_count,
    monthly_fee,
    months,
    start_date,
    end_date,
    status,
    source,
    payment_id,
    created_at,
    updated_at
  )
  VALUES (
    v_payment.property_id,
    v_payment.owner_id,
    COALESCE(v_payment.months, 1) || ' Months Plan',
    v_effective_rooms,
    v_monthly_fee,
    COALESCE(v_payment.months, 1),
    NOW(),
    v_new_end_date,
    'active',
    'razorpay',
    v_payment.id,
    NOW(),
    NOW()
  )
  ON CONFLICT (property_id) DO UPDATE SET
    end_date = v_new_end_date,
    status = 'active',
    room_count = EXCLUDED.room_count,
    monthly_fee = EXCLUDED.monthly_fee,
    months = EXCLUDED.months,
    payment_id = EXCLUDED.payment_id,
    updated_at = NOW();

  -- 7. Transition property approval state:
  -- If draft -> set pending and record submitted_at.
  -- If already approved or pending (renewal) -> leave approval state untouched!
  SELECT * INTO v_property
  FROM public.properties
  WHERE id = v_payment.property_id;

  IF FOUND THEN
    IF v_property.approval_status = 'draft' OR v_property.approval_status IS NULL THEN
      UPDATE public.properties
      SET approval_status = 'pending',
          submitted_at = NOW(),
          room_count = COALESCE(v_property.room_count, v_effective_rooms)
      WHERE id = v_property.id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'property_id', v_payment.property_id,
    'new_end_date', v_new_end_date,
    'status', 'active'
  );
END;
$$;

-- Security: Service role only
REVOKE EXECUTE ON FUNCTION public.activate_property_payment(TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.activate_property_payment(TEXT, TEXT) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.activate_property_payment(TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.activate_property_payment(TEXT, TEXT) TO service_role;


-- ------------------------------------------------------------------------------
-- 8. NIGHTLY CRON: MARK EXPIRED SUBSCRIPTIONS ONLY (NO DELETES)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.cron_daily_subscription_and_draft_cleanup()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expired_count INTEGER := 0;
BEGIN
  -- Mark past-end_date subscriptions as expired
  WITH expired_rows AS (
    UPDATE public.property_subscriptions
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'active' AND end_date <= NOW()
    RETURNING id
  )
  SELECT count(*) INTO v_expired_count FROM expired_rows;

  -- Keep legacy table updated in parallel during rollout
  UPDATE public.owner_subscriptions
  SET status = 'expired'
  WHERE status = 'active' AND end_date <= NOW();

  RETURN jsonb_build_object(
    'success', true,
    'expired_subscriptions_marked', v_expired_count,
    'timestamp', NOW()
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cron_daily_subscription_and_draft_cleanup() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cron_daily_subscription_and_draft_cleanup() TO service_role;


-- ------------------------------------------------------------------------------
-- 9. READ-ONLY VIEW: CANDIDATE ABANDONED DRAFT PROPERTIES
-- ------------------------------------------------------------------------------
-- Lists draft properties eligible for review.
-- Excludes Standalone Guest Hub properties, properties with guest_hub_settings,
-- properties with any payments, and properties with any leads, checkins, or bookings.
CREATE OR REPLACE VIEW public.view_candidate_abandoned_drafts AS
SELECT 
  p.id AS property_id,
  p.name AS property_name,
  p.owner_id,
  o.name AS owner_name,
  o.email AS owner_email,
  o.phone AS owner_phone,
  p.created_at,
  p.approval_status,
  p.room_count
FROM public.properties p
LEFT JOIN public.owners o ON o.id = p.owner_id
WHERE p.approval_status = 'draft'
  -- CUTOVER TIMESTAMP: Adjust timestamp as desired
  AND p.created_at >= '2026-10-01 00:00:00+00'::TIMESTAMPTZ
  -- Exclude Standalone Guest Hub
  AND COALESCE(p.is_guest_hub_only, false) = false
  -- Exclude properties with guest_hub_settings row
  AND NOT EXISTS (
    SELECT 1 FROM public.guest_hub_settings ghs WHERE ghs.property_id = p.id
  )
  -- Exclude properties with any payments
  AND NOT EXISTS (
    SELECT 1 FROM public.owner_payments op WHERE op.property_id = p.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.property_payments pp WHERE pp.property_id = p.id
  )
  -- Exclude properties with leads
  AND NOT EXISTS (
    SELECT 1 FROM public.leads l WHERE l.property_id = p.id
  )
  -- Exclude properties with check-ins
  AND NOT EXISTS (
    SELECT 1 FROM public.guest_checkins c WHERE c.property_id = p.id
  )
  -- Exclude properties with bookings
  AND NOT EXISTS (
    SELECT 1 FROM public.bookings b WHERE b.property_id = p.id
  );
