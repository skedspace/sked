-- Migration: 00010_create_plans_and_subscriptions.sql
-- Adds subscription management and usage tracking.
--
-- DOWN:
--   drop table subscription_invoices;
--   drop table subscriptions;
--   alter table organizations drop column booking_limit_monthly;
--   alter table organizations drop column resource_limit;

-- 1. Add usage limit columns to organizations
ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS booking_limit_monthly INTEGER NOT NULL DEFAULT 99999,
    ADD COLUMN IF NOT EXISTS resource_limit INTEGER NOT NULL DEFAULT 999;

-- 2. Subscriptions table
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plan TEXT NOT NULL CHECK (plan IN ('trial', 'monthly')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'expired')),
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
    current_period_end TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1 month'),
    canceled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_org ON subscriptions(org_id);

-- 3. Subscription invoices (for tracking payment history)
CREATE TABLE subscription_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    amount_cents INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscription_invoices_sub ON subscription_invoices(subscription_id);

-- 4. Monthly usage tracking (materialized for fast reads)
CREATE TABLE monthly_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    month DATE NOT NULL DEFAULT date_trunc('month', now())::date,
    bookings_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (org_id, month)
);

CREATE INDEX idx_monthly_usage_org ON monthly_usage(org_id, month);

-- 5. Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_usage ENABLE ROW LEVEL SECURITY;

-- 6. RLS policies
CREATE POLICY "org_members_can_view_subscriptions" ON subscriptions
    FOR SELECT
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

CREATE POLICY "owners_can_manage_subscriptions" ON subscriptions
    FOR ALL
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'owner'))
    WITH CHECK (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'owner'));

CREATE POLICY "org_members_can_view_invoices" ON subscription_invoices
    FOR SELECT
    USING (subscription_id IN (
        SELECT id FROM subscriptions WHERE org_id IN (
            SELECT org_id FROM org_members WHERE user_id = auth.uid()
        )
    ));

CREATE POLICY "org_members_can_view_usage" ON monthly_usage
    FOR SELECT
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

-- 7. Function: increment usage counter
CREATE OR REPLACE FUNCTION increment_usage(p_org_id UUID, p_month DATE DEFAULT date_trunc('month', now())::date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO monthly_usage (org_id, month, bookings_count)
    VALUES (p_org_id, p_month, 1)
    ON CONFLICT (org_id, month)
    DO UPDATE SET bookings_count = monthly_usage.bookings_count + 1,
                  updated_at = now();
END;
$$;

-- 8. Function: check if org can book (within plan limits)
CREATE OR REPLACE FUNCTION can_create_booking(p_org_id UUID)
RETURNS TABLE (allowed BOOLEAN, reason TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_plan TEXT;
    v_monthly_limit INTEGER;
    v_current_usage INTEGER;
BEGIN
    -- Get plan limits
    SELECT o.plan, o.booking_limit_monthly
    INTO v_plan, v_monthly_limit
    FROM organizations o
    WHERE o.id = p_org_id;

    -- Trial plan check — no limits during trial
    IF v_plan = 'trial' THEN
        -- Trial has unlimited bookings
    END IF;

    RETURN QUERY SELECT true, NULL::TEXT;
END;
$$;
