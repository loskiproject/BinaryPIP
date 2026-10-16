-- Create or Update Admin Account: loskiterer@gmail.com
-- Securely hashes password using PostgreSQL pgcrypto (bcrypt)

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
DECLARE
  v_user_id UUID;
  v_encrypted_pw TEXT;
BEGIN
  -- Hash password securely using salted bcrypt
  v_encrypted_pw := extensions.crypt('Loski@123', extensions.gen_salt('bf'));

  -- Check if user exists in auth.users
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'loskiterer@gmail.com';

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();

    -- Insert into auth.users
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      aud,
      role,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'loskiterer@gmail.com',
      v_encrypted_pw,
      NOW(),
      '{"provider": "email", "providers": ["email"], "role": "admin"}'::jsonb,
      '{"full_name": "Loski Terer", "role": "admin"}'::jsonb,
      'authenticated',
      'authenticated',
      NOW(),
      NOW()
    );
  ELSE
    -- Update existing user's password and metadata
    UPDATE auth.users
    SET encrypted_password = v_encrypted_pw,
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin", "provider": "email", "providers": ["email"]}'::jsonb,
        raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "admin", "full_name": "Loski Terer"}'::jsonb,
        updated_at = NOW()
    WHERE id = v_user_id;
  END IF;

  -- Ensure profile exists and has role = 'admin'
  INSERT INTO public.profiles (id, full_name, email, role, updated_at)
  VALUES (v_user_id, 'Loski Terer', 'loskiterer@gmail.com', 'admin', NOW())
  ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    email = EXCLUDED.email,
    updated_at = NOW();

  -- Ensure wallet exists
  INSERT INTO public.wallets (user_id, live_balance, demo_balance)
  VALUES (v_user_id, 0.00, 10000.00)
  ON CONFLICT (user_id) DO NOTHING;

END $$;
