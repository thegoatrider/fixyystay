-- Run this in your Supabase SQL Editor to securely generate the Super Admin user.
-- Email: superadmin@fixstay.com
-- Password: superadmin123

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'superadmin@fixstay.com') THEN
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
      'superadmin@fixstay.com',
      crypt('superadmin123', gen_salt('bf')), -- secure crypted password
      NOW(),
      NULL,
      NULL,
      '{"provider":"email","providers":["email"]}',
      '{"role":"superadmin","name":"Super Administrator"}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );
  END IF;
END $$;

-- Verify creation
SELECT id, email, raw_user_meta_data FROM auth.users WHERE email = 'superadmin@fixstay.com';
