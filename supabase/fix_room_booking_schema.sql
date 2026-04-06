-- 🛠️ FIX: Multi-Room Booking & Pricing Schema
-- 📥 RUN THIS IN YOUR SUPABASE SQL EDITOR

-- 1. Enhance Rooms Table with Capacity and Pricing
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='rooms' AND column_name='base_capacity') THEN
    ALTER TABLE public.rooms ADD COLUMN base_capacity INTEGER DEFAULT 2;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='rooms' AND column_name='max_capacity') THEN
    ALTER TABLE public.rooms ADD COLUMN max_capacity INTEGER DEFAULT 4;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='rooms' AND column_name='extra_guest_price') THEN
    ALTER TABLE public.rooms ADD COLUMN extra_guest_price NUMERIC DEFAULT 500;
  END IF;
END $$;

-- 2. Enhance Bookings Table for Multi-Room Support and Analytics
-- We also add missing checkin/checkout dates to the core booking record
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='bookings' AND column_name='checkin_date') THEN
    ALTER TABLE public.bookings ADD COLUMN checkin_date DATE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='bookings' AND column_name='checkout_date') THEN
    ALTER TABLE public.bookings ADD COLUMN checkout_date DATE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='bookings' AND column_name='num_guests') THEN
    ALTER TABLE public.bookings ADD COLUMN num_guests INTEGER DEFAULT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='bookings' AND column_name='num_rooms') THEN
    ALTER TABLE public.bookings ADD COLUMN num_rooms INTEGER DEFAULT 1;
  END IF;

  -- Store detailed room selection (category_id, name, quantity) for multi-room bookings
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='bookings' AND column_name='room_details') THEN
    ALTER TABLE public.bookings ADD COLUMN room_details JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- 3. Update Existing Data (Optional/Safety)
UPDATE public.bookings 
SET num_rooms = 1 
WHERE num_rooms IS NULL;
