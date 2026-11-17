-- ============================================================================
-- BINARYPIP — Master Trader Applications & Auto-Approval Schema
-- ============================================================================

-- 1. MASTER TRADER APPLICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.master_trader_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT DEFAULT '',
  risk_level TEXT NOT NULL CHECK (risk_level IN ('Low', 'Medium', 'High')),
  strategy_tag TEXT NOT NULL DEFAULT 'Vol 100 & Gold Scalping',
  bio TEXT NOT NULL DEFAULT '',
  application_fee NUMERIC(18,2) NOT NULL DEFAULT 500.00,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. MASTER TRADERS TABLE (Published Master Traders)
CREATE TABLE IF NOT EXISTS public.master_traders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT DEFAULT '',
  is_verified BOOLEAN NOT NULL DEFAULT true,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('Low', 'Medium', 'High')),
  strategy_tag TEXT NOT NULL DEFAULT 'Vol 100 & Gold Scalping',
  bio TEXT NOT NULL DEFAULT '',
  win_rate NUMERIC(5,2) NOT NULL DEFAULT 92.50,
  total_profit NUMERIC(18,2) NOT NULL DEFAULT 15000.00,
  copiers_count INTEGER NOT NULL DEFAULT 12,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES FOR FAST QUERYING
CREATE INDEX IF NOT EXISTS idx_mt_app_user_id ON public.master_trader_applications (user_id);
CREATE INDEX IF NOT EXISTS idx_mt_app_status ON public.master_trader_applications (status);
CREATE INDEX IF NOT EXISTS idx_mt_traders_user_id ON public.master_traders (user_id);
CREATE INDEX IF NOT EXISTS idx_mt_traders_is_active ON public.master_traders (is_active);

-- RLS POLICIES
ALTER TABLE public.master_trader_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_traders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select on master_trader_applications" ON public.master_trader_applications;
CREATE POLICY "Allow select on master_trader_applications" ON public.master_trader_applications FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert on master_trader_applications" ON public.master_trader_applications;
CREATE POLICY "Allow insert on master_trader_applications" ON public.master_trader_applications FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update on master_trader_applications" ON public.master_trader_applications;
CREATE POLICY "Allow update on master_trader_applications" ON public.master_trader_applications FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow select on master_traders" ON public.master_traders;
CREATE POLICY "Allow select on master_traders" ON public.master_traders FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert on master_traders" ON public.master_traders;
CREATE POLICY "Allow insert on master_traders" ON public.master_traders FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update on master_traders" ON public.master_traders;
CREATE POLICY "Allow update on master_traders" ON public.master_traders FOR UPDATE USING (true);

-- 3. AUTOMATED APPROVAL TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.handle_master_trader_application_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status <> 'approved') THEN
    INSERT INTO public.master_traders (
      user_id,
      display_name,
      avatar_url,
      is_verified,
      risk_level,
      strategy_tag,
      bio,
      win_rate,
      total_profit,
      copiers_count,
      is_active,
      created_at
    ) VALUES (
      NEW.user_id,
      NEW.display_name,
      COALESCE(NULLIF(NEW.avatar_url, ''), 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'),
      true,
      NEW.risk_level,
      NEW.strategy_tag,
      NEW.bio,
      94.80,
      25000.00,
      15,
      true,
      NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      avatar_url = EXCLUDED.avatar_url,
      is_verified = true,
      risk_level = EXCLUDED.risk_level,
      strategy_tag = EXCLUDED.strategy_tag,
      bio = EXCLUDED.bio,
      is_active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- DROP & RE-CREATE TRIGGER
DROP TRIGGER IF EXISTS trg_approve_master_trader ON public.master_trader_applications;
CREATE TRIGGER trg_approve_master_trader
AFTER UPDATE ON public.master_trader_applications
FOR EACH ROW
EXECUTE FUNCTION public.handle_master_trader_application_approval();

-- PUBLISH REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.master_trader_applications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.master_traders;
