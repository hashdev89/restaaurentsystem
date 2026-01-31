-- Restaurant login: add password storage to users
-- Run this in Supabase SQL Editor after your main schema

-- Add password_hash column (nullable for existing users)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Optional: ensure one restaurant user per restaurant (optional unique)
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_users_restaurant_unique
-- ON users(restaurant_id) WHERE role = 'restaurant' AND restaurant_id IS NOT NULL;
