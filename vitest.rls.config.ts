import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

/**
 * The RLS suite talks to a real local Supabase instance, so it needs the same
 * credentials the app uses. Vitest does not read .env files on its own, the
 * project has no dotenv dependency, and pnpm's strict linking keeps vite's
 * loadEnv out of reach from the project root — so parse the file directly.
 */
function readEnvFile(file: string): Record<string, string> {
  let raw: string;
  try {
    raw = readFileSync(resolve(process.cwd(), file), "utf8");
  } catch {
    return {};
  }

  const out: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    // Strip a single layer of matching quotes, if present.
    out[key] = value.replace(/^(['"])(.*)\1$/, "$2");
  }
  return out;
}

const fileEnv = {
  ...readEnvFile(".env"),
  ...readEnvFile(".env.local"),
  ...readEnvFile(".env.test.local"),
};

/** Real environment variables win, so CI can inject its own credentials. */
function envVar(name: string): string {
  return process.env[name] ?? fileEnv[name] ?? "";
}

/**
 * RLS tests need genuine anon / service_role JWTs. A developer running the app
 * with DEV_AUTH=true has placeholder strings in .env.local instead, so the
 * suite prefers dedicated SUPABASE_RLS_TEST_* values when they are present.
 * Put them in .env.test.local (gitignored) — see docs/setup.md.
 */
function testKey(specific: string, fallback: string): string {
  return envVar(specific) || envVar(fallback);
}

export default defineConfig({
  test: {
    name: "rls",
    include: ["src/**/rls.test.ts", "src/**/*.rls.test.ts"],
    environment: "node",
    testTimeout: 30000,
    hookTimeout: 60000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: testKey(
        "SUPABASE_RLS_TEST_URL",
        "NEXT_PUBLIC_SUPABASE_URL",
      ),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: testKey(
        "SUPABASE_RLS_TEST_ANON_KEY",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      ),
      SUPABASE_SERVICE_ROLE_KEY: testKey(
        "SUPABASE_RLS_TEST_SERVICE_KEY",
        "SUPABASE_SERVICE_ROLE_KEY",
      ),
    },
  },
});
