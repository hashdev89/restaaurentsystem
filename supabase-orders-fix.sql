-- ============================================================
-- Fix "Failed to create order" – ensure orders & order_items exist
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Restaurants first (referenced by orders and menu_items)
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
  review_count INTEGER NOT NULL DEFAULT 0
);

-- 2. Menu items (referenced by order_items)
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL,
  category TEXT NOT NULL DEFAULT 'Other',
  image TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  customizations JSONB
);

-- 3. Orders
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
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- 4. Order line items
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

-- 5. RLS: allow insert/select so checkout can create orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all orders" ON orders;
CREATE POLICY "Allow all orders" ON orders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all order_items" ON order_items;
CREATE POLICY "Allow all order_items" ON order_items FOR ALL USING (true) WITH CHECK (true);

-- 6. Seed one restaurant if none exist (then set NEXT_PUBLIC_DEFAULT_RESTAURANT_ID in .env)
INSERT INTO restaurants (id, name, description, address, phone, location)
SELECT gen_random_uuid(), 'The Rocks Cafe', 'Australian cuisine.', '123 George Street, Sydney NSW 2000', '(02) 9251 2345', 'Sydney'
WHERE NOT EXISTS (SELECT 1 FROM restaurants LIMIT 1)
RETURNING id, name;
