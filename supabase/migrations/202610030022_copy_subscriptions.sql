-- NEXSMARKETS / BinaryPip — Copy Trading Subscriptions Table Migration
-- Enables real-time copy trading subscription tracking per follower & account type

CREATE TABLE IF NOT EXISTS public.copy_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    master_trader_id TEXT NOT NULL,
    master_trader_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    account_type TEXT NOT NULL CHECK (account_type IN ('real', 'demo', 'live')),
    allocated_amount NUMERIC(12, 2) NOT NULL CHECK (allocated_amount > 0),
    copy_ratio NUMERIC(5, 2) NOT NULL DEFAULT 1.0,
    stop_loss_limit NUMERIC(12, 2) DEFAULT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'stopped')) DEFAULT 'active',
    total_copied_profit NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partial unique index to prevent duplicate active/paused copy subscriptions on the same account
CREATE UNIQUE INDEX IF NOT EXISTS idx_copy_subs_unique_active
ON public.copy_subscriptions (follower_id, master_trader_id, account_type)
WHERE status != 'stopped';

-- Performance index for follower queries
CREATE INDEX IF NOT EXISTS idx_copy_subs_follower_acc
ON public.copy_subscriptions (follower_id, account_type, status);

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_copy_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_copy_subscriptions_updated_at ON public.copy_subscriptions;
CREATE TRIGGER trg_copy_subscriptions_updated_at
    BEFORE UPDATE ON public.copy_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_copy_subscriptions_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE public.copy_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own copy subscriptions" ON public.copy_subscriptions;
CREATE POLICY "Users can view their own copy subscriptions"
ON public.copy_subscriptions FOR SELECT
USING (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users can create their own copy subscriptions" ON public.copy_subscriptions;
CREATE POLICY "Users can create their own copy subscriptions"
ON public.copy_subscriptions FOR INSERT
WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users can update their own copy subscriptions" ON public.copy_subscriptions;
CREATE POLICY "Users can update their own copy subscriptions"
ON public.copy_subscriptions FOR UPDATE
USING (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users can delete their own copy subscriptions" ON public.copy_subscriptions;
CREATE POLICY "Users can delete their own copy subscriptions"
ON public.copy_subscriptions FOR DELETE
USING (auth.uid() = follower_id);

-- Enable Realtime for copy_subscriptions table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.copy_subscriptions;
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;
