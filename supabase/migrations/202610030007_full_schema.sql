-- ============================================================================
-- BINARYPIP / EXSTRADE COMPLETE SUPABASE DATABASE SCHEMA
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

-- Ensure all columns exist if profiles table was already partially created
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

-- 3. ACCOUNT ACTIVITIES TABLE
CREATE TABLE IF NOT EXISTS public.account_activities (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  summary TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. TRANSACTIONS TABLE
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

-- 5. TRADES TABLE
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

-- 6. PROFILE DOCUMENTS TABLE (KYC Uploads)
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

-- 7. KYC CASES TABLE
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

-- 8. PROFILE SUITABILITY RESPONSES TABLE
CREATE TABLE IF NOT EXISTS public.profile_suitability_responses (
  user_id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  primary_goal TEXT NOT NULL,
  income_band TEXT NOT NULL,
  derivative_experience TEXT NOT NULL,
  risk_percentage INTEGER NOT NULL CHECK (risk_percentage BETWEEN 0 AND 100),
  referral_source TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. ADMIN DEPOSIT ADDRESSES TABLE
CREATE TABLE IF NOT EXISTS public.admin_deposit_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain TEXT NOT NULL,
  asset TEXT NOT NULL,
  address TEXT NOT NULL,
  qr_code TEXT DEFAULT '',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users (id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  ip_address TEXT DEFAULT '',
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. SYSTEM SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. USER TRADE ALLOCATIONS TABLE
CREATE TABLE IF NOT EXISTS public.user_trade_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users (id) ON DELETE CASCADE,
  tier TEXT NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- AUTOMATIC NEW USER SETUP TRIGGER & FUNCTIONS
-- ============================================================================

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_key;

CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role TEXT := 'client';
  v_full_name TEXT := '';
  v_username TEXT := '';
BEGIN
  v_full_name := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    SPLIT_PART(NEW.email, '@', 1)
  );

  v_username := COALESCE(
    NULLIF(NEW.raw_user_meta_data ->> 'username', ''),
    'user_' || SUBSTR(REPLACE(NEW.id::text, '-', ''), 1, 8)
  );

  IF NEW.email ILIKE '%admin%'
     OR NEW.email = 'loskiterer@gmail.com'
     OR NEW.email = 'mutuagedeon77@gmail.com'
     OR NEW.email LIKE '%@binarypip.com'
     OR NEW.email LIKE '%@exstrade.com'
  THEN
    v_role := 'admin';
  END IF;

  BEGIN
    INSERT INTO public.profiles (
      id, full_name, username, email, phone, country, role, updated_at
    )
    VALUES (
      NEW.id,
      v_full_name,
      v_username,
      COALESCE(NEW.email, ''),
      COALESCE(NEW.raw_user_meta_data ->> 'phone', ''),
      COALESCE(NEW.raw_user_meta_data ->> 'country', 'Global'),
      v_role,
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      email = EXCLUDED.email,
      role = CASE WHEN EXCLUDED.role = 'admin' THEN 'admin' ELSE public.profiles.role END,
      updated_at = NOW();
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  BEGIN
    INSERT INTO public.wallets (user_id, live_balance, demo_balance)
    VALUES (NEW.id, 0.00, 10000.00)
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_full_setup ON auth.users;
CREATE TRIGGER on_auth_user_created_full_setup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_signup();

-- Profile update activity log trigger
CREATE OR REPLACE FUNCTION public.record_profile_update_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.full_name IS DISTINCT FROM OLD.full_name OR NEW.phone IS DISTINCT FROM OLD.phone THEN
    INSERT INTO public.account_activities (user_id, event_type, summary)
    VALUES (NEW.id, 'profile_updated', 'Your profile details were updated.');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_updated_record_activity ON public.profiles;
CREATE TRIGGER on_profile_updated_record_activity
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.record_profile_update_activity();

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('profile-avatars', 'profile-avatars', false, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('kyc-documents', 'kyc-documents', false, 5242880, ARRAY['image/jpeg', 'image/png', 'application/pdf'])
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES & PERMISSIONS
-- ============================================================================

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_suitability_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_deposit_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_trade_allocations ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, anon, service_role;

-- Profiles Policies
DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Wallets Policies
DROP POLICY IF EXISTS "Public read wallets" ON public.wallets;
CREATE POLICY "Public read wallets" ON public.wallets FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users and admin write wallets" ON public.wallets;
CREATE POLICY "Users and admin write wallets" ON public.wallets FOR ALL USING (true);

-- Account Activities Policies
DROP POLICY IF EXISTS "Users read own activity" ON public.account_activities;
CREATE POLICY "Users read own activity" ON public.account_activities FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Transactions Policies
DROP POLICY IF EXISTS "Public transactions access" ON public.transactions;
CREATE POLICY "Public transactions access" ON public.transactions FOR ALL USING (true);

-- Trades Policies
DROP POLICY IF EXISTS "Public trades access" ON public.trades;
CREATE POLICY "Public trades access" ON public.trades FOR ALL USING (true);

-- Profile Documents Policies
DROP POLICY IF EXISTS "Public profile documents access" ON public.profile_documents;
CREATE POLICY "Public profile documents access" ON public.profile_documents FOR ALL USING (true);

-- KYC Cases Policies
DROP POLICY IF EXISTS "Public kyc cases access" ON public.kyc_cases;
CREATE POLICY "Public kyc cases access" ON public.kyc_cases FOR ALL USING (true);

-- Profile Suitability Policies
DROP POLICY IF EXISTS "Public suitability access" ON public.profile_suitability_responses;
CREATE POLICY "Public suitability access" ON public.profile_suitability_responses FOR ALL USING (true);

-- Admin Deposit Addresses Policies
DROP POLICY IF EXISTS "Public deposit addresses access" ON public.admin_deposit_addresses;
CREATE POLICY "Public deposit addresses access" ON public.admin_deposit_addresses FOR ALL USING (true);

-- Audit Logs Policies
DROP POLICY IF EXISTS "Public audit logs access" ON public.audit_logs;
CREATE POLICY "Public audit logs access" ON public.audit_logs FOR ALL USING (true);

-- System Settings Policies
DROP POLICY IF EXISTS "Public system settings access" ON public.system_settings;
CREATE POLICY "Public system settings access" ON public.system_settings FOR ALL USING (true);

-- User Trade Allocations Policies
DROP POLICY IF EXISTS "Public trade allocations access" ON public.user_trade_allocations;
CREATE POLICY "Public trade allocations access" ON public.user_trade_allocations FOR ALL USING (true);

-- Storage Objects Policies
DROP POLICY IF EXISTS "Storage avatars select" ON storage.objects;
CREATE POLICY "Storage avatars select" ON storage.objects FOR SELECT USING (bucket_id = 'profile-avatars');

DROP POLICY IF EXISTS "Storage avatars insert" ON storage.objects;
CREATE POLICY "Storage avatars insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'profile-avatars');

DROP POLICY IF EXISTS "Storage avatars delete" ON storage.objects;
CREATE POLICY "Storage avatars delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'profile-avatars');

DROP POLICY IF EXISTS "Storage kyc select" ON storage.objects;
CREATE POLICY "Storage kyc select" ON storage.objects FOR SELECT USING (bucket_id = 'kyc-documents');

DROP POLICY IF EXISTS "Storage kyc insert" ON storage.objects;
CREATE POLICY "Storage kyc insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'kyc-documents');

-- ============================================================================
-- REALTIME PUBLICATIONS
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profiles') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'account_activities') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.account_activities;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'wallets') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'transactions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'trades') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.trades;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'kyc_cases') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.kyc_cases;
  END IF;
END;
$$;
