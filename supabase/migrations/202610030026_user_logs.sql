-- ============================================================================
-- BINARYPIP — User Logs Table & Realtime Setup
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'Info',
  ip_address TEXT DEFAULT '—',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES FOR FAST QUERYING
CREATE INDEX IF NOT EXISTS idx_user_logs_created_at ON public.user_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_logs_user_email ON public.user_logs (user_email);
CREATE INDEX IF NOT EXISTS idx_user_logs_action ON public.user_logs (action);

-- RLS POLICIES
ALTER TABLE public.user_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select user_logs" ON public.user_logs;
CREATE POLICY "Allow select user_logs" ON public.user_logs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert user_logs" ON public.user_logs;
CREATE POLICY "Allow insert user_logs" ON public.user_logs FOR INSERT WITH CHECK (true);

-- PUBLISH REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_logs;
