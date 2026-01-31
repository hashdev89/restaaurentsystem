-- Run in Supabase SQL Editor to allow Restaurant Dashboard to create/update/delete menu items.
-- Uses anon key (no auth.uid() required).

DROP POLICY IF EXISTS "Allow insert menu items" ON menu_items;
CREATE POLICY "Allow insert menu items" ON menu_items FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update menu items" ON menu_items;
CREATE POLICY "Allow update menu items" ON menu_items FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete menu items" ON menu_items;
CREATE POLICY "Allow delete menu items" ON menu_items FOR DELETE USING (true);
