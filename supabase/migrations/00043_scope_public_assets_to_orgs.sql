-- Migration: 00043_scope_public_assets_to_orgs.sql
-- Limit writes and deletes in public-assets to the organization namespace in
-- the object key. Public reads remain unrestricted because the bucket serves
-- public storefront images.
--
-- Object keys are written as `<org_id>/<asset-folder>/<file>` by the app.

DROP POLICY IF EXISTS public_assets_insert ON storage.objects;
CREATE POLICY public_assets_insert ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'public-assets'
        AND (storage.foldername(name))[1] IN (
            SELECT org_id::text
            FROM auth_user_org_ids() AS org(org_id)
        )
    );

DROP POLICY IF EXISTS public_assets_update ON storage.objects;
CREATE POLICY public_assets_update ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'public-assets'
        AND (storage.foldername(name))[1] IN (
            SELECT org_id::text
            FROM auth_user_org_ids() AS org(org_id)
        )
    )
    WITH CHECK (
        bucket_id = 'public-assets'
        AND (storage.foldername(name))[1] IN (
            SELECT org_id::text
            FROM auth_user_org_ids() AS org(org_id)
        )
    );

DROP POLICY IF EXISTS public_assets_delete ON storage.objects;
CREATE POLICY public_assets_delete ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'public-assets'
        AND (storage.foldername(name))[1] IN (
            SELECT org_id::text
            FROM auth_user_org_ids() AS org(org_id)
        )
    );
