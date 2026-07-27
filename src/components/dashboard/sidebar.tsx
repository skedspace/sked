"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarCheck2,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  CreditCard,
  Grid2X2,
  LayoutDashboard,
  Monitor,
  PanelsTopLeft,
  Radio,
  Settings,
  SlidersHorizontal,
  Star,
  Swords,
  Trophy,
  UserRound,
  UsersRound,
} from "lucide-react";

export function DashboardSidebar({
  isOwner: _isOwner,
  orgId,
}: {
  isOwner: boolean;
  orgId: string;
}) {
  const pathname = usePathname();

  // Build nav items — Board link needs orgId
  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/calendar", label: "Calendar", icon: CalendarDays },
    { href: "/dashboard/bookings", label: "Bookings", icon: ClipboardList },
    { href: "/dashboard/courts", label: "Courts", icon: Grid2X2 },
    { href: "/dashboard/matches", label: "Matches", icon: Trophy },
    { href: "/dashboard/tournaments", label: "Tournaments", icon: Swords },
    { href: `/board/${orgId}`, label: "Board View", icon: Monitor },
    { href: "/dashboard/session", label: "Live Session", icon: Radio },
    {
      href: `/dashboard/settings/board`,
      label: "Board Settings",
      icon: SlidersHorizontal,
    },
    { href: "/dashboard/customers", label: "Customers", icon: UserRound },
    { href: "/dashboard/players", label: "Players", icon: UsersRound },
    { href: "/dashboard/payments", label: "Payments", icon: CreditCard },
    { href: "/dashboard/reviews", label: "Reviews", icon: Star },
    { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
    {
      href: "/dashboard/settings/page",
      label: "Public Page",
      icon: PanelsTopLeft,
    },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
  ];

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <aside className="sticky top-0 flex h-screen w-16 shrink-0 flex-col border-r border-black/[0.07] bg-[#fdfcf9] px-2 py-5 sm:w-60 sm:px-5 sm:py-7">
      <Link
        href="/dashboard"
        className="flex h-11 items-center gap-3 px-1.5 focus-visible:ring-2 focus-visible:ring-[#65ad00] focus-visible:outline-none"
        aria-label="Sked dashboard"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#151713] text-[#b9f34b] shadow-[0_8px_20px_rgba(23,26,22,0.15)]">
          <CalendarCheck2 className="h-5 w-5" />
        </span>
        <span className="hidden text-xl font-black tracking-[-0.04em] text-[#151713] sm:inline">
          sked
        </span>
      </Link>

      <nav
        className="mt-6 flex-1 space-y-0.5 overflow-y-auto"
        aria-label="Main"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`flex min-h-10 items-center justify-center gap-3 rounded-xl px-3 text-sm font-semibold transition-all focus-visible:ring-2 focus-visible:ring-[#65ad00] focus-visible:outline-none sm:justify-start ${
                active
                  ? "bg-[#eff9d8] text-[#245d19]"
                  : "text-[#565b54] hover:bg-black/[0.035] hover:text-[#151713]"
              }`}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
              <span className="hidden sm:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        className="mt-5 flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl border border-[#dfeabf] bg-[#f5fadf] p-2.5 text-left transition-colors hover:bg-[#eff8cf] focus-visible:ring-2 focus-visible:ring-[#65ad00] focus-visible:outline-none sm:justify-start"
        aria-label="Open Maya Studio account menu"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#171a16] text-[11px] font-black text-white">
          MS
        </span>
        <span className="hidden min-w-0 flex-1 sm:block">
          <span className="block truncate text-xs font-black text-[#171a16]">
            Maya Studio
          </span>
          <span className="text-muted-foreground mt-0.5 block text-[10px]">
            Admin
          </span>
        </span>
        <ChevronDown className="text-muted-foreground hidden h-4 w-4 sm:block" />
      </button>
    </aside>
  );
}
