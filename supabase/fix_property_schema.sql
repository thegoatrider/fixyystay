-- COMPREHENSIVE FIX for properties table schema
-- This adds all columns required by onboarding, pricing, and location logic.

ALTER TABLE public.properties 
-- Standard location metadata
ADD COLUMN IF NOT EXISTS area_name TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS pincode TEXT,

-- Business logic columns
ADD COLUMN IF NOT EXISTS uid TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS max_guests INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS max_capacity INTEGER DEFAULT 20,
ADD COLUMN IF NOT EXISTS extra_per_pax NUMERIC DEFAULT 0;

-- Optional: ensure city_area is sync'd if needed
-- UPDATE public.properties SET area_name = city_area WHERE area_name IS NULL;
