-- Migration: 00032_create_tournaments.sql
-- Tournaments table that groups matches together, plus FK in matches table.
--
-- DOWN:
--   ALTER TABLE matches DROP COLUMN IF EXISTS tournament_id;
--   DROP TABLE IF EXISTS tournaments;

-- 1. Create the tournaments table
CREATE TABLE tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    format TEXT NOT NULL DEFAULT 'single_elimination'
        CHECK (format IN ('single_elimination', 'double_elimination', 'round_robin', 'pool_play')),
    skill_level TEXT,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL CHECK (ends_at > starts_at),
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'registration', 'in_progress', 'completed', 'cancelled')),
    participant_count INTEGER NOT NULL DEFAULT 0 CHECK (participant_count >= 0),
    max_participants INTEGER NOT NULL DEFAULT 0 CHECK (max_participants >= 0),
    entry_fee_cents INTEGER NOT NULL DEFAULT 0 CHECK (entry_fee_cents >= 0),
    current_round TEXT,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tournaments_org_status ON tournaments(org_id, status);
CREATE INDEX idx_tournaments_org_dates ON tournaments(org_id, starts_at, ends_at);

ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_tournaments ON tournaments
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

-- Allow public reads for board display
CREATE POLICY public_read_tournaments ON tournaments
    FOR SELECT
    USING (true);

CREATE TRIGGER update_tournaments_updated_at
    BEFORE UPDATE ON tournaments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Add tournament_id to matches (nullable — a match may exist without a tournament)
ALTER TABLE matches
    ADD COLUMN IF NOT EXISTS tournament_id UUID REFERENCES tournaments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_matches_tournament ON matches(tournament_id);
