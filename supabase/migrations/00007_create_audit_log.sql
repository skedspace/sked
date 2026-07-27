-- Migration: 00007_create_audit_log.sql
-- Immutable action trail for important org operations.

-- DOWN: drop table audit_log;

CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES auth.users(id),
    action TEXT NOT NULL,
    target TEXT,
    payload JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_org_created ON audit_log(org_id, created_at DESC);

-- RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_can_read_audit_log" ON audit_log
    FOR SELECT
    USING (org_id IN (
        SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'owner'
    ));

-- Insert-only for authenticated users
CREATE POLICY "authenticated_can_insert_audit_log" ON audit_log
    FOR INSERT
    WITH CHECK (org_id IN (
        SELECT org_id FROM org_members WHERE user_id = auth.uid()
    ));

-- Deny updates and deletes
CREATE POLICY "no_update_audit_log" ON audit_log
    FOR UPDATE
    USING (false);

CREATE POLICY "no_delete_audit_log" ON audit_log
    FOR DELETE
    USING (false);
