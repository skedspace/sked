-- Migration: 00027_add_public_insert_policies.sql
-- Allow public (anon) users to insert customers and bookings through the server action.
-- The server action validates all fields before inserting.

-- DOWN: drop policy if exists public_insert_customers on customers;
-- DOWN: drop policy if exists public_insert_bookings on bookings;
-- DOWN: drop policy if exists public_insert_audit_log on audit_log;

-- 1. Customers: allow anon inserts for public booking flow
CREATE POLICY public_insert_customers ON customers
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- 2. Bookings: allow anon inserts for public booking flow
CREATE POLICY public_insert_bookings ON bookings
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- 3. Customers: allow anon select by email/phone (needed to find existing customers)
CREATE POLICY public_select_customers ON customers
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- 4. Audit log: allow insert for booking audit trail
CREATE POLICY public_insert_audit_log ON audit_log
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);
