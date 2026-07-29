-- Migration: 00013_create_recurring_bookings.sql
-- Weekly/monthly recurring booking rules.
--
-- When a recurring booking is created, a rule is stored and
-- future bookings are pre-generated.
--
-- DOWN:
--   drop table recurring_rules;
--   alter table bookings drop column recurring_rule_id;

CREATE TABLE recurring_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly')) DEFAULT 'weekly',
    start_date DATE NOT NULL,
    end_date DATE,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sun, 6=Sat (null for monthly)
    day_of_month INTEGER CHECK (day_of_month >= 1 AND day_of_month <= 31), -- null for weekly
    max_occurrences INTEGER DEFAULT 52,
    occurrences_created INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT check_frequency_day CHECK (
        (frequency IN ('weekly', 'biweekly') AND day_of_week IS NOT NULL) OR
        (frequency = 'monthly' AND day_of_month IS NOT NULL)
    )
);

ALTER TABLE bookings
    ADD COLUMN recurring_rule_id UUID REFERENCES recurring_rules(id) ON DELETE SET NULL;

CREATE INDEX idx_recurring_rules_org ON recurring_rules(org_id);

ALTER TABLE recurring_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_can_view_recurring" ON recurring_rules
    FOR SELECT
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

CREATE POLICY "owners_can_manage_recurring" ON recurring_rules
    FOR ALL
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'owner'))
    WITH CHECK (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'owner'));

-- Function: generate future recurring bookings
CREATE OR REPLACE FUNCTION generate_recurring_bookings(p_rule_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rule recurring_rules%ROWTYPE;
    v_current_date DATE;
    v_booking_start TIMESTAMPTZ;
    v_booking_end TIMESTAMPTZ;
    v_created INTEGER := 0;
    v_max_date DATE;
    v_interval_days INTEGER;
BEGIN
    SELECT * INTO v_rule FROM recurring_rules WHERE id = p_rule_id;
    IF NOT FOUND THEN
        RETURN 0;
    END IF;

    -- Determine next date to generate
    v_current_date := v_rule.start_date;
    -- Add weeks for already created occurrences
    IF v_rule.frequency = 'weekly' THEN
        v_current_date := v_current_date + (v_rule.occurrences_created * 7);
        v_interval_days := 7;
    ELSIF v_rule.frequency = 'biweekly' THEN
        v_current_date := v_current_date + (v_rule.occurrences_created * 14);
        v_interval_days := 14;
    ELSE
        v_current_date := v_current_date + INTERVAL '1 month' * v_rule.occurrences_created;
        v_interval_days := 30;
    END IF;

    -- Cap at max_occurrences or end_date
    v_max_date := COALESCE(v_rule.end_date, v_rule.start_date + INTERVAL '1 year');

    WHILE v_current_date <= v_max_date AND v_rule.occurrences_created + v_created < v_rule.max_occurrences LOOP
        v_booking_start := v_current_date + v_rule.start_time;
        v_booking_end := v_current_date + v_rule.end_time;

        -- Skip if already exists (idempotent)
        IF NOT EXISTS (
            SELECT 1 FROM bookings
            WHERE recurring_rule_id = p_rule_id
              AND time_range = format('[%s,%s)', v_booking_start, v_booking_end)::tstzrange
        ) THEN
            BEGIN
                INSERT INTO bookings (
                    org_id, resource_id, service_id, customer_id,
                    time_range, status, price_cents, source, recurring_rule_id
                ) VALUES (
                    v_rule.org_id, v_rule.resource_id, v_rule.service_id, v_rule.customer_id,
                    format('[%s,%s)', v_booking_start, v_booking_end)::tstzrange,
                    'confirmed', 0, 'recurring', p_rule_id
                );
                v_created := v_created + 1;
            EXCEPTION WHEN OTHERS THEN
                -- Skip conflicts (exclusion constraint, etc.)
            END;
        END IF;

        -- Advance
        IF v_rule.frequency = 'weekly' THEN
            v_current_date := v_current_date + 7;
        ELSIF v_rule.frequency = 'biweekly' THEN
            v_current_date := v_current_date + 14;
        ELSE
            v_current_date := v_current_date + INTERVAL '1 month';
        END IF;
    END LOOP;

    -- Update occurrence count
    UPDATE recurring_rules
    SET occurrences_created = occurrences_created + v_created,
        updated_at = now()
    WHERE id = p_rule_id;

    RETURN v_created;
END;
$$;
