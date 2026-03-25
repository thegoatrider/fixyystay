-- Add city column to properties table
ALTER TABLE properties ADD COLUMN IF NOT EXISTS city TEXT DEFAULT 'Alibag' NOT NULL;

-- Index for faster filtering
CREATE INDEX IF NOT EXISTS idx_properties_city ON properties(city);


