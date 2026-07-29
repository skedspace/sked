"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BadgePercent,
  Bell,
  Building2,
  CalendarCheck2,
  CalendarClock,
  CalendarDays,
  ChartNoAxesCombined,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Crown,
  Download,
  Mail,
  MoreVertical,
  Plus,
  RefreshCw,
  Tag,
  TrendingUp,
  UserRoundPlus,
  UserPlus,
  Users,
  WalletCards,
  Zap,
  X,
  XCircle,
} from "lucide-react";
import {
  addDays,
  format,
  formatDistanceToNowStrict,
} from "date-fns";

type ActivityType =
  | "organization"
  | "user"
  | "payment"
  | "failed"
  | "booking"
  | "subscription"
  | "audit";

export type AdminDashboardData = {
  range: { from: string; to: string };
  metrics: {
    organizations: number;
    organizationDelta: number;
    activeUsers: number;
    usersTotal: number;
    bookings: number;
    bookingChange: number;
    mrr: number;
    revenueChange: number;
    conversion: number;
    converted: number;
  };
  planDistribution: Array<{ name: string; count: number }>;
  revenueEvents: Array<{ date: string; amount: number; source: string }>;
  needsAttention: {
    total: number;
    trialsExpiringToday: number;
    trialsExpiringSoon: number;
    failedPaymentCount: number;
    failedPaymentTotal: number;
    pastDueSubscriptions: number;
    inactiveOrganizations: number;
    promotionsEnding: number;
    systemHealthy: boolean;
  };
  trialFunnel: {
    started: number;
    active: number;
    expiring: number;
    converted: number;
    churned: number;
  };
  recentOrganizations: Array<{
    id: string;
    name: string;
    location: string;
    logoUrl: string | null;
    plan: string;
    status: string;
    joinedAt: string;
  }>;
  recentBookings: Array<{
    id: string;
    organization: string;
    resource: string;
    customer: string;
    status: string;
    startsAt: string;
  }>;
  activities: Array<{
    id: string;
    type: ActivityType;
    title: string;
    detail: string;
    at: string;
  }>;
};

