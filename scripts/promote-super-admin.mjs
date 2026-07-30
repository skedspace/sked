/**
 * Grant an existing account the super_admin platform role.
 *
 * /admin admits a user when either
 *   a) their app_metadata.platform_role is 'super_admin', or
 *   b) their email is in SUPER_ADMIN_EMAIL / SUPER_ADMIN_EMAILS.
 *
 * (b) needs the env var wired into every environment that serves /admin. This
 * script does (a) instead: it stamps the role onto the account itself, so the
 * Command Center opens without a redeploy. It also confirms the email address
 * if confirmation is still pending, which is what blocks sign-in entirely.
 *
 * Usage (against the deployed project — take both values from
 * Supabase → Project Settings → API):
 *
 *   SUPABASE_URL=https://xxxx.supabase.co \
 *   SERVICE_ROLE_KEY=eyJ… \
 *   node scripts/promote-super-admin.mjs owner@example.com
 *
 * Falls back to NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY, so
 * `node --env-file=.env.local scripts/promote-super-admin.mjs <email>` works too.
 */
import { createClient } from "@supabase/supabase-js";

const url =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceKey =
  process.env.SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const email = process.argv[2]?.trim().toLowerCase();

if (!email) {
  console.error("usage: node scripts/promote-super-admin.mjs <email>");
  process.exit(1);
}
if (!url || !serviceKey) {
  console.error(
    "SUPABASE_URL and SERVICE_ROLE_KEY are required (or NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)",
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUser(target) {
  // listUsers is paginated; the project is small enough to walk it.
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw error;
    const match = data.users.find(
      (user) => user.email?.toLowerCase() === target,
    );
    if (match) return match;
    if (data.users.length < 200) return null;
  }
  return null;
}

const user = await findUser(email);

if (!user) {
  console.error(
    `no account found for ${email} — sign up at /signup first, then re-run this`,
  );
  process.exit(1);
}

const { data, error } = await admin.auth.admin.updateUserById(user.id, {
  email_confirm: true,
  app_metadata: {
    ...user.app_metadata,
    platform_role: "super_admin",
    account_status: "active",
  },
});

if (error) {
  console.error(`failed to promote ${email}: ${error.message}`);
  process.exit(1);
}

console.log(`promoted ${data.user.email} (${data.user.id}) to super_admin`);
console.log(`email confirmed: ${Boolean(data.user.email_confirmed_at)}`);
console.log("\nOpen /admin — the gate re-reads the account on every request.");
