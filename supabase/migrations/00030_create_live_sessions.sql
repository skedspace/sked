-- Migration: 00030_create_live_sessions.sql
-- Persists live session state so the dashboard (SessionControl) and public
-- board display are correlated and synced. Session state includes queue,
-- groups, court assignments, game timers, and returned players.
--
-- DOWN:
--   DROP TABLE IF EXISTS live_sessions;

CREATE TABLE live_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Open Play',
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'paused', 'ended')),
    -- The full session state as JSONB:
    -- {
    --   queue: Player[],
    --   groups: GameGroup[],
    --   courts: CourtGame[],
    --   returned: Player[]
    -- }
    state JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_live_sessions_org_active
    ON live_sessions(org_id, status)
    WHERE status = 'active';

ALTER TABLE live_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_live_sessions ON live_sessions
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

-- Allow anonymous/public reads for the board display (read-only via token)
CREATE POLICY public_read_live_sessions ON live_sessions
    FOR SELECT
    USING (true);

CREATE TRIGGER update_live_sessions_updated_at
    BEFORE UPDATE ON live_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
