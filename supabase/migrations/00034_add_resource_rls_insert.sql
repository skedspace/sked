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

-- 1. Resources: INSERT + UPDATE for authenticated tenant members
DROP POLICY IF EXISTS owner_insert_resources ON resources;
CREATE POLICY owner_insert_resources ON resources
    FOR INSERT
    WITH CHECK (org_id IN (
        SELECT org_id FROM org_members WHERE user_id = auth.uid()
    ));

DROP POLICY IF EXISTS owner_update_resources ON resources;
CREATE POLICY owner_update_resources ON resources
    FOR UPDATE
    USING (org_id IN (
        SELECT org_id FROM org_members WHERE user_id = auth.uid()
    ))
    WITH CHECK (org_id IN (
        SELECT org_id FROM org_members WHERE user_id = auth.uid()
    ));

-- 2. Locations: INSERT + UPDATE
DROP POLICY IF EXISTS owner_insert_locations ON locations;
CREATE POLICY owner_insert_locations ON locations
    FOR INSERT
    WITH CHECK (org_id IN (
        SELECT org_id FROM org_members WHERE user_id = auth.uid()
    ));

DROP POLICY IF EXISTS owner_update_locations ON locations;
CREATE POLICY owner_update_locations ON locations
    FOR UPDATE
    USING (org_id IN (
        SELECT org_id FROM org_members WHERE user_id = auth.uid()
    ))
    WITH CHECK (org_id IN (
        SELECT org_id FROM org_members WHERE user_id = auth.uid()
    ));

-- 3. Services: INSERT + UPDATE
DROP POLICY IF EXISTS owner_insert_services ON services;
CREATE POLICY owner_insert_services ON services
    FOR INSERT
    WITH CHECK (org_id IN (
        SELECT org_id FROM org_members WHERE user_id = auth.uid()
    ));

DROP POLICY IF EXISTS owner_update_services ON services;
CREATE POLICY owner_update_services ON services
    FOR UPDATE
    USING (org_id IN (
        SELECT org_id FROM org_members WHERE user_id = auth.uid()
    ))
    WITH CHECK (org_id IN (
        SELECT org_id FROM org_members WHERE user_id = auth.uid()
    ));

-- 4. Service-Resources: INSERT + DELETE for links inside a member org
DROP POLICY IF EXISTS tenant_isolation_service_resources ON service_resources;
CREATE POLICY tenant_isolation_service_resources ON service_resources
    USING (
        service_id IN (
            SELECT id FROM services WHERE org_id IN (
                SELECT org_id FROM org_members WHERE user_id = auth.uid()
            )
        )
        AND resource_id IN (
            SELECT id FROM resources WHERE org_id IN (
                SELECT org_id FROM org_members WHERE user_id = auth.uid()
            )
        )
    )
    WITH CHECK (
        service_id IN (
            SELECT id FROM services WHERE org_id IN (
                SELECT org_id FROM org_members WHERE user_id = auth.uid()
            )
        )
        AND resource_id IN (
            SELECT id FROM resources WHERE org_id IN (
                SELECT org_id FROM org_members WHERE user_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS owner_insert_service_resources ON service_resources;
CREATE POLICY owner_insert_service_resources ON service_resources
    FOR INSERT
    WITH CHECK (
        service_id IN (
            SELECT id FROM services WHERE org_id IN (
                SELECT org_id FROM org_members WHERE user_id = auth.uid()
            )
        )
        AND resource_id IN (
            SELECT id FROM resources WHERE org_id IN (
                SELECT org_id FROM org_members WHERE user_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS owner_delete_service_resources ON service_resources;
CREATE POLICY owner_delete_service_resources ON service_resources
    FOR DELETE
    USING (
        service_id IN (
            SELECT id FROM services WHERE org_id IN (
                SELECT org_id FROM org_members WHERE user_id = auth.uid()
            )
        )
        AND resource_id IN (
            SELECT id FROM resources WHERE org_id IN (
                SELECT org_id FROM org_members WHERE user_id = auth.uid()
            )
        )
    );
