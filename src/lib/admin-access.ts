import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDevAuthEnabled } from "@/lib/dev-auth";

export type PlatformRole = "super_admin" | "admin" | "manager" | "staff" | "viewer";

export const PLATFORM_ROLES: PlatformRole[] = [
  "super_admin",
  "admin",
  "manager",
  "staff",
  "viewer",
];

export const ROLE_ACCESS: Record<
  PlatformRole,
  { label: string; scope: string; powers: string }
> = {
  super_admin: {
    label: "Super Admin",
    scope: "Platform-wide",
    powers: "Only role that can open the Command Center, manage every organization, change platform pricing, export platform data, activate/deactivate users, and manage user roles.",
  },
  admin: {
    label: "Admin",
    scope: "Assigned organization",
    powers: "Organization owner-level access in the tenant app. Can manage settings and business operations for their organization, but cannot access the Command Center.",
  },
  manager: {
    label: "Manager",
    scope: "Assigned organization",
    powers: "Operational owner-level access for bookings, courts, customers, and day-to-day setup in the assigned organization. Cannot access platform administration.",
  },
  staff: {
    label: "Staff",
    scope: "Assigned organization",
    powers: "Staff access in the tenant app. Can use organization workflows allowed by owner settings. Cannot manage platform-wide settings.",
  },
  viewer: {
    label: "Viewer",
    scope: "Assigned organization",
    powers: "Read-only platform role. Mapped to staff membership for tenant visibility, with no Command Center access.",
  },
};

const DEV_AUTH_ENABLED = isDevAuthEnabled();

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function isPlatformRole(value: unknown): value is PlatformRole {
  return typeof value === "string" && PLATFORM_ROLES.includes(value as PlatformRole);
}

export function platformRoleFromUser(user: Pick<User, "app_metadata" | "email"> | null | undefined) {
  const saved = text(user?.app_metadata?.platform_role);
  if (isPlatformRole(saved)) return saved;
  const allowedEmails = superAdminEmails();
  if (user?.email && allowedEmails.includes(user.email.toLowerCase())) {
    return "super_admin";
  }
  return null;
}

export function membershipRoleForPlatformRole(role: PlatformRole) {
  return role === "staff" || role === "viewer" ? "staff" : "owner";
}

export function superAdminEmails() {
  return [
    process.env.SUPER_ADMIN_EMAIL,
    process.env.SUPER_ADMIN_EMAILS,
    process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL,
  ]
    .filter(Boolean)
    .flatMap((value) => String(value).split(","))
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export const getCurrentAdminAccess = cache(async () => {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return { signedIn: false, isSuperAdmin: false, user: null, role: null };
  }

  if (DEV_AUTH_ENABLED) {
    return {
      signedIn: true,
      isSuperAdmin: true,
      user: session.user,
      role: "super_admin" as PlatformRole,
    };
  }

  const admin = createAdminClient();
  const current = await admin.auth.admin.getUserById(session.user.id);
  const freshUser = current.data.user ?? session.user;
  const role = platformRoleFromUser(freshUser);

  return {
    signedIn: true,
    isSuperAdmin: role === "super_admin",
    user: freshUser,
    role,
  };
});

export async function assertSuperAdmin() {
  const access = await getCurrentAdminAccess();
  if (!access.signedIn) return { ok: false as const, error: "Sign in to continue." };
  if (!access.isSuperAdmin) {
    return { ok: false as const, error: "Only the Super Admin can use the Command Center." };
  }
  return { ok: true as const, access };
}

export function isSuperAdminUser(user: Pick<User, "app_metadata" | "email">) {
  return platformRoleFromUser(user) === "super_admin";
}

export async function superAdminRouteGuard() {
  const access = await assertSuperAdmin();
  if (access.ok) return null;
  return new Response(access.error, {
    status: access.error.startsWith("Sign in") ? 401 : 403,
    headers: { "Cache-Control": "no-store" },
  });
}
