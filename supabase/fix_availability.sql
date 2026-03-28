-- Migration to fix property availability by adding stay dates to bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS checkin_date DATE;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS checkout_date DATE;

-- Update comments for clarity
COMMENT ON COLUMN public.bookings.checkin_date IS 'Date the guest arrives at the property.';
COMMENT ON COLUMN public.bookings.checkout_date IS 'Date the guest departs from the property.';
