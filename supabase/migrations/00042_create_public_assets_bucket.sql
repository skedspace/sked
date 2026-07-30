-- Migration: 00042_create_public_assets_bucket.sql
-- Creates a public storage bucket for user-uploaded images (court photos,
-- public page gallery photos, etc.) so owners can upload files directly
-- instead of pasting external image URLs.
--
-- DOWN:
--   DROP POLICY IF EXISTS public_assets_read ON storage.objects;
--   DROP POLICY IF EXISTS public_assets_insert ON storage.objects;
--   DROP POLICY IF EXISTS public_assets_update ON storage.objects;
--   DROP POLICY IF EXISTS public_assets_delete ON storage.objects;
--   DELETE FROM storage.buckets WHERE id = 'public-assets';

-- 1. Public bucket. Files are world-readable (the public page needs them),
--    while writes are restricted to authenticated members below.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'public-assets',
    'public-assets',
    true,
    10485760, -- 10 MB, matches config.toml storage limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Anyone can read (bucket is public / served on the storefront).
DROP POLICY IF EXISTS public_assets_read ON storage.objects;
CREATE POLICY public_assets_read ON storage.objects
    FOR SELECT
    USING (bucket_id = 'public-assets');

-- 3. Authenticated users can upload/replace/remove objects in this bucket.
--    Object keys are namespaced by org id from the app (e.g. "<orgId>/courts/..").
DROP POLICY IF EXISTS public_assets_insert ON storage.objects;
CREATE POLICY public_assets_insert ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'public-assets');

DROP POLICY IF EXISTS public_assets_update ON storage.objects;
CREATE POLICY public_assets_update ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'public-assets')
    WITH CHECK (bucket_id = 'public-assets');

DROP POLICY IF EXISTS public_assets_delete ON storage.objects;
CREATE POLICY public_assets_delete ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'public-assets');
