-- ============================================================================
-- TRANSACTIONS & WALLETS DATABASE SYNC SCRIPT
-- Guarantees transaction approvals, wallet balance credits, and status sync
-- ============================================================================

-- 1. Ensure transactions table structure and status check constraint
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'deposit', 'withdrawal', 'adjustment'
    amount NUMERIC(15, 2) NOT NULL,
    bonus_amount NUMERIC(15, 2) DEFAULT 0.00,
    total_amount NUMERIC(15, 2) NOT NULL,
    asset VARCHAR(20) DEFAULT 'USD',
    gateway_network VARCHAR(100) DEFAULT 'MPESA',
    reference_code TEXT DEFAULT '',
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'flagged'
    admin_notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Function to automatically credit/debit wallet when transaction is approved
CREATE OR REPLACE FUNCTION public.process_transaction_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only trigger when status changes to 'approved'
    IF (NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved')) THEN
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

DROP TRIGGER IF EXISTS on_transaction_approved ON public.transactions;
CREATE TRIGGER on_transaction_approved
    AFTER UPDATE OF status ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.process_transaction_approval();

-- 3. Grants & RLS policies
GRANT ALL ON TABLE public.transactions TO anon, authenticated, service_role;
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;

-- 4. Ensure Realtime publishing for transactions
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;
