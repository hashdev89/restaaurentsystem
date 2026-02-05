-- ============================================================
-- Fix: "Could not find the 'special_requests' column of 'orders'"
-- Run in Supabase Dashboard → SQL Editor
-- Adds missing columns to existing orders table
-- ============================================================

-- Add missing columns to orders (IF NOT EXISTS = skip if already there)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS special_requests TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS square_payment_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_ready_time TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'pickup';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS table_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- If payment_status was added, ensure not-null for new rows (optional)
-- ALTER TABLE orders ALTER COLUMN payment_status SET DEFAULT 'pending';
