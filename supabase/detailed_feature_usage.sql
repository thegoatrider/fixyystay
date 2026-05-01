-- Drop old view if exists
DROP VIEW IF EXISTS feature_usage_metrics;

-- Detailed lead usage per owner
CREATE OR REPLACE VIEW owner_lead_usage AS
SELECT 
  leads.owner_id,
  owners.name as owner_name,
  count(leads.id) as total_leads,
  max(leads.created_at) as last_activity
FROM leads
JOIN owners ON leads.owner_id = owners.id
GROUP BY leads.owner_id, owners.name;

-- Detailed guest checkin usage per owner
CREATE OR REPLACE VIEW owner_checkin_usage AS
SELECT 
  guest_checkins.owner_id,
  owners.name as owner_name,
  count(guest_checkins.id) as total_checkins,
  max(guest_checkins.created_at) as last_activity
FROM guest_checkins
JOIN owners ON guest_checkins.owner_id = owners.id
GROUP BY guest_checkins.owner_id, owners.name;

-- Grant permissions
GRANT SELECT ON owner_lead_usage TO authenticated;
GRANT SELECT ON owner_lead_usage TO anon;
GRANT SELECT ON owner_checkin_usage TO authenticated;
GRANT SELECT ON owner_checkin_usage TO anon;