function mockDashboard(range: AdminDashboardData["range"]): AdminDashboardData {
  const end = new Date(`${range.to}T17:00:00`);
  const at = (minutesAgo: number) => new Date(end.getTime() - minutesAgo * 60_000).toISOString();
  const rangeStart = new Date(`${range.from}T09:00:00`).getTime();
  const rangeEnd = end.getTime();
  const rangeDays = Math.max(1, Math.round((rangeEnd - rangeStart) / 86_400_000));
  const trialStarted = Math.max(8, Math.round((142 * rangeDays) / 30));
  const mockExpiringToday = Math.max(1, Math.round((4 * rangeDays) / 30));
  const mockFailedPayments = Math.max(1, Math.round((2 * rangeDays) / 30));
  const mockPastDueSubscriptions = Math.max(1, Math.round((3 * rangeDays) / 30));
  const mockExpiringSoon = Math.max(1, Math.round((6 * rangeDays) / 30));
  const mockInactiveOrganizations = Math.max(1, Math.round((5 * rangeDays) / 30));
  const mockPromotionsEnding = Math.max(1, Math.round((3 * rangeDays) / 30));
  const revenueValues = [3850000, 7200000, 11250000, 12400000, 9700000, 16150000];
  const orgs = [
    ["ace", "Ace Pickleball Club", "Makati City, PH", "monthly", "active"],
    ["yard", "The Pickle Yard", "Cebu City, PH", "trial", "active"],
    ["rally", "Rally Point Pickleball", "Davao City, PH", "trial", "trial"],
    ["smash", "Smash Pickleball Center", "Taguig City, PH", "monthly", "active"],
    ["hub", "Pickle Hub", "Quezon City, PH", "trial", "past_due"],
    ["courtside", "Courtside PH", "Bacolod City, PH", "monthly", "active"],
  ] as const;
  const bookingOrgs = [orgs[0], orgs[1], orgs[2], orgs[3], orgs[4], orgs[0]];
  const statuses = ["confirmed", "confirmed", "pending", "confirmed", "confirmed", "cancelled"];
  const resources = ["Court 2", "Court 1", "Court 3", "Court 4", "Court 1", "Court 3"];
  const customers = ["Mark D.", "Jane S.", "Coach M.", "Alex R.", "Chris T.", "Jeff P."];

  return {
    range,
    metrics: {
      organizations: 256,
      organizationDelta: 18,
      activeUsers: 1248,
      usersTotal: 1482,
      bookings: 3842,
      bookingChange: 9.8,
      mrr: 12854000,
      revenueChange: 12.4,
      conversion: 17.6,
      converted: 34,
    },
    planDistribution: [
      { name: "starter", count: 112 },
      { name: "pro", count: 98 },
      { name: "business", count: 34 },
      { name: "enterprise", count: 12 },
    ],
    revenueEvents: revenueValues.map((amount, index) => ({
      date: new Date(rangeStart + ((rangeEnd - rangeStart) * index) / (revenueValues.length - 1)).toISOString(),
      amount,
      source: "Demo subscription revenue",
    })),
    needsAttention: {
      total:
        mockExpiringToday +
        mockExpiringSoon +
        mockFailedPayments +
        mockPastDueSubscriptions +
        mockInactiveOrganizations +
        mockPromotionsEnding,
      trialsExpiringToday: mockExpiringToday,
      trialsExpiringSoon: mockExpiringSoon,
      failedPaymentCount: mockFailedPayments,
      failedPaymentTotal: Math.max(199000, Math.round((398000 * rangeDays) / 30)),
      pastDueSubscriptions: mockPastDueSubscriptions,
      inactiveOrganizations: mockInactiveOrganizations,
      promotionsEnding: mockPromotionsEnding,
      systemHealthy: true,
    },
    trialFunnel: {
      started: trialStarted,
      active: Math.round(trialStarted * 0.479),
      expiring: Math.round(trialStarted * 0.148),
      converted: Math.round(trialStarted * 0.127),
      churned: Math.round(trialStarted * 0.042),
    },
    recentOrganizations: orgs.map((org, index) => ({
      id: `mock-${org[0]}`,
      name: org[1],
      location: org[2],
      logoUrl: null,
      plan: org[3],
      status: org[4],
      joinedAt: at(index * 24 * 60 + 30),
    })),
    recentBookings: bookingOrgs.map((org, index) => ({
      id: `mock-booking-${index + 1}`,
      organization: org[1],
      resource: resources[index]!,
      customer: customers[index]!,
      status: statuses[index]!,
      startsAt: at(index * 70 + 45),
    })),
    activities: [
      { id: "mock-a1", type: "organization", title: "New organization registered", detail: "Ace Pickleball Club", at: at(2) },
      { id: "mock-a2", type: "user", title: "New user joined", detail: "john.doe@aceclub.ph", at: at(5) },
      { id: "mock-a3", type: "payment", title: "Payment received", detail: "₱1,990 from Ace Pickleball Club", at: at(12) },
      { id: "mock-a4", type: "subscription", title: "Subscription upgraded", detail: "The Pickle Yard to Pro Plan", at: at(18) },
      { id: "mock-a5", type: "subscription", title: "Trial started", detail: "Rally Point Pickleball", at: at(25) },
      { id: "mock-a6", type: "booking", title: "Booking confirmed", detail: "Court 2 • The Pickle Yard", at: at(32) },
      { id: "mock-a7", type: "failed", title: "Payment failed", detail: "₱1,990 from Pickle Hub", at: at(45) },
      { id: "mock-a8", type: "organization", title: "New organization registered", detail: "Smash Pickleball Center", at: at(60) },
      { id: "mock-a9", type: "user", title: "User role updated", detail: "Maria Santos is now Admin", at: at(75) },
      { id: "mock-a10", type: "payment", title: "Payment refunded", detail: "₱990 to Court Central", at: at(90) },
      { id: "mock-a11", type: "booking", title: "Booking cancelled", detail: "Court 1 • Pickle Hub", at: at(105) },
    ],
  };
}

function money(cents: number) {
  return `₱${Math.round(cents / 100).toLocaleString("en-PH")}`;
}

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function signed(value: number, suffix = "") {
  const rounded = Math.abs(value) >= 10 ? value.toFixed(0) : value.toFixed(1);
  return `${value >= 0 ? "+" : ""}${rounded}${suffix}`;
}

export function AdminOverview({ data }: { data: AdminDashboardData }) {
  const populatedData = useMemo(
    () => data.metrics.organizations > 0 ? data : mockDashboard(data.range),
    [data],
  );
  return <AdminOverviewContent data={populatedData} />;
}

