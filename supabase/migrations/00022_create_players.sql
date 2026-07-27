-- Player profiles and per-match player results.

CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    skill_level NUMERIC(2,1) NOT NULL DEFAULT 3.0 CHECK (skill_level >= 1.0 AND skill_level <= 5.0),
    play_style TEXT NOT NULL DEFAULT 'All Court Player',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    birthday DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE match_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    team TEXT CHECK (team IN ('a', 'b')),
    result TEXT CHECK (result IN ('win', 'loss', 'draw')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (match_id, player_id)
);

CREATE INDEX idx_players_org_status ON players(org_id, status);
CREATE INDEX idx_players_org_skill ON players(org_id, skill_level);
CREATE INDEX idx_match_players_player ON match_players(player_id);
CREATE INDEX idx_match_players_match ON match_players(match_id);

ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_players ON players
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

CREATE POLICY tenant_isolation_match_players ON match_players
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

CREATE TRIGGER update_players_updated_at
    BEFORE UPDATE ON players
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
