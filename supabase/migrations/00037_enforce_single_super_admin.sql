-- Keep the platform Super Admin role unique even if auth metadata is changed
-- outside the application UI.
CREATE UNIQUE INDEX IF NOT EXISTS one_platform_super_admin
ON auth.users ((raw_app_meta_data ->> 'platform_role'))
WHERE raw_app_meta_data ->> 'platform_role' = 'super_admin';

