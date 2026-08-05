-- Migration: 00046_public_review_submission.sql
--
-- T-9.1.1 / T-9.1.2: lets a customer who actually booked leave a review,
-- without granting anon any access to the reviews table.
--
-- Trust model (T-9.1.1): booking-lookup verification. The reviewer proves the
-- visit by supplying the email or phone they booked with plus the date of the
-- booking. Everything still lands `pending` for owner moderation, so nothing
-- reaches the storefront unreviewed.
--
-- The emailed signed-link model was rejected for now: it depends on a Resend
-- pipeline and a booking-completion job that do not exist yet (both are marked
-- done in docs/tasks.md but absent from the codebase). Revisit once those land.
--
-- As with 00044 and 00045, anon gets NO policy on the table. The RPC is
-- SECURITY DEFINER and is the only public write path.
--
-- DOWN: drop function submit_public_review;
--       drop index reviews_one_per_booking;

-- One review per booking, enforced by the database rather than only in the RPC.
CREATE UNIQUE INDEX IF NOT EXISTS reviews_one_per_booking
    ON reviews (booking_id)
    WHERE booking_id IS NOT NULL;

CREATE OR REPLACE FUNCTION submit_public_review(
    p_org_slug TEXT,
    p_contact TEXT,
    p_booking_date DATE,
    p_rating INTEGER,
    p_title TEXT,
    p_body TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org_id     UUID;
    v_booking    RECORD;
    v_review_id  UUID;
    v_contact    TEXT := nullif(btrim(lower(coalesce(p_contact, ''))), '');
    v_title      TEXT := nullif(btrim(coalesce(p_title, '')), '');
    v_body       TEXT := nullif(btrim(coalesce(p_body, '')), '');
BEGIN
    IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 THEN
        RAISE EXCEPTION 'rating must be between 1 and 5' USING ERRCODE = '22023';
    END IF;

    IF v_title IS NULL OR v_body IS NULL THEN
        RAISE EXCEPTION 'review title and body are required' USING ERRCODE = '22023';
    END IF;

    IF v_contact IS NULL OR p_booking_date IS NULL THEN
        RAISE EXCEPTION 'contact and booking date are required' USING ERRCODE = '22023';
    END IF;

    SELECT id INTO v_org_id
    FROM organizations
    WHERE slug = p_org_slug AND deleted_at IS NULL;

    IF v_org_id IS NULL OR NOT public_org_is_bookable(v_org_id) THEN
        RAISE EXCEPTION 'REVIEW_NO_MATCH' USING ERRCODE = '42501';
    END IF;

    -- Match a real, already-finished booking for this contact on this date.
    -- Cancelled and no-show bookings deliberately do not earn a review.
    SELECT b.id, b.customer_id, b.resource_id
    INTO v_booking
    FROM bookings b
    JOIN customers c ON c.id = b.customer_id
    WHERE b.org_id = v_org_id
      AND b.status IN ('confirmed', 'completed')
      AND lower(b.time_range) < now()
      AND (lower(b.time_range) AT TIME ZONE 'UTC')::date = p_booking_date
      AND (
            lower(btrim(coalesce(c.email, ''))) = v_contact
         OR regexp_replace(coalesce(c.phone, ''), '[^0-9]', '', 'g')
            = regexp_replace(v_contact, '[^0-9]', '', 'g')
            AND regexp_replace(v_contact, '[^0-9]', '', 'g') <> ''
      )
    ORDER BY lower(b.time_range) DESC
    LIMIT 1;

    IF v_booking.id IS NULL THEN
        -- Deliberately generic: do not confirm whether the contact or the date
        -- was the part that did not match.
        RAISE EXCEPTION 'REVIEW_NO_MATCH' USING ERRCODE = '42501';
    END IF;

    IF EXISTS (SELECT 1 FROM reviews WHERE booking_id = v_booking.id) THEN
        RAISE EXCEPTION 'REVIEW_ALREADY_SUBMITTED' USING ERRCODE = '23505';
    END IF;

    INSERT INTO reviews (
        org_id, customer_id, resource_id, booking_id,
        title, body, rating, source, status
    )
    VALUES (
        v_org_id, v_booking.customer_id, v_booking.resource_id, v_booking.id,
        v_title, v_body, p_rating, 'web_app', 'pending'
    )
    RETURNING id INTO v_review_id;

    RETURN v_review_id;
END;
$$;

REVOKE ALL ON FUNCTION submit_public_review(TEXT, TEXT, DATE, INTEGER, TEXT, TEXT)
    FROM PUBLIC;
GRANT EXECUTE ON FUNCTION submit_public_review(TEXT, TEXT, DATE, INTEGER, TEXT, TEXT)
    TO anon, authenticated, service_role;
