-- SEO Tables Migration

-- 1. Locations Table
CREATE TABLE IF NOT EXISTS public.seo_locations (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  intro_text TEXT,
  popular_tags TEXT[],
  latitude NUMERIC,
  longitude NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Property Types Table
CREATE TABLE IF NOT EXISTS public.seo_property_types (
  slug TEXT PRIMARY KEY,
  name_plural TEXT NOT NULL,
  name_singular TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Landmarks Table
CREATE TABLE IF NOT EXISTS public.seo_landmarks (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  city_slug TEXT REFERENCES public.seo_locations(slug) ON DELETE CASCADE,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Add SEO Slug to Properties Table
-- Check if column exists, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema='public' AND table_name='properties' AND column_name='slug') THEN
        ALTER TABLE public.properties ADD COLUMN slug TEXT UNIQUE;
    END IF;
END $$;

-- Enable RLS and add basic policies
ALTER TABLE public.seo_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_property_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_landmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to seo_locations" ON public.seo_locations FOR SELECT USING (true);
CREATE POLICY "Allow public read access to seo_property_types" ON public.seo_property_types FOR SELECT USING (true);
CREATE POLICY "Allow public read access to seo_landmarks" ON public.seo_landmarks FOR SELECT USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_properties_slug ON public.properties(slug);
CREATE INDEX IF NOT EXISTS idx_properties_city ON public.properties(city);
CREATE INDEX IF NOT EXISTS idx_properties_type ON public.properties(type);

-- Insert seed data for locations
INSERT INTO public.seo_locations (slug, name, state, intro_text, popular_tags) VALUES
('alibag', 'Alibag', 'Maharashtra', 'Discover the best luxury villas and beach stays in Alibag. Perfect for weekend getaways and family holidays.', ARRAY['pool', 'beach facing', 'pet friendly']),
('goa', 'Goa', 'Goa', 'Explore premium villas, boutique hotels, and party stays across Goa.', ARRAY['luxury', 'pool', 'couple friendly']),
('lonavala', 'Lonavala', 'Maharashtra', 'Find beautiful hill-station villas and budget stays in Lonavala.', ARRAY['pool', 'mountain view', 'family friendly']),
('pune', 'Pune', 'Maharashtra', 'Book the perfect weekend resort or homestay near Pune.', ARRAY['budget', 'pet friendly']),
('shimla', 'Shimla', 'Himachal Pradesh', 'Experience the mountains with our top-rated homestays and resorts in Shimla.', ARRAY['snow view', 'heater', 'luxury'])
ON CONFLICT (slug) DO NOTHING;

-- Insert seed data for property types
INSERT INTO public.seo_property_types (slug, name_plural, name_singular) VALUES
('villas', 'Villas', 'Villa'),
('resorts', 'Resorts', 'Resort'),
('beach-stays', 'Beach Stays', 'Beach Stay'),
('homestays', 'Homestays', 'Homestay'),
('hotels', 'Hotels', 'Hotel')
ON CONFLICT (slug) DO NOTHING;

-- Insert seed data for landmarks
INSERT INTO public.seo_landmarks (slug, name, city_slug, latitude, longitude) VALUES
('kashid-beach', 'Kashid Beach', 'alibag', 18.4357, 72.8943),
('imagica', 'Adlabs Imagica', 'lonavala', 18.7844, 73.3421),
('baga-beach', 'Baga Beach', 'goa', 15.5553, 73.7517)
ON CONFLICT (slug) DO NOTHING;

-- Generate slugs for existing properties
UPDATE public.properties 
SET slug = lower(regexp_replace(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'), '^-+|-+$', '', 'g')) || '-' || lower(regexp_replace(regexp_replace(COALESCE(city, 'unspecified'), '[^a-zA-Z0-9]+', '-', 'g'), '^-+|-+$', '', 'g'))
WHERE slug IS NULL;
