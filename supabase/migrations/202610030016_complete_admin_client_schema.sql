-- ============================================================================
-- BINARYPIP / EXSTRADE FULL DATABASE MIGRATION SCRIPT
-- Connects Client Dashboard and Admin Dashboard with Realtime Sync & RLS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) DEFAULT '',
    email VARCHAR(255) DEFAULT '',
    phone VARCHAR(50) DEFAULT '',
    country VARCHAR(100) DEFAULT 'Kenya',
    kyc_status VARCHAR(50) DEFAULT 'unverified',
    account_status VARCHAR(50) DEFAULT 'active',
    role VARCHAR(50) DEFAULT 'client',
    trading_mode VARCHAR(20) DEFAULT 'PROFIT',
    recovery_email VARCHAR(255) DEFAULT '',
    home_address VARCHAR(255) DEFAULT '',
    document_region VARCHAR(100) DEFAULT 'Global',
    document_type VARCHAR(100) DEFAULT 'ID Card',
    document_number VARCHAR(100) DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trading_mode VARCHAR(20) DEFAULT 'PROFIT';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(50) DEFAULT 'unverified';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_status VARCHAR(50) DEFAULT 'active';

-- 2. WALLETS TABLE
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    live_balance NUMERIC(15, 2) DEFAULT 0.00,
    demo_balance NUMERIC(15, 2) DEFAULT 10000.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure UNIQUE constraint on user_id for upserts
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

-- 3. TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'deposit', 'withdrawal', 'adjustment'
    amount NUMERIC(15, 2) NOT NULL,
    bonus_amount NUMERIC(15, 2) DEFAULT 0.00,
    total_amount NUMERIC(15, 2) NOT NULL,
    asset VARCHAR(20) DEFAULT 'USD',
    gateway_network VARCHAR(100) DEFAULT 'MPESA',
    reference_code TEXT DEFAULT '',
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    admin_notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TRADES TABLE
CREATE TABLE IF NOT EXISTS public.trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    symbol VARCHAR(100) NOT NULL,
    direction VARCHAR(20) NOT NULL, -- 'higher', 'lower', 'buy', 'sell'
    amount NUMERIC(15, 2) NOT NULL,
    entry_price NUMERIC(18, 5) DEFAULT 0,
    exit_price NUMERIC(18, 5) DEFAULT 0,
    profit_loss NUMERIC(15, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'closed', -- 'open', 'closed', 'won', 'lost'
    account_type VARCHAR(20) DEFAULT 'real', -- 'demo', 'real'
    closed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. PROFILE DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS public.profile_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    storage_path TEXT DEFAULT '',
    original_name TEXT DEFAULT '',
    document_type VARCHAR(100) DEFAULT 'ID Card',
    mime_type VARCHAR(100) DEFAULT 'image/jpeg',
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'verified', 'rejected'
    admin_notes TEXT DEFAULT '',
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ
);

-- 6. KYC CASES TABLE
CREATE TABLE IF NOT EXISTS public.kyc_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider VARCHAR(50) DEFAULT 'manual',
    provider_case_id TEXT DEFAULT '',
    status VARCHAR(50) DEFAULT 'pending',
    reviewer_note TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. SYSTEM SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. ADMIN DEPOSIT ADDRESSES TABLE
CREATE TABLE IF NOT EXISTS public.admin_deposit_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    network VARCHAR(100) NOT NULL,
    asset_name VARCHAR(100) NOT NULL,
    wallet_address TEXT NOT NULL,
    note TEXT DEFAULT '',
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID,
    admin_name VARCHAR(255) DEFAULT 'Admin',
    action VARCHAR(100) NOT NULL,
    target_id TEXT DEFAULT '',
    target_type VARCHAR(100) DEFAULT '',
    detail TEXT DEFAULT '',
    severity VARCHAR(20) DEFAULT 'info',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. NEW USER SIGNUP TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_full_name TEXT;
    user_role TEXT;
BEGIN
    user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
    user_role := CASE
        WHEN LOWER(NEW.email) IN ('admin@binarypip.com', 'loskiterer@gmail.com', 'mutuagedeon77@gmail.com') THEN 'admin'
        ELSE 'client'
    END;

    INSERT INTO public.profiles (id, full_name, email, role, kyc_status, account_status, trading_mode, created_at, updated_at)
    VALUES (NEW.id, user_full_name, NEW.email, user_role, 'unverified', 'active', 'PROFIT', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        updated_at = NOW();

    INSERT INTO public.wallets (user_id, live_balance, demo_balance, created_at, updated_at)
    VALUES (NEW.id, 0.00, 10000.00, NOW(), NOW())
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_signup();

-- 11. OPEN PERMISSIONS & DISABLE RESTRICTIVE RLS FOR ANON REST CALLS
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_cases DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_deposit_addresses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;

-- 12. REALTIME REPLICATION PUBLICATION
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
