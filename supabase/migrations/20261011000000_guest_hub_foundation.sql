-- ============================================================================
-- GUEST HUB FOUNDATION MIGRATION (PHASES 1, 2, AND 3)
-- Supports ₹20/room/month standalone & add-on subscriptions, permanent room QRs,
-- PIN-protected stays, live department requests, staff logins, and Phase 2/3 tables.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 0. Platform-level settings (e.g. Product Name)
CREATE TABLE IF NOT EXISTS public.guest_hub_platform_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  product_name TEXT NOT NULL DEFAULT 'Guest Hub',
  price_per_room_monthly NUMERIC NOT NULL DEFAULT 20,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.guest_hub_platform_settings (id, product_name, price_per_room_monthly)
VALUES ('default', 'Guest Hub', 20)
ON CONFLICT (id) DO NOTHING;

-- 1. Extend properties table with optional standalone flag
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS is_guest_hub_only BOOLEAN DEFAULT FALSE;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS address TEXT;

-- 2. Guest Hub Settings (1:1 per Property / Hotel)
CREATE TABLE IF NOT EXISTS public.guest_hub_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL UNIQUE REFERENCES public.properties(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  hub_status TEXT NOT NULL DEFAULT 'active' CHECK (hub_status IN ('active', 'paused', 'removed')),
  country_code TEXT NOT NULL DEFAULT '91',
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  
  -- Subscription & Room Allowance (₹20 / room / month)
  subscription_status TEXT NOT NULL DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'trial', 'expired')),
  paid_rooms_limit INTEGER NOT NULL DEFAULT 0,
  subscription_start_date TIMESTAMPTZ,
  subscription_end_date TIMESTAMPTZ,
  plan_features JSONB NOT NULL DEFAULT '{"phase1": true, "phase2": false, "phase3": false}'::jsonb,

  -- Hotel Configuration JSONB blocks (matches starter() shape)
  branding JSONB NOT NULL DEFAULT '{}'::jsonb,
  departments JSONB NOT NULL DEFAULT '{}'::jsonb,
  house_info JSONB NOT NULL DEFAULT '{}'::jsonb,
  policies JSONB NOT NULL DEFAULT '[]'::jsonb,
  services JSONB NOT NULL DEFAULT '{}'::jsonb,
  menu JSONB NOT NULL DEFAULT '[]'::jsonb,
  request_items JSONB NOT NULL DEFAULT '{}'::jsonb,
  local_guide JSONB NOT NULL DEFAULT '[]'::jsonb,
  emergency_contacts JSONB NOT NULL DEFAULT '[]'::jsonb,
  bill_settings JSONB NOT NULL DEFAULT '{"gst_number": "", "gst_rate": 5, "room_bill_prefix": "RM-", "room_bill_next": 1, "table_bill_prefix": "TB-", "table_bill_next": 1}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Guest Hub Subscriptions & Payments Log (₹20 / room / month)
CREATE TABLE IF NOT EXISTS public.guest_hub_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES public.owners(id) ON DELETE SET NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  rooms_count INTEGER NOT NULL,
  months_count INTEGER NOT NULL DEFAULT 1,
  price_per_room NUMERIC NOT NULL DEFAULT 20,
  total_amount NUMERIC NOT NULL,
  razorpay_order_id TEXT UNIQUE,
  razorpay_payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Extend property_rooms with permanent QR token
ALTER TABLE public.property_rooms ADD COLUMN IF NOT EXISTS qr_token TEXT UNIQUE;
ALTER TABLE public.property_rooms ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Backfill qr_token for existing property_rooms that don't have one
UPDATE public.property_rooms
SET qr_token = encode(gen_random_bytes(9), 'hex')
WHERE qr_token IS NULL;

-- 5. Staff Users (Scoped to Property / Hotel)
CREATE TABLE IF NOT EXISTS public.hub_staff_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  login_id TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'manager', 'staff', 'kitchen')),
  departments TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(property_id, login_id)
);

-- 6. Stays (Active & Past Guest Stays per Room)
CREATE TABLE IF NOT EXISTS public.hub_stays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.property_rooms(id) ON DELETE CASCADE,
  guest_checkin_id UUID REFERENCES public.guest_checkins(id) ON DELETE SET NULL,
  guest_name TEXT NOT NULL,
  guest_phone TEXT,
  pin_code TEXT NOT NULL,
  checkin_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  access_ends_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  ended_by TEXT,
  food_ordering_allowed BOOLEAN NOT NULL DEFAULT TRUE,
  selected_offer_ids UUID[] DEFAULT ARRAY[]::UUID[],
  failed_pin_attempts INTEGER NOT NULL DEFAULT 0,
  pin_locked_until TIMESTAMPTZ,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hub_stays_room_active ON public.hub_stays(room_id, ended_at, access_ends_at);
