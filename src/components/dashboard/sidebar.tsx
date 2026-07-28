"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  CalendarCheck2,
  CalendarDays,
  ChevronDown,
  ChevronRight,
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

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === href;
    return pathname.startsWith(href);
  };

  type NavItem = {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  };

  type NavSection = {
    label: string | null;
    items: NavItem[];
  };

  const sections: NavSection[] = [
    {
      label: null,
      items: [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/dashboard/session", label: "Live Session", icon: Radio },
      ],
    },
    {
      label: "Scheduling",
      items: [
        { href: "/dashboard/calendar", label: "Calendar", icon: CalendarDays },
        { href: "/dashboard/bookings", label: "Bookings", icon: ClipboardList },
        { href: "/dashboard/courts", label: "Courts", icon: Grid2X2 },
      ],
    },
    {
      label: "Competition",
      items: [
        { href: "/dashboard/matches", label: "Matches", icon: Trophy },
        { href: "/dashboard/tournaments", label: "Tournaments", icon: Swords },
      ],
    },
    {
      label: "Venue & Public",
      items: [
        { href: `/board/${orgId}`, label: "Board View", icon: Monitor },
        {
          href: `/dashboard/settings/board`,
          label: "Board Settings",
          icon: SlidersHorizontal,
        },
        {
          href: "/dashboard/settings/page",
          label: "Public Page",
          icon: PanelsTopLeft,
        },
      ],
    },
    {
      label: "People",
      items: [
        { href: "/dashboard/customers", label: "Customers", icon: UserRound },
        { href: "/dashboard/players", label: "Players", icon: UsersRound },
        {
          href: "/dashboard/settings/team",
          label: "Team",
          icon: UsersRound,
        },
      ],
    },
    {
      label: "Finance",
      items: [
        { href: "/dashboard/payments", label: "Payments", icon: CreditCard },
        { href: "/dashboard/reviews", label: "Reviews", icon: Star },
        { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
      ],
    },
    {
      label: null,
      items: [{ href: "/dashboard/settings", label: "Settings", icon: Settings }],
    },
  ];

  // Determine which sections have an active child so they auto-expand
  function sectionHasActive(itemSet: NavItem[]) {
    return itemSet.some((item) => isActive(item.href));
  }

  // Initialize any section that has an active item as open
  function initOpen() {
    const open: Record<string, boolean> = {};
    for (const section of sections) {
      if (section.label && sectionHasActive(section.items)) {
        open[section.label] = true;
      }
    }
    return open;
  }

  const [expanded, setExpanded] = useState<Record<string, boolean>>(initOpen);

  function toggleSection(label: string) {
    setExpanded((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  function renderItems(items: NavItem[]) {
    return items.map((item) => {
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
    });
  }

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
        className="mt-6 flex-1 space-y-1 overflow-y-auto"
        aria-label="Main"
      >
        {sections.map((section, idx) => {
          const isStandalone = !section.label;
          const open = isStandalone || expanded[section.label!];

          return (
            <div key={section.label ?? `section-${idx}`}>
              {section.label ? (
                <button
                  type="button"
                  onClick={() => toggleSection(section.label!)}
                  className="flex hidden w-full items-center justify-between rounded-lg px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-[#9ba097] transition-colors hover:text-[#151713] sm:flex"
                >
                  {section.label}
                  {open ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </button>
              ) : null}
              {open ? (
                <div className="space-y-0.5">{renderItems(section.items)}</div>
              ) : null}
            </div>
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
