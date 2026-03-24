-- UID Migration: Add unique identifiers to properties and guest_checkins

-- 1. Add uid column to properties table
ALTER TABLE properties ADD COLUMN IF NOT EXISTS uid VARCHAR(20) UNIQUE;

-- 2. Add uid column to guest_checkins table
ALTER TABLE guest_checkins ADD COLUMN IF NOT EXISTS uid VARCHAR(20) UNIQUE;

-- 3. Backfill UIDs for existing approved properties (optional, one-time)
UPDATE properties
SET uid = 'PRP-' || upper(substr(md5(id::text), 1, 8))
WHERE approved = true AND uid IS NULL;

-- 4. Backfill UIDs for existing guest checkins (optional, one-time)
UPDATE guest_checkins
SET uid = 'GST-' || upper(substr(md5(id::text), 1, 8))
WHERE uid IS NULL;
