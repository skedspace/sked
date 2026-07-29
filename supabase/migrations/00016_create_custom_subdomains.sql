-- Migration: 00016_create_custom_subdomains.sql
-- Custom subdomains for public pages (e.g. business.sked.space).
--
-- This stores the desired subdomain on the organization.
-- Routing is handled by middleware and Vercel.
--
-- DOWN: alter table organizations drop column subdomain;

ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS subdomain TEXT UNIQUE CHECK (subdomain ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$');

CREATE INDEX idx_organizations_subdomain ON organizations(subdomain) WHERE subdomain IS NOT NULL;
