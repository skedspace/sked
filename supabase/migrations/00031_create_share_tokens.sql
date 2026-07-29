-- Migration: 00031_create_share_tokens.sql
-- Persists board share tokens in the database instead of in-memory Map.
--
-- DOWN:
--   DROP TABLE IF EXISTS share_tokens;

CREATE TABLE share_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days')
);

CREATE INDEX idx_share_tokens_token ON share_tokens(token);
CREATE INDEX idx_share_tokens_org ON share_tokens(org_id);
CREATE INDEX idx_share_tokens_expires ON share_tokens(expires_at);

ALTER TABLE share_tokens ENABLE ROW LEVEL SECURITY;

-- Allow public reads so the shared board page can validate tokens
CREATE POLICY public_read_share_tokens ON share_tokens
    FOR SELECT
    USING (true);

-- Allow authenticated inserts (dashboard users creating share links)
CREATE POLICY auth_insert_share_tokens ON share_tokens
    FOR INSERT
    WITH CHECK (
        org_id IN (
            SELECT org_id FROM org_members WHERE user_id = auth.uid()
        )
        AND session_id IN (
            SELECT id FROM live_sessions WHERE live_sessions.org_id = share_tokens.org_id
        )
    );
