"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import {
  assertSuperAdmin,
  isSuperAdminUser,
  isPlatformRole,
  membershipRoleForPlatformRole,
} from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminUserRole, AdminUserStatus } from "./admin-user-list";

type ActionResult = {
  ok: boolean;
  error?: string;
  inviteSent?: boolean;
};

function password() {
  return `${randomBytes(18).toString("base64url")}aA1!`;
}

async function hasAnotherSuperAdmin(supabase: ReturnType<typeof createAdminClient>, userId?: string) {
  const result = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (result.error) return { error: result.error.message };
  const existing = (result.data.users ?? []).filter(
    (user) => user.id !== userId && isSuperAdminUser(user),
  );
  return { hasAnother: existing.length > 0 };
}

export async function createAdminUserAction(input: {
  name: string;
  email: string;
  role: AdminUserRole;
  orgId: string;
}): Promise<ActionResult> {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const role = isPlatformRole(input.role) ? input.role : "staff";

  const access = await assertSuperAdmin();
  if (!access.ok) return { ok: false, error: access.error };
  if (name.length < 2) return { ok: false, error: "Full name is required." };
  if (!email.includes("@")) return { ok: false, error: "Enter a valid email address." };
  if (!input.orgId) return { ok: false, error: "Choose an organization." };

  const supabase = createAdminClient();
  if (role === "super_admin") {
    const uniqueness = await hasAnotherSuperAdmin(supabase);
    if (uniqueness.error) return { ok: false, error: uniqueness.error };
    if (uniqueness.hasAnother) {
      return { ok: false, error: "There can only be one Super Admin." };
    }
  }

  const { data: organization, error: orgError } = await supabase
    .from("organizations")
    .select("id")
    .eq("id", input.orgId)
    .maybeSingle();

  if (orgError) return { ok: false, error: orgError.message };
  if (!organization) return { ok: false, error: "Organization was not found." };

  const created = await supabase.auth.admin.createUser({
    email,
    password: password(),
    email_confirm: true,
    user_metadata: { full_name: name },
    app_metadata: { platform_role: role, account_status: "active" },
  });

  if (created.error || !created.data.user) {
    return { ok: false, error: created.error?.message || "Unable to create user." };
  }

  const membership = await supabase.from("org_members").upsert({
    org_id: input.orgId,
    user_id: created.data.user.id,
    role: membershipRoleForPlatformRole(role),
  });

  if (membership.error) {
    await supabase.auth.admin.deleteUser(created.data.user.id);
    return { ok: false, error: membership.error.message };
  }

  const invite = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { full_name: name },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  return { ok: true, inviteSent: !invite.error };
}

export async function updateAdminUserRoleAction(
  userId: string,
  role: AdminUserRole,
  orgId: string,
): Promise<ActionResult> {
  if (!isPlatformRole(role)) return { ok: false, error: "Choose a valid role." };

  const access = await assertSuperAdmin();
  if (!access.ok) return { ok: false, error: access.error };

  const supabase = createAdminClient();
  const current = await supabase.auth.admin.getUserById(userId);
  if (current.error || !current.data.user) {
    return { ok: false, error: current.error?.message || "User was not found." };
  }

  const appMetadata =
    current.data.user.app_metadata && typeof current.data.user.app_metadata === "object"
      ? current.data.user.app_metadata
      : {};
  const currentRole = isSuperAdminUser(current.data.user) ? "super_admin" : appMetadata.platform_role;

  if (role === "super_admin") {
    const uniqueness = await hasAnotherSuperAdmin(supabase, userId);
    if (uniqueness.error) return { ok: false, error: uniqueness.error };
    if (uniqueness.hasAnother) {
      return { ok: false, error: "There can only be one Super Admin." };
    }
  }

  if (currentRole === "super_admin" && role !== "super_admin") {
    return { ok: false, error: "The only Super Admin cannot be demoted." };
  }

  const authUpdate = await supabase.auth.admin.updateUserById(userId, {
    app_metadata: { ...appMetadata, platform_role: role },
  });

  if (authUpdate.error) return { ok: false, error: authUpdate.error.message };

  if (orgId) {
    const membership = await supabase
      .from("org_members")
      .update({ role: membershipRoleForPlatformRole(role) })
      .eq("user_id", userId)
      .eq("org_id", orgId);
    if (membership.error) return { ok: false, error: membership.error.message };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function updateAdminUserStatusAction(
  userId: string,
  status: AdminUserStatus,
): Promise<ActionResult> {
  if (status !== "active" && status !== "inactive") {
    return { ok: false, error: "Choose a valid status." };
  }

  const access = await assertSuperAdmin();
  if (!access.ok) return { ok: false, error: access.error };

  const supabase = createAdminClient();
  const current = await supabase.auth.admin.getUserById(userId);
  if (current.error || !current.data.user) {
    return { ok: false, error: current.error?.message || "User was not found." };
  }

  const appMetadata =
    current.data.user.app_metadata && typeof current.data.user.app_metadata === "object"
      ? current.data.user.app_metadata
      : {};
  if (status === "inactive" && isSuperAdminUser(current.data.user)) {
    return { ok: false, error: "The only Super Admin cannot be deactivated." };
  }

  const result = await supabase.auth.admin.updateUserById(userId, {
    app_metadata: { ...appMetadata, account_status: status },
    ban_duration: status === "inactive" ? "876000h" : "none",
  });

  if (result.error) return { ok: false, error: result.error.message };

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  return { ok: true };
}
