-- ============================================================================
-- PROPOSED SECURITY FIXES: REPLACE CLIENT-WRITABLE USER_METADATA IN RLS
-- DO NOT AUTO-APPLY: For manual review by repository administrator.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. One-time snippet: Backfill app_metadata role for existing users
-- ----------------------------------------------------------------------------
-- Run this in Supabase SQL editor to ensure app_metadata.role is populated from
-- existing user records so JWTs include the server-trusted role:
--
-- UPDATE auth.users
-- SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', raw_user_meta_data->>'role')
-- WHERE raw_user_meta_data->>'role' IS NOT NULL;
--
-- Explicitly ensure superadmin has admin role:
-- UPDATE auth.users
-- SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
-- WHERE email = 'superadmin@fixstay.com';

-- ----------------------------------------------------------------------------
-- 2. Table: public.account_deletion_requests
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view all account deletion requests" ON public.account_deletion_requests;
DROP POLICY IF EXISTS "Admins can view all deletion requests" ON public.account_deletion_requests;
CREATE POLICY "Admins can view all account deletion requests"
  ON public.account_deletion_requests
  FOR SELECT
  USING (
    ((select auth.jwt()) -> 'app_metadata' ->> 'role' = 'admin')
    OR ((select auth.jwt()) ->> 'email' = 'superadmin@fixstay.com')
  );

DROP POLICY IF EXISTS "Admins can update account deletion requests" ON public.account_deletion_requests;
DROP POLICY IF EXISTS "Admins can update deletion requests" ON public.account_deletion_requests;
CREATE POLICY "Admins can update account deletion requests"
  ON public.account_deletion_requests
  FOR UPDATE
  USING (
    ((select auth.jwt()) -> 'app_metadata' ->> 'role' = 'admin')
    OR ((select auth.jwt()) ->> 'email' = 'superadmin@fixstay.com')
  );

-- ----------------------------------------------------------------------------
-- 3. Table: public.support_messages
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view all support messages" ON public.support_messages;
CREATE POLICY "Admins can view all support messages"
  ON public.support_messages
  FOR SELECT
  USING (
    ((select auth.jwt()) -> 'app_metadata' ->> 'role' = 'admin')
    OR ((select auth.jwt()) ->> 'email' = 'superadmin@fixstay.com')
  );

DROP POLICY IF EXISTS "Admins can insert support messages" ON public.support_messages;
CREATE POLICY "Admins can insert support messages"
  ON public.support_messages
  FOR INSERT
  WITH CHECK (
    (((select auth.jwt()) -> 'app_metadata' ->> 'role' = 'admin')
      OR ((select auth.jwt()) ->> 'email' = 'superadmin@fixstay.com'))
    AND sender_type = 'admin'
  );

DROP POLICY IF EXISTS "Admins can update support messages" ON public.support_messages;
CREATE POLICY "Admins can update support messages"
  ON public.support_messages
  FOR UPDATE
  USING (
    ((select auth.jwt()) -> 'app_metadata' ->> 'role' = 'admin')
    OR ((select auth.jwt()) ->> 'email' = 'superadmin@fixstay.com')
  );

-- ----------------------------------------------------------------------------
-- 4. Table: public.owner_payments
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view owner payments" ON public.owner_payments;
CREATE POLICY "Admins can view owner payments"
  ON public.owner_payments
  FOR SELECT
  USING (
    ((select auth.jwt()) ->> 'email' = 'superadmin@fixstay.com')
    OR ((select auth.jwt()) -> 'app_metadata' ->> 'role' = 'admin')
  );

-- ----------------------------------------------------------------------------
-- 5. Table: public.owners (from fix_owner_rls.sql)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Owners can view own record" ON public.owners;
CREATE POLICY "Owners can view own record"
  ON public.owners
  FOR SELECT
  USING (
    (select auth.uid()) = user_id
    OR email = ((select auth.jwt()) ->> 'email')
    OR (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
    OR (((select auth.jwt()) ->> 'email') = 'superadmin@fixstay.com')
  );

-- ----------------------------------------------------------------------------
-- 6. Table: public.influencer_promotion_requests (from influencer_requests.sql)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view all requests" ON public.influencer_promotion_requests;
CREATE POLICY "Admins can view all requests"
  ON public.influencer_promotion_requests
  FOR SELECT
  USING (
    ((select auth.jwt()) ->> 'email' = 'superadmin@fixstay.com')
    OR (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
  );

-- ----------------------------------------------------------------------------
-- 7. Table: public.messages (from police_owner_messages.sql)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Police can view all messages" ON public.messages;
CREATE POLICY "Police can view all messages"
  ON public.messages
  FOR SELECT
  USING (
    ((select auth.jwt()) -> 'app_metadata' ->> 'role' = 'police')
  );

DROP POLICY IF EXISTS "Police can insert messages" ON public.messages;
CREATE POLICY "Police can insert messages"
  ON public.messages
  FOR INSERT
  WITH CHECK (
    (((select auth.jwt()) -> 'app_metadata' ->> 'role' = 'police'))
    AND sender_type = 'police'
  );

DROP POLICY IF EXISTS "Police can update messages" ON public.messages;
CREATE POLICY "Police can update messages"
  ON public.messages
  FOR UPDATE
  USING (
    ((select auth.jwt()) -> 'app_metadata' ->> 'role' = 'police')
  );
