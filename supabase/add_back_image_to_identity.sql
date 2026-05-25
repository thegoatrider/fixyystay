-- Add back_image_url column to guest_identity table
-- Run this in Supabase SQL Editor

ALTER TABLE public.guest_identity
  ADD COLUMN IF NOT EXISTS back_image_url TEXT;

-- Optional: update index for faster lookups
COMMENT ON COLUMN public.guest_identity.back_image_url IS 'URL of the back side of the government ID document';
