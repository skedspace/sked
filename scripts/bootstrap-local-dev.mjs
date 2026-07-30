/**
 * Bootstrap the local Supabase stack with a signed-in-able dev user.
 *
 * supabase/seed.sql creates the demo organization but deliberately leaves the
 * auth user and its org_members link as a manual step, because the user id is
 * only known once auth has minted it. This script closes that gap:
 *
 *   1. creates (or reuses) an auth user via the admin API
 *   2. stamps app_metadata.platform_role = super_admin so the Command Center
 *      gate in src/lib/admin-access.ts admits it
 *   3. links the user to the demo org as owner
 *
 * Usage: node scripts/bootstrap-local-dev.mjs
 * Requires the local stack to be running (npx supabase start).
 */
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_KEY = process.env.SERVICE_ROLE_KEY;
const EMAIL = process.env.DEV_EMAIL ?? "dev@sked.space";
const PASSWORD = process.env.DEV_PASSWORD ?? "devpassword123";
const ORG_ID = "00000000-0000-0000-0000-000000000001";

if (!SERVICE_KEY) {
  console.error("SERVICE_ROLE_KEY env var is required");
  process.exit(1);
}

const admin = createClient(URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findExisting(email) {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  return data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

const existing = await findExisting(EMAIL);

let user;
if (existing) {
  const { data, error } = await admin.auth.admin.updateUserById(existing.id, {
    password: PASSWORD,
    app_metadata: { platform_role: "super_admin", account_status: "active" },
  });
  if (error) throw error;
  user = data.user;
  console.log(`reused existing user ${user.email} (${user.id})`);
} else {
  const { data, error } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    app_metadata: { platform_role: "super_admin", account_status: "active" },
  });
  if (error) throw error;
  user = data.user;
  console.log(`created user ${user.email} (${user.id})`);
}

const { error: memberError } = await admin
  .from("org_members")
  .upsert({ org_id: ORG_ID, user_id: user.id, role: "owner" }, { onConflict: "org_id,user_id" });

if (memberError) {
  console.error("failed to link org membership:", memberError.message);
  process.exit(1);
}
console.log(`linked ${user.email} to org ${ORG_ID} as owner`);

const { data: check } = await admin
  .from("org_members")
  .select("org_id, user_id, role")
  .eq("user_id", user.id);
console.log("org_members rows:", JSON.stringify(check));
console.log(`\nSign in at http://localhost:3000/login with:\n  ${EMAIL} / ${PASSWORD}`);
