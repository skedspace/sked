import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, CheckCircle2, LockKeyhole, ShieldCheck, UserCheck } from "lucide-react";
import { getCurrentAdminAccess, superAdminEmails } from "@/lib/admin-access";
import { AdminSignupForm } from "./admin-signup-form";

export const dynamic = "force-dynamic";

export default async function AdminSignupPage() {
  const access = await getCurrentAdminAccess();
  if (access.signedIn && access.isSuperAdmin) redirect("/admin");
  const allowedEmails = superAdminEmails();
  const inviteOnly = allowedEmails.length > 0;

  return (
    <main className="admin-auth-shell">
      <section className="admin-auth-visual">
        <Link href="/" className="admin-auth-brand">
          <span><CalendarDays /></span>
          <strong>sked</strong>
          <small>ADMIN</small>
        </Link>
        <div>
          <p>Owner Access</p>
          <h1>Secure command center enrollment.</h1>
          <span>Admin access is separate from organization staff accounts and requires owner-level verification.</span>
        </div>
        <ul>
          <li><ShieldCheck /> Platform-wide permissions</li>
          <li><UserCheck /> Super admin role check</li>
          <li><LockKeyhole /> Invite-only protection</li>
        </ul>
      </section>
      <section className="admin-auth-card">
        <div>
          <p>Admin Signup</p>
          <h2>{inviteOnly ? "Verify your owner email" : "Admin access is restricted"}</h2>
          <span>
            {inviteOnly
              ? "Use an approved owner email. After verification, we will route you to the Command Center."
              : "Set SUPER_ADMIN_EMAIL or SUPER_ADMIN_EMAILS before enabling admin signup."}
          </span>
        </div>
        <AdminSignupForm allowedEmails={allowedEmails} />
        <div className="admin-auth-footnote">
          <CheckCircle2 />
          <span>Normal organizations should use the public signup flow. This page is only for website owner/developer privileges.</span>
        </div>
        <Link href="/login">Already approved? Sign in</Link>
      </section>
    </main>
  );
}
