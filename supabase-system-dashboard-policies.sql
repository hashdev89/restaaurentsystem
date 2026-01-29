-- Run in Supabase SQL Editor after supabase-schema.sql and supabase-migrations.sql.
-- Allows System Dashboard (anon key) to list/add/edit restaurants and list/add users.
-- Safe to run more than once (drops then recreates).

-- Restaurants: allow system dashboard to list all, add new, and update (e.g. is_active)
DROP POLICY IF EXISTS "Allow read all restaurants" ON restaurants;
CREATE POLICY "Allow read all restaurants" ON restaurants FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow insert restaurants" ON restaurants;
CREATE POLICY "Allow insert restaurants" ON restaurants FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow update restaurants" ON restaurants;
CREATE POLICY "Allow update restaurants" ON restaurants FOR UPDATE USING (true);

-- Users: allow system dashboard to list and add users
DROP POLICY IF EXISTS "Allow read users" ON users;
CREATE POLICY "Allow read users" ON users FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow insert users" ON users;
CREATE POLICY "Allow insert users" ON users FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow update users" ON users;
CREATE POLICY "Allow update users" ON users FOR UPDATE USING (true);
