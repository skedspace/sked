-- Migration: 00045_create_public_booking_rpc.sql
--
-- Fixes T-7.2.14: an anonymous customer could not complete a booking.
--
-- src/lib/supabase/server.ts createClient() builds an ANON-key client, so the
-- public booking flow runs as role `anon`. booking-actions.ts then did:
--
--     supabase.from("bookings").insert({...}).select("id").single()
--
-- PostgREST turns .select() into `Prefer: return=representation`, and RETURNING
-- is gated by a SELECT policy. anon has never had one on bookings, so the row
-- was written and the request then failed with 42501 — the customer saw an
-- error for a booking that had actually been created. Verified against
-- PostgREST: bare INSERT returns 201, the same INSERT with representation
-- returns 401/42501.
--
-- Granting anon a SELECT policy on bookings would fix the symptom and reopen
-- the class of leak 00044 just closed. Instead the whole write moves behind a
-- SECURITY DEFINER function that validates, inserts, and returns the id — so
-- anon needs no table privileges on bookings at all.
--
-- The same round trip also links the customer to a player record. That was
-- previously a direct anon INSERT into players, which has no anon policy, so it
-- failed silently on every public booking and left the board, matches and
-- reports views without player rows.
--
-- DOWN: drop function create_public_booking;
--       recreate policy public_insert_bookings from 00044.

CREATE OR REPLACE FUNCTION create_public_booking(
    p_org_id UUID,
    p_resource_id UUID,
    p_service_id UUID,
    p_customer_id UUID,
    p_start TIMESTAMPTZ,
    p_end TIMESTAMPTZ,
    p_price_cents INTEGER,
    p_idempotency_key TEXT DEFAULT NULL,
    p_customer_name TEXT DEFAULT NULL,
    p_customer_email TEXT DEFAULT NULL,
    p_customer_phone TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_booking_id UUID;
    v_player_id  UUID;
    v_key        TEXT := nullif(btrim(coalesce(p_idempotency_key, '')), '');
    v_email      TEXT := nullif(btrim(coalesce(p_customer_email, '')), '');
    v_phone      TEXT := nullif(btrim(coalesce(p_customer_phone, '')), '');
    v_name       TEXT := nullif(btrim(coalesce(p_customer_name, '')), '');
BEGIN
    -- Same gate the 00044 INSERT policy applied: org must be publicly bookable,
    -- and the resource and service must both be active and belong to it.
    IF NOT public_booking_target_is_valid(p_org_id, p_resource_id, p_service_id) THEN
        RAISE EXCEPTION 'booking target is not available for public booking'
            USING ERRCODE = '42501';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM customers
        WHERE id = p_customer_id AND org_id = p_org_id
    ) THEN
        RAISE EXCEPTION 'customer does not belong to this organization'
            USING ERRCODE = '42501';
    END IF;

    IF p_start IS NULL OR p_end IS NULL OR p_end <= p_start THEN
        RAISE EXCEPTION 'booking must end after it starts' USING ERRCODE = '22023';
    END IF;

    IF p_price_cents IS NULL OR p_price_cents < 0 THEN
        RAISE EXCEPTION 'price must not be negative' USING ERRCODE = '22023';
    END IF;

    -- Idempotent replay: the same key returns the same booking rather than
    -- erroring, so a retried submission or a browser back-navigation is safe.
    IF v_key IS NOT NULL THEN
        SELECT id INTO v_booking_id
        FROM bookings
        WHERE idempotency_key = v_key AND org_id = p_org_id;

        IF v_booking_id IS NOT NULL THEN
            RETURN v_booking_id;
        END IF;
    END IF;

    BEGIN
        INSERT INTO bookings (
            org_id, resource_id, service_id, customer_id,
            time_range, status, price_cents, source, idempotency_key
        )
        VALUES (
            p_org_id, p_resource_id, p_service_id, p_customer_id,
            tstzrange(p_start, p_end, '[)'), 'confirmed', p_price_cents,
            'public', v_key
        )
        RETURNING id INTO v_booking_id;
    EXCEPTION
        WHEN exclusion_violation THEN
            -- The double-booking guard fired. A distinct, stable token lets the
            -- server action offer alternative slots instead of a raw DB error.
            RAISE EXCEPTION 'SLOT_TAKEN' USING ERRCODE = '23P01';
        WHEN unique_violation THEN
            -- Concurrent submission with the same idempotency key won the race.
            SELECT id INTO v_booking_id
            FROM bookings
            WHERE idempotency_key = v_key AND org_id = p_org_id;

            IF v_booking_id IS NULL THEN
                RAISE;
            END IF;
            RETURN v_booking_id;
    END;

    -- Customers double as players for the board, matches and reports views.
    -- Best-effort: a player problem must never cost the customer their booking.
    BEGIN
        SELECT id INTO v_player_id FROM players WHERE customer_id = p_customer_id;

        IF v_player_id IS NULL AND v_email IS NOT NULL THEN
            SELECT id INTO v_player_id
            FROM players WHERE org_id = p_org_id AND email = v_email LIMIT 1;
        END IF;

        IF v_player_id IS NULL AND v_phone IS NOT NULL THEN
            SELECT id INTO v_player_id
            FROM players WHERE org_id = p_org_id AND phone = v_phone LIMIT 1;
        END IF;

        IF v_player_id IS NOT NULL THEN
            UPDATE players SET customer_id = p_customer_id
            WHERE id = v_player_id AND customer_id IS DISTINCT FROM p_customer_id;
        ELSIF v_name IS NOT NULL THEN
            INSERT INTO players (
                org_id, customer_id, name, email, phone,
                skill_level, play_style, status
            )
            VALUES (
                p_org_id, p_customer_id, v_name, v_email, v_phone,
                2.0, 'All Court Player', 'active'
            );
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            NULL;
    END;

    RETURN v_booking_id;
END;
$$;

REVOKE ALL ON FUNCTION create_public_booking(
    UUID, UUID, UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_public_booking(
    UUID, UUID, UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, TEXT, TEXT, TEXT, TEXT
) TO anon, authenticated, service_role;

-- anon no longer writes to bookings directly; the RPC is the only public path.
DROP POLICY IF EXISTS public_insert_bookings ON bookings;
