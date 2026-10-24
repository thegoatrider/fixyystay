-- ==============================================================================
-- MIGRATION: 20261023220000_fix_owner_payments_constraints.sql
-- DESCRIPTION: Permanent constraint alignment for owner_payments table
-- SAFE & IDEMPOTENT: Can be applied multiple times without side effects
-- ==============================================================================

-- 1. Relax legacy NOT NULL columns so per-property payments never fail
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

-- 2. Ensure all per-property payment columns exist
ALTER TABLE public.owner_payments ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL;
ALTER TABLE public.owner_payments ADD COLUMN IF NOT EXISTS months INTEGER;
ALTER TABLE public.owner_payments ADD COLUMN IF NOT EXISTS room_count INTEGER;
ALTER TABLE public.owner_payments ADD COLUMN IF NOT EXISTS monthly_fee NUMERIC;
ALTER TABLE public.owner_payments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.owner_payments ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT;
ALTER TABLE public.owner_payments ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;
ALTER TABLE public.owner_payments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Drop legacy constraint variations cleanly
ALTER TABLE public.owner_payments DROP CONSTRAINT IF EXISTS chk_owner_payments_status;
ALTER TABLE public.owner_payments DROP CONSTRAINT IF EXISTS owner_payments_status_check;

-- 4. Add unified check constraint allowing all valid workflow statuses
ALTER TABLE public.owner_payments ADD CONSTRAINT chk_owner_payments_status 
CHECK (status IN ('pending', 'created', 'paid', 'failed', 'refunded'));

-- 5. Backfill any existing NULL status rows safely to 'paid'
UPDATE public.owner_payments SET status = 'paid' WHERE status IS NULL;

-- 6. Ensure optional helper columns exist
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT FALSE;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';
ALTER TABLE public.influencers ADD COLUMN IF NOT EXISTS instagram TEXT;

