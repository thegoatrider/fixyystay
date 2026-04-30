CREATE OR REPLACE VIEW feature_usage_metrics AS
SELECT 
  (SELECT count(DISTINCT owner_id) FROM leads) AS owners_using_lead_form,
  (SELECT count(DISTINCT owner_id) FROM guest_checkins) AS owners_using_guest_form;

-- Grant permissions to authenticated users to read this view (for admin dashboard usage)
GRANT SELECT ON feature_usage_metrics TO authenticated;
GRANT SELECT ON feature_usage_metrics TO anon;
