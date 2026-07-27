-- Migration: 00012_create_packages.sql
-- Prepaid session bundles (packages/credits).
--
-- A package is a product offering (e.g. "10 sessions for ₱5,000").
-- A customer_package is a purchased instance with remaining sessions.
--
-- DOWN:
--   drop table package_redemptions;
--   drop table customer_packages;
--   drop table packages;

CREATE TABLE packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    service_id UUID REFERENCES services(id) ON DELETE SET NULL,
    session_count INTEGER NOT NULL CHECK (session_count > 0),
    price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
    duration_days INTEGER CHECK (duration_days > 0), -- validity period (null = no expiry)
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (org_id, name)
);

CREATE INDEX idx_packages_org ON packages(org_id);

-- Purchased packages (customer holds sessions)
CREATE TABLE customer_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    package_id UUID NOT NULL REFERENCES packages(id) ON DELETE RESTRICT,
    sessions_remaining INTEGER NOT NULL CHECK (sessions_remaining >= 0),
    sessions_total INTEGER NOT NULL CHECK (sessions_total > 0),
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (sessions_remaining <= sessions_total)
);

CREATE INDEX idx_customer_packages_org ON customer_packages(org_id);
CREATE INDEX idx_customer_packages_customer ON customer_packages(customer_id, org_id);

-- Redemption log
CREATE TABLE package_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_package_id UUID NOT NULL REFERENCES customer_packages(id) ON DELETE CASCADE,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (booking_id) -- each booking can redeem from at most one package
);

CREATE INDEX idx_package_redemptions_pkg ON package_redemptions(customer_package_id);

-- Enable RLS
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_redemptions ENABLE ROW LEVEL SECURITY;

-- RLS: packages
CREATE POLICY "org_members_can_view_packages" ON packages
    FOR SELECT
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

CREATE POLICY "owners_can_manage_packages" ON packages
    FOR ALL
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'owner'))
    WITH CHECK (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'owner'));

-- RLS: customer_packages
CREATE POLICY "org_members_can_view_customer_packages" ON customer_packages
    FOR SELECT
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

CREATE POLICY "owners_can_manage_customer_packages" ON customer_packages
    FOR ALL
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'owner'))
    WITH CHECK (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'owner'));

-- RLS: redemptions
CREATE POLICY "org_members_can_view_redemptions" ON package_redemptions
    FOR SELECT
    USING (customer_package_id IN (
        SELECT id FROM customer_packages WHERE org_id IN (
            SELECT org_id FROM org_members WHERE user_id = auth.uid()
        )
    ));

-- Public function: get customer's active packages (used during booking)
CREATE OR REPLACE FUNCTION get_customer_packages(p_customer_id UUID, p_org_id UUID)
RETURNS TABLE (
    id UUID,
    package_name TEXT,
    sessions_remaining INTEGER,
    sessions_total INTEGER,
    expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        cp.id,
        p.name,
        cp.sessions_remaining,
        cp.sessions_total,
        cp.expires_at
    FROM customer_packages cp
    JOIN packages p ON p.id = cp.package_id
    WHERE cp.customer_id = p_customer_id
      AND cp.org_id = p_org_id
      AND cp.sessions_remaining > 0
      AND (cp.expires_at IS NULL OR cp.expires_at > now())
    ORDER BY cp.expires_at ASC NULLS LAST;
END;
$$;

-- Function: redeem a session from a package
CREATE OR REPLACE FUNCTION redeem_package_session(
    p_customer_package_id UUID,
    p_booking_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_remaining INTEGER;
BEGIN
    SELECT sessions_remaining INTO v_remaining
    FROM customer_packages
    WHERE id = p_customer_package_id
    FOR UPDATE; -- lock row

    IF v_remaining IS NULL OR v_remaining <= 0 THEN
        RETURN false;
    END IF;

    -- Deduct session
    UPDATE customer_packages
    SET sessions_remaining = sessions_remaining - 1,
        updated_at = now()
    WHERE id = p_customer_package_id;

    -- Log redemption
    INSERT INTO package_redemptions (customer_package_id, booking_id)
    VALUES (p_customer_package_id, p_booking_id);

    RETURN true;
END;
$$;
