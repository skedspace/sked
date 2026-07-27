-- Migration: 00011_create_discount_codes.sql
-- Promotional discount codes for bookings.
--
-- DOWN: drop table discount_codes;

CREATE TABLE discount_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed')) DEFAULT 'percentage',
    value_percent INTEGER CHECK (value_percent >= 1 AND value_percent <= 100),
    value_cents INTEGER CHECK (value_cents >= 0),
    max_uses INTEGER,
    current_uses INTEGER NOT NULL DEFAULT 0,
    min_cents INTEGER CHECK (min_cents >= 0),
    max_discount_cents INTEGER CHECK (max_discount_cents >= 0),
    starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (org_id, code)
);

CREATE INDEX idx_discount_codes_org ON discount_codes(org_id);
CREATE INDEX idx_discount_codes_code ON discount_codes(org_id, code);

-- Validate that either value_percent or value_cents is set based on type
ALTER TABLE discount_codes ADD CONSTRAINT check_discount_value
    CHECK (
        (type = 'percentage' AND value_percent IS NOT NULL AND value_cents IS NULL) OR
        (type = 'fixed' AND value_cents IS NOT NULL AND value_percent IS NULL)
    );

ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_can_view_discounts" ON discount_codes
    FOR SELECT
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

CREATE POLICY "owners_can_manage_discounts" ON discount_codes
    FOR ALL
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'owner'))
    WITH CHECK (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'owner'));

-- Function: validate and apply a discount code
-- Returns the discount info + the calculated discount amount
CREATE OR REPLACE FUNCTION apply_discount_code(
    p_org_id UUID,
    p_code TEXT,
    p_amount_cents INTEGER
)
RETURNS TABLE (
    valid BOOLEAN,
    message TEXT,
    discount_cents INTEGER,
    final_cents INTEGER,
    discount_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_discount discount_codes%ROWTYPE;
BEGIN
    -- Find the code
    SELECT * INTO v_discount
    FROM discount_codes
    WHERE org_id = p_org_id
      AND code = UPPER(p_code)
      AND is_active = true;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Invalid or expired code.'::TEXT, 0, p_amount_cents, NULL::UUID;
        RETURN;
    END IF;

    -- Check date range
    IF v_discount.starts_at > now() THEN
        RETURN QUERY SELECT false, 'This code is not active yet.'::TEXT, 0, p_amount_cents, NULL::UUID;
        RETURN;
    END IF;

    IF v_discount.expires_at IS NOT NULL AND v_discount.expires_at < now() THEN
        RETURN QUERY SELECT false, 'This code has expired.'::TEXT, 0, p_amount_cents, NULL::UUID;
        RETURN;
    END IF;

    -- Check usage limit
    IF v_discount.max_uses IS NOT NULL AND v_discount.current_uses >= v_discount.max_uses THEN
        RETURN QUERY SELECT false, 'This code has reached its usage limit.'::TEXT, 0, p_amount_cents, NULL::UUID;
        RETURN;
    END IF;

    -- Check minimum amount
    IF v_discount.min_cents IS NOT NULL AND p_amount_cents < v_discount.min_cents THEN
        RETURN QUERY SELECT false, format('Minimum booking amount of ₱%s required.', (v_discount.min_cents / 100)::TEXT), 0, p_amount_cents, NULL::UUID;
        RETURN;
    END IF;

    -- Calculate discount
    DECLARE
        v_discount_cents INTEGER;
    BEGIN
        IF v_discount.type = 'percentage' THEN
            v_discount_cents := (p_amount_cents * v_discount.value_percent) / 100;
            -- Apply max discount cap if set
            IF v_discount.max_discount_cents IS NOT NULL AND v_discount_cents > v_discount.max_discount_cents THEN
                v_discount_cents := v_discount.max_discount_cents;
            END IF;
        ELSE
            v_discount_cents := v_discount.value_cents;
            -- Don't exceed the booking amount
            IF v_discount_cents > p_amount_cents THEN
                v_discount_cents := p_amount_cents;
            END IF;
        END IF;

        -- Increment usage
        UPDATE discount_codes
        SET current_uses = current_uses + 1,
            updated_at = now()
        WHERE id = v_discount.id;

        RETURN QUERY SELECT true, 'Code applied!'::TEXT, v_discount_cents, p_amount_cents - v_discount_cents, v_discount.id;
        RETURN;
    END;
END;
$$;
