-- Add missing location metadata columns to properties table
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS area_name TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS pincode TEXT;

-- Update existing city_area to area_name for data consistency (optional but helpful)
-- UPDATE public.properties SET area_name = city_area WHERE area_name IS NULL;
