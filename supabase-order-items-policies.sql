-- Run in Supabase SQL Editor to allow creating and reading order items.
-- Required when placing an order (orders API inserts into order_items).

-- Allow insert: app creates order_items when an order is placed
DROP POLICY IF EXISTS "Allow insert order_items" ON order_items;
CREATE POLICY "Allow insert order_items" ON order_items FOR INSERT WITH CHECK (true);

-- Allow select: app reads order_items when fetching orders (e.g. GET /api/orders)
DROP POLICY IF EXISTS "Allow select order_items" ON order_items;
CREATE POLICY "Allow select order_items" ON order_items FOR SELECT USING (true);
