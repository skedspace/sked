-- Grant table privileges to the PostgREST API roles.
--
-- Migrations 00001-00039 create 40 tables, enable RLS on every one, and define
-- policies — but never GRANT any DML privilege to anon / authenticated /
-- service_role. Those roles ended up with only REFERENCES, TRIGGER and TRUNCATE,
-- so every request through the Data API failed with:
--     42501: permission denied for table <name>
-- including service_role, which the Command Center depends on.
--
-- GRANT and RLS are two independent gates in Postgres: GRANT decides whether a
-- role may touch the table at all, RLS decides which rows it sees. The schema
-- only ever configured the second one. This restores the first, matching the
-- privileges a stock Supabase project ships with.
--
-- Safety: every public table has RLS enabled, so row access stays governed by
-- the existing policies. campaign_otps and platform_subscription_webhook_events
-- have RLS on with zero policies, which keeps them deny-all for anon and
-- authenticated. service_role bypasses RLS by design.

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- Tables created by later migrations inherit the same privileges.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
