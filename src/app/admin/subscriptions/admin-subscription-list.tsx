"use client";

import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Bell,
  CalendarCheck2,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Crown,
  Download,
  Eye,
  HelpCircle,
  MoreVertical,
  RefreshCw,
  Search,
  TimerReset,
  WalletCards,
  X,
} from "lucide-react";
import { format, formatDistanceToNowStrict } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState, useTransition } from "react";
import {
  grantPremiumAction,
  toggleAutoRenewAction,
  updateSubscriptionStatusAction,
} from "./actions";

export type SubscriptionStatus = "active" | "trial" | "past_due" | "expired";

export type AdminSubscriptionRow = {
  id: string;
  orgId: string;
  orgSlug: string;
  orgName: string;
  orgLocation: string;
  orgLogoUrl: string | null;
  ownerName: string;
  ownerEmail: string;
  ownerAvatarUrl: string | null;
  plan: "trial" | "monthly";
  status: SubscriptionStatus;
  trialDaysLeft: number | null;
  renewalDate: string;
  monthlyFeeCents: number;
  autoRenew: boolean;
  updatedAt: string;
};

export type AdminSubscriptionListData = {
  range: { from: string; to: string };
  totalAvailable: number;
  monthlyPriceCents: number;
  metrics: Array<{
    key: string;
    label: string;
    value: number;
    change: number;
    detail?: string;
    money?: boolean;
    tone: "cyan" | "green" | "purple" | "orange" | "red";
  }>;
  subscriptions: AdminSubscriptionRow[];
  organizations: Array<{ id: string; name: string }>;
  notifications: Array<{ id: string; title: string; detail: string; at: string }>;
  demo: boolean;
};

type SortKey = "orgName" | "status" | "renewalDate" | "monthlyFeeCents" | "trialDaysLeft";
type SortDirection = "asc" | "desc";

const PAGE_SIZE = 8;

function dateLabel(from: string, to: string) {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
}

function money(cents: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Math.round(cents / 100));
}

function statusLabel(status: SubscriptionStatus) {
  return status === "past_due"
    ? "Past Due"
    : `${status[0]!.toUpperCase()}${status.slice(1)}`;
}

function Change({ value, dangerPositive = false }: { value: number; dangerPositive?: boolean }) {
  if (value === 0) return <span className="org-change is-flat">-</span>;
  const Icon = value > 0 ? ArrowUp : ArrowDown;
  return (
    <span
      className={`org-change ${value > 0 ? "is-positive" : "is-negative"} ${
        dangerPositive && value > 0 ? "is-danger-positive" : ""
      }`}
    >
      <Icon /> {Math.abs(value).toLocaleString()}
    </span>
  );
}

function MetricIcon({ tone }: { tone: AdminSubscriptionListData["metrics"][number]["tone"] }) {
  const icons = {
    cyan: Crown,
    green: WalletCards,
    purple: TimerReset,
    orange: CalendarCheck2,
    red: AlertCircle,
  };
  const Icon = icons[tone];
  return <Icon />;
}

