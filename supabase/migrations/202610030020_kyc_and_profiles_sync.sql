-- ============================================================================
-- BINARYPIP / EXSTRADE KYC & PROFILE VERIFICATION DATABASE SYNC
-- Dedicated SQL Migration Script to manage KYC approvals and profile sync in Supabase
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ENSURE COLUMNS EXIST ON PROFILE DOCUMENTS & PROFILES TABLES
ALTER TABLE public.profile_documents ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(50) DEFAULT 'unverified';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_status VARCHAR(50) DEFAULT 'active';

-- CREATE KYC CASES TABLE
CREATE TABLE IF NOT EXISTS public.kyc_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider VARCHAR(50) DEFAULT 'manual',
    provider_case_id TEXT DEFAULT '',
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    reviewer_note TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. AUTOMATIC PROFILE KYC SYNC TRIGGER
CREATE OR REPLACE FUNCTION public.sync_profile_kyc_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- When KYC case or document is approved or verified:
    IF (NEW.status = 'approved' OR NEW.status = 'verified') THEN
        UPDATE public.profiles
        SET kyc_status = 'verified',
            account_status = 'active',
            updated_at = NOW()
        WHERE id = NEW.user_id;

        UPDATE public.profile_documents
        SET status = 'verified',
            reviewed_at = NOW()
        WHERE user_id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_kyc_case_approval ON public.kyc_cases;
CREATE TRIGGER trg_sync_kyc_case_approval
    AFTER INSERT OR UPDATE OF status ON public.kyc_cases
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_profile_kyc_approval();

DROP TRIGGER IF EXISTS trg_sync_profile_doc_approval ON public.profile_documents;
CREATE TRIGGER trg_sync_profile_doc_approval
    AFTER UPDATE OF status ON public.profile_documents
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_profile_kyc_approval();

-- 3. MARKS EXISTING PROFILES WITH PENDING DOCUMENTS AS VERIFIED
UPDATE public.profiles
SET kyc_status = 'verified',
    account_status = 'active',
    updated_at = NOW()
WHERE kyc_status = 'pending';

UPDATE public.profile_documents
SET status = 'verified',
    reviewed_at = NOW()
WHERE status = 'pending';

UPDATE public.kyc_cases
SET status = 'approved',
    updated_at = NOW()
WHERE status = 'pending';

-- 4. GRANTS & ACCESS PERMISSIONS
GRANT ALL ON TABLE public.kyc_cases TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.profile_documents TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.profiles TO anon, authenticated, service_role;

ALTER TABLE public.kyc_cases DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 5. REALTIME REPLICATION FOR LIVE ADMIN-CLIENT SYNC
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.kyc_cases;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.profile_documents;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;
