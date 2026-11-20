-- ============================================================================
-- BINARYPIP — Referral System Schema & Realtime Setup
-- ============================================================================

-- 1. ADD REFERRAL COLUMNS TO PROFILES IF NOT EXISTS
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_rewarded BOOLEAN DEFAULT false;

-- INDEXES FOR FAST QUERYING
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles (referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles (referred_by);

-- 2. AUTOMATICALLY GENERATE REFERRAL CODE FOR NEW PROFILES
CREATE OR REPLACE FUNCTION public.handle_profile_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL OR NEW.referral_code = '' THEN
    NEW.referral_code := 'BPIP' || UPPER(SUBSTRING(REPLACE(GEN_RANDOM_UUID()::text, '-', ''), 1, 4));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_profile_referral_code ON public.profiles;
CREATE TRIGGER trg_profile_referral_code
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_profile_referral_code();

-- UPDATE EXISTING PROFILES WITH REFERRAL CODES
UPDATE public.profiles
SET referral_code = 'BPIP' || UPPER(SUBSTRING(REPLACE(id::text, '-', ''), 1, 4))
WHERE referral_code IS NULL OR referral_code = '';
