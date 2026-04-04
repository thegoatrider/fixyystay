-- Table for capturing new property owner leads
CREATE TABLE IF NOT EXISTS public.property_owner_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    city TEXT NOT NULL,
    area TEXT NOT NULL,
    google_link TEXT NOT NULL,
    status TEXT DEFAULT 'pending' -- 'pending', 'contacted', 'archived'
);

-- Enable RLS
ALTER TABLE public.property_owner_leads ENABLE ROW LEVEL SECURITY;

-- Allow public to insert leads (since it's a contact form)
CREATE POLICY "Allow public insert to property_owner_leads" 
ON public.property_owner_leads FOR INSERT TO public
WITH CHECK (true);

-- Allow admins (superadmin@fixstay.com) to read and manage leads
-- Note: Replace with your actual admin-checking logic if different
CREATE POLICY "Allow admin to manage property_owner_leads" 
ON public.property_owner_leads FOR ALL TO authenticated
USING (auth.jwt() ->> 'email' = 'superadmin@fixstay.com');
