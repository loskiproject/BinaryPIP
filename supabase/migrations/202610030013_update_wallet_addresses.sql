-- ============================================================================
-- UPDATE ADMIN DEPOSIT / RECEIVING WALLET ADDRESSES
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- ============================================================================

-- Ensure columns match what both frontend queries use
ALTER TABLE public.admin_deposit_addresses ADD COLUMN IF NOT EXISTS network TEXT;
ALTER TABLE public.admin_deposit_addresses ADD COLUMN IF NOT EXISTS asset_name TEXT;
ALTER TABLE public.admin_deposit_addresses ADD COLUMN IF NOT EXISTS wallet_address TEXT;
ALTER TABLE public.admin_deposit_addresses ADD COLUMN IF NOT EXISTS note TEXT DEFAULT '';
ALTER TABLE public.admin_deposit_addresses ADD COLUMN IF NOT EXISTS chain TEXT;
ALTER TABLE public.admin_deposit_addresses ADD COLUMN IF NOT EXISTS asset TEXT;
ALTER TABLE public.admin_deposit_addresses ADD COLUMN IF NOT EXISTS address TEXT;

-- Clear previous default addresses and insert the new ones
DELETE FROM public.admin_deposit_addresses;

INSERT INTO public.admin_deposit_addresses (
  chain,
  asset,
  address,
  network,
  asset_name,
  wallet_address,
  note,
  enabled
) VALUES
  (
    'Tron (TRC-20)',
    'USDT',
    'TB4TkYeuqjGsP7bkfeMbUJdZEjCuKHnzqp',
    'USDT-TRC20',
    'Tether (USDT TRON)',
    'TB4TkYeuqjGsP7bkfeMbUJdZEjCuKHnzqp',
    'Send USDT on TRON (TRC-20) network only.',
    true
  ),
  (
    'Ethereum (ERC-20)',
    'ETH',
    '0x1b8f03340425adffe272f672c0a905a066a4d75d',
    'ETH',
    'Ethereum (ETH)',
    '0x1b8f03340425adffe272f672c0a905a066a4d75d',
    'Send ETH on Ethereum (ERC-20) mainnet.',
    true
  ),
  (
    'Bitcoin Network',
    'BTC',
    '1CV2yhcq8bsVCpfFiQSGNuHJaYAVUQtahS',
    'BTC',
    'Bitcoin (BTC)',
    '1CV2yhcq8bsVCpfFiQSGNuHJaYAVUQtahS',
    'Send BTC over Native Bitcoin mainnet.',
    true
  );
