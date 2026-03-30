-- 🚀 Add House Rules to Properties Table
-- 📥 RUN THIS IN YOUR SUPABASE SQL EDITOR

-- 1. Add house_rules column to properties
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS house_rules TEXT;

-- Descriptive comment
COMMENT ON COLUMN public.properties.house_rules IS 'House rules entered by the owner/admin, visible to guests before booking.';
