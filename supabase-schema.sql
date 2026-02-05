-- ============================================================
-- EasyMenu / Restaurant – Supabase schema for orders & checkout
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- Enable UUID extension (usually already on)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------------
-- 1. RESTAURANTS (must exist before orders / menu_items)
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  image TEXT,
  location TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  rating NUMERIC(3,2) NOT NULL DEFAULT 0,
  review_count INTEGER NOT NULL DEFAULT 0,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  pos_enabled BOOLEAN NOT NULL DEFAULT true,
  kds_enabled BOOLEAN NOT NULL DEFAULT true,
  pos_pin_required BOOLEAN NOT NULL DEFAULT false,
  kds_pin_required BOOLEAN NOT NULL DEFAULT false,
  access_pos_pin TEXT,
  access_kds_pin TEXT,
  sunday_surcharge_enabled BOOLEAN NOT NULL DEFAULT false,
  sunday_surcharge_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  public_holiday_surcharge_enabled BOOLEAN NOT NULL DEFAULT false,
  public_holiday_surcharge_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  public_holiday_dates JSONB DEFAULT '[]'::jsonb,
  surcharge_manual_override TEXT DEFAULT 'auto',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------
-- 2. MENU_ITEMS (referenced by order_items.menu_item_id)
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL,
  category TEXT NOT NULL DEFAULT 'Other',
  image TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  customizations JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_id ON menu_items(restaurant_id);

-- --------------------------------------------------------------
-- 3. ORDERS
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  total NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  order_type TEXT NOT NULL DEFAULT 'pickup',
  table_number TEXT,
  special_requests TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  square_payment_id TEXT,
  estimated_ready_time TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- --------------------------------------------------------------
-- 4. ORDER_ITEMS (line items for each order)
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_menu_item_id ON order_items(menu_item_id);

-- --------------------------------------------------------------
-- 5. RLS (Row Level Security) – allow app to create/read orders
-- If your app uses the anon key, enable these so checkout works.
-- --------------------------------------------------------------
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Policies: allow all operations for anon and authenticated (app backend)
-- Adjust or remove if you use service_role key only.

DROP POLICY IF EXISTS "Allow read restaurants" ON restaurants;
CREATE POLICY "Allow read restaurants" ON restaurants FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow read menu_items" ON menu_items;
CREATE POLICY "Allow read menu_items" ON menu_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow all orders" ON orders;
CREATE POLICY "Allow all orders" ON orders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all order_items" ON order_items;
CREATE POLICY "Allow all order_items" ON order_items FOR ALL USING (true) WITH CHECK (true);

-- --------------------------------------------------------------
-- 6. Optional: seed one restaurant (copy the returned id to .env)
-- --------------------------------------------------------------
-- INSERT INTO restaurants (name, description, address, phone, location)
-- VALUES (
--   'The Rocks Cafe',
--   'Authentic Australian cuisine.',
--   '123 George Street, The Rocks, Sydney NSW 2000',
--   '(02) 9251 2345',
--   'The Rocks, Sydney'
-- )
-- ON CONFLICT DO NOTHING
-- RETURNING id, name;
