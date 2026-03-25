-- Property UID Backfill / Refactor
-- This script re-assigns UIDs based on the city and creation order

WITH numbered_props AS (
  SELECT 
    id,
    city,
    ROW_NUMBER() OVER (PARTITION BY city ORDER BY created_at ASC) as city_rank
  FROM properties
)

UPDATE properties p
SET uid = 
  CASE 
    WHEN np.city = 'Alibag' THEN 'ALB' || LPAD(np.city_rank::text, 3, '0')
    WHEN np.city = 'Lonavala' THEN 'LON' || LPAD(np.city_rank::text, 3, '0')
    WHEN np.city = 'Goa' THEN 'GOA' || LPAD(np.city_rank::text, 3, '0')
    WHEN np.city = 'Mumbai' THEN 'MUM' || LPAD(np.city_rank::text, 3, '0')
    WHEN np.city = 'Khandala' THEN 'KHA' || LPAD(np.city_rank::text, 3, '0')
    WHEN np.city = 'Matheran' THEN 'MAT' || LPAD(np.city_rank::text, 3, '0')
    WHEN np.city = 'Mahableshwar' THEN 'MAH' || LPAD(np.city_rank::text, 3, '0')
    ELSE 'PRP' || LPAD(np.city_rank::text, 3, '0')
  END
FROM numbered_props np
WHERE p.id = np.id;