CREATE INDEX IF NOT EXISTS idx_hub_stays_property ON public.hub_stays(property_id, checkin_at DESC);

-- 7. Requests (Service Requests & Phase 1/3 Food Orders)
CREATE TABLE IF NOT EXISTS public.hub_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  stay_id UUID NOT NULL REFERENCES public.hub_stays(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.property_rooms(id) ON DELETE CASCADE,
  room_number TEXT NOT NULL,
  guest_name TEXT NOT NULL,
  department TEXT NOT NULL,
  service TEXT NOT NULL, -- 'restaurant', 'housekeeping', 'minibar', 'spa', 'laundry', 'taxi', 'special_occasions', 'clearance', 'offer'
  items JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{ name, qty, price, category, details }]
  details JSONB NOT NULL DEFAULT '{}'::jsonb, -- structured form fields (spa, taxi, special_occasions)
  note TEXT,
  total NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'received' CHECK (
    status IN ('received', 'seen', 'accepted', 'preparing', 'on_the_way', 'delivered', 'completed', 'declined', 'cancelled')
  ),
  status_history JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{ status, at, by_id, by_name }]
  seen_at TIMESTAMPTZ,
  seen_by TEXT,
  accepted_at TIMESTAMPTZ,
  accepted_by TEXT,
  completed_at TIMESTAMPTZ,
  completed_by TEXT,
  declined_at TIMESTAMPTZ,
  declined_by TEXT,
  decline_reason TEXT,
  bill_id UUID, -- Linked in Phase 3
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hub_requests_property_created ON public.hub_requests(property_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hub_requests_stay ON public.hub_requests(stay_id, created_at DESC);

-- 8. Event Log (Audit Trail)
CREATE TABLE IF NOT EXISTS public.hub_event_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'checkin', 'checkout', 'stay_extended', 'request_created', 'request_status', 'settings_updated', 'staff_login'
  description TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  actor_role TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hub_event_logs_property ON public.hub_event_logs(property_id, created_at DESC);

-- 9. Phase 2 Tables: Messages & Offers
CREATE TABLE IF NOT EXISTS public.hub_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  stay_id UUID NOT NULL REFERENCES public.hub_stays(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.property_rooms(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('guest', 'staff')),
  sender_name TEXT NOT NULL,
  staff_id UUID REFERENCES public.hub_staff_users(id) ON DELETE SET NULL,
  text TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.hub_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  details TEXT NOT NULL,
  price NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Phase 3 Tables: Restaurant Tables, Bills & Payments
CREATE TABLE IF NOT EXISTS public.hub_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(property_id, table_name)
);

CREATE TABLE IF NOT EXISTS public.hub_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  bill_number TEXT NOT NULL,
  bill_type TEXT NOT NULL CHECK (bill_type IN ('room', 'table', 'takeaway')),
  stay_id UUID REFERENCES public.hub_stays(id) ON DELETE SET NULL,
  table_id UUID REFERENCES public.hub_tables(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_phone TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  gst_rate NUMERIC NOT NULL DEFAULT 5,
  gst_amount NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'paid', 'cancelled')),
  cancel_reason TEXT,
  cancelled_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(property_id, bill_number)
);

CREATE TABLE IF NOT EXISTS public.hub_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  bill_id UUID NOT NULL REFERENCES public.hub_bills(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('cash', 'upi', 'card')),
  amount NUMERIC NOT NULL,
  taken_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.guest_hub_platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_hub_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_hub_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hub_staff_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hub_stays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hub_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hub_event_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hub_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hub_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hub_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hub_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hub_payments ENABLE ROW LEVEL SECURITY;

-- Public read policies for Realtime subscriptions (mutations are strictly handled via Server Actions with Admin Client verification)
DROP POLICY IF EXISTS "Allow read for realtime on hub_requests" ON public.hub_requests;
CREATE POLICY "Allow read for realtime on hub_requests" ON public.hub_requests FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow read for realtime on hub_stays" ON public.hub_stays;
CREATE POLICY "Allow read for realtime on hub_stays" ON public.hub_stays FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow read for realtime on guest_hub_settings" ON public.guest_hub_settings;
CREATE POLICY "Allow read for realtime on guest_hub_settings" ON public.guest_hub_settings FOR SELECT USING (true);

-- Add tables to supabase_realtime publication if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.hub_requests;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.hub_stays;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.guest_hub_settings;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.hub_messages;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;
