-- 1. Add register-specific columns to guest_checkins table
ALTER TABLE public.guest_checkins ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'guest_form';
ALTER TABLE public.guest_checkins ADD COLUMN IF NOT EXISTS register_date DATE;
ALTER TABLE public.guest_checkins ADD COLUMN IF NOT EXISTS register_image_url TEXT;

-- 2. Create indices for performance optimization
CREATE INDEX IF NOT EXISTS idx_guest_checkins_register_date ON public.guest_checkins(register_date);
CREATE INDEX IF NOT EXISTS idx_guest_checkins_source ON public.guest_checkins(source);
