-- Autowala Affiliate System Migration

-- 1. Extend Influencers Table
ALTER TABLE public.influencers ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'standard';

-- 2. Create the tracking table
CREATE TABLE IF NOT EXISTS public.influencer_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    influencer_id UUID REFERENCES public.influencers(id) ON DELETE CASCADE,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    customer_name TEXT,
    customer_phone TEXT,
    status TEXT DEFAULT 'sent', -- 'sent', 'clicked', 'booked'
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    commission_earned NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and setup basic policies if needed (assuming defaults for admin/service role access are sufficient)
ALTER TABLE public.influencer_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow ALL on influencer_links for authenticated" ON public.influencer_links FOR ALL TO authenticated USING (true);
