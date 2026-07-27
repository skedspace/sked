/**
 * Development-mode authentication bypass.
 *
 * In local development (NODE_ENV !== "production"), auth is bypassed
 * so you can browse the full workspace without logging in.
 *
 * In production, real auth is enforced.
 */

export const DEV_AUTH_ENABLED = process.env.NODE_ENV !== "production";

const MOCK_USER_ID = "00000000-0000-0000-0000-000000000001";
const MOCK_ORG_ID = "00000000-0000-0000-0000-000000000001";

/**
 * Returns mock auth data for development when DEV_AUTH is enabled.
 */
export function getDevSession() {
  if (!DEV_AUTH_ENABLED) return null;

  return {
    session: {
      user: {
        id: MOCK_USER_ID,
        email: "dev@sked.space",
        aud: "authenticated",
        role: "authenticated",
        app_metadata: {},
        user_metadata: {},
        created_at: new Date().toISOString(),
      },
      expires_at: Math.floor(Date.now() / 1000) + 86400,
      expires_in: 86400,
      access_token: "dev-mode-token",
      refresh_token: "dev-mode-refresh",
    },
  };
}

/**
 * Returns mock membership data for development.
 */
export function getDevMembership() {
  if (!DEV_AUTH_ENABLED) return null;

  return {
    org_id: MOCK_ORG_ID,
    role: "owner" as const,
  };
}

/**
 * Creates a supabase client that returns mock data in dev mode.
 * Use this on pages that need auth gating during development.
 */
export async function withDevAuth<T>(
  fn: () => Promise<T>,
  mockData: T,
): Promise<T> {
  if (DEV_AUTH_ENABLED) {
    return mockData;
  }
  return fn();
}
