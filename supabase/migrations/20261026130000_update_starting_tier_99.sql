-- Rate revision: Revise Alibag / Raigad & Non-Metro starting tier (1-6 rooms) from 199 to 99
-- 1-6 rooms: 99
-- 7-12 rooms: 299
-- 13-20 rooms: 399
-- 21-30 rooms: 499
-- 31-50 rooms: 599
-- 51-75 rooms: 999
-- 76-100 rooms: 1399

UPDATE public.pricing_tiers
SET monthly_fee_inr = 99
WHERE min_rooms = 1 AND max_rooms = 6;

INSERT INTO public.pricing_tiers (min_rooms, max_rooms, monthly_fee_inr, active)
SELECT 1, 6, 99::NUMERIC, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.pricing_tiers WHERE min_rooms = 1 AND max_rooms = 6
);
