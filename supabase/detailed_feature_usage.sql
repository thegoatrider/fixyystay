-- Drop old views
DROP VIEW IF EXISTS owner_lead_usage;
DROP VIEW IF EXISTS owner_checkin_usage;

-- Detailed lead usage for ALL owners
CREATE OR REPLACE VIEW owner_lead_usage AS
SELECT 
  owners.id as owner_id,
  owners.name as owner_name,
  owners.email as owner_email,
  COALESCE(count(leads.id), 0) as total_leads,
  max(leads.created_at) as last_activity
FROM owners
LEFT JOIN leads ON owners.id = leads.owner_id
GROUP BY owners.id, owners.name, owners.email;

-- Detailed guest checkin usage for ALL owners
CREATE OR REPLACE VIEW owner_checkin_usage AS
SELECT 
  owners.id as owner_id,
  owners.name as owner_name,
  owners.email as owner_email,
  COALESCE(count(guest_checkins.id), 0) as total_checkins,
  max(guest_checkins.created_at) as last_activity
FROM owners
LEFT JOIN guest_checkins ON owners.id = guest_checkins.owner_id
GROUP BY owners.id, owners.name, owners.email;

-- Grant permissions
GRANT SELECT ON owner_lead_usage TO authenticated;
GRANT SELECT ON owner_lead_usage TO anon;
GRANT SELECT ON owner_checkin_usage TO authenticated;
GRANT SELECT ON owner_checkin_usage TO anon;
