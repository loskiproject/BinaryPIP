-- ============================================================================
-- BINARYPIP — AI Security Guardian Tables & Realtime Setup
-- ============================================================================

-- 1. SECURITY EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  user_email TEXT DEFAULT '—',
  ip_address TEXT DEFAULT '127.0.0.1',
  subnet TEXT DEFAULT '127.0.0.0/24',
  user_agent TEXT DEFAULT 'BinaryPip Client',
  action_taken TEXT DEFAULT 'Logged',
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 2. BLOCKED IPS TABLE
CREATE TABLE IF NOT EXISTS public.blocked_ips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_or_subnet TEXT UNIQUE NOT NULL,
  reason TEXT DEFAULT 'Suspicious activity detected',
  blocked_by TEXT DEFAULT 'AI Security Guardian',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. SECURITY SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.security_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  lockdown_mode BOOLEAN NOT NULL DEFAULT false,
  withdrawals_frozen BOOLEAN NOT NULL DEFAULT false,
  strict_2fa_enforced BOOLEAN NOT NULL DEFAULT true,
  auto_block_brute_force BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INSERT DEFAULT SETTINGS ROW IF NOT EXISTS
INSERT INTO public.security_settings (id, lockdown_mode, withdrawals_frozen, strict_2fa_enforced, auto_block_brute_force)
VALUES (1, false, false, true, true)
ON CONFLICT (id) DO NOTHING;

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_sec_events_created_at ON public.security_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sec_events_severity ON public.security_events (severity);
CREATE INDEX IF NOT EXISTS idx_sec_events_type ON public.security_events (event_type);

-- RLS POLICIES
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select security_events" ON public.security_events;
CREATE POLICY "Allow select security_events" ON public.security_events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert security_events" ON public.security_events;
CREATE POLICY "Allow insert security_events" ON public.security_events FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow select blocked_ips" ON public.blocked_ips;
CREATE POLICY "Allow select blocked_ips" ON public.blocked_ips FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert blocked_ips" ON public.blocked_ips;
CREATE POLICY "Allow insert blocked_ips" ON public.blocked_ips FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete blocked_ips" ON public.blocked_ips;
CREATE POLICY "Allow delete blocked_ips" ON public.blocked_ips FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow select security_settings" ON public.security_settings;
CREATE POLICY "Allow select security_settings" ON public.security_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow update security_settings" ON public.security_settings;
CREATE POLICY "Allow update security_settings" ON public.security_settings FOR UPDATE USING (true);

-- PUBLISH REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.security_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.blocked_ips;
ALTER PUBLICATION supabase_realtime ADD TABLE public.security_settings;
