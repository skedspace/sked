import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentAdminAccess } from "@/lib/admin-access";
import { AdminSidebar } from "./admin-sidebar";
import "./admin.css";

export const metadata: Metadata = {
  title: "Command Center",
  description: "SKED platform administration",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const access = await getCurrentAdminAccess();
  if (!access.signedIn) redirect("/login?redirect=/admin");
  if (!access.isSuperAdmin) notFound();

  return (
    <div className="admin-shell">
      <AdminSidebar
        userName={access.user?.user_metadata?.full_name as string | undefined}
        userEmail={access.user?.email}
      />
      <main className="admin-main">{children}</main>
    </div>
  );
}
