-- Enable uuid extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Owners Table
CREATE TABLE public.owners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id), -- Map to Supabase Auth
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Properties Table
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES public.owners(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  amenities TEXT[],
  latitude NUMERIC,
  longitude NUMERIC,
  image_url TEXT,
  helpdesk_number TEXT,
  city_area TEXT, -- Rough area for guest side (e.g. Alibag, Varsoli)
  approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Rooms Table
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  base_price NUMERIC NOT NULL,
  price_bucket TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Room Rates Table
CREATE TABLE public.room_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  price NUMERIC NOT NULL,
  UNIQUE(room_id, date)
);

-- 5. Room Availability Table
CREATE TABLE public.room_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  available BOOLEAN DEFAULT TRUE,
  UNIQUE(room_id, date)
);

-- 6. Influencers Table
CREATE TABLE public.influencers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Influencer Properties (Assignment by Admin)
CREATE TABLE public.influencer_properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  influencer_id UUID REFERENCES public.influencers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(property_id, influencer_id)
);

-- 8. Influencer Clicks
CREATE TABLE public.influencer_clicks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  influencer_id UUID REFERENCES public.influencers(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Bookings Table
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  influencer_id UUID REFERENCES public.influencers(id) ON DELETE SET NULL,
  guest_name TEXT NOT NULL,
  guest_phone TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Leads Table
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES public.owners(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  checkin_date DATE,
  checkout_date DATE,
  status TEXT DEFAULT 'Enquired', -- Enquired, Clicked, Shortlisted, Booked, etc.
  marking TEXT DEFAULT 'Warm', -- Hot, Warm, Cold, Booked
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Guest Check-ins Table
CREATE TABLE public.guest_checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES public.owners(id) ON DELETE CASCADE,
  guest_phone TEXT NOT NULL,
  guest_name TEXT NOT NULL,
  num_people INTEGER NOT NULL,
  checkin_date DATE,
  checkout_date DATE,
  id_documents JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
