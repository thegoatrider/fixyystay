-- 🚀 Add Guest Name to Leads (if missing)
-- 📥 RUN THIS IN YOUR SUPABASE SQL EDITOR

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS guest_name TEXT;

COMMENT ON COLUMN public.leads.guest_name IS 'Name of the guest who submitted an enquiry or who is booked.';
