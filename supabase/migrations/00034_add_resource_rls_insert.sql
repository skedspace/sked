-- Migration: 00034_add_resource_rls_insert.sql
-- Adds missing INSERT/UPDATE/DELETE policies for resources, locations,
-- services, and service_resources tables so authenticated members can
-- create/edit courts.
--
-- DOWN:
--   DROP POLICY IF EXISTS owner_insert_resources ON resources;
--   DROP POLICY IF EXISTS owner_update_resources ON resources;
--   DROP POLICY IF EXISTS owner_insert_locations ON locations;
--   DROP POLICY IF EXISTS owner_update_locations ON locations;
--   DROP POLICY IF EXISTS owner_insert_services ON services;
--   DROP POLICY IF EXISTS owner_update_services ON services;
--   DROP POLICY IF EXISTS owner_insert_service_resources ON service_resources;
--   DROP POLICY IF EXISTS owner_delete_service_resources ON service_resources;

-- 1. Resources — INSERT + UPDATE for authenticated members
CREATE POLICY IF NOT EXISTS owner_insert_resources ON resources
    FOR INSERT
    WITH CHECK (org_id IN (
        SELECT org_id FROM org_members WHERE user_id = auth.uid()
    ));

CREATE POLICY IF NOT EXISTS owner_update_resources ON resources
    FOR UPDATE
    USING (org_id IN (
        SELECT org_id FROM org_members WHERE user_id = auth.uid()
    ));

-- 2. Locations — INSERT + UPDATE
CREATE POLICY IF NOT EXISTS owner_insert_locations ON locations
    FOR INSERT
    WITH CHECK (org_id IN (
        SELECT org_id FROM org_members WHERE user_id = auth.uid()
    ));

CREATE POLICY IF NOT EXISTS owner_update_locations ON locations
    FOR UPDATE
    USING (org_id IN (
        SELECT org_id FROM org_members WHERE user_id = auth.uid()
    ));

-- 3. Services — INSERT + UPDATE
CREATE POLICY IF NOT EXISTS owner_insert_services ON services
    FOR INSERT
    WITH CHECK (org_id IN (
        SELECT org_id FROM org_members WHERE user_id = auth.uid()
    ));

CREATE POLICY IF NOT EXISTS owner_update_services ON services
    FOR UPDATE
    USING (org_id IN (
        SELECT org_id FROM org_members WHERE user_id = auth.uid()
    ));

-- 4. Service-Resources — INSERT + DELETE
CREATE POLICY IF NOT EXISTS owner_insert_service_resources ON service_resources
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY IF NOT EXISTS owner_delete_service_resources ON service_resources
    FOR DELETE
    USING (true);
