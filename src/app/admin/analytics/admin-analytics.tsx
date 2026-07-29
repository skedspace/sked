"use client";

import {
  ArrowRight,
  ArrowUp,
  Bell,
  CalendarCheck2,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronDown,
  CircleDollarSign,
  Clock,
  Download,
  HelpCircle,
  Info,
  RefreshCw,
  Target,
  TrendingUp,
  Users,
  UserRound,
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export type AnalyticsTone = "cyan" | "green" | "purple" | "orange" | "red";

export type AdminAnalyticsData = {
  range: { from: string; to: string };
  metrics: Array<{
    key: string;
    label: string;
    value: number;
    previousValue: number;
    kind: "money" | "number" | "percent";
    tone: AnalyticsTone;
  }>;
  revenueSeries: Array<{
    date: string;
    revenueCents: number;
    previousRevenueCents: number;
    bookings: number;
    users: number;
    organizations: number;
  }>;
  bookingsSeries: Array<{ date: string; value: number }>;
  userGrowthSeries: Array<{ date: string; value: number }>;
  mrc: {
    totalCents: number;
    previousCents: number;
    rows: Array<{ label: string; valueCents: number; percent: number; color: string }>;
  };
  revenueByPlan: Array<{ label: string; valueCents: number; percent: number; color: string }>;
  insights: Array<{ key: string; title: string; detail: string; tone: AnalyticsTone }>;
  notifications: Array<{ id: string; title: string; detail: string; at: string; relativeLabel: string; tone: "success" | "warning" | "danger" | "info" }>;
  demo: boolean;
};

type Frequency = "daily" | "monthly";

function money(cents: number, digits = 2) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(cents / 100);
}

function compactMoney(cents: number) {
  const pesos = Math.abs(cents / 100);
  const sign = cents < 0 ? "-" : "";
  if (pesos >= 1_000_000) return `${sign}₱${trimDecimal(pesos / 1_000_000)}M`;
  if (pesos >= 1_000) return `${sign}₱${trimDecimal(pesos / 1_000)}K`;
  return `${sign}₱${Math.round(pesos).toLocaleString("en-US")}`;
}

function trimDecimal(value: number) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function metricValue(metric: AdminAnalyticsData["metrics"][number]) {
  if (metric.kind === "money") return money(metric.value);
  if (metric.kind === "percent") return `${metric.value.toFixed(1)}%`;
  return metric.value.toLocaleString();
}

