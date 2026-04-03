-- 🚀 SQL Migration: Standardize Property UIDs to ALB-
-- This script replaces the generic 'PRP-' prefix with 'ALB-' for Alibag properties.

UPDATE public.properties
SET uid = REPLACE(uid, 'PRP-', 'ALB-')
WHERE uid LIKE 'PRP-%';

-- Optional: Verify the update
-- SELECT id, name, uid FROM public.properties WHERE uid LIKE 'ALB-%';
