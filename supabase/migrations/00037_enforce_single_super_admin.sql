-- Migration: 00037_enforce_single_super_admin.sql
-- Supabase-managed auth.users cannot be safely indexed from project migrations.
-- The single Super Admin invariant is enforced in admin user server actions.

DO $$
BEGIN
    RAISE NOTICE 'Single Super Admin is enforced by application server actions.';
END $$;
