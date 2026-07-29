"use client";

import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BadgePercent,
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Eye,
  Filter,
  Gift,
  HelpCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  TicketPercent,
  TrendingUp,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { deleteAdminPromotionAction, saveAdminPromotionAction, toggleAdminPromotionAction } from "./actions";

export type PromotionStatus = "active" | "scheduled" | "expired" | "draft";
export type PromotionType = "percentage" | "fixed" | "free_trial";
export type PromotionTone = "cyan" | "green" | "purple" | "orange" | "red";

export type AdminPromotionRow = {
  id: string;
  orgId: string;
  orgName: string;
  name: string;
  description: string;
  type: PromotionType;
  code: string;
  discount: string;
  valuePercent: number | null;
  valueCents: number | null;
  minCents: number | null;
  maxDiscountCents: number | null;
  maxUses: number;
  currentUses: number;
  usagePercent: number;
  status: PromotionStatus;
  startsAt: string | null;
  expiresAt: string | null;
  periodLabel: string;
  periodDetail: string;
  createdAt: string;
  createdBy: string;
  badgeLabel: string;
  badgeClassName: string;
  revenueCents: number;
  discountCents: number;
  isActive: boolean;
};

export type AdminPromotionData = {
  range: { from: string; to: string };
  metrics: Array<{
    key: string;
    label: string;
    value: number;
    previousValue: number;
    kind: "money" | "number" | "percent";
    tone: PromotionTone;
  }>;
  promotions: AdminPromotionRow[];
  organizations: Array<{ id: string; name: string }>;
  notifications: Array<{ id: string; title: string; detail: string; at: string; relativeLabel: string; tone: "success" | "warning" | "danger" | "info" }>;
  demo: boolean;
};

type TabKey = "all" | PromotionStatus;
type SortKey = "name" | "type" | "code" | "currentUses" | "status" | "expiresAt";
type SortDirection = "asc" | "desc";

const PAGE_SIZE = 7;
const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "all", label: "All Promotions" },
  { key: "active", label: "Active" },
  { key: "scheduled", label: "Scheduled" },
  { key: "expired", label: "Expired" },
  { key: "draft", label: "Drafts" },
];

function dateLabel(from: string, to: string) {
  return `${formatDate(from)} - ${formatDate(to, true)}`;
}

