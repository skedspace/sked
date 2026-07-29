"use client";

import {
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Eye,
  Filter,
  HelpCircle,
  RefreshCw,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export type AuditLogRow = {
  id: string;
  at: string;
  dateLabel: string;
  relativeLabel: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  actionLabel: string;
  actionType: "create" | "update" | "delete" | "login" | "webhook";
  resource: string;
  resourceId: string;
  organization: string;
  ipAddress: string;
  status: "success" | "warning";
  detail: string;
  payload: Record<string, unknown>;
};

export type AuditLogData = {
  range: { from: string; to: string };
  rows: AuditLogRow[];
  totalCount: number;
  users: Array<{ id: string; name: string }>;
  actions: string[];
  resources: string[];
  quickFilters: Array<{ key: string; label: string; count: number }>;
  notifications: Array<{ id: string; title: string; detail: string; at: string; relativeLabel: string; tone: "warning" | "info" }>;
  system: {
    environment: string;
    region: string;
    database: string;
    databaseHealthy: boolean;
    uptime: number;
    activeSessions: number;
    cpuUsage: number;
    memoryUsage: number;
    storageUsage: number;
    sslValid: boolean;
    backupStatus: string;
    lastBackupAt: string;
    nextBackupAt: string;
    sparkline: number[];
  };
  demo: boolean;
};

type SortKey = "at" | "actorName" | "actionLabel" | "resource" | "ipAddress";
type SortDirection = "asc" | "desc";

const PAGE_SIZE = 10;

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

function isoDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function actorInitials(name: string) {
  if (name === "System") return "SYS";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";
}

function statusDot(row: AuditLogRow) {
  if (row.status === "warning") return "warning";
  if (row.actionType === "login") return "blue";
  if (row.actionType === "webhook") return "orange";
  return "green";
}

function actionText(value: string) {
  return `${value[0]?.toUpperCase() ?? ""}${value.slice(1)}`;
}

export function AdminAuditLogs({ data }: { data: AuditLogData }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("all");
  const [user, setUser] = useState("all");
  const [resource, setResource] = useState("all");
  const [status, setStatus] = useState("all");
  const [ipAddress, setIpAddress] = useState("");
  const [keyword, setKeyword] = useState("");
  const [quick, setQuick] = useState("all");
  const [rangeFrom, setRangeFrom] = useState(data.range.from);
  const [rangeTo, setRangeTo] = useState(data.range.to);
  const [sortKey, setSortKey] = useState<SortKey>("at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<AuditLogRow | null>(null);
  const [message, setMessage] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const detailQuery = keyword.trim().toLowerCase();
    return data.rows
      .filter((row) => {
        const haystack = `${row.actorName} ${row.actorRole} ${row.actionLabel} ${row.action} ${row.resource} ${row.resourceId} ${row.organization} ${row.ipAddress} ${row.detail}`.toLowerCase();
        const quickMatch =
          quick === "all" ||
          (quick === "login" && row.actionType === "login") ||
          (quick === "user" && row.resource.toLowerCase() === "user") ||
          (quick === "payment" && /payment|transaction|webhook/i.test(`${row.resource} ${row.action}`)) ||
          (quick === "booking" && row.resource.toLowerCase() === "booking") ||
          (quick === "system" && (row.actorName === "System" || row.resource.toLowerCase() === "webhook"));
        return (
          (!query || haystack.includes(query)) &&
          (action === "all" || row.actionType === action) &&
          (user === "all" || row.actorName === user) &&
          (resource === "all" || row.resource === resource) &&
          (status === "all" || row.status === status) &&
          (!ipAddress.trim() || row.ipAddress.includes(ipAddress.trim())) &&
          (!detailQuery || row.detail.toLowerCase().includes(detailQuery) || JSON.stringify(row.payload).toLowerCase().includes(detailQuery)) &&
          quickMatch
        );
      })
      .sort((left, right) => {
        const a = sortKey === "at" ? new Date(left.at).getTime() : String(left[sortKey]);
        const b = sortKey === "at" ? new Date(right.at).getTime() : String(right[sortKey]);
        const comparison = typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b));
        return sortDirection === "asc" ? comparison : -comparison;
      });
  }, [action, data.rows, ipAddress, keyword, quick, resource, search, sortDirection, sortKey, status, user]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  function resetPage(callback: () => void) {
    callback();
    setPage(0);
  }

  function clearFilters() {
    setSearch("");
    setAction("all");
    setUser("all");
    setResource("all");
    setStatus("all");
    setIpAddress("");
    setKeyword("");
    setQuick("all");
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
    router.push(`/admin/audit-logs?${new URLSearchParams({ from, to })}`);
  }

  async function copyResource(row: AuditLogRow) {
    await navigator.clipboard?.writeText(row.resourceId);
    setMessage("Resource ID copied.");
  }

  return (
    <div className="command-center audit-page">
      <header className="command-header organizations-header">
        <div>
          <h1>Audit Logs</h1>
          <p>Track system activity and user actions across the platform.</p>
        </div>
        <div className="command-actions">
          <details className="admin-popover date-popover">
            <summary className="admin-action-button"><CalendarDays /> <span>{dateLabel(data.range.from, data.range.to)}</span> <ChevronDown /></summary>
            <div className="admin-popover-panel date-panel">
              <div className="date-presets">
                <button type="button" onClick={() => applyRange(7)}>7 days</button>
                <button type="button" onClick={() => applyRange(30)}>30 days</button>
                <button type="button" onClick={() => applyRange(90)}>90 days</button>
              </div>
              <label>From<input type="date" value={rangeFrom} onChange={(event) => setRangeFrom(event.target.value)} /></label>
              <label>To<input type="date" value={rangeTo} onChange={(event) => setRangeTo(event.target.value)} /></label>
              <button className="date-apply" type="button" onClick={() => applyRange()}>Apply date range</button>
            </div>
          </details>
          <Link className="admin-action-button help-button" href="/admin/platform-settings"><HelpCircle /> <span>Help</span></Link>
          <details className="admin-popover notification-popover">
            <summary className="notification-button" aria-label="Open audit notifications">
              <Bell />
              {data.notifications.length > 0 && <span>{data.notifications.length}</span>}
            </summary>
            <div className="admin-popover-panel notification-panel">
              <div className="notification-heading">
                <div><strong>Audit Alerts</strong><small>Recent important activity</small></div>
                <button type="button" onClick={() => router.refresh()} title="Refresh notifications"><RefreshCw /></button>
              </div>
              <div className="analytics-notification-list">
                {data.notifications.map((notification) => (
                  <div className={`analytics-notification tone-${notification.tone}`} key={notification.id}>
                    <span><ShieldAlert /></span>
                    <div><strong>{notification.title}</strong><small>{notification.detail}</small></div>
                    <time dateTime={notification.at}>{notification.relativeLabel}</time>
                  </div>
                ))}
              </div>
            </div>
          </details>
          <span className="organizations-admin-avatar" title="Admin">AD</span>
        </div>
      </header>

      {message && <button className="org-toast" type="button" onClick={() => setMessage("")}>{message}<X /></button>}

      <div className="audit-layout">
        <main>
          <section className="audit-toolbar admin-panel">
            <label className="admin-search-field">
              <Search />
              <input value={search} onChange={(event) => resetPage(() => setSearch(event.target.value))} placeholder="Search by user, action, or resource..." />
            </label>
            <select value={action} onChange={(event) => resetPage(() => setAction(event.target.value))}>
              <option value="all">All Actions</option>
              {data.actions.map((item) => <option value={item} key={item}>{actionText(item)}</option>)}
            </select>
            <select value={user} onChange={(event) => resetPage(() => setUser(event.target.value))}>
              <option value="all">All Users</option>
              {data.users.map((item) => <option value={item.name} key={item.id}>{item.name}</option>)}
            </select>
            <select value={resource} onChange={(event) => resetPage(() => setResource(event.target.value))}>
              <option value="all">All Resources</option>
              {data.resources.map((item) => <option value={item} key={item}>{item}</option>)}
            </select>
            <button type="button" onClick={() => setMessage("Use the right filter panel for advanced filters.")}>More Filters <Filter /></button>
            <Link href={`/admin/audit-logs/export?from=${data.range.from}&to=${data.range.to}`}><Download /> Export</Link>
          </section>

          <section className="admin-panel audit-table-panel">
            <div className="admin-table-scroll audit-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th><button type="button" onClick={() => sortBy("at")}>Date & Time <ChevronDown /></button></th>
                    <th><button type="button" onClick={() => sortBy("actorName")}>User</button></th>
                    <th><button type="button" onClick={() => sortBy("actionLabel")}>Action</button></th>
                    <th><button type="button" onClick={() => sortBy("resource")}>Resource</button></th>
                    <th>Resource ID</th>
                    <th><button type="button" onClick={() => sortBy("ipAddress")}>IP Address</button></th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row) => (
                    <tr key={row.id}>
                      <td><span className={`audit-dot ${statusDot(row)}`} />{row.dateLabel}</td>
                      <td><UserCell row={row} /></td>
                      <td><span className={`audit-action-badge type-${row.actionType}`}>{actionText(row.actionType)}</span> {row.actionLabel}</td>
                      <td>{row.resource}</td>
                      <td><button className="audit-id-button" type="button" onClick={() => copyResource(row)}>{row.resourceId}<Copy /></button></td>
                      <td>{row.ipAddress}</td>
                      <td><button className="audit-view-button" type="button" onClick={() => setSelected(row)} aria-label={`View ${row.actionLabel}`}><Eye /></button></td>
                    </tr>
                  ))}
                  {pageRows.length === 0 && (
                    <tr>
                      <td colSpan={7}>
                        <div className="audit-empty">No audit logs match the selected filters.</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              page={safePage}
              totalPages={totalPages}
              showing={filtered.length}
              total={data.totalCount}
              onPage={setPage}
            />
          </section>
        </main>

        <aside className="audit-filter-rail">
          <section className="admin-panel audit-filter-card">
            <header><h2>Filters</h2><button type="button" onClick={clearFilters}>Clear All</button></header>
            <label>Date Range<select value={`${data.range.from}|${data.range.to}`} onChange={() => undefined}><option value={`${data.range.from}|${data.range.to}`}>{dateLabel(data.range.from, data.range.to)}</option></select></label>
            <label>Action<select value={action} onChange={(event) => resetPage(() => setAction(event.target.value))}><option value="all">All Actions</option>{data.actions.map((item) => <option value={item} key={item}>{actionText(item)}</option>)}</select></label>
            <label>User<select value={user} onChange={(event) => resetPage(() => setUser(event.target.value))}><option value="all">All Users</option>{data.users.map((item) => <option value={item.name} key={item.id}>{item.name}</option>)}</select></label>
            <label>Resource<select value={resource} onChange={(event) => resetPage(() => setResource(event.target.value))}><option value="all">All Resources</option>{data.resources.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
            <label>Status<select value={status} onChange={(event) => resetPage(() => setStatus(event.target.value))}><option value="all">All Status</option><option value="success">Success</option><option value="warning">Needs Review</option></select></label>
            <label>IP Address<input value={ipAddress} onChange={(event) => resetPage(() => setIpAddress(event.target.value))} placeholder="Enter IP address" /></label>
            <label>Keyword<input value={keyword} onChange={(event) => resetPage(() => setKeyword(event.target.value))} placeholder="Search in details..." /></label>
            <button className="audit-apply" type="button" onClick={() => setMessage(`${filtered.length} matching logs found.`)}>Apply Filters</button>
          </section>

          <section className="admin-panel audit-filter-card quick">
            <h2>Quick Filters</h2>
            {data.quickFilters.map((item) => (
              <button className={quick === item.key ? "is-active" : ""} type="button" key={item.key} onClick={() => resetPage(() => setQuick(quick === item.key ? "all" : item.key))}>
                <SlidersHorizontal /> <span>{item.label}</span> <strong>{item.count}</strong>
              </button>
            ))}
          </section>
        </aside>
      </div>

      <SystemFooter data={data} />

      {selected && <AuditDetail row={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function UserCell({ row }: { row: AuditLogRow }) {
  return (
    <div className="audit-user-cell">
      <span>{actorInitials(row.actorName)}</span>
      <div><strong>{row.actorName}</strong><small>{row.actorRole}</small></div>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  showing,
  total,
  onPage,
}: {
  page: number;
  totalPages: number;
  showing: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, index) => index);
  return (
    <footer className="audit-pagination">
      <p>Showing 1 to {Math.min(showing, PAGE_SIZE)} of {total.toLocaleString("en-US")} logs</p>
      <div>
        <button type="button" disabled={page === 0} onClick={() => onPage(Math.max(0, page - 1))}><ChevronLeft /></button>
        {pages.map((item) => <button className={page === item ? "is-active" : ""} type="button" key={item} onClick={() => onPage(item)}>{item + 1}</button>)}
        {totalPages > 6 && <span>...</span>}
        {totalPages > 5 && <button type="button" onClick={() => onPage(totalPages - 1)}>{totalPages}</button>}
        <button type="button" disabled={page >= totalPages - 1} onClick={() => onPage(Math.min(totalPages - 1, page + 1))}><ChevronRight /></button>
      </div>
    </footer>
  );
}

function AuditDetail({ row, onClose }: { row: AuditLogRow; onClose: () => void }) {
  return (
    <div className="audit-modal-backdrop" role="presentation" onClick={onClose}>
      <section className="admin-panel audit-detail-modal" role="dialog" aria-modal="true" aria-labelledby="audit-detail-title" onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <h2 id="audit-detail-title">{row.actionLabel}</h2>
            <p>{row.dateLabel} by {row.actorName}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close details"><X /></button>
        </header>
        <dl>
          <div><dt>User</dt><dd>{row.actorName} ({row.actorRole})</dd></div>
          <div><dt>Organization</dt><dd>{row.organization}</dd></div>
          <div><dt>Resource</dt><dd>{row.resource}</dd></div>
          <div><dt>Resource ID</dt><dd>{row.resourceId}</dd></div>
          <div><dt>IP Address</dt><dd>{row.ipAddress}</dd></div>
          <div><dt>Details</dt><dd>{row.detail}</dd></div>
        </dl>
        <pre>{JSON.stringify(row.payload, null, 2)}</pre>
      </section>
    </div>
  );
}

function SystemFooter({ data }: { data: AuditLogData }) {
  return (
    <section className="admin-panel settings-footer audit-system-footer">
      <InfoCell title="Environment" value={data.system.environment} detail={data.system.region} />
      <InfoCell title="Server Uptime" value={`${data.system.uptime.toFixed(2)}%`} detail="Last 30 days" tone="green" />
      <InfoCell title="Database" value={data.system.database} detail={data.system.databaseHealthy ? "Status: Healthy" : "Status: Check required"} tone={data.system.databaseHealthy ? "green" : "orange"} />
      <InfoCell title="Last Backup" value="2 days ago" detail={formatDate(data.system.lastBackupAt, true)} />
      <InfoCell title="Active Sessions" value={String(data.system.activeSessions)} detail="View all sessions" />
      <div className="settings-usage-bars">
        <Meter label="CPU Usage" value={data.system.cpuUsage} />
        <Meter label="Memory Usage" value={data.system.memoryUsage} />
        <Meter label="Storage Usage" value={data.system.storageUsage} />
      </div>
      <InfoCell title="SSL Certificate" value={data.system.sslValid ? "Valid" : "Invalid"} detail={`Next Backup ${formatDate(data.system.nextBackupAt, true)}`} tone={data.system.sslValid ? "green" : "red"} />
    </section>
  );
}

function InfoCell({ title, value, detail, tone }: { title: string; value: string; detail: string; tone?: "green" | "orange" | "red" }) {
  return <div className={`settings-info-cell ${tone ? `tone-${tone}` : ""}`}><small>{title}</small><strong>{value}</strong><span>{detail}</span></div>;
}

function Meter({ label, value }: { label: string; value: number }) {
  return <div><span>{label}</span><strong>{Math.round(value)}%</strong><i><b style={{ width: `${Math.round(value)}%` }} /></i></div>;
}
