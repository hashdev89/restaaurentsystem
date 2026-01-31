-- Allow restaurant delete: API needs to UPDATE users (unlink) and DELETE restaurant.
-- Option 1 (recommended): Set SUPABASE_SERVICE_ROLE_KEY in .env (Supabase → Settings → API → service_role). No SQL needed.
-- Option 2: Run this in Supabase SQL Editor if you don't use the service role key (RLS will allow anon to update users and delete restaurants).

-- Allow updating users (e.g. set restaurant_id to null when deleting a restaurant)
DROP POLICY IF EXISTS "Allow update users restaurant_id" ON users;
CREATE POLICY "Allow update users restaurant_id" ON users
  FOR UPDATE USING (true) WITH CHECK (true);

-- Allow deleting restaurants (system dashboard / API)
DROP POLICY IF EXISTS "Allow delete restaurants" ON restaurants;
CREATE POLICY "Allow delete restaurants" ON restaurants
  FOR DELETE USING (true);
