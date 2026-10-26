-- Migration: 202610030015_add_trading_mode_column.sql
-- Description: Adds trading_mode column to public.profiles table for Admin Profit/Loss allocation persistence.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trading_mode VARCHAR(20) DEFAULT 'PROFIT';
GRANT ALL ON TABLE public.profiles TO anon, authenticated, service_role;
