-- Migration: 00001_create_organizations_and_members.sql
-- Creates the tenant root and org membership tables.

-- DOWN: drop table org_members; drop table organizations;

-- 1. Organizations
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro')),
    logo_url TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_organizations_slug ON organizations(slug) WHERE deleted_at IS NULL;

-- 2. Org Members
CREATE TABLE org_members (
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'staff')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (org_id, user_id)
);

CREATE INDEX idx_org_members_user ON org_members(user_id);
CREATE INDEX idx_org_members_org ON org_members(org_id);

-- 3. Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies — organizations
CREATE POLICY "users_can_view_their_org" ON organizations
    FOR SELECT
    USING (id IN (
        SELECT org_id FROM org_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "owners_can_update_their_org" ON organizations
    FOR UPDATE
    USING (id IN (
        SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'owner'
    ))
    WITH CHECK (id IN (
        SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'owner'
    ));

-- 5. RLS Policies — org_members
CREATE POLICY "users_can_view_own_memberships" ON org_members
    FOR SELECT
    USING (user_id = auth.uid() OR org_id IN (
        SELECT org_id FROM org_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "owners_can_invite_members" ON org_members
    FOR INSERT
    WITH CHECK (org_id IN (
        SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'owner'
    ));

CREATE POLICY "owners_can_remove_members" ON org_members
    FOR DELETE
    USING (org_id IN (
        SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'owner'
    ));

-- 6. Auto-created_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
