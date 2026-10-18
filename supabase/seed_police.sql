-- Run this in your Supabase SQL Editor to generate or reset the default Police user.
-- Email: police@fixstay.com
-- Password: Police@2026

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'police@fixstay.com';

  IF v_user_id IS NULL THEN
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
      uuid_generate_v4(),
      'authenticated',
      'authenticated',
      'police@fixstay.com',
      crypt('Police@2026', gen_salt('bf')),
      NOW(),
      NULL,
      NULL,
      '{"provider":"email","providers":["email"],"role":"police"}',
      '{"role":"police","name":"Police Official","station_name":"Central Station"}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );
  ELSE
    -- If user already exists, update password and metadata to ensure police role
    UPDATE auth.users
    SET 
      encrypted_password = crypt('Police@2026', gen_salt('bf')),
      raw_app_meta_data = raw_app_meta_data || '{"role":"police"}'::jsonb,
      raw_user_meta_data = raw_user_meta_data || '{"role":"police","name":"Police Official"}'::jsonb,
      email_confirmed_at = COALESCE(email_confirmed_at, NOW())
    WHERE id = v_user_id;
  END IF;
END $$;

-- Verify creation/update
SELECT id, email, raw_user_meta_data, raw_app_meta_data FROM auth.users WHERE email = 'police@fixstay.com';
