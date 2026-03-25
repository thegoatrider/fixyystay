-- Migration to add email column to bookings for notifications
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS guest_email TEXT;

-- Update the comments for clarity
COMMENT ON COLUMN public.bookings.guest_email IS 'Email address of the guest, used for booking confirmations.';
