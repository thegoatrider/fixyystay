-- ==============================================================================
-- FIX & MANUAL ACCOUNT RECREATION FOR NIKHIL BERDE
-- Email: nikhilberde169@gmail.com
-- Password: riverpark
-- Plan: Business 3 Months (Active)
-- 
-- Instructions: Run this script directly in your Supabase SQL Editor.
-- ==============================================================================

DO $$
DECLARE
  v_email TEXT := 'nikhilberde169@gmail.com';
  v_password TEXT := 'riverpark';
  v_name TEXT := 'Nikhil Berde';
  v_new_user_id UUID := gen_random_uuid();
  v_owner_id UUID;
  v_existing_owner_id UUID;
  v_existing_user_id UUID;
BEGIN
  -- 1. PURGE EXISTING STALE RECORDS
  -- Find any existing owner ID for this email
  SELECT id INTO v_existing_owner_id FROM public.owners WHERE LOWER(email) = LOWER(v_email);
  
  IF v_existing_owner_id IS NOT NULL THEN
    -- Delete related records first to respect foreign keys
    DELETE FROM public.properties WHERE owner_id = v_existing_owner_id;
    DELETE FROM public.owner_payments WHERE owner_id = v_existing_owner_id;
    DELETE FROM public.owner_subscriptions WHERE owner_id = v_existing_owner_id;
    DELETE FROM public.owners WHERE id = v_existing_owner_id;
  END IF;

  -- Also check and delete by payment email if any payments were unlinked
  DELETE FROM public.owner_payments WHERE LOWER(payment_ref) LIKE '%nikhil%' OR owner_id IN (SELECT id FROM public.owners WHERE LOWER(email) = LOWER(v_email));

  -- Delete from auth.users if any lingering auth record exists
  SELECT id INTO v_existing_user_id FROM auth.users WHERE LOWER(email) = LOWER(v_email);
  IF v_existing_user_id IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = v_existing_user_id;
  END IF;

  -- 2. CREATE FRESH AUTH USER (Password: riverpark)
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_new_user_id,
    'authenticated',
    'authenticated',
    LOWER(v_email),
    crypt(v_password, gen_salt('bf')),
    NOW(),
    NULL,
    NULL,
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('name', v_name, 'role', 'owner'),
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  );

  -- 3. INSERT CORRESPONDING OWNER IN public.owners
  INSERT INTO public.owners (
    user_id,
    name,
    email,
    created_at
  ) VALUES (
    v_new_user_id,
    v_name,
    LOWER(v_email),
    NOW()
  ) RETURNING id INTO v_owner_id;

  -- 4. INSERT ACTIVE 3-MONTH SUBSCRIPTION
  INSERT INTO public.owner_subscriptions (
    owner_id,
    plan_name,
    start_date,
    end_date,
    status,
    created_at
  ) VALUES (
    v_owner_id,
    'Business 3 Months',
    NOW(),
    NOW() + INTERVAL '3 months',
    'active',
    NOW()
  );

  -- 5. LOG RECORDED PAYMENT
  INSERT INTO public.owner_payments (
    owner_id,
    amount,
    payment_date,
    payment_method,
    payment_ref,
    plan_duration_months,
    created_at
  ) VALUES (
    v_owner_id,
    300,
    NOW(),
    'Razorpay',
    'manual_recreation_nikhilberde',
    3,
    NOW()
  );

  RAISE NOTICE 'Successfully purged and recreated account for % with user_id % and owner_id %', v_email, v_new_user_id, v_owner_id;
END $$;

-- 6. VERIFY CREATION
SELECT 
  u.id AS auth_user_id,
  u.email,
  u.email_confirmed_at,
  u.raw_user_meta_data->>'role' AS role,
  o.id AS owner_id,
  o.name AS owner_name,
  s.plan_name,
  s.status AS subscription_status,
  s.end_date AS subscription_end_date
FROM auth.users u
JOIN public.owners o ON o.user_id = u.id
LEFT JOIN public.owner_subscriptions s ON s.owner_id = o.id
WHERE LOWER(u.email) = 'nikhilberde169@gmail.com';
