-- Migration: 00023_enhance_payments_dashboard.sql
-- Adds optional dashboard fields for manual transactions, subscriptions,
-- payouts, and refunds while preserving existing booking payments.

ALTER TABLE payments
  ALTER COLUMN booking_id DROP NOT NULL;

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'booking'
    CHECK (category IN ('booking', 'subscription', 'payout', 'refund')),
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT;

UPDATE payments p
SET org_id = b.org_id
FROM bookings b
WHERE p.booking_id = b.id
  AND p.org_id IS NULL;

UPDATE payments p
SET customer_id = b.customer_id
FROM bookings b
WHERE p.booking_id = b.id
  AND p.customer_id IS NULL;

UPDATE payments
SET category = CASE WHEN type = 'refund' THEN 'refund' ELSE 'booking' END
WHERE category IS NULL;

CREATE INDEX IF NOT EXISTS idx_payments_org ON payments(org_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_category ON payments(category);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

CREATE POLICY tenant_isolation_payments_by_org ON payments
  FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );
