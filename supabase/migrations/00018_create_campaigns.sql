-- Migration: 00018_create_campaigns.sql
-- Giveaway and raffle campaigns with OTP entry and provably fair draws.
--
-- DOWN:
--   drop table campaign_otps;
--   drop table campaign_entries;
--   drop table campaign_tasks;
--   drop table campaigns;

CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    prize TEXT NOT NULL,
    prize_cents INTEGER CHECK (prize_cents >= 0),
    starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ends_at TIMESTAMPTZ NOT NULL,
    max_entries_per_person INTEGER NOT NULL DEFAULT 1,
    draw_type TEXT NOT NULL DEFAULT 'standard' CHECK (draw_type IN ('standard', 'provably_fair')),
    draw_commitment TEXT, -- Hash committed before draw (for provably fair)
    draw_nonce TEXT, -- Random nonce used in draw
    draw_block_hash TEXT, -- Bitcoin block hash used for provably fair
    winner_count INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'drawn', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaigns_org ON campaigns(org_id);

-- Task types for earning entries
CREATE TABLE campaign_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('booking', 'follow_social', 'share', 'referral')),
    label TEXT NOT NULL,
    description TEXT,
    entry_count INTEGER NOT NULL DEFAULT 1, -- how many entries this task earns
    config JSONB DEFAULT '{}', -- type-specific config (e.g. social URL)
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Customer entries
CREATE TABLE campaign_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    task_id UUID REFERENCES campaign_tasks(id) ON DELETE SET NULL,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    customer_phone TEXT,
    otp_verified BOOLEAN NOT NULL DEFAULT false,
    is_winner BOOLEAN NOT NULL DEFAULT false,
    winner_position INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (campaign_id, customer_id, task_id)
);

CREATE INDEX idx_campaign_entries_campaign ON campaign_entries(campaign_id);

-- OTP codes for verifying entries
CREATE TABLE campaign_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id UUID NOT NULL REFERENCES campaign_entries(id) ON DELETE CASCADE,
    otp TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaign_otps_entry ON campaign_otps(entry_id);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_otps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_can_view_campaigns" ON campaigns
    FOR SELECT
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

CREATE POLICY "owners_can_manage_campaigns" ON campaigns
    FOR ALL
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'owner'))
    WITH CHECK (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'owner'));

CREATE POLICY "owners_can_manage_tasks" ON campaign_tasks
    FOR ALL
    USING (campaign_id IN (SELECT id FROM campaigns WHERE org_id IN (
        SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'owner'
    )))
    WITH CHECK (campaign_id IN (SELECT id FROM campaigns WHERE org_id IN (
        SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'owner'
    )));

CREATE POLICY "owners_can_manage_entries" ON campaign_entries
    FOR ALL
    USING (campaign_id IN (SELECT id FROM campaigns WHERE org_id IN (
        SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'owner'
    )))
    WITH CHECK (campaign_id IN (SELECT id FROM campaigns WHERE org_id IN (
        SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'owner'
    )));
