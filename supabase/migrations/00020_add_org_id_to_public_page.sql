-- Migration: 00020_add_org_id_to_public_page.sql
-- Adds org_id to the public page RPC so booking forms can
-- reference the real organization ID.
--
-- DOWN: Re-run 00019's function

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
