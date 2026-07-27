-- Scheduled matches managed from the dashboard.

CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    resource_id UUID REFERENCES resources(id) ON DELETE SET NULL,
    service_id UUID REFERENCES services(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    team_a TEXT NOT NULL,
    team_b TEXT NOT NULL,
    match_type TEXT NOT NULL DEFAULT 'doubles',
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL CHECK (ends_at > starts_at),
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'completed', 'cancelled')),
    score TEXT,
    participant_count INTEGER NOT NULL DEFAULT 0 CHECK (participant_count >= 0),
    participant_capacity INTEGER NOT NULL DEFAULT 4 CHECK (participant_capacity > 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_matches_org_start ON matches(org_id, starts_at);
CREATE INDEX idx_matches_org_status ON matches(org_id, status);
CREATE INDEX idx_matches_resource ON matches(resource_id);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_matches ON matches
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

CREATE TRIGGER update_matches_updated_at
    BEFORE UPDATE ON matches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
