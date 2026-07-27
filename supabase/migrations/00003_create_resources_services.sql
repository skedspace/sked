-- Migration: 00003_create_resources_services.sql
-- Bookable resources, services offered, and their many-to-many links.

-- DOWN: drop table service_resources; drop table services; drop table resources;

-- 1. Resources
CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'default',
    capacity INTEGER NOT NULL DEFAULT 1 CHECK (capacity > 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_resources_org ON resources(org_id);
CREATE INDEX idx_resources_location ON resources(location_id);

-- 2. Services
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    duration_min INTEGER NOT NULL CHECK (duration_min > 0),
    price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
    buffer_before_min INTEGER NOT NULL DEFAULT 0,
    buffer_after_min INTEGER NOT NULL DEFAULT 0,
    payment_mode TEXT NOT NULL DEFAULT 'free' CHECK (payment_mode IN ('free', 'deposit', 'full')),
    deposit_cents INTEGER CHECK (deposit_cents >= 0),
    min_notice_min INTEGER NOT NULL DEFAULT 60,
    max_advance_days INTEGER NOT NULL DEFAULT 30,
    service_category TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_services_org ON services(org_id);

-- 3. Service-Resource Link (many-to-many)
CREATE TABLE service_resources (
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    PRIMARY KEY (service_id, resource_id)
);

-- 4. RLS
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_resources ON resources
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

CREATE POLICY tenant_isolation_services ON services
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

CREATE POLICY tenant_isolation_service_resources ON service_resources
    USING (service_id IN (
        SELECT id FROM services WHERE org_id IN (
            SELECT org_id FROM org_members WHERE user_id = auth.uid()
        )
    ));

-- 5. Triggers
CREATE TRIGGER update_resources_updated_at
    BEFORE UPDATE ON resources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at
    BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