function formatDate(value: string | null, includeYear = false) {
  if (!value) return "-";
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "-";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[date.getMonth()]} ${date.getDate()}${includeYear ? `, ${date.getFullYear()}` : ""}`;
}

function money(cents: number) {
  const sign = cents < 0 ? "-" : "";
  const pesos = Math.abs(cents) / 100;
  return `${sign}₱${pesos.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function metricValue(metric: AdminPromotionData["metrics"][number]) {
  if (metric.kind === "money") return money(metric.value);
  if (metric.kind === "percent") return `${metric.value.toFixed(1)}%`;
  return Math.round(metric.value).toLocaleString("en-US");
}

function percentChange(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function statusLabel(status: PromotionStatus) {
  return status === "draft" ? "Draft" : `${status[0]!.toUpperCase()}${status.slice(1)}`;
}

function typeLabel(type: PromotionType) {
  if (type === "free_trial") return "Free Trial";
  if (type === "fixed") return "Fixed Amount";
  return "Percentage";
}

function dateInput(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

function centsToPesos(value: number | null) {
  return value ? String(value / 100) : "";
}

function PromotionIcon({ tone }: { tone: PromotionTone }) {
  const icons = {
    cyan: TicketPercent,
    green: Gift,
    purple: BadgePercent,
    orange: BadgePercent,
    red: TrendingUp,
  };
  const Icon = icons[tone];
  return <Icon />;
}

export function AdminPromotions({ data }: { data: AdminPromotionData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState(data.promotions);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [tab, setTab] = useState<TabKey>("all");
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("expiresAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [rangeFrom, setRangeFrom] = useState(data.range.from);
  const [rangeTo, setRangeTo] = useState(data.range.to);
  const [selected, setSelected] = useState<AdminPromotionRow | null>(data.promotions[0] ?? null);
  const [editing, setEditing] = useState<AdminPromotionRow | "new" | null>(null);
  const [message, setMessage] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows
      .filter((promotion) =>
        (!query ||
          promotion.name.toLowerCase().includes(query) ||
          promotion.code.toLowerCase().includes(query) ||
          promotion.description.toLowerCase().includes(query)) &&
        (type === "all" || promotion.type === type) &&
        (status === "all" || promotion.status === status) &&
        (tab === "all" || promotion.status === tab),
      )
      .sort((left, right) => {
        const a = left[sortKey] ?? "";
        const b = right[sortKey] ?? "";
        const comparison = typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b));
        return sortDirection === "asc" ? comparison : -comparison;
      });
  }, [rows, search, sortDirection, sortKey, status, tab, type]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const hasFilters = Boolean(search || type !== "all" || status !== "all" || tab !== "all");

  function setFilter(callback: () => void) {
    callback();
    setPage(0);
  }

  function clearFilters() {
    setSearch("");
    setType("all");
    setStatus("all");
    setTab("all");
    setPage(0);
  }

  function sortBy(key: SortKey) {
    if (sortKey === key) setSortDirection((value) => (value === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  function applyRange(days?: number) {
    let from = rangeFrom;
    let to = rangeTo;
    if (days) {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - days);
      from = isoDateKey(start);
      to = isoDateKey(end);
      setRangeFrom(from);
      setRangeTo(to);
    }
    router.push(`/admin/promotions?${new URLSearchParams({ from, to })}`);
  }

  function runAction(action: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        setMessage(success);
        router.refresh();
      } else {
        setMessage(result.error || "Promotion update failed.");
      }
    });
  }

  function togglePromotion(row: AdminPromotionRow) {
    if (data.demo) {
      setRows((current) => current.map((item) => (item.id === row.id ? { ...item, isActive: !item.isActive, status: item.isActive ? "draft" : "active" } : item)));
      setMessage(`${row.name} updated in demo mode.`);
      return;
    }
    runAction(() => toggleAdminPromotionAction(row.id, !row.isActive), `${row.name} updated.`);
  }

  function deletePromotion(row: AdminPromotionRow) {
    if (!confirm(`Delete ${row.name}? Existing redemptions will remain in reports.`)) return;
    if (data.demo) {
      setRows((current) => current.filter((item) => item.id !== row.id));
      setSelected((current) => (current?.id === row.id ? rows.find((item) => item.id !== row.id) ?? null : current));
      setMessage(`${row.name} deleted in demo mode.`);
      return;
    }
    runAction(() => deleteAdminPromotionAction(row.id), `${row.name} deleted.`);
  }

  return (
    <div className="command-center promotions-page">
      <header className="command-header organizations-header">
        <div>
          <h1>Promotions</h1>
          <p>Create and manage promotional offers to grow your user base and reward your customers.</p>
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
          <Link className="admin-action-button" href={`/admin/promotions/export?from=${data.range.from}&to=${data.range.to}`}>
            <Download /> <span>Export</span>
          </Link>
          <Link className="admin-action-button help-button" href="/admin/pricing">
            <HelpCircle /> <span>Help</span>
          </Link>
          <details className="admin-popover notification-popover">
            <summary className="notification-button" aria-label="Open promotion notifications">
              <Bell />
              {data.notifications.length > 0 && <span>{data.notifications.length}</span>}
            </summary>
            <div className="admin-popover-panel notification-panel">
              <div className="notification-heading">
                <div><strong>Promotion Alerts</strong><small>Important offer activity</small></div>
                <button type="button" onClick={() => router.refresh()} title="Refresh notifications"><RefreshCw /></button>
              </div>
              <div className="analytics-notification-list">
                {data.notifications.map((notification) => (
                  <div className={`analytics-notification tone-${notification.tone}`} key={notification.id}>
                    <span><BadgePercent /></span>
                    <div><strong>{notification.title}</strong><small>{notification.detail}</small></div>
                    <time dateTime={notification.at}>{notification.relativeLabel}</time>
                  </div>
                ))}
                {data.notifications.length === 0 && <p>No promotion alerts for this range.</p>}
              </div>
              <Link href="/admin/audit-logs">View all activity <ArrowRight /></Link>
            </div>
          </details>
          <span className="organizations-admin-avatar" title="Admin">AD</span>
        </div>
      </header>

      {message && (
        <button className="org-toast" type="button" onClick={() => setMessage("")}>
          {message}<X />
        </button>
      )}

      <section className="organizations-metrics promotions-metrics" aria-label="Promotion metrics">
        {data.metrics.map((metric) => {
          const change = percentChange(metric.value, metric.previousValue);
          return (
            <article className={`organization-metric metric-${metric.tone}`} key={metric.key}>
              <span className="organization-metric-icon"><PromotionIcon tone={metric.tone} /></span>
              <div>
                <small>{metric.label}</small>
                <strong>{metricValue(metric)}</strong>
                <p>
                  <span className={`org-change ${change >= 0 ? "is-positive" : "is-negative"}`}>
                    {change >= 0 ? <ArrowUp /> : <ArrowDown />} {Math.abs(change).toFixed(1)}%
                  </span>
                  <span>vs last month</span>
                </p>
              </div>
            </article>
          );
        })}
      </section>

      <section className="promotions-layout">
        <main className="admin-panel organizations-table-panel promotions-main-panel">
          <div className="payment-tabs promotion-tabs" aria-label="Promotion status tabs">
            {tabs.map((item) => (
              <button key={item.key} type="button" className={tab === item.key ? "is-active" : ""} onClick={() => setFilter(() => setTab(item.key))}>
                {item.label}
              </button>
            ))}
          </div>
          <div className="organizations-filter-panel promotions-filter-panel">
            <label className="org-search">
              <Search />
              <input aria-label="Search promotions" placeholder="Search promotions by name or code..." value={search} onChange={(event) => setFilter(() => setSearch(event.target.value))} />
            </label>
            <label className="org-select"><span>Type</span>
              <select value={type} onChange={(event) => setFilter(() => setType(event.target.value))}>
                <option value="all">All Types</option>
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
                <option value="free_trial">Free Trial</option>
              </select><ChevronDown />
            </label>
            <label className="org-select"><span>Status</span>
              <select value={status} onChange={(event) => setFilter(() => setStatus(event.target.value))}>
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="scheduled">Scheduled</option>
                <option value="expired">Expired</option>
                <option value="draft">Draft</option>
              </select><ChevronDown />
            </label>
            <button className="org-clear-button promotion-more-filter" type="button" onClick={clearFilters} disabled={!hasFilters}><Filter /> More Filters</button>
            <button className="org-add-button" type="button" onClick={() => setEditing("new")}><Plus /> Create Promotion</button>
          </div>

          <div className="organizations-table-scroll promotions-table-scroll">
            <table>
              <thead>
                <tr>
                  <SortableHeader label="Promotion" sortKey="name" activeKey={sortKey} direction={sortDirection} onSort={sortBy} />
                  <SortableHeader label="Type" sortKey="type" activeKey={sortKey} direction={sortDirection} onSort={sortBy} />
                  <SortableHeader label="Code" sortKey="code" activeKey={sortKey} direction={sortDirection} onSort={sortBy} />
                  <th>Discount</th>
                  <SortableHeader label="Usage" sortKey="currentUses" activeKey={sortKey} direction={sortDirection} onSort={sortBy} />
                  <SortableHeader label="Status" sortKey="status" activeKey={sortKey} direction={sortDirection} onSort={sortBy} />
                  <SortableHeader label="Period" sortKey="expiresAt" activeKey={sortKey} direction={sortDirection} onSort={sortBy} />
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((promotion) => (
                  <tr key={promotion.id} className={selected?.id === promotion.id ? "is-selected" : ""}>
                    <td>
                      <button className="promotion-entity" type="button" onClick={() => setSelected(promotion)}>
                        <span className={`promotion-badge ${promotion.badgeClassName}`}>{promotion.badgeLabel.split("\n").map((line) => <b key={line}>{line}</b>)}</span>
                        <span><strong>{promotion.name}</strong><small>{promotion.description}</small></span>
                      </button>
                    </td>
                    <td><span className={`promotion-type type-${promotion.type}`}>{typeLabel(promotion.type)}</span></td>
                    <td><button className="promotion-code" type="button" onClick={() => navigator.clipboard?.writeText(promotion.code)}>{promotion.code}<Copy /></button></td>
                    <td><span className="promotion-discount"><strong>{promotion.discount.split("(")[0]?.trim()}</strong><small>{promotion.discount.includes("(") ? `(${promotion.discount.split("(").slice(1).join("(")}` : ""}</small></span></td>
                    <td><Usage promotion={promotion} /></td>
                    <td><span className={`promotion-status status-${promotion.status}`}><i />{statusLabel(promotion.status)}</span></td>
                    <td><span className="promotion-period"><strong>{promotion.periodLabel}</strong><small>{promotion.periodDetail}</small></span></td>
                    <td>
                      <div className="org-actions">
                        <button type="button" onClick={() => setSelected(promotion)} aria-label={`View ${promotion.name}`}><Eye /></button>
                        <details>
                          <summary aria-label={`Actions for ${promotion.name}`}><MoreHorizontal /></summary>
                          <div>
                            <button type="button" onClick={() => setEditing(promotion)}>Edit promotion</button>
                            <button type="button" disabled={pending} onClick={() => togglePromotion(promotion)}>{promotion.isActive ? "Move to draft" : "Activate"}</button>
                            <button type="button" disabled={pending} onClick={() => deletePromotion(promotion)}>Delete</button>
                          </div>
                        </details>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pageRows.length === 0 && <div className="org-empty"><Search /><strong>No promotions found</strong><small>Adjust the filters or create a new promotion.</small></div>}
          </div>
          <footer className="organizations-pagination promotions-pagination">
            <p>
              Showing {filtered.length === 0 ? 0 : safePage * PAGE_SIZE + 1} to {Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} of {hasFilters ? filtered.length : rows.length} promotions
              {data.demo && <em> Demo data</em>}
            </p>
            <div>
              <button type="button" onClick={() => setPage(Math.max(0, safePage - 1))} disabled={safePage === 0}><ChevronLeft /></button>
              {Array.from({ length: Math.min(totalPages, 3) }, (_, index) => (
                <button className={safePage === index ? "is-active" : ""} type="button" key={index} onClick={() => setPage(index)}>{index + 1}</button>
              ))}
              <button type="button" onClick={() => setPage(Math.min(totalPages - 1, safePage + 1))} disabled={safePage === totalPages - 1}><ChevronRight /></button>
            </div>
          </footer>
        </main>
        <PromotionOverview promotion={selected} onEdit={(promotion) => setEditing(promotion)} />
      </section>

      {editing && (
        <PromotionEditor
          promotion={editing === "new" ? null : editing}
          organizations={data.organizations}
          demo={data.demo}
          onClose={() => setEditing(null)}
          onSaved={(promotion, isNew) => {
            if (data.demo) {
              if (isNew) setRows((current) => [promotion, ...current]);
              else setRows((current) => current.map((item) => (item.id === promotion.id ? promotion : item)));
              setSelected(promotion);
              setMessage(`${promotion.name} saved in demo mode.`);
              setEditing(null);
              return;
            }
            setMessage(`${promotion.name} saved.`);
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function isoDateKey(date: Date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

function Usage({ promotion }: { promotion: AdminPromotionRow }) {
  return (
    <span className="promotion-usage">
      <strong>{promotion.currentUses.toLocaleString("en-US")} / {promotion.maxUses ? promotion.maxUses.toLocaleString("en-US") : "∞"}</strong>
      <i><b style={{ width: `${promotion.usagePercent}%` }} /></i>
    </span>
  );
}

function SortableHeader({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  direction: SortDirection;
  onSort: (key: SortKey) => void;
}) {
  const Icon = activeKey === sortKey && direction === "desc" ? ArrowDown : ArrowUp;
  return <th><button type="button" onClick={() => onSort(sortKey)}>{label}<Icon className={activeKey === sortKey ? "is-active" : ""} /></button></th>;
}

function PromotionOverview({ promotion, onEdit }: { promotion: AdminPromotionRow | null; onEdit: (promotion: AdminPromotionRow) => void }) {
  if (!promotion) {
    return (
      <aside className="admin-panel promotion-overview">
        <h2>Promotion Overview</h2>
        <div className="org-empty"><BadgePercent /><strong>No promotion selected</strong><small>Select a row to inspect its setup.</small></div>
      </aside>
    );
  }
  return (
    <aside className="admin-panel promotion-overview">
      <h2>Promotion Overview</h2>
      <div className="promotion-overview-head">
        <span className={`promotion-badge ${promotion.badgeClassName}`}>{promotion.badgeLabel.split("\n").map((line) => <b key={line}>{line}</b>)}</span>
        <div>
          <strong>{promotion.name}</strong>
          <small>{promotion.description}</small>
        </div>
        <span className={`promotion-status status-${promotion.status}`}><i />{statusLabel(promotion.status)}</span>
      </div>
      <dl>
        <div><dt>Organization</dt><dd>{promotion.orgName}</dd></div>
        <div><dt>Code</dt><dd>{promotion.code} <Copy /></dd></div>
        <div><dt>Type</dt><dd>{typeLabel(promotion.type)} Discount</dd></div>
        <div><dt>Discount</dt><dd>{promotion.discount}</dd></div>
        <div><dt>Minimum Purchase</dt><dd>{promotion.minCents ? money(promotion.minCents) : "No minimum"}</dd></div>
        <div><dt>Usage Limit</dt><dd>{promotion.maxUses ? `${promotion.maxUses.toLocaleString("en-US")} total redemptions` : "No limit"}</dd></div>
        <div><dt>Usage</dt><dd>{promotion.currentUses.toLocaleString("en-US")} / {promotion.maxUses ? promotion.maxUses.toLocaleString("en-US") : "∞"} used</dd></div>
      </dl>
      <div className="promotion-overview-progress"><i style={{ width: `${promotion.usagePercent}%` }} /><span>{Math.round(promotion.usagePercent)}%</span></div>
      <dl>
        <div><dt>Applies To</dt><dd>All plans</dd></div>
        <div><dt>Created</dt><dd>{formatDate(promotion.createdAt, true)} by {promotion.createdBy}</dd></div>
      </dl>
      <button type="button" onClick={() => onEdit(promotion)}><Pencil /> Edit Promotion</button>
    </aside>
  );
}

function PromotionEditor({
  promotion,
  organizations,
  demo,
  onClose,
  onSaved,
}: {
  promotion: AdminPromotionRow | null;
  organizations: AdminPromotionData["organizations"];
  demo: boolean;
  onClose: () => void;
  onSaved: (promotion: AdminPromotionRow, isNew: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(promotion?.name ?? "");
  const [description, setDescription] = useState(promotion?.description ?? "");
  const [orgId, setOrgId] = useState(promotion?.orgId ?? organizations[0]?.id ?? "");
  const [code, setCode] = useState(promotion?.code ?? "WELCOME20");
  const [type, setType] = useState<PromotionType>(promotion?.type ?? "percentage");
  const [valuePercent, setValuePercent] = useState(promotion?.valuePercent ? String(promotion.valuePercent) : "20");
  const [valueCents, setValueCents] = useState(centsToPesos(promotion?.valueCents ?? null));
  const [maxUses, setMaxUses] = useState(promotion?.maxUses ? String(promotion.maxUses) : "1000");
  const [minCents, setMinCents] = useState(centsToPesos(promotion?.minCents ?? null));
  const [maxDiscountCents, setMaxDiscountCents] = useState(centsToPesos(promotion?.maxDiscountCents ?? null));
  const [startsAt, setStartsAt] = useState(dateInput(promotion?.startsAt ?? new Date().toISOString()));
  const [expiresAt, setExpiresAt] = useState(dateInput(promotion?.expiresAt ?? null));
  const [isActive, setIsActive] = useState(promotion?.isActive ?? true);
  const [error, setError] = useState("");

  function makePreview(): AdminPromotionRow {
    const selectedOrg = organizations.find((org) => org.id === orgId);
    const percent = type === "fixed" ? null : Number(valuePercent || 0);
    const fixedCents = type === "fixed" ? Math.round(Number(valueCents || 0) * 100) : null;
    const maxDiscount = maxDiscountCents ? Math.round(Number(maxDiscountCents) * 100) : null;
    const valueCode = code.trim().toUpperCase();
    const badgeLabel = type === "fixed" ? "₱ OFF" : `${percent || 0}%\nOFF`;
    return {
      id: promotion?.id ?? `demo-${Date.now()}`,
      orgId,
      orgName: selectedOrg?.name ?? "All organizations",
      name: name.trim() || `${valueCode} Promotion`,
      description: description.trim() || "Platform promotion",
      type,
      code: valueCode,
      discount: type === "fixed" ? `₱${Number(valueCents || 0).toLocaleString("en-US")} OFF` : `${percent || 0}% OFF${maxDiscount ? ` (Up to ${money(maxDiscount)})` : ""}`,
      valuePercent: percent,
      valueCents: fixedCents,
      minCents: minCents ? Math.round(Number(minCents) * 100) : null,
      maxDiscountCents: maxDiscount,
      maxUses: Number(maxUses || 0),
      currentUses: promotion?.currentUses ?? 0,
      usagePercent: 0,
      status: isActive ? "active" : "draft",
      startsAt: startsAt ? `${startsAt}T00:00:00.000` : null,
      expiresAt: expiresAt ? `${expiresAt}T23:59:59.999` : null,
      periodLabel: `${startsAt ? formatDate(startsAt) : "-"} - ${expiresAt ? formatDate(expiresAt, true) : "No end"}`,
      periodDetail: expiresAt ? "Scheduled" : "Ongoing",
      createdAt: promotion?.createdAt ?? new Date().toISOString(),
      createdBy: "Current admin",
      badgeLabel,
      badgeClassName: percent && percent >= 30 ? "badge-red" : percent && percent >= 20 ? "badge-blue" : "badge-purple",
      revenueCents: promotion?.revenueCents ?? 0,
      discountCents: promotion?.discountCents ?? 0,
      isActive,
    };
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const preview = makePreview();
    if (demo) {
      onSaved(preview, !promotion);
      return;
    }
    startTransition(async () => {
      const result = await saveAdminPromotionAction({
        id: promotion?.id,
        orgId,
        code,
        description: `${name.trim() || code.trim()} - ${description.trim() || "Platform promotion"}`,
        type: type === "fixed" ? "fixed" : "percentage",
        valuePercent: type === "fixed" ? undefined : Number(valuePercent || 0),
        valueCents: type === "fixed" ? Math.round(Number(valueCents || 0) * 100) : undefined,
        maxUses: maxUses ? Number(maxUses) : null,
        minCents: minCents ? Math.round(Number(minCents) * 100) : null,
        maxDiscountCents: maxDiscountCents ? Math.round(Number(maxDiscountCents) * 100) : null,
        startsAt,
        expiresAt: expiresAt || null,
        isActive,
      });
      if (result.ok) onSaved(preview, !promotion);
      else setError(result.error || "Could not save this promotion.");
    });
  }

  return (
    <div className="org-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="org-modal promotion-editor-modal" role="dialog" aria-modal="true" aria-labelledby="promotion-editor-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="org-modal-close" type="button" onClick={onClose} aria-label="Close promotion editor"><X /></button>
        <h2 id="promotion-editor-title">{promotion ? "Edit Promotion" : "Create Promotion"}</h2>
        <form onSubmit={submit} className="promotion-editor-form">
          <label><span>Name</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Welcome 20% Off" required /></label>
          <label><span>Organization</span><select value={orgId} onChange={(event) => setOrgId(event.target.value)} required>{organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}</select></label>
          <label><span>Code</span><input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="WELCOME20" required /></label>
          <label><span>Type</span><select value={type} onChange={(event) => setType(event.target.value as PromotionType)}><option value="percentage">Percentage</option><option value="fixed">Fixed Amount</option><option value="free_trial">Free Trial</option></select></label>
          {type === "fixed" ? (
            <label><span>Amount (PHP)</span><input type="number" min="1" step="0.01" value={valueCents} onChange={(event) => setValueCents(event.target.value)} required /></label>
          ) : (
            <label><span>Percent</span><input type="number" min="1" max="100" value={valuePercent} onChange={(event) => setValuePercent(event.target.value)} required /></label>
          )}
          <label><span>Max Uses</span><input type="number" min="0" value={maxUses} onChange={(event) => setMaxUses(event.target.value)} placeholder="No limit" /></label>
          <label><span>Minimum Purchase (PHP)</span><input type="number" min="0" step="0.01" value={minCents} onChange={(event) => setMinCents(event.target.value)} placeholder="No minimum" /></label>
          <label><span>Max Discount (PHP)</span><input type="number" min="0" step="0.01" value={maxDiscountCents} onChange={(event) => setMaxDiscountCents(event.target.value)} placeholder="No cap" /></label>
          <label><span>Starts</span><input type="date" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} required /></label>
          <label><span>Expires</span><input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /></label>
          <label className="promotion-editor-wide"><span>Description</span><input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="For new organizations" /></label>
          <label className="promotion-editor-toggle"><input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} /><span>Active promotion</span></label>
          {error && <p className="promotion-editor-error">{error}</p>}
          <div className="org-modal-actions promotion-editor-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={pending}>{pending ? "Saving..." : "Save Promotion"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
