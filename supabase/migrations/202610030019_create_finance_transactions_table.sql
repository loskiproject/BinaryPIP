-- ============================================================================
-- BINARYPIP / EXSTRADE FINANCE & TRANSACTIONS DATABASE TABLE
-- Dedicated SQL Migration Script to create and manage Finance Data in Supabase
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CREATE FINANCE TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'deposit', 'withdrawal', 'adjustment'
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    bonus_amount NUMERIC(15, 2) DEFAULT 0.00,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    asset VARCHAR(20) DEFAULT 'USD',
    gateway_network VARCHAR(100) DEFAULT 'MPESA', -- 'MPESA', 'USDT-TRC20', 'BTC', 'ETH', 'BANK_WIRE'
    reference_code TEXT DEFAULT '',
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'completed', 'rejected', 'flagged'
    admin_notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure updated_at column exists
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create Indexes for fast querying in Admin Finance Portal
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);

-- 2. AUTOMATIC WALLET CREDIT/DEBIT TRIGGER ON APPROVAL
CREATE OR REPLACE FUNCTION public.process_finance_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- When Admin approves or completes a transaction:
    IF ((NEW.status = 'approved' OR NEW.status = 'completed') AND (OLD.status IS NULL OR (OLD.status != 'approved' AND OLD.status != 'completed'))) THEN
        IF NEW.type = 'deposit' THEN
            UPDATE public.wallets
            SET live_balance = live_balance + COALESCE(NEW.total_amount, NEW.amount),
                updated_at = NOW()
            WHERE user_id = NEW.user_id;
        ELSIF NEW.type = 'withdrawal' THEN
            UPDATE public.wallets
            SET live_balance = GREATEST(0, live_balance - NEW.amount),
                updated_at = NOW()
            WHERE user_id = NEW.user_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_process_finance_approval ON public.transactions;
CREATE TRIGGER trg_process_finance_approval
    AFTER UPDATE OF status ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.process_finance_approval();

-- 3. GRANTS & ACCESS PERMISSIONS
GRANT ALL ON TABLE public.transactions TO anon, authenticated, service_role;
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;

-- 4. REALTIME REPLICATION FOR LIVE ADMIN-CLIENT SYNC
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;
