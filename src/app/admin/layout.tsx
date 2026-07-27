import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Admin uses the service role client which bypasses RLS.
  // No auth check needed — the admin routes are protected by
  // the middleware in production (or DEV_AUTH bypass in dev).

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r bg-ink p-4 text-white">
        <Link href="/admin" className="mb-6 block text-lg font-bold">
          SKED Admin
        </Link>
        <nav className="space-y-1">
          <AdminNavItem href="/admin" label="Overview" />
          <AdminNavItem href="/admin/organizations" label="Organizations" />
          <AdminNavItem href="/admin/users" label="Users" />
          <AdminNavItem href="/admin/bookings" label="Bookings" />
          <hr className="my-3 border-white/20" />
          <AdminNavItem href="/dashboard" label="← Back to dashboard" />
        </nav>
      </aside>
      <main className="flex-1 bg-paper p-8">{children}</main>
    </div>
  );
}

function AdminNavItem({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block rounded-md px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
    >
      {label}
    </Link>
  );
}
