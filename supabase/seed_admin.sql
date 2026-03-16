-- Run this in your Supabase SQL Editor to securely generate the default Admin user.
-- Email: admin@fixstay.com
-- Password: admin

-- 1. Insert the auth user securely
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@fixstay.com') THEN
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
      'authenticated', -- Always authenticated for Supabase JWT
      'admin@fixstay.com',
      crypt('admin', gen_salt('bf')), -- secure crypted password
      NOW(),
      NULL,
      NULL,
      '{"provider":"email","providers":["email"]}',
      '{"role":"admin","name":"Default Administrator"}', -- This marks them as an admin in Next.js
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );
  END IF;
END $$;

-- 2. Verify creation
SELECT id, email, raw_user_meta_data FROM auth.users WHERE email = 'admin@fixstay.com';
