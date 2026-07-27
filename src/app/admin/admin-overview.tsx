"use client";

import {
  Building2,
  Users,
  CalendarCheck,
  TrendingUp,
  CreditCard,
  Activity,
  ArrowRight,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

type BookingRow = {
  id: string;
  status: string;
  price_cents: number | null;
  time_range: unknown;
  created_at: string;
  org_id: string;
};

type Stats = {
  orgCount: number;
  userCount: number;
  bookingCount: number;
  paidBookings: number;
  totalRevenue: number;
  planDist: { free: number; starter: number; pro: number; other: number };
  freeOrgs: number;
  starterOrgs: number;
  proOrgs: number;
  recentBookings: BookingRow[];
};

export function AdminOverview({ stats }: { stats: Stats }) {
  const statusBadge = (s: string) => {
    const map: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      confirmed: "default",
      completed: "default",
      pending: "secondary",
      held: "outline",
      cancelled: "secondary",
      no_show: "destructive",
    };
    return <Badge variant={map[s] ?? "outline"}>{s}</Badge>;
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Admin Overview</h1>
        <p className="text-muted-foreground">
          Platform-wide metrics and management.
        </p>
      </div>

      {/* ── Key Metrics ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={<Building2 className="h-5 w-5" />}
          label="Organizations"
          value={stats.orgCount.toLocaleString()}
          detail={`${stats.starterOrgs} starter · ${stats.proOrgs} pro`}
        />
        <MetricCard
          icon={<Users className="h-5 w-5" />}
          label="Users"
          value={stats.userCount.toLocaleString()}
          detail="Across all orgs"
        />
        <MetricCard
          icon={<CalendarCheck className="h-5 w-5" />}
          label="Total Bookings"
          value={stats.bookingCount.toLocaleString()}
          detail={`${stats.paidBookings.toLocaleString()} confirmed/completed`}
        />
        <MetricCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Revenue"
          value={`₱${(stats.totalRevenue / 100).toLocaleString("en-PH")}`}
          detail="Total across all bookings"
        />
      </div>

      {/* ── Plan Distribution + Booking Status ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Plan breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Plan Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <PlanBar
                label="Free"
                count={stats.planDist.free}
                total={stats.orgCount}
                color="bg-[#b9f34b]"
              />
              <PlanBar
                label="Starter"
                count={stats.planDist.starter}
                total={stats.orgCount}
                color="bg-[#ff6b4a]"
              />
              <PlanBar
                label="Pro"
                count={stats.planDist.pro}
                total={stats.orgCount}
                color="bg-[#171a16]"
              />
              {stats.planDist.other > 0 && (
                <PlanBar
                  label="Other"
                  count={stats.planDist.other}
                  total={stats.orgCount}
                  color="bg-muted"
                />
              )}
            </div>
            <div className="mt-4 border-t border-black/[0.07] pt-3 text-xs text-muted-foreground">
              {stats.freeOrgs} free &middot; {stats.starterOrgs} starter &middot;{" "}
              {stats.proOrgs} pro &middot; {stats.orgCount} total
            </div>
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Recent Bookings
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[320px] overflow-y-auto">
            {stats.recentBookings.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No bookings yet.</p>
            ) : (
              <div className="space-y-2">
                {stats.recentBookings.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between rounded-lg border border-black/[0.07] bg-white p-3 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">
                          #{b.id.slice(0, 6)}
                        </span>
                        {statusBadge(b.status)}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(b.created_at).toLocaleDateString("en-PH", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    {b.price_cents != null && b.price_cents > 0 && (
                      <span className="ml-3 font-semibold text-[#171a16]">
                        ₱{(b.price_cents / 100).toLocaleString("en-PH")}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Navigation Grid ── */}
      <div className="grid gap-4 sm:grid-cols-3">
        <QuickLink
          href="/admin/organizations"
          label="Organizations"
          desc="View, search, and manage all registered businesses"
          icon={<Building2 className="h-4 w-4" />}
        />
        <QuickLink
          href="/admin/users"
          label="Users"
          desc="View and manage platform users and their roles"
          icon={<Users className="h-4 w-4" />}
        />
        <QuickLink
          href="/admin/bookings"
          label="Bookings"
          desc="Browse all bookings across the platform"
          icon={<CalendarCheck className="h-4 w-4" />}
        />
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-black tracking-[-0.02em]">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function PlanBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {count} ({pct.toFixed(0)}%)
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-black/[0.06]">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function QuickLink({
  href,
  label,
  desc,
  icon,
}: {
  href: string;
  label: string;
  desc: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-black/[0.09] bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-black/20 hover:shadow-[0_8px_24px_rgba(23,26,22,0.06)]"
    >
      <div className="flex items-center justify-between">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f0efe8] text-[#171a16]">
          {icon}
        </span>
        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>
      <p className="mt-3 text-sm font-bold">{label}</p>
      <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
    </Link>
  );
}