function percentChange(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function dateLabel(from: string, to: string) {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
}

function shortDate(value: string) {
  return format(new Date(`${value}T00:00:00`), "MMM d");
}

function monthKey(value: string) {
  return value.slice(0, 7);
}

function aggregateRevenue(series: AdminAnalyticsData["revenueSeries"], frequency: Frequency) {
  if (frequency === "daily") return series;
  const byMonth = new Map<string, AdminAnalyticsData["revenueSeries"][number]>();
  series.forEach((point) => {
    const key = monthKey(point.date);
    const current = byMonth.get(key) ?? { date: `${key}-01`, revenueCents: 0, previousRevenueCents: 0, bookings: 0, users: 0, organizations: 0 };
    current.revenueCents += point.revenueCents;
    current.previousRevenueCents += point.previousRevenueCents;
    current.bookings += point.bookings;
    current.users += point.users;
    current.organizations += point.organizations;
    byMonth.set(key, current);
  });
  return [...byMonth.values()];
}

function aggregatePoints(series: Array<{ date: string; value: number }>, frequency: Frequency) {
  if (frequency === "daily") return series;
  const byMonth = new Map<string, { date: string; value: number }>();
  series.forEach((point) => {
    const key = monthKey(point.date);
    const current = byMonth.get(key) ?? { date: `${key}-01`, value: 0 };
    current.value += point.value;
    byMonth.set(key, current);
  });
  return [...byMonth.values()];
}

function linePoints(values: number[], width: number, height: number, top = 12, bottom = 28) {
  const max = Math.max(1, ...values);
  const innerHeight = height - top - bottom;
  const step = values.length <= 1 ? width : width / (values.length - 1);
  return values.map((value, index) => {
    const x = Math.round(index * step * 100) / 100;
    const y = Math.round((top + innerHeight - (value / max) * innerHeight) * 100) / 100;
    return `${x},${y}`;
  });
}

function areaPath(points: string[], height: number) {
  if (points.length === 0) return "";
  const [first] = points[0]!.split(",");
  const [last] = points.at(-1)!.split(",");
  return `M ${points.join(" L ")} L ${last},${height - 28} L ${first},${height - 28} Z`;
}

function donutBackground(rows: Array<{ percent: number; color: string }>) {
  let start = 0;
  const segments = rows.map((row) => {
    const end = start + row.percent;
    const value = `${row.color} ${start}% ${end}%`;
    start = end;
    return value;
  });
  return `conic-gradient(${segments.join(", ") || "#203646 0 100%"})`;
}

function MetricIcon({ metric }: { metric: AdminAnalyticsData["metrics"][number] }) {
  const icons: Record<string, typeof CircleDollarSign> = {
    revenue: CircleDollarSign,
    organizations: Users,
    users: UserRound,
    bookings: CalendarCheck2,
    utilization: ChartNoAxesCombined,
  };
  const Icon = icons[metric.key] ?? TrendingUp;
  return <Icon />;
}

function InsightIcon({ tone }: { tone: AnalyticsTone }) {
  const icons = {
    cyan: TrendingUp,
    green: ArrowUp,
    purple: CalendarDays,
    orange: Clock,
    red: Target,
  };
  const Icon = icons[tone];
  return <Icon />;
}

export function AdminAnalytics({ data }: { data: AdminAnalyticsData }) {
  const router = useRouter();
  const [rangeFrom, setRangeFrom] = useState(data.range.from);
  const [rangeTo, setRangeTo] = useState(data.range.to);
  const [revenueFrequency, setRevenueFrequency] = useState<Frequency>("daily");
  const [bookingFrequency, setBookingFrequency] = useState<Frequency>("daily");
  const [userFrequency, setUserFrequency] = useState<Frequency>("daily");

  const revenueSeries = useMemo(() => aggregateRevenue(data.revenueSeries, revenueFrequency), [data.revenueSeries, revenueFrequency]);
  const bookingSeries = useMemo(() => aggregatePoints(data.bookingsSeries, bookingFrequency), [data.bookingsSeries, bookingFrequency]);
  const userSeries = useMemo(() => aggregatePoints(data.userGrowthSeries, userFrequency), [data.userGrowthSeries, userFrequency]);

  function applyRange(days?: number) {
    let from = rangeFrom;
    let to = rangeTo;
    if (days) {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - days);
      from = format(start, "yyyy-MM-dd");
      to = format(end, "yyyy-MM-dd");
      setRangeFrom(from);
      setRangeTo(to);
    }
    router.push(`/admin/analytics?${new URLSearchParams({ from, to })}`);
  }

  return (
    <div className="command-center analytics-page">
      <header className="command-header organizations-header">
        <div>
          <h1>Analytics</h1>
          <p>Track performance, usage, and growth across your platform.</p>
        </div>
        <div className="command-actions">
          <details className="admin-popover date-popover">
            <summary className="admin-action-button">
              <CalendarDays /> <span>{dateLabel(data.range.from, data.range.to)}</span> <ChevronDown />
            </summary>
            <div className="admin-popover-panel date-panel">
              <div className="date-presets">
                <button type="button" onClick={() => applyRange(7)}>7 days</button>
                <button type="button" onClick={() => applyRange(30)}>30 days</button>
                <button type="button" onClick={() => applyRange(90)}>90 days</button>
              </div>
              <label>From<input type="date" value={rangeFrom} onChange={(event) => setRangeFrom(event.target.value)} /></label>
              <label>To<input type="date" value={rangeTo} onChange={(event) => setRangeTo(event.target.value)} /></label>
              <button className="date-apply" type="button" onClick={() => applyRange()}>Apply reporting period</button>
            </div>
          </details>
          <Link className="admin-action-button" href={`/admin/analytics/export?from=${data.range.from}&to=${data.range.to}`}>
            <Download /> <span>Export</span>
          </Link>
          <Link className="admin-action-button help-button" href="/admin/pricing">
            <HelpCircle /> <span>Help</span>
          </Link>
          <details className="admin-popover notification-popover">
            <summary className="notification-button" aria-label="Open analytics notifications">
              <Bell />
              {data.notifications.length > 0 && <span>{data.notifications.length}</span>}
            </summary>
            <div className="admin-popover-panel notification-panel">
              <div className="notification-heading">
                <div><strong>Analytics Alerts</strong><small>Important platform signals</small></div>
                <button type="button" onClick={() => router.refresh()} title="Refresh notifications"><RefreshCw /></button>
              </div>
              <div className="analytics-notification-list">
                {data.notifications.map((notification) => (
                  <div className={`analytics-notification tone-${notification.tone}`} key={notification.id}>
                    <span><Info /></span>
                    <div><strong>{notification.title}</strong><small>{notification.detail}</small></div>
                    <time dateTime={notification.at}>{notification.relativeLabel}</time>
                  </div>
                ))}
                {data.notifications.length === 0 && <p>No analytics alerts for this range.</p>}
              </div>
              <Link href="/admin/audit-logs">View all activity <ArrowRight /></Link>
            </div>
          </details>
          <span className="organizations-admin-avatar" title="Admin">AD</span>
        </div>
      </header>

      <section className="organizations-metrics analytics-metrics" aria-label="Analytics metrics">
        {data.metrics.map((metric) => {
          const change = percentChange(metric.value, metric.previousValue);
          return (
            <article className={`organization-metric metric-${metric.tone}`} key={metric.key}>
              <span className="organization-metric-icon"><MetricIcon metric={metric} /></span>
              <div>
                <small>{metric.label}</small>
                <strong>{metricValue(metric)}</strong>
                <p>
                  <span className={`org-change ${change >= 0 ? "is-positive" : "is-negative"}`}>
                    <ArrowUp /> {Math.abs(change).toFixed(1)}%
                  </span>
                  <span>vs previous period</span>
                </p>
              </div>
            </article>
          );
        })}
      </section>

      <section className="analytics-chart-grid">
        <article className="admin-panel analytics-revenue-panel">
          <PanelHeading title="Revenue Overview" info="Paid booking payments and subscription invoices." frequency={revenueFrequency} onFrequency={setRevenueFrequency} />
          <RevenueChart series={revenueSeries} />
        </article>
        <article className="admin-panel analytics-bookings-panel">
          <PanelHeading title="Bookings Overview" info="Booking volume created during the selected period." frequency={bookingFrequency} onFrequency={setBookingFrequency} />
          <div className="analytics-chart-summary">
            <strong>{data.metrics.find((metric) => metric.key === "bookings")?.value.toLocaleString() ?? "0"}</strong>
            <span>Total Bookings</span>
            <em><ArrowUp /> {Math.abs(percentChange(data.metrics.find((metric) => metric.key === "bookings")?.value ?? 0, data.metrics.find((metric) => metric.key === "bookings")?.previousValue ?? 0)).toFixed(1)}% vs previous period</em>
          </div>
          <BarChart series={bookingSeries} />
        </article>
      </section>

      <section className="analytics-lower-grid">
        <article className="admin-panel analytics-mrc-panel">
          <PanelTitle title="Monthly Recurring Charges (MRC)" linkLabel="View all" href="/admin/subscriptions" />
          <div className="analytics-mrc-total">
            <strong>{money(data.mrc.totalCents)}</strong>
            <span>Current MRC</span>
            <em><ArrowUp /> {Math.abs(percentChange(data.mrc.totalCents, data.mrc.previousCents)).toFixed(1)}% vs previous period</em>
          </div>
          <div className="analytics-mrc-list">
            {data.mrc.rows.map((row) => (
              <div key={row.label}>
                <i style={{ backgroundColor: row.color }} />
                <span>{row.label}</span>
                <strong>{money(row.valueCents)}</strong>
                <small>{row.percent.toFixed(1)}%</small>
              </div>
            ))}
          </div>
          <Link className="analytics-inline-link" href="/admin/payments">View MRR Trend <ArrowRight /></Link>
        </article>

        <article className="admin-panel analytics-plan-panel">
          <PanelTitle title="Revenue by Plan" linkLabel="View all" href="/admin/pricing" />
          <div className="analytics-donut-layout">
            <div className="analytics-donut" style={{ background: donutBackground(data.revenueByPlan) }}>
              <div><strong>{money(data.revenueByPlan.reduce((sum, row) => sum + row.valueCents, 0))}</strong><span>Total Revenue</span></div>
            </div>
            <div className="analytics-plan-legend">
              {data.revenueByPlan.map((row) => (
                <div key={row.label}>
                  <i style={{ backgroundColor: row.color }} />
                  <span>{row.label}</span>
                  <strong>{money(row.valueCents)}</strong>
                  <small>({row.percent.toFixed(1)}%)</small>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="admin-panel analytics-users-panel">
          <PanelHeading title="User Growth" info="Cumulative new platform users in range." frequency={userFrequency} onFrequency={setUserFrequency} compact />
          <div className="analytics-chart-summary analytics-user-summary">
            <strong>{data.metrics.find((metric) => metric.key === "users")?.value.toLocaleString() ?? "0"}</strong>
            <span>New Users</span>
            <em><ArrowUp /> {Math.abs(percentChange(data.metrics.find((metric) => metric.key === "users")?.value ?? 0, data.metrics.find((metric) => metric.key === "users")?.previousValue ?? 0)).toFixed(1)}% vs previous period</em>
          </div>
          <LineOnlyChart series={userSeries} />
        </article>
      </section>

      <section className="admin-panel analytics-insights-panel">
        <PanelTitle title="Key Insights" />
        <div className="analytics-insights-grid">
          {data.insights.map((insight) => (
            <article className={`analytics-insight insight-${insight.tone}`} key={insight.key}>
              <span><InsightIcon tone={insight.tone} /></span>
              <div><strong>{insight.title}</strong><small>{insight.detail}</small></div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function PanelTitle({ title, linkLabel, href }: { title: string; linkLabel?: string; href?: string }) {
  return (
    <div className="analytics-panel-title">
      <h2>{title} <Info /></h2>
      {href && linkLabel && <Link href={href}>{linkLabel}</Link>}
    </div>
  );
}

function PanelHeading({
  title,
  info,
  frequency,
  onFrequency,
  compact,
}: {
  title: string;
  info: string;
  frequency: Frequency;
  onFrequency: (value: Frequency) => void;
  compact?: boolean;
}) {
  return (
    <div className={`analytics-panel-heading ${compact ? "is-compact" : ""}`}>
      <h2>{title} <Info aria-label={info} /></h2>
      <label className="compact-select analytics-frequency">
        <select value={frequency} onChange={(event) => onFrequency(event.target.value as Frequency)} aria-label={`${title} frequency`}>
          <option value="daily">Daily</option>
          <option value="monthly">Monthly</option>
        </select>
        <ChevronDown />
      </label>
    </div>
  );
}

function RevenueChart({ series }: { series: AdminAnalyticsData["revenueSeries"] }) {
  const width = 620;
  const height = 220;
  const revenueValues = series.map((point) => point.revenueCents / 100);
  const previousValues = series.map((point) => point.previousRevenueCents / 100);
  const values = [...revenueValues, ...previousValues];
  const max = Math.max(1, ...values);
  const currentPoints = linePoints(revenueValues, width, height);
  const previousPoints = linePoints(previousValues, width, height);
  const labels = labelIndexes(series.length);

  return (
    <div className="analytics-line-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Revenue overview chart">
        <defs>
          <linearGradient id="analyticsRevenueFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#11dce4" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#11dce4" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((line) => (
          <g key={line}>
            <line className="chart-gridline" x1="0" x2={width} y1={16 + line * 176} y2={16 + line * 176} />
            <text x="0" y={10 + line * 176}>{compactMoney(Math.round(max * (1 - line) * 100))}</text>
          </g>
        ))}
        <path className="analytics-area" d={areaPath(currentPoints, height)} />
        <polyline className="analytics-previous-line" points={previousPoints.join(" ")} />
        <polyline className="analytics-current-line" points={currentPoints.join(" ")} />
        {currentPoints.map((point, index) => {
          const [x, y] = point.split(",").map(Number);
          return <circle key={`${point}-${index}`} cx={x} cy={y} r="2.7" />;
        })}
        {labels.map((index) => (
          <text className="analytics-x-label" key={series[index]?.date ?? index} x={(index / Math.max(1, series.length - 1)) * width} y="214">
            {series[index] ? shortDate(series[index]!.date) : ""}
          </text>
        ))}
      </svg>
      <div className="analytics-legend">
        <span><i className="legend-current" />Revenue</span>
        <span><i className="legend-previous" />Revenue (Previous Period)</span>
      </div>
    </div>
  );
}

function BarChart({ series }: { series: Array<{ date: string; value: number }> }) {
  const max = Math.max(1, ...series.map((point) => point.value));
  return (
    <div className="analytics-bar-chart" role="img" aria-label="Bookings overview chart">
      <div>
        {series.map((point) => (
          <span key={point.date} style={{ height: `${Math.max(6, (point.value / max) * 100)}%` }} title={`${shortDate(point.date)}: ${point.value.toLocaleString()}`} />
        ))}
      </div>
      <footer>
        {labelIndexes(series.length).map((index) => <span key={series[index]?.date ?? index}>{series[index] ? shortDate(series[index]!.date) : ""}</span>)}
      </footer>
    </div>
  );
}

function LineOnlyChart({ series }: { series: Array<{ date: string; value: number }> }) {
  const width = 430;
  const height = 180;
  const points = linePoints(series.map((point) => point.value), width, height, 12, 24);
  return (
    <div className="analytics-user-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="User growth chart">
        <defs>
          <linearGradient id="analyticsUserFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#11dce4" stopOpacity="0.26" />
            <stop offset="100%" stopColor="#11dce4" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.33, 0.66, 1].map((line) => <line className="chart-gridline" key={line} x1="0" x2={width} y1={16 + line * 130} y2={16 + line * 130} />)}
        <path className="analytics-user-area" d={areaPath(points, height)} />
        <polyline className="analytics-current-line" points={points.join(" ")} />
        {points.map((point, index) => {
          const [x, y] = point.split(",").map(Number);
          return <circle key={`${point}-${index}`} cx={x} cy={y} r="2.4" />;
        })}
      </svg>
    </div>
  );
}

function labelIndexes(length: number) {
  if (length <= 1) return [0];
  const count = Math.min(6, length);
  return Array.from({ length: count }, (_, index) => Math.round((index / (count - 1)) * (length - 1)));
}
