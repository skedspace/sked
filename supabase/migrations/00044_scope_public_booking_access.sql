-- Migration: 00044_scope_public_booking_access.sql
--
-- Closes two cross-tenant holes confirmed by the RLS suite (src/lib/supabase/rls.test.ts).
--
-- 1. CUSTOMER PII WAS WORLD-READABLE.
--    00027 added, to let the public booking flow find returning customers:
--        CREATE POLICY public_select_customers ON customers
--            FOR SELECT TO anon, authenticated USING (true);
--    Permissive policies are OR-combined, so `true` overrode
--    tenant_isolation_customers entirely. Any authenticated user could read
--    every other tenant's customers, and any anonymous caller holding the
--    public anon key could read every customer row in the database — name,
--    email, phone, notes. The anon key ships to every browser that loads a
--    storefront, so this was a live PII exposure.
--
--    Replaced with find_or_create_customer(): a SECURITY DEFINER function that
--    performs the lookup-or-insert server-side, scoped to one org, and returns
--    only a UUID. No customer row ever crosses the API boundary.
--
-- 2. STAFF COULD READ PAYMENTS.
--    payments carried two FOR ALL policies granting every org member access,
--    OR-ed with a FOR SELECT owners-only policy — so the owners-only rule never
--    bit, contradicting the `-- Staff role cannot read payments` comment in
--    00005. The tenant policies are re-scoped to write commands only, leaving a
--    single SELECT policy that really is owners-only.
--
-- Also tightens the WITH CHECK (true) anon INSERT policies on bookings and
-- audit_log, which let anyone write rows into any organization.
--
-- DOWN: see 00027 and 00005 to restore the previous (vulnerable) policies;
--       drop function find_or_create_customer, public_org_is_bookable,
--       public_booking_target_is_valid.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Helpers
-- ─────────────────────────────────────────────────────────────────────────────

-- An org is publicly bookable when it exists, is not soft-deleted, and has a
-- published storefront. SECURITY DEFINER because anon cannot read these tables
-- directly — and must not be able to.
CREATE OR REPLACE FUNCTION public_org_is_bookable(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM organizations o
        JOIN pages p ON p.org_id = o.id
        WHERE o.id = p_org_id
          AND o.deleted_at IS NULL
          AND p.is_published
    );
$$;

-- The resource and service a public booking targets must both belong to the
-- org being booked, and both must be active.
CREATE OR REPLACE FUNCTION public_booking_target_is_valid(
    p_org_id UUID,
    p_resource_id UUID,
    p_service_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public_org_is_bookable(p_org_id)
       AND EXISTS (
            SELECT 1 FROM resources r
            WHERE r.id = p_resource_id AND r.org_id = p_org_id AND r.is_active
       )
       AND EXISTS (
            SELECT 1 FROM services s
            WHERE s.id = p_service_id AND s.org_id = p_org_id AND s.is_active
       );
$$;

REVOKE ALL ON FUNCTION public_org_is_bookable(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public_booking_target_is_valid(UUID, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public_org_is_bookable(UUID)
    TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public_booking_target_is_valid(UUID, UUID, UUID)
    TO anon, authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Customer lookup without exposing customer rows
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION find_or_create_customer(
    p_org_id UUID,
    p_name TEXT,
    p_email TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_customer_id UUID;
    v_email TEXT := nullif(btrim(coalesce(p_email, '')), '');
    v_phone TEXT := nullif(btrim(coalesce(p_phone, '')), '');
    v_name  TEXT := nullif(btrim(coalesce(p_name, '')), '');
BEGIN
    IF NOT public_org_is_bookable(p_org_id) THEN
        RAISE EXCEPTION 'organization is not accepting public bookings'
            USING ERRCODE = '42501';
    END IF;

    IF v_name IS NULL THEN
        RAISE EXCEPTION 'customer name is required' USING ERRCODE = '22023';
    END IF;

    IF v_email IS NOT NULL THEN
        SELECT id INTO v_customer_id
        FROM customers
        WHERE org_id = p_org_id AND email = v_email
        LIMIT 1;
    END IF;

    IF v_customer_id IS NULL AND v_phone IS NOT NULL THEN
        SELECT id INTO v_customer_id
        FROM customers
        WHERE org_id = p_org_id AND phone = v_phone
        LIMIT 1;
    END IF;

    IF v_customer_id IS NULL THEN
        INSERT INTO customers (org_id, name, email, phone)
        VALUES (p_org_id, v_name, v_email, v_phone)
        RETURNING id INTO v_customer_id;
    END IF;

    RETURN v_customer_id;
END;
$$;

REVOKE ALL ON FUNCTION find_or_create_customer(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION find_or_create_customer(UUID, TEXT, TEXT, TEXT)
    TO anon, authenticated, service_role;

-- The blanket policies this replaces.
DROP POLICY IF EXISTS public_select_customers ON customers;
DROP POLICY IF EXISTS public_insert_customers ON customers;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Constrain anonymous inserts
-- ─────────────────────────────────────────────────────────────────────────────

-- Org members keep writing bookings through tenant_isolation_bookings; this
-- policy now covers only the anonymous storefront path, and only for a
-- published org whose resource and service actually belong to it.
DROP POLICY IF EXISTS public_insert_bookings ON bookings;
CREATE POLICY public_insert_bookings ON bookings
    FOR INSERT
    TO anon
    WITH CHECK (
        source = 'public'
        AND public_booking_target_is_valid(org_id, resource_id, service_id)
    );

-- Audit entries from the public flow must name a real, bookable org.
DROP POLICY IF EXISTS public_insert_audit_log ON audit_log;
CREATE POLICY public_insert_audit_log ON audit_log
    FOR INSERT
    TO anon
    WITH CHECK (public_org_is_bookable(org_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Payments: owners read, members write
-- ─────────────────────────────────────────────────────────────────────────────

-- payments.org_id is nullable (00023 allows standalone expense rows), so fall
-- back to the parent booking's org when it is not set.
CREATE OR REPLACE FUNCTION payment_org_id(p_org_id UUID, p_booking_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT coalesce(
        p_org_id,
        (SELECT b.org_id FROM bookings b WHERE b.id = p_booking_id)
    );
$$;

REVOKE ALL ON FUNCTION payment_org_id(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION payment_org_id(UUID, UUID)
    TO anon, authenticated, service_role;

-- These two were FOR ALL, so they granted SELECT to every org member and
-- OR-ed away the owners-only restriction below.
DROP POLICY IF EXISTS tenant_isolation_payments ON payments;
DROP POLICY IF EXISTS tenant_isolation_payments_by_org ON payments;
DROP POLICY IF EXISTS owners_only_read_payments ON payments;

-- The only SELECT policy on the table: owners of the owning org.
CREATE POLICY payments_owner_select ON payments
    FOR SELECT
    USING (
        payment_org_id(org_id, booking_id) IN (SELECT auth_user_owned_org_ids())
    );

CREATE POLICY payments_member_insert ON payments
    FOR INSERT
    WITH CHECK (
        payment_org_id(org_id, booking_id) IN (SELECT auth_user_org_ids())
    );

CREATE POLICY payments_member_update ON payments
    FOR UPDATE
    USING (
        payment_org_id(org_id, booking_id) IN (SELECT auth_user_org_ids())
    )
    WITH CHECK (
        payment_org_id(org_id, booking_id) IN (SELECT auth_user_org_ids())
    );

CREATE POLICY payments_member_delete ON payments
    FOR DELETE
    USING (
        payment_org_id(org_id, booking_id) IN (SELECT auth_user_org_ids())
    );
