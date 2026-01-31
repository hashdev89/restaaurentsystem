-- Add latitude/longitude so restaurants show on the map (Mapbox).
-- Run in Supabase SQL Editor after your main schema.

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Optional: index for map queries by bounds
-- CREATE INDEX IF NOT EXISTS idx_restaurants_lat_lng ON restaurants(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