export function AdminSubscriptionList({ data }: { data: AdminSubscriptionListData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [trialEnding, setTrialEnding] = useState("all");
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("renewalDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [rangeFrom, setRangeFrom] = useState(data.range.from);
  const [rangeTo, setRangeTo] = useState(data.range.to);
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<AdminSubscriptionRow | null>(null);
  const [showGrant, setShowGrant] = useState(false);
  const [rows, setRows] = useState(data.subscriptions);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows
      .filter((row) => {
        const days = row.trialDaysLeft;
        return (
          (!query ||
            row.orgName.toLowerCase().includes(query) ||
            row.ownerName.toLowerCase().includes(query) ||
            row.ownerEmail.toLowerCase().includes(query)) &&
          (status === "all" || row.status === status || (status === "premium" && row.plan === "monthly")) &&
          (trialEnding === "all" ||
            (trialEnding === "today" && days === 0) ||
            (trialEnding === "seven" && days !== null && days <= 7) ||
            (trialEnding === "expired" && row.status === "expired"))
        );
      })
      .sort((left, right) => {
        const a = left[sortKey];
        const b = right[sortKey];
        const comparison =
          typeof a === "number" && typeof b === "number"
            ? a - b
            : String(a ?? "").localeCompare(String(b ?? ""));
        return sortDirection === "asc" ? comparison : -comparison;
      });
  }, [rows, search, sortDirection, sortKey, status, trialEnding]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const hasFilters = Boolean(search || status !== "all" || trialEnding !== "all");

  function setFilter(callback: () => void) {
    callback();
    setPage(0);
  }

  function clearFilters() {
    setSearch("");
    setStatus("all");
    setTrialEnding("all");
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
      from = format(start, "yyyy-MM-dd");
      to = format(end, "yyyy-MM-dd");
      setRangeFrom(from);
      setRangeTo(to);
    }
    router.push(`/admin/subscriptions?${new URLSearchParams({ from, to })}`);
  }

  function updateDemoRow(id: string, update: Partial<AdminSubscriptionRow>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...update } : row)));
  }

  function toggleRenewal(row: AdminSubscriptionRow, autoRenew: boolean) {
    if (data.demo || row.id.startsWith("virtual-")) {
      updateDemoRow(row.id, { autoRenew });
      setMessage(`${row.orgName} auto renew ${autoRenew ? "enabled" : "disabled"} in demo mode.`);
      return;
    }
    startTransition(async () => {
      const result = await toggleAutoRenewAction(row.id, autoRenew);
      setMessage(result.ok ? `${row.orgName} auto renew updated.` : result.error || "Update failed.");
      if (result.ok) router.refresh();
    });
  }

  function changeStatus(row: AdminSubscriptionRow, nextStatus: "active" | "past_due" | "expired") {
    if (data.demo || row.id.startsWith("virtual-")) {
      updateDemoRow(row.id, {
        status: nextStatus === "active" && row.plan === "trial" ? "trial" : nextStatus,
      });
      setMessage(`${row.orgName} updated in demo mode.`);
      return;
    }
    startTransition(async () => {
      const result = await updateSubscriptionStatusAction(row.id, nextStatus);
      setMessage(result.ok ? `${row.orgName} updated.` : result.error || "Update failed.");
      if (result.ok) router.refresh();
    });
  }

  async function grantPremium(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const orgId = String(form.get("orgId") || "");
    if (!orgId) return;
    if (data.demo) {
      const target = rows.find((row) => row.orgId === orgId);
      if (target) {
        updateDemoRow(target.id, {
          plan: "monthly",
          status: "active",
          monthlyFeeCents: data.monthlyPriceCents,
          autoRenew: true,
          trialDaysLeft: null,
        });
      }
      setMessage("Premium granted in demo mode.");
      setShowGrant(false);
      return;
    }
    startTransition(async () => {
      const result = await grantPremiumAction(orgId);
      setMessage(result.ok ? "Premium granted." : result.error || "Unable to grant Premium.");
      if (result.ok) {
        setShowGrant(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="command-center organizations-page subscriptions-page">
      <header className="command-header organizations-header">
        <div>
          <h1>Subscriptions</h1>
          <p>Manage free trials and premium subscriptions.</p>
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
          <Link className="admin-action-button" href={`/admin/subscriptions/export?from=${data.range.from}&to=${data.range.to}`}>
            <Download /> <span>Export</span>
          </Link>
          <Link className="admin-action-button help-button" href="/admin/pricing">
            <HelpCircle /> <span>Help</span>
          </Link>
          <details className="admin-popover notification-popover">
            <summary className="notification-button" aria-label="Open subscription notifications">
              <Bell />
              {data.notifications.length > 0 && <span>{data.notifications.length}</span>}
            </summary>
            <div className="admin-popover-panel notification-panel">
              <div className="notification-heading">
                <div><strong>Subscription Alerts</strong><small>Trials, renewals, and payment risk</small></div>
                <button type="button" onClick={() => router.refresh()} title="Refresh notifications"><RefreshCw /></button>
              </div>
              <div className="org-notification-list">
                {data.notifications.map((notification) => (
                  <div key={notification.id}>
                    <span><WalletCards /></span>
                    <div><strong>{notification.title}</strong><small>{notification.detail}</small></div>
                    <time>{formatDistanceToNowStrict(new Date(notification.at), { addSuffix: true })}</time>
                  </div>
                ))}
                {data.notifications.length === 0 && <p>No subscription alerts yet.</p>}
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

      <section className="organizations-metrics" aria-label="Subscription metrics">
        {data.metrics.map((metric) => (
          <article className={`organization-metric metric-${metric.tone}`} key={metric.key}>
            <span className="organization-metric-icon"><MetricIcon tone={metric.tone} /></span>
            <div>
              <small>{metric.label}</small>
              <strong>{metric.money ? money(metric.value) : metric.value.toLocaleString()}</strong>
              {metric.detail && <span className="user-metric-detail">{metric.detail}</span>}
              <p><Change value={metric.change} dangerPositive={metric.key === "past_due"} /> <span>vs previous period</span></p>
            </div>
          </article>
        ))}
      </section>

      <section className="organizations-filter-panel subscriptions-filter-panel">
        <label className="org-search">
          <Search />
          <input
            aria-label="Search subscriptions"
            placeholder="Search organizations..."
            value={search}
            onChange={(event) => setFilter(() => setSearch(event.target.value))}
          />
        </label>
        <label className="org-select"><span>Status</span>
          <select value={status} onChange={(event) => setFilter(() => setStatus(event.target.value))}>
            <option value="all">All Status</option>
            <option value="premium">Premium</option>
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="past_due">Past Due</option>
            <option value="expired">Expired</option>
          </select><ChevronDown />
        </label>
        <label className="org-select"><span>Trial Ending</span>
          <select value={trialEnding} onChange={(event) => setFilter(() => setTrialEnding(event.target.value))}>
            <option value="all">All Dates</option>
            <option value="today">Ends Today</option>
            <option value="seven">Next 7 Days</option>
            <option value="expired">Expired Trials</option>
          </select><ChevronDown />
        </label>
        <button className="org-clear-button" type="button" onClick={clearFilters} disabled={!hasFilters}>Clear Filters</button>
        <button className="org-add-button grant-premium-button" type="button" onClick={() => setShowGrant(true)}>
          <Crown /> Grant Premium
        </button>
      </section>

      <section className="organizations-table-panel subscriptions-table-panel">
        <div className="organizations-table-scroll">
          <table>
            <thead>
              <tr>
                <SortableHeader label="Organization" sortKey="orgName" activeKey={sortKey} direction={sortDirection} onSort={sortBy} />
                <th>Owner</th>
                <th>Subscription</th>
                <SortableHeader label="Status" sortKey="status" activeKey={sortKey} direction={sortDirection} onSort={sortBy} />
                <SortableHeader label="Trial Days Left" sortKey="trialDaysLeft" activeKey={sortKey} direction={sortDirection} onSort={sortBy} />
                <SortableHeader label="Renewal Date" sortKey="renewalDate" activeKey={sortKey} direction={sortDirection} onSort={sortBy} />
                <SortableHeader label="Monthly Fee" sortKey="monthlyFeeCents" activeKey={sortKey} direction={sortDirection} onSort={sortBy} />
                <th>Auto Renew</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <button className="org-entity" type="button" onClick={() => setSelected(row)}>
                      <OrganizationAvatar row={row} />
                      <span><strong>{row.orgName}</strong><small>{row.orgLocation}</small></span>
                    </button>
                  </td>
                  <td>
                    <div className="subscription-owner">
                      <OwnerAvatar row={row} />
                      <span><strong>{row.ownerName}</strong><small>{row.ownerEmail}</small></span>
                    </div>
                  </td>
                  <td>
                    <span className={`subscription-plan plan-${row.plan}`}>{row.plan === "monthly" ? "Premium" : row.status === "expired" ? "Expired Trial" : "Trial"}</span>
                    <small className="subscription-subline">{row.plan === "monthly" ? "Monthly" : "14 Days"}</small>
                  </td>
                  <td><span className={`subscription-status status-${row.status}`}><i />{statusLabel(row.status)}</span></td>
                  <td className={row.trialDaysLeft !== null && row.trialDaysLeft <= 2 ? "subscription-danger" : ""}>
                    {row.trialDaysLeft === null ? "-" : row.trialDaysLeft === 0 ? "Ends today" : `${row.trialDaysLeft} days left`}
                  </td>
                  <td>
                    {row.plan === "monthly" ? (
                      <span>{format(new Date(row.renewalDate), "MMM d, yyyy")}<small className={row.status === "past_due" ? "subscription-danger-text" : ""}>{row.status === "past_due" ? "Overdue" : formatDistanceToNowStrict(new Date(row.renewalDate), { addSuffix: true })}</small></span>
                    ) : (
                      <span>-<small className={row.status === "expired" ? "subscription-muted-danger" : ""}>{row.status === "expired" ? "Expired" : `Trial ends ${format(new Date(row.renewalDate), "MMM d, yyyy")}`}</small></span>
                    )}
                  </td>
                  <td>{row.monthlyFeeCents > 0 ? `${money(row.monthlyFeeCents)}/mo` : "-"}</td>
                  <td>
                    {row.plan === "monthly" && row.status !== "expired" ? (
                      <label className="renew-toggle">
                        <input
                          type="checkbox"
                          checked={row.autoRenew}
                          disabled={pending}
                          onChange={(event) => toggleRenewal(row, event.target.checked)}
                          aria-label={`Toggle auto renew for ${row.orgName}`}
                        />
                        <span />
                        <em>{row.autoRenew ? "On" : "Off"}</em>
                      </label>
                    ) : "-"}
                  </td>
                  <td>
                    <div className="org-actions">
                      <button type="button" onClick={() => setSelected(row)} aria-label={`View ${row.orgName}`}><Eye /></button>
                      <details>
                        <summary aria-label={`Actions for ${row.orgName}`}><MoreVertical /></summary>
                        <div>
                          <button type="button" onClick={() => setSelected(row)}>View details</button>
                          <button type="button" disabled={pending} onClick={() => changeStatus(row, "active")}>Mark active</button>
                          <button type="button" disabled={pending} onClick={() => changeStatus(row, "past_due")}>Mark past due</button>
                          <button type="button" disabled={pending} onClick={() => changeStatus(row, "expired")}>Expire</button>
                          <Link href={`/admin/organizations?org=${row.orgId}`}>Open organization</Link>
                        </div>
                      </details>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pageRows.length === 0 && <div className="org-empty"><Search /><strong>No subscriptions found</strong><small>Adjust the filters and try again.</small></div>}
        </div>
        <footer className="organizations-pagination">
          <p>
            Showing {filtered.length === 0 ? 0 : safePage * PAGE_SIZE + 1} to {Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} of {hasFilters ? filtered.length : data.totalAvailable} subscriptions
            {data.demo && <em> Demo data</em>}
          </p>
          <div>
            <button type="button" onClick={() => setPage(Math.max(0, safePage - 1))} disabled={safePage === 0}><ChevronLeft /></button>
            {Array.from({ length: Math.min(totalPages, 3) }, (_, index) => (
              <button className={safePage === index ? "is-active" : ""} type="button" key={index} onClick={() => setPage(index)}>{index + 1}</button>
            ))}
            {totalPages > 4 && <span>...</span>}
            {totalPages > 3 && <button className={safePage === totalPages - 1 ? "is-active" : ""} type="button" onClick={() => setPage(totalPages - 1)}>{totalPages}</button>}
            <button type="button" onClick={() => setPage(Math.min(totalPages - 1, safePage + 1))} disabled={safePage === totalPages - 1}><ChevronRight /></button>
          </div>
        </footer>
      </section>

      {selected && <SubscriptionDetails row={selected} onClose={() => setSelected(null)} />}
      {showGrant && (
        <GrantPremium
          organizations={data.organizations}
          pending={pending}
          onClose={() => setShowGrant(false)}
          onSubmit={grantPremium}
        />
      )}
    </div>
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

function OrganizationAvatar({ row }: { row: AdminSubscriptionRow }) {
  if (row.orgLogoUrl) {
    // Tenant logos can be hosted outside Next's configured image domains.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={row.orgLogoUrl} alt="" />;
  }
  return <span>{row.orgName.split(/\s+/).slice(0, 2).map((word) => word[0]).join("")}</span>;
}

function OwnerAvatar({ row }: { row: AdminSubscriptionRow }) {
  if (row.ownerAvatarUrl) {
    // Auth-provider avatars may be remote.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={row.ownerAvatarUrl} alt="" />;
  }
  return <span>{row.ownerName.split(/\s+/).slice(0, 2).map((word) => word[0]).join("")}</span>;
}

function SubscriptionDetails({ row, onClose }: { row: AdminSubscriptionRow; onClose: () => void }) {
  return (
    <div className="org-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="org-modal org-detail-modal" role="dialog" aria-modal="true" aria-labelledby="subscription-detail-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="org-modal-close" type="button" onClick={onClose} aria-label="Close details"><X /></button>
        <div className="org-detail-heading">
          <OrganizationAvatar row={row} />
          <div><h2 id="subscription-detail-title">{row.orgName}</h2><p>{row.ownerName} - {row.ownerEmail}</p></div>
        </div>
        <div className="org-detail-grid">
          <div><small>Subscription</small><strong>{row.plan === "monthly" ? "Premium Monthly" : "Free Trial"}</strong></div>
          <div><small>Status</small><strong>{statusLabel(row.status)}</strong></div>
          <div><small>Monthly Fee</small><strong>{row.monthlyFeeCents > 0 ? money(row.monthlyFeeCents) : "Free"}</strong></div>
          <div><small>Trial Days Left</small><strong>{row.trialDaysLeft === null ? "-" : row.trialDaysLeft}</strong></div>
          <div><small>Renewal Date</small><strong>{format(new Date(row.renewalDate), "MMM d, yyyy")}</strong></div>
          <div><small>Auto Renew</small><strong>{row.autoRenew ? "On" : "Off"}</strong></div>
        </div>
        <div className="org-modal-actions">
          <Link href={`/admin/organizations?org=${row.orgId}`}><WalletCards /> Organization</Link>
          <Link href={`/p/${row.orgSlug}`} target="_blank"><Eye /> Public Page</Link>
        </div>
      </section>
    </div>
  );
}

function GrantPremium({
  organizations,
  pending,
  onClose,
  onSubmit,
}: {
  organizations: AdminSubscriptionListData["organizations"];
  pending: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="org-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="org-modal org-create-modal" onSubmit={onSubmit} onMouseDown={(event) => event.stopPropagation()}>
        <button className="org-modal-close" type="button" onClick={onClose} aria-label="Close form"><X /></button>
        <h2>Grant Premium</h2>
        <p>Move an organization to the monthly Premium subscription.</p>
        <label>Organization<select name="orgId" required defaultValue={organizations[0]?.id || ""}>
          {organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
        </select></label>
        <button className="org-create-submit" type="submit" disabled={pending || organizations.length === 0}>{pending ? "Granting..." : "Grant Premium"}</button>
      </form>
    </div>
  );
}
