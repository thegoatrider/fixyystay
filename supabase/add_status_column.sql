-- Run this in the Supabase SQL Editor
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='guest_checkins' AND column_name='status') THEN
    ALTER TABLE public.guest_checkins ADD COLUMN status TEXT DEFAULT 'draft';
    UPDATE public.guest_checkins SET status = 'completed';
  END IF;
END $$;
