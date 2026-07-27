-- Migration: 00009_create_availability_engine.sql
-- The availability function that generates bookable slots.
-- Replaces the stub from 00008.

-- DOWN is not needed for function replacements

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
DECLARE
    v_org_id UUID;
    v_duration_min INT;
    v_buffer_before INT;
    v_buffer_after INT;
    v_min_notice_min INT;
    v_max_advance_days INT;
    v_now TIMESTAMPTZ := now();
    v_day_start TIMESTAMPTZ;
    v_day_end TIMESTAMPTZ;
    v_weekday INT;
    v_opens_at TIME;
    v_closes_at TIME;
    v_is_closed BOOLEAN;
    v_slot_start TIMESTAMPTZ;
    v_slot_end TIMESTAMPTZ;
    r RECORD;
    s RECORD;
BEGIN
    -- Resolve org
    SELECT id INTO v_org_id
    FROM organizations
    WHERE slug = p_org_slug AND deleted_at IS NULL;

    IF v_org_id IS NULL THEN
        RETURN;
    END IF;

    -- Get service details
    SELECT duration_min, buffer_before_min, buffer_after_min,
           min_notice_min, max_advance_days
    INTO v_duration_min, v_buffer_before, v_buffer_after,
         v_min_notice_min, v_max_advance_days
    FROM services
    WHERE id = p_service_id AND org_id = v_org_id AND is_active;

    IF v_duration_min IS NULL THEN
        RETURN;
    END IF;

    -- Check advance booking window
    IF p_date > (v_now::DATE + v_max_advance_days) THEN
        RETURN;
    END IF;

    v_weekday := EXTRACT(DOW FROM p_date)::INT; -- 0=Sun

    -- Find eligible resources for this service
    FOR r IN
        SELECT res.id, res.name, res.capacity, loc.timezone
        FROM resources res
        JOIN locations loc ON loc.id = res.location_id
        JOIN service_resources sr ON sr.resource_id = res.id
        WHERE sr.service_id = p_service_id AND res.is_active
    LOOP
        -- Check if this date has an hour override
        SELECT is_closed, opens_at, closes_at
        INTO v_is_closed, v_opens_at, v_closes_at
        FROM hour_overrides
        WHERE location_id = (
            SELECT location_id FROM resources WHERE id = r.id
        ) AND date = p_date;

        IF v_is_closed THEN
            CONTINUE; -- Skip this resource, closed for the day
        END IF;

        -- If no override, use operating hours for this weekday
        IF v_opens_at IS NULL THEN
            SELECT opens_at, closes_at
            INTO v_opens_at, v_closes_at
            FROM operating_hours
            WHERE location_id = (
                SELECT location_id FROM resources WHERE id = r.id
            ) AND weekday = v_weekday AND is_active;

            -- If no hours found, skip this resource
            IF v_opens_at IS NULL THEN
                CONTINUE;
            END IF;
        END IF;

        -- Convert to timestamptz in the resource's timezone
        v_day_start := (p_date + v_opens_at) AT TIME ZONE r.timezone;
        v_day_end := (p_date + v_closes_at) AT TIME ZONE r.timezone;

        -- Subtract buffer_after from end
        v_day_end := v_day_end - (v_buffer_after || ' minutes')::INTERVAL;

        -- Generate slots
        v_slot_start := v_day_start + (v_buffer_before || ' minutes')::INTERVAL;

        WHILE v_slot_start + (v_duration_min || ' minutes')::INTERVAL <= v_day_end LOOP
            v_slot_end := v_slot_start + (v_duration_min || ' minutes')::INTERVAL;

            -- Apply min notice
            IF v_slot_start >= v_now + (v_min_notice_min || ' minutes')::INTERVAL THEN
                -- Check if slot overlaps with any existing booking
                IF NOT EXISTS (
                    SELECT 1 FROM bookings
                    WHERE resource_id = r.id
                    AND status IN ('held', 'pending', 'confirmed')
                    AND time_range && TSTZRANGE(v_slot_start, v_slot_end, '[)')
                ) THEN
                    start_time := v_slot_start;
                    end_time := v_slot_end;
                    resource_id := r.id;
                    resource_name := r.name;
                    RETURN NEXT;
                END IF;
            END IF;

            v_slot_start := v_slot_start + (15 || ' minutes')::INTERVAL;
        END LOOP;
    END LOOP;
END;
$$;
