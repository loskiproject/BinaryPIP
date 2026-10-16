-- Grant Admin Role to User UID: 87966561-515d-4e42-ac9d-569b2e448a5e

-- 1. Update public profiles role
UPDATE public.profiles
SET role = 'admin',
    updated_at = NOW()
WHERE id = '87966561-515d-4e42-ac9d-569b2e448a5e';

-- 2. Update auth.users metadata so Supabase JWT includes admin role
UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb,
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
WHERE id = '87966561-515d-4e42-ac9d-569b2e448a5e';
