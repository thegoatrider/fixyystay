-- ============================================================================
-- PROPOSED SECURITY FIXES: REPLACE CLIENT-WRITABLE USER_METADATA IN RLS
-- DO NOT AUTO-APPLY: For manual review by repository administrator.
-- ============================================================================

-- 1. One-time snippet: Set server-trusted app_metadata role for existing admin(s)
-- UPDATE auth.users
-- SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb
-- WHERE email = 'superadmin@fixstay.com';

-- 2. Account Deletion Requests Table
DROP POLICY IF EXISTS "Admins can view all deletion requests" ON public.account_deletion_requests;
CREATE POLICY "Admins can view all deletion requests"
  ON public.account_deletion_requests
  FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
    OR (auth.jwt() ->> 'email' = 'superadmin@fixstay.com')
  );

DROP POLICY IF EXISTS "Admins can update deletion requests" ON public.account_deletion_requests;
CREATE POLICY "Admins can update deletion requests"
  ON public.account_deletion_requests
  FOR UPDATE
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
    OR (auth.jwt() ->> 'email' = 'superadmin@fixstay.com')
  );

-- 3. Owner Support Messages Table
DROP POLICY IF EXISTS "Admins can view all support messages" ON public.support_messages;
CREATE POLICY "Admins can view all support messages"
  ON public.support_messages
  FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
    OR (auth.jwt() ->> 'email' = 'superadmin@fixstay.com')
  );

DROP POLICY IF EXISTS "Admins can insert support messages" ON public.support_messages;
CREATE POLICY "Admins can insert support messages"
  ON public.support_messages
  FOR INSERT
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
    OR (auth.jwt() ->> 'email' = 'superadmin@fixstay.com')
  );

DROP POLICY IF EXISTS "Admins can update support messages" ON public.support_messages;
CREATE POLICY "Admins can update support messages"
  ON public.support_messages
  FOR UPDATE
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
    OR (auth.jwt() ->> 'email' = 'superadmin@fixstay.com')
  );

-- 4. Owner Payments Table
DROP POLICY IF EXISTS "Admins can view owner payments" ON public.owner_payments;
CREATE POLICY "Admins can view owner payments"
  ON public.owner_payments
  FOR SELECT
  USING (
    (auth.jwt() ->> 'email' = 'superadmin@fixstay.com')
    OR (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  );

-- 5. Properties Table (Admin bypass in fix_owner_rls)
DROP POLICY IF EXISTS "Admins can access all properties" ON public.properties;
CREATE POLICY "Admins can access all properties"
  ON public.properties
  FOR ALL
  USING (
    (auth.jwt() ->> 'email' = 'superadmin@fixstay.com')
    OR (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  );

-- 6. Influencer Requests Table
DROP POLICY IF EXISTS "Admins can view all influencer requests" ON public.influencer_requests;
CREATE POLICY "Admins can view all influencer requests"
  ON public.influencer_requests
  FOR ALL
  USING (
    (auth.jwt() ->> 'email' = 'superadmin@fixstay.com')
    OR (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  );
