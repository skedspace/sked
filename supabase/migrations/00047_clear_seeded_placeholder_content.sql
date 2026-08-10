-- Migration: 00047_clear_seeded_placeholder_content.sql
--
-- T-9.4.1 / T-9.4.2: strips SKED's own placeholder content out of storefronts
-- that persisted it.
--
-- Why data needs fixing and not just code: the page editor hydrates its state
-- with readPublicPageSections(), which merges DEFAULT_PAGE_SECTIONS into the
-- saved row, and then writes that merged object back to pages.sections. So an
-- owner who opened the editor once and pressed Save baked our defaults into
-- their own data. Blanking the defaults in code fixes new and untouched pages;
-- it cannot reach these rows.
--
-- What was published under a real venue's name, enabled by default:
--   * three invented testimonials, rendered under "- Player 1/2/3" bylines
--   * a contact block reading 123 Pickleball Lane, Makati City, PH,
--     +63 912 345 6789, hello@acepickleball.ph — a plausible PH mobile number
--     and a real-looking domain, which a customer could act on
--   * four amenity claims (night play, free parking) the venue may not offer
--
-- This deletes ONLY values that exactly match the strings we shipped. An owner
-- who typed their own phone number, wrote their own testimonial, or happens to
-- offer "Free parking" keeps it: equality against the known placeholder is the
-- whole safety property here, so do not loosen it to ILIKE or a prefix match.
--
-- DOWN: none. The removed values were never the owner's content, and restoring
--       fabricated testimonials and a fake phone number is not a desirable
--       rollback. Take a backup of pages.sections before applying if you want
--       an escape hatch.

BEGIN;

-- Quotes, amenity labels and contact values exactly as DEFAULT_PAGE_SECTIONS
-- shipped them prior to this change. Kept inline rather than in a temp table so
-- the migration reads as a single reversible-by-inspection statement.
WITH placeholder AS (
    SELECT
        ARRAY[
            'Super easy to book and the courts are always in perfect condition!',
            'Love the vibes here. Great spot for weekend games with friends.',
            'Clean courts, great staff, and zero hassle booking. Highly recommend!'
        ] AS quotes,
        ARRAY[
            'Top quality courts',
            'Night play',
            'Free parking',
            'Amenities'
        ] AS amenities
),
cleaned AS (
    SELECT
        p.org_id,
        -- Drop only our own quotes; anything the owner added survives.
        COALESCE(
            (
                SELECT jsonb_agg(q)
                FROM jsonb_array_elements_text(
                         COALESCE(p.sections -> 'storefront' -> 'testimonials' -> 'quotes', '[]'::jsonb)
                     ) AS q
                WHERE q <> ALL (ph.quotes)
            ),
            '[]'::jsonb
        ) AS kept_quotes,
        COALESCE(
            (
                SELECT jsonb_agg(a)
                FROM jsonb_array_elements_text(
                         COALESCE(p.sections -> 'storefront' -> 'amenities' -> 'items', '[]'::jsonb)
                     ) AS a
                WHERE a <> ALL (ph.amenities)
            ),
            '[]'::jsonb
        ) AS kept_amenities
    FROM pages p
    CROSS JOIN placeholder ph
    WHERE p.sections ? 'storefront'
)
UPDATE pages p
SET sections = jsonb_set(
        jsonb_set(
            jsonb_set(
                p.sections,
                '{storefront,testimonials}',
                COALESCE(p.sections -> 'storefront' -> 'testimonials', '{}'::jsonb)
                    || jsonb_build_object(
                        'quotes', c.kept_quotes,
                        -- An empty quote list must not leave a heading floating
                        -- over an empty grid, so the section goes off with it.
                        'enabled',
                        CASE
                            WHEN jsonb_array_length(c.kept_quotes) = 0 THEN 'false'::jsonb
                            ELSE COALESCE(p.sections -> 'storefront' -> 'testimonials' -> 'enabled', 'true'::jsonb)
                        END
                    )
            ),
            '{storefront,amenities,items}',
            c.kept_amenities
        ),
        '{storefront,contact}',
        COALESCE(p.sections -> 'storefront' -> 'contact', '{}'::jsonb)
            || jsonb_build_object(
                'address', CASE WHEN p.sections #>> '{storefront,contact,address}' = '123 Pickleball Lane'
                                THEN '' ELSE COALESCE(p.sections #>> '{storefront,contact,address}', '') END,
                'city',    CASE WHEN p.sections #>> '{storefront,contact,city}' = 'Makati City, PH'
                                THEN '' ELSE COALESCE(p.sections #>> '{storefront,contact,city}', '') END,
                'hours',   CASE WHEN p.sections #>> '{storefront,contact,hours}' = 'Open Daily, 6:00 AM - 11:00 PM'
                                THEN '' ELSE COALESCE(p.sections #>> '{storefront,contact,hours}', '') END,
                'phone',   CASE WHEN p.sections #>> '{storefront,contact,phone}' = '+63 912 345 6789'
                                THEN '' ELSE COALESCE(p.sections #>> '{storefront,contact,phone}', '') END,
                'email',   CASE WHEN p.sections #>> '{storefront,contact,email}' = 'hello@acepickleball.ph'
                                THEN '' ELSE COALESCE(p.sections #>> '{storefront,contact,email}', '') END
            )
    )
FROM cleaned c
WHERE c.org_id = p.org_id;

COMMIT;
