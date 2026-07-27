-- Migration: 00026_add_page_primary_color.sql
-- Adds primary_color column to pages table for theme customization,
-- and updates the get_public_page RPC to return it.
--
-- DOWN: ALTER TABLE pages DROP COLUMN IF EXISTS primary_color;
--       (then re-run the RPC from 00020)

-- 1. Add primary_color column to pages
ALTER TABLE pages
  ADD COLUMN IF NOT EXISTS primary_color TEXT;

-- 2. Update the get_public_page RPC to include primary_color
CREATE OR REPLACE FUNCTION get_public_page(page_slug TEXT)
RETURNS TABLE (
    org_id UUID,
    org_name TEXT,
    org_slug TEXT,
    bio TEXT,
    cover_url TEXT,
    logo_url TEXT,
    socials JSONB,
    sections JSONB,
    theme TEXT,
    primary_color TEXT,
    services JSON,
    is_published BOOLEAN,
    plan TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_org_id UUID;
BEGIN
    SELECT id INTO v_org_id
    FROM organizations
    WHERE slug = page_slug AND deleted_at IS NULL;

    IF v_org_id IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        o.id,
        o.name,
        o.slug,
        p.bio,
        p.cover_url,
        p.logo_url,
        p.socials,
        p.sections,
        p.theme,
        p.primary_color,
        (SELECT json_agg(json_build_object(
            'id', s.id,
            'name', s.name,
            'duration_min', s.duration_min,
            'price_cents', s.price_cents,
            'payment_mode', s.payment_mode,
            'deposit_cents', s.deposit_cents
        ))
        FROM services s
        WHERE s.org_id = v_org_id AND s.is_active),
        p.is_published,
        o.plan
    FROM organizations o
    JOIN pages p ON p.org_id = o.id
    WHERE o.id = v_org_id;
END;
$$;
