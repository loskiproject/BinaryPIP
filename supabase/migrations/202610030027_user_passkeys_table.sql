-- ============================================================================
-- BINARYPIP — User Passkeys Database Table & Realtime Setup
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_passkeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  credential_id TEXT UNIQUE NOT NULL,
  public_key TEXT DEFAULT '',
  friendly_name TEXT NOT NULL DEFAULT 'BinaryPIP Device Passkey',
  counter INTEGER NOT NULL DEFAULT 0,
  device_type TEXT DEFAULT 'Biometric Device',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_user_passkeys_user_email ON public.user_passkeys (user_email);
CREATE INDEX IF NOT EXISTS idx_user_passkeys_credential_id ON public.user_passkeys (credential_id);

-- RLS POLICIES
ALTER TABLE public.user_passkeys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select user_passkeys" ON public.user_passkeys;
CREATE POLICY "Allow select user_passkeys" ON public.user_passkeys FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert user_passkeys" ON public.user_passkeys;
CREATE POLICY "Allow insert user_passkeys" ON public.user_passkeys FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update user_passkeys" ON public.user_passkeys;
CREATE POLICY "Allow update user_passkeys" ON public.user_passkeys FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow delete user_passkeys" ON public.user_passkeys;
CREATE POLICY "Allow delete user_passkeys" ON public.user_passkeys FOR DELETE USING (true);

-- PUBLISH REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_passkeys;
