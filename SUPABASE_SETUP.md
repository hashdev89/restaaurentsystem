# Supabase setup – create tables

All tables needed for the updated app are in **supabase-schema.sql** + **supabase-migrations.sql**.

| Table | Used by |
|-------|--------|
| **restaurants** | Default restaurant (rest_1), FKs for orders/tables/inventory |
| **menu_items** | Menu (optional; app also uses mock). Migrations add `barcode`, `stock_quantity` |
| **orders** | Checkout, Restaurant Dashboard, POS Orders, KDS – create, list, update status |
| **order_items** | Line items for each order |
| **tables** | Dashboard Tables & QR – create tables, list for QR codes |
| **inventory** | Dashboard Stock, POS barcode – barcode items, quantity, print labels |
| **seat_bookings** | Bookings API – table bookings |
| **users** | Auth (optional); schema includes for future use |

Run the SQL in your Supabase project in this order.

## Step 1: Run main schema

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project **iyzczhszqmqjqrqnkpeg**.
2. Go to **SQL Editor**.
3. Copy the full contents of **`supabase-schema.sql`**.
4. Paste into the editor and click **Run**.

This creates: `restaurants`, `menu_items`, `orders`, `order_items`, `users`, `tables`, `seat_bookings`, indexes, RLS, and policies.

## Step 2: Run migrations

1. In the same **SQL Editor**, open a **New query**.
2. Copy the full contents of **`supabase-migrations.sql`**.
3. Paste and click **Run**.

This adds: `barcode` and `stock_quantity` on `menu_items`, creates `inventory`, and adds policies so the app can read/update orders and manage tables/inventory with the anon key.

## Step 3: Seed one restaurant (for orders/tables/inventory)

1. **New query** in SQL Editor.
2. Run:

```sql
INSERT INTO restaurants (name, description, address, phone, location)
VALUES (
  'The Rocks Cafe',
  'Authentic Australian cuisine with modern twists.',
  '123 George Street, The Rocks, Sydney NSW 2000',
  '(02) 9251 2345',
  'The Rocks, Sydney'
)
RETURNING id, name;
```

3. Copy the returned **`id`** (UUID).

## Step 4: Set default restaurant in `.env.local`

Add to your `.env.local` (use the UUID from Step 3):

```env
NEXT_PUBLIC_DEFAULT_RESTAURANT_ID=paste-the-uuid-here
```

Restart the app (`npm run dev`). Orders, tables, and inventory will use this restaurant when the app uses `rest_1`.

---

**If you see "No restaurant in database"**  
Run **Step 3** above (the `INSERT INTO restaurants ...` query), or run **`supabase-seed-restaurant.sql`** in the SQL Editor. Or add a restaurant from **System Dashboard** → [http://localhost:3000/system/dashboard](http://localhost:3000/system/dashboard) → Restaurants → Add Restaurant.

**System Dashboard (add restaurants / users from the app)**  
To let the System Dashboard create and edit restaurants and users, run **`supabase-system-dashboard-policies.sql`** in the SQL Editor once. Then you can add restaurants and users from the UI.

**System Settings (save settings to the database)**  
To persist System Dashboard → Settings (business name, tax rate, currency, timezone, features), run **`supabase-system-settings.sql`** in the SQL Editor once. This creates the `system_settings` table and inserts a default row. After that, "Save settings" will store values in Supabase.
