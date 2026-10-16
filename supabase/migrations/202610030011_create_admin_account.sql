-- ============================================================================
-- CREATE / ELEVATE ADMIN ACCOUNT IN SUPABASE DATABASE
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
DECLARE
  v_email TEXT := 'admin@binarypip.com';
  v_password TEXT := 'Admin@2026!';
  v_full_name TEXT := 'BinaryPip Admin';
  v_user_id UUID;
  v_encrypted_pw TEXT;
BEGIN
  -- Compute bcrypt hash for password
  v_encrypted_pw := extensions.crypt(v_password, extensions.gen_salt('bf', 10));

  -- Check if user already exists in auth.users
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();

    -- Create new user in auth.users
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
      v_email,
      v_encrypted_pw,
      NOW(),
      '{"provider": "email", "providers": ["email"], "role": "admin"}'::jsonb,
      jsonb_build_object('full_name', v_full_name, 'role', 'admin'),
      'authenticated',
      'authenticated',
      NOW(),
      NOW()
    );
  ELSE
    -- Update existing user's password and metadata
    UPDATE auth.users
    SET encrypted_password = v_encrypted_pw,
        email_confirmed_at = NOW(),
        aud = 'authenticated',
        role = 'authenticated',
        raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin", "provider": "email", "providers": ["email"]}'::jsonb,
        raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('full_name', v_full_name, 'role', 'admin'),
        updated_at = NOW()
    WHERE id = v_user_id;
  END IF;

  -- Insert/Update profile with role = 'admin'
  INSERT INTO public.profiles (id, full_name, email, role, updated_at)
  VALUES (v_user_id, v_full_name, v_email, 'admin', NOW())
  ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    updated_at = NOW();

  -- Insert wallet for admin
  INSERT INTO public.wallets (user_id, live_balance, demo_balance)
  VALUES (v_user_id, 0.00, 10000.00)
  ON CONFLICT (user_id) DO NOTHING;

END $$;
