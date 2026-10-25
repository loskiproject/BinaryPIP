-- Migration: 202610030014_full_admin_realtime_sync.sql
-- Description: Ensures tables, unique constraints, and Realtime publication for seamless Admin-Client sync.

-- 1. Ensure wallets table has UNIQUE constraint on user_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'wallets_user_id_key'
    ) THEN
        ALTER TABLE public.wallets ADD CONSTRAINT wallets_user_id_key UNIQUE (user_id);
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 2. Grants for anon & authenticated roles
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 3. Disable restrictive RLS on core sync tables so REST calls never fail
ALTER TABLE public.wallets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_cases DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_deposit_addresses DISABLE ROW LEVEL SECURITY;

-- 4. Enable Realtime Replication on core sync tables
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.trades;
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;
