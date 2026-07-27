-- Migration: 00005_create_payments.sql
-- Payment transactions with provider idempotency.

-- DOWN: drop table payments;

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id),
    provider TEXT NOT NULL,
    provider_ref TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('deposit', 'full', 'refund')),
    amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_provider_ref ON payments(provider_ref);

-- RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_payments ON payments
    USING (booking_id IN (
        SELECT id FROM bookings WHERE org_id IN (
            SELECT org_id FROM org_members WHERE user_id = auth.uid()
        )
    ));

-- Staff role cannot read payments
CREATE POLICY owners_only_read_payments ON payments
    FOR SELECT
    USING (booking_id IN (
        SELECT id FROM bookings WHERE org_id IN (
            SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'owner'
        )
    ));

CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
