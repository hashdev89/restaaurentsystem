-- Run this after supabase-schema.sql to add QR/table, barcode and stock support.

-- Add barcode and stock to menu_items (optional use by POS/API)
ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS barcode TEXT,
  ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_menu_items_barcode ON menu_items(barcode) WHERE barcode IS NOT NULL;

-- Inventory table: barcode-scannable items (e.g. water bottles) for POS and stock
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  barcode TEXT NOT NULL,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(restaurant_id, barcode)
);

CREATE INDEX IF NOT EXISTS idx_inventory_restaurant ON inventory(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_barcode ON inventory(restaurant_id, barcode);

ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read inventory" ON inventory FOR SELECT USING (true);
CREATE POLICY "Allow insert inventory" ON inventory FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update inventory" ON inventory FOR UPDATE USING (true);

-- Allow app (anon key) to read and update orders (dashboard, POS, KDS)
DROP POLICY IF EXISTS "Restaurant owners can view their orders" ON orders;
DROP POLICY IF EXISTS "Restaurant owners can update their orders" ON orders;
CREATE POLICY "Allow read orders" ON orders FOR SELECT USING (true);
CREATE POLICY "Allow update orders" ON orders FOR UPDATE USING (true);

-- Allow app to create tables (dashboard Tables & QR)
CREATE POLICY "Allow insert tables" ON tables FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update tables" ON tables FOR UPDATE USING (true);
