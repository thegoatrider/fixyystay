-- SQL Migration: Enhanced Booking & Leads Schema
-- 📥 RUN THIS IN YOUR SUPABASE SQL EDITOR

-- 1. Enhance Bookings Table
-- Add missing guest info and precise stay dates
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS checkin_date DATE,
ADD COLUMN IF NOT EXISTS checkout_date DATE,
ADD COLUMN IF NOT EXISTS guest_email TEXT;

-- 2. Enhance Leads Table
-- Add guest name and email for automated lead creation from bookings
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS guest_name TEXT,
ADD COLUMN IF NOT EXISTS guest_email TEXT;

-- 3. Optimization: Ensure indices exist for calendar performance
CREATE INDEX IF NOT EXISTS idx_bookings_room_dates ON public.bookings (room_id, checkin_date, checkout_date);
CREATE INDEX IF NOT EXISTS idx_leads_property_dates ON public.leads (property_id, checkin_date, checkout_date);

COMMENT ON TABLE public.bookings IS 'Stores confirmed room bookings with check-in/out dates and guest contact info.';
COMMENT ON TABLE public.leads IS 'Stores guest enquiries and automated booking leads for owners.';
