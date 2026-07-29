"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BadgePercent,
  BellRing,
  Building2,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  MonitorCog,
  Settings,
  SlidersHorizontal,
  Users,
  WalletCards,
  X,
  Menu,
  LogOut,
  UserRound,
} from "lucide-react";
import { useState } from "react";

const groups = [
  {
    label: "",
    items: [{ href: "/admin", label: "Command Center", icon: LayoutDashboard }],
  },
  {
    label: "Manage",
    items: [
      { href: "/admin/organizations", label: "Organizations", icon: Building2 },
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/subscriptions", label: "Subscriptions", icon: WalletCards },
      { href: "/admin/payments", label: "Payments", icon: CreditCard },
      { href: "/admin/bookings", label: "Bookings", icon: CalendarDays },
      { href: "/admin/courts", label: "Courts", icon: MonitorCog },
    ],
  },
  {
    label: "Growth",
    items: [
      { href: "/admin/pricing", label: "Plans & Pricing", icon: CircleDollarSign },
      { href: "/admin/promotions", label: "Promotions", icon: BadgePercent },
      { href: "/admin/analytics", label: "Analytics", icon: ChartNoAxesCombined },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/platform-settings", label: "Settings", icon: Settings },
      { href: "/admin/integrations", label: "Integrations", icon: SlidersHorizontal },
      { href: "/admin/audit-logs", label: "Audit Logs", icon: ClipboardList },
    ],
  },
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "SA";
}

export function AdminSidebar({
  userName,
  userEmail,
}: {
  userName?: string;
  userEmail?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const displayName = userName || userEmail || "Super Admin";

  return (
    <>
      <button
        className="admin-mobile-menu"
        type="button"
        aria-label={open ? "Close navigation" : "Open navigation"}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X /> : <Menu />}
      </button>
      {open && <button className="admin-nav-scrim" aria-label="Close navigation" onClick={() => setOpen(false)} />}
      <aside className={`admin-sidebar ${open ? "is-open" : ""}`}>
        <Link href="/admin" className="admin-brand" onClick={() => setOpen(false)}>
          <span className="admin-brand-mark">
            <CalendarDays aria-hidden="true" />
          </span>
          <span>
            <strong>sked</strong>
            <small>ADMIN</small>
          </span>
        </Link>

        <nav aria-label="Admin navigation">
          {groups.map((group, index) => (
            <div className="admin-nav-group" key={group.label || index}>
              {group.label && <p>{group.label}</p>}
              {group.items.map((item) => {
                const active =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    href={item.href}
                    key={item.href}
                    className={active ? "is-active" : ""}
                    onClick={() => setOpen(false)}
                  >
                    <Icon aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <details className="admin-profile-menu">
          <summary className="admin-profile">
            <span className="admin-avatar">{initials(displayName)}</span>
            <span>
              <strong>{displayName}</strong>
              <small>Super Admin</small>
            </span>
            <ChevronDown aria-hidden="true" />
          </summary>
          <div>
            <Link href="/dashboard" onClick={() => setOpen(false)}><UserRound />Organization dashboard</Link>
            <Link href="/admin/platform-settings" onClick={() => setOpen(false)}><Settings />Platform settings</Link>
            <Link href="/admin/audit-logs" onClick={() => setOpen(false)}><ClipboardList />Audit logs</Link>
            <form action="/auth/signout" method="post">
              <button type="submit"><LogOut />Sign out</button>
            </form>
          </div>
        </details>
        <div className="admin-status is-visible">
          <Activity />
          Admin session active
          <BellRing />
        </div>
      </aside>
    </>
  );
}
