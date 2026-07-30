-- Fix infinite recursion in the org_members RLS policies.
--
-- All three policies created in 00001 subquery org_members from inside a policy
-- that is itself ON org_members:
--
--     CREATE POLICY "users_can_view_own_memberships" ON org_members
--         FOR SELECT USING (user_id = auth.uid() OR org_id IN (
--             SELECT org_id FROM org_members WHERE user_id = auth.uid()));
--
-- Evaluating the policy requires evaluating the policy, so Postgres aborts with:
--     42P17: infinite recursion detected in policy for relation "org_members"
--
-- This is not limited to org_members. Policies on organizations (and other
-- tables) test membership with `IN (SELECT org_id FROM org_members ...)`, so the
-- recursion propagates to every membership-gated table in the schema.
--
-- The standard remedy is to read the membership rows through a SECURITY DEFINER
-- function. It executes as its owner, which bypasses RLS on org_members, so the
-- policy no longer re-enters itself.

CREATE OR REPLACE FUNCTION auth_user_org_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT org_id FROM org_members WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION auth_user_owned_org_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT org_id FROM org_members
    WHERE user_id = auth.uid() AND role = 'owner';
$$;

REVOKE ALL ON FUNCTION auth_user_org_ids() FROM PUBLIC;
REVOKE ALL ON FUNCTION auth_user_owned_org_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth_user_org_ids() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth_user_owned_org_ids() TO authenticated, service_role;

DROP POLICY IF EXISTS "users_can_view_own_memberships" ON org_members;
DROP POLICY IF EXISTS "owners_can_invite_members" ON org_members;
DROP POLICY IF EXISTS "owners_can_remove_members" ON org_members;

-- Same intent as the originals: see your own row, plus every member of an org
-- you belong to; only owners may add or remove members.
CREATE POLICY "users_can_view_own_memberships" ON org_members
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR org_id IN (SELECT auth_user_org_ids())
    );

CREATE POLICY "owners_can_invite_members" ON org_members
    FOR INSERT
    WITH CHECK (org_id IN (SELECT auth_user_owned_org_ids()));

CREATE POLICY "owners_can_remove_members" ON org_members
    FOR DELETE
    USING (org_id IN (SELECT auth_user_owned_org_ids()));
