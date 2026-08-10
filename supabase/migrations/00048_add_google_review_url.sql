-- Migration: 00048_add_google_review_url.sql
--
-- T-9.1.3: stores the venue's Google Business review link and exposes it to
-- the public page, so the review form can hand a happy reviewer on to Google
-- after their first-party review is submitted.
--
-- Why it is public: for a local venue, discovery happens in Google Maps and
-- Facebook rather than on the SKED storefront, so a Google review is worth
-- more for acquisition than an on-page one. The first-party review is what the
-- owner controls and can display; the Google handoff is what actually brings
-- new players in. The value is a public Google Maps URL — it is not sensitive,
-- and nothing here widens the org_settings table's own RLS.
--
-- The handoff is offered after a review is accepted, to EVERY reviewer
-- regardless of rating. Showing it only to 4- and 5-star reviewers is review
-- gating — soliciting public reviews selectively by sentiment — which Google's
-- contributed-content policy prohibits and which the FTC's consumer-review
-- rule treats as deceptive. The venue's own Business Profile is the asset at
-- risk, so equal treatment is the safe default. The behaviour is a single
-- named constant in review-form.tsx if the owner ever wants to revisit it.
--
-- DOWN: ALTER TABLE org_settings DROP COLUMN IF EXISTS google_review_url;
--       (then re-run the RPC from 00028)

ALTER TABLE org_settings
    ADD COLUMN IF NOT EXISTS google_review_url TEXT;

-- Rebuild get_public_page with the extra column. The signature is unchanged,
-- so callers do not move; the RLS suite asserts an exact column whitelist and
-- is updated in the same commit.
DROP FUNCTION IF EXISTS get_public_page(TEXT);

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
    plan TEXT,
    google_review_url TEXT
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
        o.plan,
        -- LEFT JOIN: org_settings is created lazily, so an org that has never
        -- opened settings must still return a page rather than no rows.
        os.google_review_url
    FROM organizations o
    JOIN pages p ON p.org_id = o.id
    LEFT JOIN org_settings os ON os.org_id = o.id
    WHERE o.id = v_org_id;
END;
$$;
