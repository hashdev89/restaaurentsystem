-- Add surcharge columns to restaurants (run in Supabase SQL Editor)
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS sunday_surcharge_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS sunday_surcharge_percent NUMERIC(5,2) NOT NULL DEFAULT 0;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS public_holiday_surcharge_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS public_holiday_surcharge_percent NUMERIC(5,2) NOT NULL DEFAULT 0;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS public_holiday_dates JSONB DEFAULT '[]'::jsonb;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS surcharge_manual_override TEXT DEFAULT 'auto';
