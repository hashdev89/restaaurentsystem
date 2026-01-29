-- Run this in Supabase: SQL Editor → New query → paste → Run
-- Inserts one default restaurant so checkout and dashboard work.

INSERT INTO restaurants (name, description, address, phone, image, location, is_active, rating, review_count)
VALUES (
  'Default Restaurant',
  'Your restaurant. Edit in Table Editor or re-run with your details.',
  '1 Restaurant St, Your City',
  '+61 2 0000 0000',
  NULL,
  NULL,
  true,
  0,
  0
);

-- Run once. To add more restaurants, repeat the INSERT with different name/address/phone.
