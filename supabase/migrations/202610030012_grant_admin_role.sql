-- ============================================================================
-- GRANT ADMIN ROLE TO USER IN SUPABASE DATABASE
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- ============================================================================

-- 1. Ensure profiles table has role column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'client';

-- 2. Elevate user by Email
UPDATE public.profiles
SET role = 'admin',
    updated_at = NOW()
WHERE email = 'loskiterer@gmail.com';

UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb,
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
WHERE email = 'loskiterer@gmail.com';

-- 3. Elevate user by UID (87966561-515d-4e42-ac9d-569b2e448a5e)
UPDATE public.profiles
SET role = 'admin',
    updated_at = NOW()
WHERE id = '87966561-515d-4e42-ac9d-569b2e448a5e';

UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
WHERE id = '87966561-515d-4e42-ac9d-569b2e448a5e';
