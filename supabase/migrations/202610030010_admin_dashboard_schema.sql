-- ============================================================================
-- BINARYPIP ADMIN DASHBOARD COMPLETE SUPABASE DATABASE MIGRATION
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- ============================================================================

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  username TEXT UNIQUE DEFAULT '',
  email TEXT DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  avatar_path TEXT,
  recovery_email TEXT NOT NULL DEFAULT '',
  home_address TEXT NOT NULL DEFAULT '',
  document_region TEXT NOT NULL DEFAULT 'Global',
  document_type TEXT NOT NULL DEFAULT 'ID Card',
  document_number TEXT NOT NULL DEFAULT '',
  kyc_status TEXT NOT NULL DEFAULT 'unverified' CHECK (kyc_status IN ('unverified', 'pending', 'verified', 'rejected')),
  account_status TEXT NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'closed')),
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all columns exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_path TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS recovery_email TEXT NOT NULL DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS home_address TEXT NOT NULL DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS document_region TEXT NOT NULL DEFAULT 'Global';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS document_type TEXT NOT NULL DEFAULT 'ID Card';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS document_number TEXT NOT NULL DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS kyc_status TEXT NOT NULL DEFAULT 'unverified';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'client';

-- 2. WALLETS TABLE
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users (id) ON DELETE CASCADE,
  live_balance NUMERIC(18,2) NOT NULL DEFAULT 0.00,
  demo_balance NUMERIC(18,2) NOT NULL DEFAULT 10000.00,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'transfer', 'bonus', 'trade_profit', 'trade_loss')),
  amount NUMERIC(18,2) NOT NULL,
  asset TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'approved', 'rejected', 'failed')),
  method TEXT DEFAULT '',
  reference_id TEXT DEFAULT '',
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. TRADES TABLE
CREATE TABLE IF NOT EXISTS public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('buy', 'sell')),
  amount NUMERIC(18,2) NOT NULL,
  entry_price NUMERIC(18,4) NOT NULL,
  exit_price NUMERIC(18,4),
  profit_loss NUMERIC(18,2) DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled')),
  account_type TEXT NOT NULL DEFAULT 'real' CHECK (account_type IN ('real', 'demo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

-- 5. PROFILE DOCUMENTS TABLE (KYC Submissions)
CREATE TABLE IF NOT EXISTS public.profile_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL CHECK (file_size > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'approved', 'rejected')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. KYC CASES TABLE
CREATE TABLE IF NOT EXISTS public.kyc_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_case_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'needs_more_info')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by UUID REFERENCES auth.users (id),
  reviewer_note TEXT NOT NULL DEFAULT '',
  UNIQUE (provider, provider_case_id)
);

-- 7. ADMIN DEPOSIT ADDRESSES TABLE (Gateways & Crypto Addresses)
CREATE TABLE IF NOT EXISTS public.admin_deposit_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain TEXT DEFAULT '',
  asset TEXT DEFAULT '',
  address TEXT DEFAULT '',
  network TEXT NOT NULL DEFAULT 'USDT-TRC20',
  asset_name TEXT NOT NULL DEFAULT 'Tether USDT',
  wallet_address TEXT NOT NULL DEFAULT '',
  note TEXT DEFAULT '',
  min_deposit_usd NUMERIC(18,2) DEFAULT 10.00,
  max_deposit_usd NUMERIC(18,2) DEFAULT 100000.00,
  qr_code TEXT DEFAULT '',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Drop legacy NOT NULL constraints on chain, asset, address if table already existed
ALTER TABLE public.admin_deposit_addresses ALTER COLUMN chain DROP NOT NULL;
ALTER TABLE public.admin_deposit_addresses ALTER COLUMN asset DROP NOT NULL;
ALTER TABLE public.admin_deposit_addresses ALTER COLUMN address DROP NOT NULL;

