-- Migration: 00006_create_pages.sql
-- Public-facing storefront configuration. One row per organization.

-- DOWN: drop table pages;

CREATE TABLE pages (
    org_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    theme TEXT NOT NULL DEFAULT 'default',
    sections JSONB NOT NULL DEFAULT '[]',
    cover_url TEXT,
    logo_url TEXT,
    bio TEXT,
    socials JSONB DEFAULT '{}',
    is_published BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_pages ON pages
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

CREATE POLICY owners_can_update_pages ON pages
    FOR UPDATE
    USING (org_id IN (
        SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'owner'
    ))
    WITH CHECK (org_id IN (
        SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'owner'
    ));

CREATE TRIGGER update_pages_updated_at
    BEFORE UPDATE ON pages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