function AdminOverviewContent({ data }: { data: AdminDashboardData }) {
  const router = useRouter();
  const [from, setFrom] = useState(data.range.from);
  const [to, setTo] = useState(data.range.to);
  const [unread, setUnread] = useState(data.activities.length);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const refreshTimer = window.setInterval(refreshWhenVisible, 30_000);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(refreshTimer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [router]);

  function applyRange(nextFrom = from, nextTo = to) {
    router.push(`/admin?from=${nextFrom}&to=${nextTo}`);
  }

  function applyPreset(days: number) {
    const nextTo = format(new Date(), "yyyy-MM-dd");
    const nextFrom = format(addDays(new Date(), -days), "yyyy-MM-dd");
    setFrom(nextFrom);
    setTo(nextTo);
    applyRange(nextFrom, nextTo);
  }

  const selectedDays = Math.max(
    1,
    Math.round(
      (new Date(`${data.range.to}T23:59:59`).getTime() -
        new Date(`${data.range.from}T00:00:00`).getTime()) /
        86_400_000,
    ),
  );
  const funnelPreset =
    selectedDays <= 8 ? "7" : selectedDays <= 35 ? "30" : selectedDays <= 100 ? "90" : "365";

  return (
    <div className="command-center">
      <header className="command-header">
        <div>
          <h1>Command Center</h1>
          <p>Monitor, manage, and grow your SKED platform.</p>
        </div>
        <div className="command-actions">
          <details className="admin-popover date-popover">
            <summary className="admin-action-button">
              <CalendarDays />
              <span>{format(new Date(`${data.range.from}T00:00:00`), "MMM d")} – {format(new Date(`${data.range.to}T00:00:00`), "MMM d, yyyy")}</span>
              <ChevronDown />
            </summary>
            <div className="admin-popover-panel date-panel">
              <div className="date-presets">
                <button type="button" onClick={() => applyPreset(7)}>Last 7 days</button>
                <button type="button" onClick={() => applyPreset(30)}>Last 30 days</button>
                <button type="button" onClick={() => applyPreset(90)}>Last 90 days</button>
              </div>
              <label>
                From
                <input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} />
              </label>
              <label>
                To
                <input type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} />
              </label>
              <button className="date-apply" type="button" onClick={() => applyRange()}>Apply range</button>
            </div>
          </details>

          <a
            className="admin-action-button"
            href={`/admin/export?from=${data.range.from}&to=${data.range.to}`}
            download
          >
            <Download />
            <span>Export Report</span>
          </a>

          <details className="admin-popover notification-popover" onToggle={(event) => {
            if (event.currentTarget.open) setUnread(0);
          }}>
            <summary className="notification-button" aria-label="Open notifications">
              <Bell />
              {unread > 0 && <span>{Math.min(unread, 99)}</span>}
            </summary>
            <div className="admin-popover-panel notification-panel">
              <div className="notification-heading">
                <div>
                  <strong>Notifications</strong>
                  <small>Live platform events</small>
                </div>
                <button type="button" onClick={() => router.refresh()} title="Refresh notifications">
                  <RefreshCw />
                </button>
              </div>
              {data.activities.slice(0, 6).map((item) => (
                <ActivityRow item={item} compact key={item.id} />
              ))}
              {data.activities.length === 0 && <EmptyLine label="No notifications yet" />}
              <Link href="/admin/audit-logs">View all activity <ArrowRight /></Link>
            </div>
          </details>
        </div>
      </header>

      <section className="metric-grid" aria-label="Platform metrics">
        <MetricCard icon={Building2} label="Total Organizations" value={data.metrics.organizations.toLocaleString()} change={`+${data.metrics.organizationDelta}`} detail={`${data.metrics.organizationDelta} new in selected period`} />
        <MetricCard icon={Users} label="Active Users" value={data.metrics.activeUsers.toLocaleString()} change={`${data.metrics.usersTotal} total`} detail="Signed in during selected period" />
        <MetricCard icon={CalendarCheck2} label="Total Bookings" value={data.metrics.bookings.toLocaleString()} change={signed(data.metrics.bookingChange, "%")} detail="Compared with previous period" />
        <MetricCard icon={CircleDollarSign} label="Monthly Recurring Revenue" value={money(data.metrics.mrr)} change={signed(data.metrics.revenueChange, "%")} detail="Active subscription run rate" />
        <MetricCard icon={TrendingUp} label="Trial Conversions" value={`${data.metrics.conversion.toFixed(1)}%`} change={`+${data.metrics.converted}`} detail="Trial-to-paid organizations" />
      </section>

      <section className="overview-grid">
        <NeedsAttention attention={data.needsAttention} />

        <TrialFunnel
          funnel={data.trialFunnel}
          preset={funnelPreset}
          onPresetChange={(days) => applyPreset(Number(days))}
        />

        <aside className="admin-panel activity-panel">
          <div className="panel-heading">
            <h2>Real-time Activity</h2>
            <span className="live-label"><i /> Live</span>
          </div>
          <div className="activity-list" aria-live="polite">
            {data.activities.map((item) => <ActivityRow item={item} key={item.id} />)}
            {data.activities.length === 0 && <EmptyLine label="Activity will appear here" />}
          </div>
          <Link className="view-activity" href="/admin/audit-logs">View all activity <ArrowRight /></Link>
        </aside>

        <div className="admin-panel table-panel organizations-panel">
          <div className="panel-heading">
            <h2>Recent Organizations</h2>
            <Link href="/admin/organizations">View all</Link>
          </div>
          <div className="admin-table-scroll">
            <table>
              <thead><tr><th>Organization</th><th>Plan</th><th>Status</th><th>Joined</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {data.recentOrganizations.map((org) => (
                  <tr key={org.id}>
                    <td>
                      <Link href={`/admin/organizations?selected=${org.id}`} className="entity-cell">
                        <EntityAvatar name={org.name} image={org.logoUrl} />
                        <span><strong>{org.name}</strong><small>{org.location}</small></span>
                      </Link>
                    </td>
                    <td>{titleCase(org.plan)}</td>
                    <td><StatusPill value={org.status} /></td>
                    <td>{format(new Date(org.joinedAt), "MMM d, yyyy")}</td>
                    <td><Link href={`/admin/organizations?selected=${org.id}`} aria-label={`Open ${org.name}`}><MoreVertical /></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.recentOrganizations.length === 0 && <EmptyLine label="No organizations yet" />}
          </div>
        </div>

        <div className="admin-panel table-panel bookings-panel">
          <div className="panel-heading">
            <h2>Recent Bookings</h2>
            <Link href="/admin/bookings">View all</Link>
          </div>
          <div className="admin-table-scroll">
            <table>
              <thead><tr><th>Booking</th><th>Court</th><th>Date & Time</th><th>Status</th><th>User</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {data.recentBookings.map((booking) => (
                  <tr key={booking.id}>
                    <td><span className="booking-visual"><CalendarCheck2 /></span><span><strong>{booking.organization}</strong><small>#{booking.id.slice(0, 7)}</small></span></td>
                    <td>{booking.resource}</td>
                    <td><strong>{format(new Date(booking.startsAt), "MMM d, yyyy")}</strong><small>{format(new Date(booking.startsAt), "h:mm a")}</small></td>
                    <td><StatusPill value={booking.status} /></td>
                    <td>{booking.customer}</td>
                    <td><Link href={`/admin/bookings?selected=${booking.id}`} aria-label={`Open booking ${booking.id}`}><MoreVertical /></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.recentBookings.length === 0 && <EmptyLine label="No bookings in this range" />}
          </div>
        </div>
      </section>

      <section className="admin-panel quick-actions">
        <h2>Quick Actions</h2>
        <div>
          <QuickAction href="/admin/organizations?action=new" icon={Building2} label="Add Organization" detail="Register a new business" />
          <QuickAction href="/admin/users?action=invite" icon={UserPlus} label="Add User" detail="Invite admin or staff" />
          <QuickAction href="/admin/promotions?action=new" icon={BadgePercent} label="Create Promotion" detail="Launch a new promo" />
          <QuickAction href="/admin/email-campaigns?action=new" icon={Mail} label="Send Email Campaign" detail="Reach your audience" />
          <QuickAction href="/admin/pricing" icon={WalletCards} label="Manage Plans" detail="Edit subscription plans" />
          <QuickAction href={`/admin/export?from=${data.range.from}&to=${data.range.to}`} icon={ChartNoAxesCombined} label="View Reports" detail="Export analytics & insights" />
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  change,
  detail,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
  change: string;
  detail: string;
}) {
  return (
    <article className="metric-card">
      <span className="metric-icon"><Icon /></span>
      <div>
        <small>{label}</small>
        <p><strong>{value}</strong><em>{change}</em></p>
        <span>{detail}</span>
      </div>
      <MoreVertical />
    </article>
  );
}

function NeedsAttention({
  attention,
}: {
  attention: AdminDashboardData["needsAttention"];
}) {
  const issues = [
    {
      key: "payments",
      icon: CircleDollarSign,
      title: `${attention.failedPaymentCount} failed ${attention.failedPaymentCount === 1 ? "payment" : "payments"}`,
      detail: `${money(attention.failedPaymentTotal)} requires recovery`,
      href: "/admin/payments?status=failed",
      tone: "danger",
      priority: "Critical",
      show: attention.failedPaymentCount > 0,
    },
    {
      key: "past-due",
      icon: WalletCards,
      title: `${attention.pastDueSubscriptions} past-due ${attention.pastDueSubscriptions === 1 ? "subscription" : "subscriptions"}`,
      detail: "Billing access is at risk",
      href: "/admin/subscriptions?status=past_due",
      tone: "danger",
      priority: "Critical",
      show: attention.pastDueSubscriptions > 0,
    },
    {
      key: "trials-today",
      icon: CalendarClock,
      title: `${attention.trialsExpiringToday} ${attention.trialsExpiringToday === 1 ? "trial expires" : "trials expire"} today`,
      detail: "Contact these organizations now",
      href: "/admin/subscriptions?status=expiring_today",
      tone: "danger",
      priority: "Critical",
      show: attention.trialsExpiringToday > 0,
    },
    {
      key: "trials-soon",
      icon: CalendarClock,
      title: `${attention.trialsExpiringSoon} ${attention.trialsExpiringSoon === 1 ? "trial expires" : "trials expire"} within 3 days`,
      detail: "Conversion window is closing",
      href: "/admin/subscriptions?status=expiring_soon",
      tone: "warning",
      priority: "High",
      show: attention.trialsExpiringSoon > 0,
    },
    {
      key: "inactive",
      icon: AlertTriangle,
      title: `${attention.inactiveOrganizations} ${attention.inactiveOrganizations === 1 ? "org" : "orgs"} inactive for 30+ days`,
      detail: "Re-engagement opportunity",
      href: "/admin/organizations?status=inactive",
      tone: "warning",
      priority: "High",
      show: attention.inactiveOrganizations > 0,
    },
    {
      key: "promotions",
      icon: Tag,
      title: `${attention.promotionsEnding} ${attention.promotionsEnding === 1 ? "promotion" : "promotions"} ending this week`,
      detail: "May impact conversions",
      href: "/admin/promotions?status=ending",
      tone: "info",
      priority: "Medium",
      show: attention.promotionsEnding > 0,
    },
    {
      key: "health",
      icon: AlertTriangle,
      title: "Data source requires attention",
      detail: "One or more dashboard queries failed",
      href: "/admin/platform-settings?view=health",
      tone: "danger",
      priority: "Critical",
      show: !attention.systemHealthy,
    },
  ]
    .filter((issue) => issue.show)
    .sort((a, b) => {
      const rank = { Critical: 0, High: 1, Medium: 2 };
      return rank[a.priority as keyof typeof rank] - rank[b.priority as keyof typeof rank];
    })
    .slice(0, 5);

  return (
    <aside className="admin-panel attention-panel">
      <div className="attention-heading">
        <h2>Needs Attention</h2>
        <span className={attention.total > 0 ? "" : "is-clear"}>{attention.total}</span>
      </div>
      <div className="attention-list">
        {issues.length === 0 && (
          <div className="attention-clear">
            <span><CheckCircle2 /></span>
            <strong>No urgent issues</strong>
            <small>Everything requiring action is clear.</small>
          </div>
        )}
        {issues.map((issue) => {
          const Icon = issue.icon;
          return (
            <Link href={issue.href} className={`attention-item tone-${issue.tone}`} key={issue.key}>
              <span className="attention-icon"><Icon /></span>
              <span>
                <em>{issue.priority}</em>
                <strong>{issue.title}</strong>
                <small>{issue.detail}</small>
              </span>
              <ChevronRight />
            </Link>
          );
        })}
      </div>
      <Link className="attention-all" href="/admin/audit-logs?view=issues">
        View all issues <ArrowRight />
      </Link>
    </aside>
  );
}

function TrialFunnel({
  funnel,
  preset,
  onPresetChange,
}: {
  funnel: AdminDashboardData["trialFunnel"];
  preset: string;
  onPresetChange: (days: string) => void;
}) {
  const baseline = funnel.started;
  const percent = (value: number, denominator = baseline) =>
    denominator > 0 ? (value / denominator) * 100 : 0;
  const stages = [
    { key: "started", label: "Trial Started", value: funnel.started, icon: UserRoundPlus, tone: "cyan" },
    { key: "active", label: "Active Trial", value: funnel.active, icon: Zap, tone: "purple" },
    { key: "expiring", label: "Trial Expiring", sublabel: "(3 days)", value: funnel.expiring, icon: Clock3, tone: "orange" },
    { key: "converted", label: "Converted to Premium", value: funnel.converted, icon: Crown, tone: "green" },
    { key: "churned", label: "Churned", value: funnel.churned, icon: X, tone: "red" },
  ];
  const outcomeTotal = funnel.converted + funnel.churned;
  const connectorRates = [
    percent(funnel.active),
    percent(funnel.expiring, funnel.active),
    percent(funnel.converted, outcomeTotal),
    percent(funnel.churned),
  ];
  const presetLabels: Record<string, string> = {
    "7": "This Week",
    "30": "This Month",
    "90": "This Quarter",
    "365": "This Year",
  };

  return (
    <section className="admin-panel trial-funnel-panel">
      <div className="trial-funnel-heading">
        <div>
          <h2>Trial Funnel</h2>
          <p>Track how organizations move from trial to paying customers.</p>
        </div>
        <label className="funnel-range-select">
          <CalendarDays />
          <span className="sr-only">Trial funnel period</span>
          <select value={preset} onChange={(event) => onPresetChange(event.target.value)}>
            {Object.entries(presetLabels).map(([value, label]) => (
              <option value={value} key={value}>{label}</option>
            ))}
          </select>
          <ChevronDown />
        </label>
      </div>

      <div className="trial-funnel-scroll">
        <div className="trial-funnel-flow">
          {stages.map((stage, index) => {
            const Icon = stage.icon;
            const stagePercent = index === 0 ? 100 : percent(stage.value);
            const litDots = stage.value > 0 ? Math.max(1, Math.round(stagePercent / 10)) : 0;
            return (
              <div className="funnel-flow-pair" key={stage.key}>
                <article className={`funnel-stage stage-${stage.tone}`}>
                  <span className="funnel-stage-icon"><Icon /></span>
                  <div className="funnel-stage-copy">
                    <h3>{stage.label}{stage.sublabel && <small>{stage.sublabel}</small>}</h3>
                    <strong>{stage.value.toLocaleString()}</strong>
                    <em>{stagePercent.toFixed(1)}%</em>
                    <div className="funnel-dots" aria-hidden="true">
                      {Array.from({ length: 10 }, (_, dot) => <i className={dot < litDots ? "is-lit" : ""} key={dot} />)}
                    </div>
                  </div>
                </article>
                {index < connectorRates.length && (
                  <div className={`funnel-connector connector-${stages[index + 1]?.tone}`}>
                    <strong>{connectorRates[index]!.toFixed(1)}%</strong>
                    <span><ArrowRight /></span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ActivityRow({
  item,
  compact = false,
}: {
  item: AdminDashboardData["activities"][number];
  compact?: boolean;
}) {
  const icons = {
    organization: Building2,
    user: Users,
    payment: CircleDollarSign,
    failed: XCircle,
    booking: CalendarCheck2,
    subscription: WalletCards,
    audit: RefreshCw,
  };
  const Icon = icons[item.type];
  return (
    <div className={`activity-row activity-${item.type} ${compact ? "is-compact" : ""}`}>
      <span><Icon /></span>
      <div><strong>{titleCase(item.title)}</strong><small>{item.detail}</small></div>
      <time dateTime={item.at}>{formatDistanceToNowStrict(new Date(item.at), { addSuffix: true })}</time>
    </div>
  );
}

function EntityAvatar({ name, image }: { name: string; image: string | null }) {
  // Organization logos may be hosted by each tenant, outside Next's image allowlist.
  // eslint-disable-next-line @next/next/no-img-element
  if (image) return <img className="entity-avatar" src={image} alt="" />;
  return <span className="entity-avatar">{name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("")}</span>;
}

function StatusPill({ value }: { value: string }) {
  return <span className={`status-pill status-${value}`}>{titleCase(value)}</span>;
}

function QuickAction({
  href,
  icon: Icon,
  label,
  detail,
}: {
  href: string;
  icon: typeof Plus;
  label: string;
  detail: string;
}) {
  return (
    <Link href={href}>
      <span><Icon /></span>
      <span><strong>{label}</strong><small>{detail}</small></span>
      <ArrowRight />
    </Link>
  );
}

function EmptyLine({ label }: { label: string }) {
  return <div className="empty-line">{label}</div>;
}
