-- Enable uuid extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Owners Table
CREATE TABLE IF NOT EXISTS public.owners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id), -- Map to Supabase Auth
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Properties Table
CREATE TABLE IF NOT EXISTS public.properties (
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
CREATE TABLE IF NOT EXISTS public.rooms (
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
CREATE TABLE IF NOT EXISTS public.room_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  price NUMERIC NOT NULL,
  UNIQUE(room_id, date)
);

-- 5. Room Availability Table
CREATE TABLE IF NOT EXISTS public.room_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  available BOOLEAN DEFAULT TRUE,
  UNIQUE(room_id, date)
);

-- 6. Influencers Table
CREATE TABLE IF NOT EXISTS public.influencers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Influencer Properties (Assignment by Admin)
CREATE TABLE IF NOT EXISTS public.influencer_properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  influencer_id UUID REFERENCES public.influencers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(property_id, influencer_id)
);

-- 8. Influencer Clicks
CREATE TABLE IF NOT EXISTS public.influencer_clicks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  influencer_id UUID REFERENCES public.influencers(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Bookings Table
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  influencer_id UUID REFERENCES public.influencers(id) ON DELETE SET NULL,
  guest_name TEXT NOT NULL,
  guest_email TEXT,
  guest_phone TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  checkin_date DATE,
  checkout_date DATE,
  num_guests INTEGER DEFAULT 1,
  num_rooms INTEGER DEFAULT 1,
  room_details JSONB DEFAULT '[]'::jsonb,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  status TEXT DEFAULT 'confirmed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Leads Table
CREATE TABLE IF NOT EXISTS public.leads (
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
CREATE TABLE IF NOT EXISTS public.guest_checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES public.owners(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  guest_phone TEXT NOT NULL,
  guest_name TEXT NOT NULL,
  num_people INTEGER NOT NULL,
  checkin_date DATE,
  checkout_date DATE,
  vehicle_number TEXT,
  uid TEXT,
  status TEXT DEFAULT 'completed',
  id_documents JSONB DEFAULT '[]'::jsonb,
  form_c_details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

-- 1. Owners
ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own profile" ON public.owners
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Owners can update own profile" ON public.owners
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Owners can insert own profile" ON public.owners
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 2. Properties
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view approved properties" ON public.properties
  FOR SELECT USING (approved = true);

CREATE POLICY "Owners can view all their properties" ON public.properties
  FOR SELECT USING (owner_id IN (SELECT id FROM public.owners WHERE user_id = auth.uid()));

CREATE POLICY "Owners can insert their properties" ON public.properties
  FOR INSERT WITH CHECK (owner_id IN (SELECT id FROM public.owners WHERE user_id = auth.uid()));

CREATE POLICY "Owners can update their properties" ON public.properties
  FOR UPDATE USING (owner_id IN (SELECT id FROM public.owners WHERE user_id = auth.uid()));

CREATE POLICY "Owners can delete their properties" ON public.properties
  FOR DELETE USING (owner_id IN (SELECT id FROM public.owners WHERE user_id = auth.uid()));

-- 3. Rooms
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view rooms of approved properties" ON public.rooms
  FOR SELECT USING (property_id IN (SELECT id FROM public.properties WHERE approved = true));

CREATE POLICY "Owners can view rooms of their properties" ON public.rooms
  FOR SELECT USING (property_id IN (SELECT id FROM public.properties WHERE owner_id IN (SELECT id FROM public.owners WHERE user_id = auth.uid())));

CREATE POLICY "Owners can insert rooms for their properties" ON public.rooms
  FOR INSERT WITH CHECK (property_id IN (SELECT id FROM public.properties WHERE owner_id IN (SELECT id FROM public.owners WHERE user_id = auth.uid())));

CREATE POLICY "Owners can update rooms of their properties" ON public.rooms
  FOR UPDATE USING (property_id IN (SELECT id FROM public.properties WHERE owner_id IN (SELECT id FROM public.owners WHERE user_id = auth.uid())));

CREATE POLICY "Owners can delete rooms of their properties" ON public.rooms
  FOR DELETE USING (property_id IN (SELECT id FROM public.properties WHERE owner_id IN (SELECT id FROM public.owners WHERE user_id = auth.uid())));

-- 4. Room Rates
ALTER TABLE public.room_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view rates of approved property rooms" ON public.room_rates
  FOR SELECT USING (room_id IN (SELECT r.id FROM public.rooms r JOIN public.properties p ON r.property_id = p.id WHERE p.approved = true));

CREATE POLICY "Owners can manage rates for their rooms" ON public.room_rates
  FOR ALL USING (room_id IN (SELECT r.id FROM public.rooms r JOIN public.properties p ON r.property_id = p.id WHERE p.owner_id IN (SELECT id FROM public.owners WHERE user_id = auth.uid())));

-- 5. Room Availability
ALTER TABLE public.room_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view availability of approved property rooms" ON public.room_availability
  FOR SELECT USING (room_id IN (SELECT r.id FROM public.rooms r JOIN public.properties p ON r.property_id = p.id WHERE p.approved = true));

CREATE POLICY "Owners can manage availability for their rooms" ON public.room_availability
  FOR ALL USING (room_id IN (SELECT r.id FROM public.rooms r JOIN public.properties p ON r.property_id = p.id WHERE p.owner_id IN (SELECT id FROM public.owners WHERE user_id = auth.uid())));

-- 6. Influencers
ALTER TABLE public.influencers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Influencers can view own profile" ON public.influencers
  FOR SELECT USING (user_id = auth.uid() OR email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Influencers can update own profile" ON public.influencers
  FOR UPDATE USING (user_id = auth.uid() OR email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- 7. Influencer Properties
ALTER TABLE public.influencer_properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Influencers can view assigned properties" ON public.influencer_properties
  FOR SELECT USING (influencer_id IN (SELECT id FROM public.influencers WHERE user_id = auth.uid() OR email = (SELECT email FROM auth.users WHERE id = auth.uid())));

-- 8. Influencer Clicks
ALTER TABLE public.influencer_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log influencer clicks" ON public.influencer_clicks
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Influencers can view own clicks" ON public.influencer_clicks
  FOR SELECT USING (influencer_id IN (SELECT id FROM public.influencers WHERE user_id = auth.uid() OR email = (SELECT email FROM auth.users WHERE id = auth.uid())));

-- 9. Bookings
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can create pending bookings" ON public.bookings
  FOR INSERT WITH CHECK (
    payment_status = 'pending' AND 
    (user_id = auth.uid() OR user_id IS NULL)
  );

CREATE POLICY "Guests can view own bookings" ON public.bookings
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Guests can update own pending bookings" ON public.bookings
  FOR UPDATE 
  USING (user_id = auth.uid() AND payment_status = 'pending')
  WITH CHECK (
    user_id = auth.uid() AND 
    payment_status = 'pending'
  );

CREATE POLICY "Owners can view bookings for their properties" ON public.bookings
  FOR SELECT USING (property_id IN (SELECT id FROM public.properties WHERE owner_id IN (SELECT id FROM public.owners WHERE user_id = auth.uid())));

CREATE POLICY "Influencers can view bookings referred by them" ON public.bookings
  FOR SELECT USING (influencer_id IN (SELECT id FROM public.influencers WHERE user_id = auth.uid() OR email = (SELECT email FROM auth.users WHERE id = auth.uid())));

-- 10. Leads
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit leads" ON public.leads
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Owners can view and manage leads for their properties" ON public.leads
  FOR ALL USING (owner_id IN (SELECT id FROM public.owners WHERE user_id = auth.uid()));

-- 11. Guest Check-ins
ALTER TABLE public.guest_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit guest checkins" ON public.guest_checkins
  FOR INSERT WITH CHECK (
    (user_id = auth.uid() OR user_id IS NULL) AND
    (booking_id IS NULL OR booking_id IN (SELECT id FROM public.bookings WHERE user_id = auth.uid()))
  );

CREATE POLICY "Guests can view own checkins" ON public.guest_checkins
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Owners can view checkins for their properties" ON public.guest_checkins
  FOR SELECT USING (owner_id IN (SELECT id FROM public.owners WHERE user_id = auth.uid()));
