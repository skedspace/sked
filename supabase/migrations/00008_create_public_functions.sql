-- Migration: 00008_create_public_functions.sql
-- SECURITY DEFINER functions for anonymous public page access.

-- DOWN: drop function get_public_page; drop function get_available_slots;

-- 1. Public Page Data
-- Anonymous visitors read page data through this function, never directly from tables.
CREATE OR REPLACE FUNCTION get_public_page(page_slug TEXT)
RETURNS TABLE (
    org_name TEXT,
    org_slug TEXT,
    bio TEXT,
    cover_url TEXT,
    logo_url TEXT,
    socials JSONB,
    sections JSONB,
    theme TEXT,
    services JSON,
    is_published BOOLEAN
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
        p.is_published
    FROM organizations o
    JOIN pages p ON p.org_id = o.id
    WHERE o.id = v_org_id;
END;
$$;

-- 2. Available Slots (stub — full implementation in Phase 1)
CREATE OR REPLACE FUNCTION get_available_slots(
    p_org_slug TEXT,
    p_service_id UUID,
    p_date DATE
)
RETURNS TABLE (
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    resource_id UUID,
    resource_name TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    -- Phase 1: Full availability engine implementation
    -- This stub returns no slots until the engine is built.
    RETURN;
END;
$$;
