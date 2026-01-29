-- Run in Supabase SQL Editor (after schema + migrations).
-- Single-row system settings for System Dashboard. Safe to run more than once.

CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL DEFAULT 'RestaurantHub',
  tax_rate DECIMAL(5,2) NOT NULL DEFAULT 10,
  currency TEXT NOT NULL DEFAULT 'AUD',
  timezone TEXT NOT NULL DEFAULT 'Australia/Sydney',
  features JSONB NOT NULL DEFAULT '{"booking":true,"pos":true,"kitchen":true}'::jsonb,
  integrations JSONB NOT NULL DEFAULT '{"square":true,"supabase":true,"mapbox":true}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure exactly one row: insert default if empty
INSERT INTO system_settings (business_name, tax_rate, currency, timezone, features, integrations)
SELECT 'RestaurantHub', 10, 'AUD', 'Australia/Sydney',
  '{"booking":true,"pos":true,"kitchen":true}'::jsonb,
  '{"square":true,"supabase":true,"mapbox":true}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM system_settings LIMIT 1);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read system_settings" ON system_settings;
CREATE POLICY "Allow read system_settings" ON system_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow update system_settings" ON system_settings;
CREATE POLICY "Allow update system_settings" ON system_settings FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Allow insert system_settings" ON system_settings;
CREATE POLICY "Allow insert system_settings" ON system_settings FOR INSERT WITH CHECK (true);
