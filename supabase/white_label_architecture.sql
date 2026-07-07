-- 1. Create Organizations Table for White-Labeling
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- Used for the URL /client/{slug}
  api_key UUID UNIQUE DEFAULT uuid_generate_v4(),
  logo_url TEXT,
  primary_color TEXT DEFAULT '#2563EB', -- Default blue
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add organization_id to properties
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

-- 3. Add organization_id to guest_checkins (optional, but good for direct querying)
ALTER TABLE public.guest_checkins
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

-- 4. Set up an initial default organization for FixyStays to maintain backwards compatibility
INSERT INTO public.organizations (name, slug, primary_color) 
VALUES ('FixyStays', 'fixystays', '#FF5A5F')
ON CONFLICT (slug) DO NOTHING;

-- Map all existing properties to the FixyStays organization by default
UPDATE public.properties 
SET organization_id = (SELECT id FROM public.organizations WHERE slug = 'fixystays' LIMIT 1)
WHERE organization_id IS NULL;

-- Also update existing checkins
UPDATE public.guest_checkins 
SET organization_id = (SELECT id FROM public.organizations WHERE slug = 'fixystays' LIMIT 1)
WHERE organization_id IS NULL;

-- 5. RLS Policies
-- Enable RLS on organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Organizations can be read by anyone (needed for the public white-label form)
DROP POLICY IF EXISTS "Organizations are viewable by everyone" ON public.organizations;
CREATE POLICY "Organizations are viewable by everyone" 
ON public.organizations FOR SELECT 
USING (true);

-- (In a real production environment with full RLS, we would add policies limiting UPDATE/DELETE to organization admins)
