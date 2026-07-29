-- Migration: 00004_create_customers_bookings.sql
-- Customers and the core booking table with the double-booking exclusion constraint.

-- DOWN: drop table bookings; drop table customers;

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 1. Customers
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    notes TEXT,
    no_show_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customers_org ON customers(org_id);
CREATE INDEX idx_customers_org_email ON customers(org_id, email) WHERE email IS NOT NULL;
CREATE INDEX idx_customers_org_phone ON customers(org_id, phone) WHERE phone IS NOT NULL;

-- 2. Bookings (THE core table)
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES resources(id),
    service_id UUID NOT NULL REFERENCES services(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    assigned_staff_id UUID REFERENCES auth.users(id),
    time_range TSTZRANGE NOT NULL,
    status TEXT NOT NULL DEFAULT 'held' CHECK (status IN ('held', 'pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
    price_cents INTEGER NOT NULL,
    source TEXT NOT NULL DEFAULT 'public' CHECK (source IN ('public', 'manual')),
    cancellation_reason TEXT,
    idempotency_key TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- THE exclusion constraint that prevents double-booking at the database level
ALTER TABLE bookings
ADD CONSTRAINT no_overlap_when_held_or_confirmed
EXCLUDE USING gist (
    resource_id WITH =,
    time_range WITH &&
) WHERE (status IN ('held', 'pending', 'confirmed'));

-- Indexes
CREATE INDEX idx_bookings_resource_time ON bookings(resource_id, time_range)
    WHERE status IN ('held', 'pending', 'confirmed');
CREATE INDEX idx_bookings_org_status ON bookings(org_id, status);
CREATE INDEX idx_bookings_customer ON bookings(customer_id);
CREATE INDEX idx_bookings_date ON bookings(org_id, ((lower(time_range) AT TIME ZONE 'UTC')::date));

-- 3. RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_customers ON customers
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

CREATE POLICY tenant_isolation_bookings ON bookings
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

-- 4. Triggers
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
