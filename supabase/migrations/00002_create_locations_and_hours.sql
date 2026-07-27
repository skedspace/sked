-- Migration: 00002_create_locations_and_hours.sql
-- Physical venues, recurring operating hours, and date-specific overrides.

-- DOWN: drop table hour_overrides; drop table operating_hours; drop table locations;

-- 1. Locations
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    lat NUMERIC(10,7),
    lng NUMERIC(10,7),
    timezone TEXT NOT NULL DEFAULT 'Asia/Manila',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_locations_org ON locations(org_id);

-- 2. Operating Hours (weekly recurring)
CREATE TABLE operating_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
    opens_at TIME NOT NULL,
    closes_at TIME NOT NULL CHECK (closes_at > opens_at),
    is_active BOOLEAN NOT NULL DEFAULT true,
    UNIQUE (location_id, weekday)
);

CREATE INDEX idx_operating_hours_location ON operating_hours(location_id);

-- 3. Hour Overrides (date-specific exceptions)
CREATE TABLE hour_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    opens_at TIME,
    closes_at TIME CHECK (closes_at > opens_at),
    is_closed BOOLEAN NOT NULL DEFAULT false,
    note TEXT,
    UNIQUE (location_id, date)
);

CREATE INDEX idx_hour_overrides_location_date ON hour_overrides(location_id, date);

-- 4. RLS
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE operating_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE hour_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_locations ON locations
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

CREATE POLICY tenant_isolation_operating_hours ON operating_hours
    USING (location_id IN (
        SELECT id FROM locations WHERE org_id IN (
            SELECT org_id FROM org_members WHERE user_id = auth.uid()
        )
    ));

CREATE POLICY tenant_isolation_hour_overrides ON hour_overrides
    USING (location_id IN (
        SELECT id FROM locations WHERE org_id IN (
            SELECT org_id FROM org_members WHERE user_id = auth.uid()
        )
    ));

-- 5. Triggers
CREATE TRIGGER update_locations_updated_at
    BEFORE UPDATE ON locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
