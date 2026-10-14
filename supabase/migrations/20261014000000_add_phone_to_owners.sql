-- Add phone column to owners table if not exists
ALTER TABLE public.owners ADD COLUMN IF NOT EXISTS phone TEXT;

-- Create index for quick phone search if needed
CREATE INDEX IF NOT EXISTS idx_owners_phone ON public.owners(phone);

COMMENT ON COLUMN public.owners.phone IS 'Direct contact and WhatsApp phone number for the property owner';