-- 8. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id TEXT DEFAULT '',
  admin_name TEXT DEFAULT 'Admin',
  action TEXT NOT NULL,
  target_id TEXT DEFAULT '',
  target_type TEXT DEFAULT '',
  detail TEXT NOT NULL DEFAULT '',
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. SYSTEM SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. USER TRADE ALLOCATIONS TABLE
CREATE TABLE IF NOT EXISTS public.user_trade_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users (id) ON DELETE CASCADE,
  trade_outcome TEXT NOT NULL DEFAULT 'NORMAL',
  win_rate INTEGER NOT NULL DEFAULT 50,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_trade_allocations ADD COLUMN IF NOT EXISTS trade_outcome TEXT NOT NULL DEFAULT 'NORMAL';
ALTER TABLE public.user_trade_allocations ADD COLUMN IF NOT EXISTS win_rate INTEGER NOT NULL DEFAULT 50;

-- ============================================================================
-- INITIAL SEED DATA FOR ADMIN GATEWAYS & SYSTEM SETTINGS
-- ============================================================================

INSERT INTO public.admin_deposit_addresses (chain, asset, address, network, asset_name, wallet_address, note, enabled)
VALUES
  ('Tron (TRC-20)', 'USDT', 'TB4TkYeuq66P4Uq7xPkWtGjE9h1v3L5m8R', 'USDT-TRC20', 'Tether (USDT TRON)', 'TB4TkYeuq66P4Uq7xPkWtGjE9h1v3L5m8R', 'Send TRC-20 USDT only', true),
  ('Ethereum (ERC-20)', 'ETH', '0x1b8f03340425adffe272f672c83bc123456789ab', 'ETH', 'Ethereum (ETH)', '0x1b8f03340425adffe272f672c83bc123456789ab', 'Ethereum ERC-20 Network', true),
  ('Bitcoin Network', 'BTC', '1CV2yhcq8bsVCpfFiQSGNuHJaYAV123456', 'BTC', 'Bitcoin (BTC)', '1CV2yhcq8bsVCpfFiQSGNuHJaYAV123456', 'Bitcoin Native Network', true),
  ('M-Pesa (Till / Paybill)', 'KES', 'Paybill: 247247 / Acc: 987654', 'M-PESA', 'M-Pesa Kenya', 'Paybill: 247247 / Acc: 987654', 'Instant KES Deposit', true)
ON CONFLICT DO NOTHING;

INSERT INTO public.system_settings (key, value)
VALUES
  ('general', '{"platformName": "BinaryPip", "supportEmail": "support@binarypip.com", "maintenanceMode": false}'::jsonb),
  ('trading', '{"maxLeverage": "1:500", "minDepositUSD": 50, "autoApprovalLimit": 1000}'::jsonb),
  ('security', '{"mfaRequiredForAdmins": true, "sessionTimeoutMinutes": 60}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES & PERMISSIONS
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_deposit_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_trade_allocations ENABLE ROW LEVEL SECURITY;

GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, anon, service_role;

DROP POLICY IF EXISTS "Allow all profiles access" ON public.profiles;
CREATE POLICY "Allow all profiles access" ON public.profiles FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all wallets access" ON public.wallets;
CREATE POLICY "Allow all wallets access" ON public.wallets FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all transactions access" ON public.transactions;
CREATE POLICY "Allow all transactions access" ON public.transactions FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all trades access" ON public.trades;
CREATE POLICY "Allow all trades access" ON public.trades FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all profile_documents access" ON public.profile_documents;
CREATE POLICY "Allow all profile_documents access" ON public.profile_documents FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all kyc_cases access" ON public.kyc_cases;
CREATE POLICY "Allow all kyc_cases access" ON public.kyc_cases FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all admin_deposit_addresses access" ON public.admin_deposit_addresses;
CREATE POLICY "Allow all admin_deposit_addresses access" ON public.admin_deposit_addresses FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all audit_logs access" ON public.audit_logs;
CREATE POLICY "Allow all audit_logs access" ON public.audit_logs FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all system_settings access" ON public.system_settings;
CREATE POLICY "Allow all system_settings access" ON public.system_settings FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all user_trade_allocations access" ON public.user_trade_allocations;
CREATE POLICY "Allow all user_trade_allocations access" ON public.user_trade_allocations FOR ALL USING (true);

-- ============================================================================
-- REALTIME PUBLICATIONS FOR ADMIN MONITORING
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profiles') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'wallets') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'transactions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profile_documents') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profile_documents;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'audit_logs') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
  END IF;
END;
$$;
