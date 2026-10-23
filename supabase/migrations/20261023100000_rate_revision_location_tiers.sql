-- Rate revision: Alibag/Raigad & Non-Metro default base pricing tiers
-- 1-6 rooms: 199
-- 7-12 rooms: 299
-- 13-20 rooms: 399
-- 21-30 rooms: 499
-- 31-50 rooms: 599
-- 51-75 rooms: 999
-- 76-100 rooms: 1399

DELETE FROM public.pricing_tiers;

INSERT INTO public.pricing_tiers (min_rooms, max_rooms, monthly_fee_inr, active)
VALUES
  (1, 6, 199::NUMERIC, true),
  (7, 12, 299::NUMERIC, true),
  (13, 20, 399::NUMERIC, true),
  (21, 30, 499::NUMERIC, true),
  (31, 50, 599::NUMERIC, true),
  (51, 75, 999::NUMERIC, true),
  (76, 100, 1399::NUMERIC, true);
