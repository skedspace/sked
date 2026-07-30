/**
 * Sign in against the local stack using the very same @supabase/ssr code path
 * the app uses, and print the cookies it wants to set as a single Cookie header.
 *
 * This exists because the in-app browser pane does not composite frames, so React
 * never hydrates there and the login form cannot be driven interactively. Minting
 * the cookie here lets authenticated pages be verified over plain HTTP instead.
 *
 * Usage: node scripts/mint-session-cookie.mjs
 */
import { createServerClient } from "@supabase/ssr";

const URL_ = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON = process.env.ANON_KEY;
const EMAIL = process.env.DEV_EMAIL ?? "dev@sked.space";
const PASSWORD = process.env.DEV_PASSWORD ?? "devpassword123";

if (!ANON) {
  console.error("ANON_KEY env var is required");
  process.exit(1);
}

const jar = new Map();

const supabase = createServerClient(URL_, ANON, {
  cookies: {
    getAll: () => [...jar.entries()].map(([name, value]) => ({ name, value })),
    setAll: (cookies) => {
      for (const { name, value } of cookies) jar.set(name, value);
    },
  },
});

const { data, error } = await supabase.auth.signInWithPassword({
  email: EMAIL,
  password: PASSWORD,
});

if (error) {
  console.error("SIGNIN_FAILED:", error.message);
  process.exit(1);
}

console.error(`signed in as ${data.user.email} (${data.user.id})`);
console.error(`platform_role=${JSON.stringify(data.user.app_metadata?.platform_role)}`);
console.error(`cookie names: ${[...jar.keys()].join(", ")}`);

// stdout is only the header value, so callers can capture it cleanly.
process.stdout.write([...jar.entries()].map(([n, v]) => `${n}=${v}`).join("; "));
