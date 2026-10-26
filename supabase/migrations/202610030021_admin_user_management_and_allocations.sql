-- ============================================================================
-- BINARYPIP / EXSTRADE ADMIN USER MANAGEMENT & ALLOCATIONS SYNC
-- Dedicated SQL Migration Script to manage Admin Profit/Loss Allocations in Supabase
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Ensure trading_mode column exists on public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trading_mode VARCHAR(20) DEFAULT 'PROFIT';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(50) DEFAULT 'unverified';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_status VARCHAR(50) DEFAULT 'active';

-- 2. Function to enforce valid trading_mode values
CREATE OR REPLACE FUNCTION public.sync_profile_trading_mode()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF (NEW.trading_mode IS NULL OR (NEW.trading_mode != 'PROFIT' AND NEW.trading_mode != 'LOSS')) THEN
        NEW.trading_mode := 'PROFIT';
    END IF;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_trading_mode ON public.profiles;
CREATE TRIGGER trg_sync_profile_trading_mode
    BEFORE INSERT OR UPDATE OF trading_mode ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_profile_trading_mode();

-- 3. Grants & Access Permissions
GRANT ALL ON TABLE public.profiles TO anon, authenticated, service_role;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 4. Enable Realtime Replication for profiles table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;
