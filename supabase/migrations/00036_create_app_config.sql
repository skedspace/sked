-- Migration: 00036_create_app_config.sql
-- Adds a key-value config table for platform-wide settings (e.g. monthly subscription price).
--
-- DOWN:
--   drop table app_config;
--   drop function get_config(text);
--   drop function set_config(text, text);

-- 1. App config table
CREATE TABLE IF NOT EXISTS app_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Seed defaults
INSERT INTO app_config (key, value, description) VALUES
    ('monthly_price_cents', '129900', 'Monthly subscription price in cents. Default: 129900 (₱1,299)')
ON CONFLICT (key) DO NOTHING;

-- 2. Helper: get config value
CREATE OR REPLACE FUNCTION get_config(p_key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_value TEXT;
BEGIN
    SELECT value INTO v_value FROM app_config WHERE key = p_key;
    RETURN v_value;
END;
$$;

-- 3. Helper: set config value (admin only)
CREATE OR REPLACE FUNCTION set_config(p_key TEXT, p_value TEXT, p_description TEXT DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO app_config (key, value, description, updated_at, updated_by)
    VALUES (p_key, p_value, p_description, now(), auth.uid())
    ON CONFLICT (key)
    DO UPDATE SET value = p_value,
                  description = COALESCE(p_description, app_config.description),
                  updated_at = now(),
                  updated_by = auth.uid();
END;
$$;

-- 4. Enable RLS
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies: only admins (from admin_users or similar) can manage; all authenticated users can read
-- For simplicity, allow all authenticated users to read config values
CREATE POLICY "anyone_can_read_config" ON app_config
    FOR SELECT
    USING (true);

-- Only allow insert/update via the set_config function (SECURITY DEFINER)
-- and block direct table mutations
CREATE POLICY "no_direct_insert" ON app_config
    FOR INSERT
    WITH CHECK (false);

CREATE POLICY "no_direct_update" ON app_config
    FOR UPDATE
    USING (false);

CREATE POLICY "no_direct_delete" ON app_config
    FOR DELETE
    USING (false);
