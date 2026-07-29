"use client";

import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Bell,
  Building2,
  CalendarCheck2,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleX,
  Crown,
  Download,
  Eye,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  Timer,
  Users,
  X,
} from "lucide-react";
import { format, formatDistanceToNowStrict } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import {
  createOrganizationAction,
  updateOrganizationStatusAction,
} from "./actions";

export type OrganizationRow = {
  id: string;
  slug: string;
  name: string;
  location: string;
  logoUrl: string | null;
  plan: "trial" | "premium";
  status: "active" | "trial" | "past_due" | "churned";
  users: number;
  userChange: number;
  bookings: number;
  bookingChange: number;
  revenue: number;
  revenueChange: number;
  trialDaysLeft: number | null;
  createdAt: string;
};

export type OrganizationListData = {
  range: { from: string; to: string };
  totalAvailable: number;
  metrics: Array<{
    key: string;
    label: string;
    value: number;
    change: number;
    tone: "cyan" | "green" | "purple" | "orange" | "red";
  }>;
  organizations: OrganizationRow[];
  notifications: Array<{ id: string; title: string; detail: string; at: string }>;
  demo: boolean;
};

type SortKey = "name" | "plan" | "status" | "users" | "bookings" | "revenue" | "trialDaysLeft" | "createdAt";
type SortDirection = "asc" | "desc";

const PAGE_SIZE = 8;

function dateLabel(from: string, to: string) {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
}

function money(cents: number) {
  return `₱${Math.round(cents / 100).toLocaleString("en-PH")}`;
}

function planLabel(plan: OrganizationRow["plan"]) {
  return plan === "trial" ? "Trial" : "Premium";
}

function statusLabel(status: OrganizationRow["status"]) {
  return status === "past_due"
    ? "Past Due"
    : `${status[0]!.toUpperCase()}${status.slice(1)}`;
}

function Change({ value, suffix = "" }: { value: number; suffix?: string }) {
  if (value === 0) return <span className="org-change is-flat">—</span>;
  const Icon = value > 0 ? ArrowUp : ArrowDown;
  return (
    <span className={`org-change ${value > 0 ? "is-positive" : "is-negative"}`}>
      <Icon /> {Math.abs(value).toFixed(suffix === "%" ? 1 : 0)}{suffix}
    </span>
  );
}

function MetricIcon({ tone }: { tone: OrganizationListData["metrics"][number]["tone"] }) {
  const icons = {
    cyan: Building2,
    green: CalendarCheck2,
    purple: Crown,
    orange: Timer,
    red: CircleX,
  };
  const Icon = icons[tone];
  return <Icon />;
}

export function AdminOrgList({ data }: { data: OrganizationListData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [plan, setPlan] = useState("all");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selected, setSelected] = useState<OrganizationRow | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [message, setMessage] = useState("");
  const [rangeFrom, setRangeFrom] = useState(data.range.from);
  const [rangeTo, setRangeTo] = useState(data.range.to);
  const [organizations, setOrganizations] = useState(data.organizations);

  useEffect(() => {
    setOrganizations(data.organizations);
  }, [data.organizations]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return organizations
      .filter((organization) => {
        const created = organization.createdAt.slice(0, 10);
        return (
          (!query ||
            organization.name.toLowerCase().includes(query) ||
            organization.location.toLowerCase().includes(query) ||
            organization.slug.toLowerCase().includes(query)) &&
          (status === "all" || organization.status === status) &&
          (plan === "all" || organization.plan === plan) &&
          (!createdFrom || created >= createdFrom) &&
          (!createdTo || created <= createdTo)
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
  }, [createdFrom, createdTo, organizations, plan, search, sortDirection, sortKey, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const hasFilters = Boolean(search || status !== "all" || plan !== "all" || createdFrom || createdTo);

  function setFilter(callback: () => void) {
    callback();
    setPage(0);
  }

  function applyRange(days?: number) {
    let from = rangeFrom;
    const to = rangeTo;
    if (days) {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - days);
      from = format(start, "yyyy-MM-dd");
      setRangeFrom(from);
      setRangeTo(format(end, "yyyy-MM-dd"));
    }
    const params = new URLSearchParams({ from, to: days ? format(new Date(), "yyyy-MM-dd") : to });
    router.push(`/admin/organizations?${params}`);
  }

  function clearFilters() {
    setSearch("");
    setStatus("all");
    setPlan("all");
    setCreatedFrom("");
    setCreatedTo("");
    setPage(0);
  }

  function sortBy(key: SortKey) {
    if (sortKey === key) setSortDirection((value) => (value === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  async function createOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await createOrganizationAction({
        name: String(form.get("name") || ""),
        slug: String(form.get("slug") || ""),
        plan: String(form.get("plan") || "trial") as "trial" | "premium",
        contactEmail: String(form.get("contactEmail") || ""),
        contactPhone: String(form.get("contactPhone") || ""),
      });
      if (!result.ok) {
        setMessage(result.error || "Unable to create organization.");
        return;
      }
      setMessage("Organization created.");
      setShowCreate(false);
      router.refresh();
    });
  }

  function changeStatus(organization: OrganizationRow, nextStatus: "active" | "past_due" | "churned") {
    if (data.demo) {
      setOrganizations((current) =>
        current.map((row) =>
          row.id === organization.id
            ? { ...row, status: nextStatus === "churned" ? "churned" : nextStatus }
            : row,
        ),
      );
      setMessage(`${organization.name} updated in demo mode.`);
      return;
    }
    startTransition(async () => {
      const result = await updateOrganizationStatusAction(organization.id, nextStatus);
      setMessage(result.ok ? `${organization.name} updated.` : result.error || "Update failed.");
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="command-center organizations-page">
      <header className="command-header organizations-header">
        <div>
          <h1>Organizations</h1>
          <p>Manage and monitor all organizations on your SKED platform.</p>
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
          <Link className="admin-action-button" href={`/admin/organizations/export?from=${data.range.from}&to=${data.range.to}`}>
            <Download /> <span>Export</span>
          </Link>
          <details className="admin-popover notification-popover">
            <summary className="notification-button" aria-label="Open organization notifications">
              <Bell />
              {data.notifications.length > 0 && <span>{data.notifications.length}</span>}
            </summary>
            <div className="admin-popover-panel notification-panel">
              <div className="notification-heading">
                <div><strong>Organization Activity</strong><small>Live account events</small></div>
                <button type="button" onClick={() => router.refresh()} title="Refresh notifications"><RefreshCw /></button>
              </div>
              <div className="org-notification-list">
                {data.notifications.map((notification) => (
                  <div key={notification.id}>
                    <span><Building2 /></span>
                    <div><strong>{notification.title}</strong><small>{notification.detail}</small></div>
                    <time>{formatDistanceToNowStrict(new Date(notification.at), { addSuffix: true })}</time>
                  </div>
                ))}
                {data.notifications.length === 0 && <p>No organization notifications yet.</p>}
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

      <section className="organizations-metrics" aria-label="Organization metrics">
        {data.metrics.map((metric) => (
          <article className={`organization-metric metric-${metric.tone}`} key={metric.key}>
            <span className="organization-metric-icon"><MetricIcon tone={metric.tone} /></span>
            <div>
              <small>{metric.label}</small>
              <strong>{metric.value.toLocaleString()}</strong>
              <p><Change value={metric.change} /> <span>vs previous period</span></p>
            </div>
          </article>
        ))}
      </section>

      <section className="organizations-filter-panel">
        <label className="org-search">
          <Search />
          <input
            aria-label="Search organizations"
            placeholder="Search organizations..."
            value={search}
            onChange={(event) => setFilter(() => setSearch(event.target.value))}
          />
        </label>
        <label className="org-select"><span>Status</span>
          <select value={status} onChange={(event) => setFilter(() => setStatus(event.target.value))}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="past_due">Past Due</option>
            <option value="churned">Churned</option>
          </select><ChevronDown />
        </label>
        <label className="org-select"><span>Plan</span>
          <select value={plan} onChange={(event) => setFilter(() => setPlan(event.target.value))}>
            <option value="all">All Plans</option>
            <option value="trial">Trial</option>
            <option value="premium">Premium</option>
          </select><ChevronDown />
        </label>
        <details className="org-created-filter">
          <summary><span>Created</span><strong><CalendarDays />{createdFrom || createdTo ? "Custom range" : "Select date range"}</strong></summary>
          <div>
            <label>From<input type="date" value={createdFrom} onChange={(event) => setFilter(() => setCreatedFrom(event.target.value))} /></label>
            <label>To<input type="date" value={createdTo} onChange={(event) => setFilter(() => setCreatedTo(event.target.value))} /></label>
          </div>
        </details>
        <button className="org-clear-button" type="button" onClick={clearFilters} disabled={!hasFilters}>Clear filters</button>
        <button className="org-add-button" type="button" onClick={() => { setMessage(""); setShowCreate(true); }}>
          <Plus /> Add Organization
        </button>
      </section>

      <section className="organizations-table-panel">
        <div className="organizations-table-scroll">
          <table>
            <thead>
              <tr>
                <SortableHeader label="Organization" sortKey="name" activeKey={sortKey} direction={sortDirection} onSort={sortBy} />
                <SortableHeader label="Plan" sortKey="plan" activeKey={sortKey} direction={sortDirection} onSort={sortBy} />
                <SortableHeader label="Status" sortKey="status" activeKey={sortKey} direction={sortDirection} onSort={sortBy} />
                <SortableHeader label="Users" sortKey="users" activeKey={sortKey} direction={sortDirection} onSort={sortBy} />
                <SortableHeader label="Bookings (30D)" sortKey="bookings" activeKey={sortKey} direction={sortDirection} onSort={sortBy} />
                <SortableHeader label="Revenue (30D)" sortKey="revenue" activeKey={sortKey} direction={sortDirection} onSort={sortBy} />
                <SortableHeader label="Trial Ends In" sortKey="trialDaysLeft" activeKey={sortKey} direction={sortDirection} onSort={sortBy} />
                <SortableHeader label="Created" sortKey="createdAt" activeKey={sortKey} direction={sortDirection} onSort={sortBy} />
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((organization) => (
                <tr key={organization.id}>
                  <td>
                    <button className="org-entity" type="button" onClick={() => setSelected(organization)}>
                      <OrganizationAvatar organization={organization} />
                      <span><strong>{organization.name}</strong><small>{organization.location}</small></span>
                    </button>
                  </td>
                  <td>{planLabel(organization.plan)}</td>
                  <td><span className={`org-status status-${organization.status}`}><i />{statusLabel(organization.status)}</span></td>
                  <td><span className="org-number">{organization.users.toLocaleString()} <Change value={organization.userChange} /></span></td>
                  <td><span className="org-number">{organization.bookings.toLocaleString()} <Change value={organization.bookingChange} /></span></td>
                  <td><span className="org-number">{money(organization.revenue)} <Change value={organization.revenueChange} suffix="%" /></span></td>
                  <td className={organization.trialDaysLeft !== null && organization.trialDaysLeft <= 7 ? "trial-ending" : ""}>
                    {organization.trialDaysLeft === null ? "—" : `${organization.trialDaysLeft} days`}
                  </td>
                  <td>{format(new Date(organization.createdAt), "MMM d, yyyy")}</td>
                  <td>
                    <div className="org-actions">
                      <button type="button" onClick={() => setSelected(organization)} aria-label={`View ${organization.name}`}><Eye /></button>
                      <details>
                        <summary aria-label={`Actions for ${organization.name}`}><MoreVertical /></summary>
                        <div>
                          <Link href={`/p/${organization.slug}`} target="_blank">Open public page</Link>
                          <Link href={`/admin/users?org=${organization.id}`}>Manage users</Link>
                          <button type="button" disabled={pending} onClick={() => changeStatus(organization, "active")}>Mark active</button>
                          <button type="button" disabled={pending} onClick={() => changeStatus(organization, "past_due")}>Mark past due</button>
                          <button type="button" disabled={pending} onClick={() => changeStatus(organization, "churned")}>Mark churned</button>
                        </div>
                      </details>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pageRows.length === 0 && <div className="org-empty"><Search /><strong>No organizations found</strong><small>Adjust the filters and try again.</small></div>}
        </div>
        <footer className="organizations-pagination">
          <p>
            Showing {filtered.length === 0 ? 0 : safePage * PAGE_SIZE + 1} to {Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} of {hasFilters ? filtered.length : data.totalAvailable} organizations
            {data.demo && <em> Demo data</em>}
          </p>
          <div>
            <button type="button" onClick={() => setPage(Math.max(0, safePage - 1))} disabled={safePage === 0}><ChevronLeft /></button>
            {Array.from({ length: Math.min(totalPages, 3) }, (_, index) => (
              <button className={safePage === index ? "is-active" : ""} type="button" key={index} onClick={() => setPage(index)}>{index + 1}</button>
            ))}
            {totalPages > 4 && <span>…</span>}
            {totalPages > 3 && <button className={safePage === totalPages - 1 ? "is-active" : ""} type="button" onClick={() => setPage(totalPages - 1)}>{totalPages}</button>}
            <button type="button" onClick={() => setPage(Math.min(totalPages - 1, safePage + 1))} disabled={safePage === totalPages - 1}><ChevronRight /></button>
          </div>
        </footer>
      </section>

      {selected && <OrganizationDetails organization={selected} onClose={() => setSelected(null)} />}
      {showCreate && <CreateOrganization pending={pending} onClose={() => setShowCreate(false)} onSubmit={createOrganization} />}
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

function OrganizationAvatar({ organization }: { organization: OrganizationRow }) {
  // Tenant logos can be hosted outside Next's configured image domains.
  // eslint-disable-next-line @next/next/no-img-element
  if (organization.logoUrl) return <img src={organization.logoUrl} alt="" />;
  return <span>{organization.name.split(/\s+/).slice(0, 2).map((word) => word[0]).join("")}</span>;
}

function OrganizationDetails({ organization, onClose }: { organization: OrganizationRow; onClose: () => void }) {
  return (
    <div className="org-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="org-modal org-detail-modal" role="dialog" aria-modal="true" aria-labelledby="org-detail-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="org-modal-close" type="button" onClick={onClose} aria-label="Close details"><X /></button>
        <div className="org-detail-heading">
          <OrganizationAvatar organization={organization} />
          <div><h2 id="org-detail-title">{organization.name}</h2><p>{organization.location}</p></div>
        </div>
        <div className="org-detail-grid">
          <div><small>Plan</small><strong>{planLabel(organization.plan)}</strong></div>
          <div><small>Status</small><strong>{statusLabel(organization.status)}</strong></div>
          <div><small>Users</small><strong>{organization.users}</strong></div>
          <div><small>Bookings</small><strong>{organization.bookings}</strong></div>
          <div><small>Revenue</small><strong>{money(organization.revenue)}</strong></div>
          <div><small>Created</small><strong>{format(new Date(organization.createdAt), "MMM d, yyyy")}</strong></div>
        </div>
        <div className="org-modal-actions">
          <Link href={`/p/${organization.slug}`} target="_blank"><Eye /> Open public page</Link>
          <Link href={`/admin/users?org=${organization.id}`}><Users /> Manage users</Link>
        </div>
      </section>
    </div>
  );
}

function CreateOrganization({
  pending,
  onClose,
  onSubmit,
}: {
  pending: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="org-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="org-modal org-create-modal" onSubmit={onSubmit} onMouseDown={(event) => event.stopPropagation()}>
        <button className="org-modal-close" type="button" onClick={onClose} aria-label="Close form"><X /></button>
        <h2>Add Organization</h2>
        <p>Create the organization and its initial subscription.</p>
        <label>Organization name<input name="name" required minLength={2} placeholder="Organization name" /></label>
        <label>Public slug<input name="slug" placeholder="ace-pickleball-club" pattern="[a-z0-9-]*" /></label>
        <label>Initial plan<select name="plan" defaultValue="trial"><option value="trial">Trial - 14 days free</option><option value="premium">Premium - monthly</option></select></label>
        <div className="org-create-fields">
          <label>Contact email<input name="contactEmail" type="email" placeholder="owner@example.com" /></label>
          <label>Contact phone<input name="contactPhone" type="tel" placeholder="+63 900 000 0000" /></label>
        </div>
        <button className="org-create-submit" type="submit" disabled={pending}>{pending ? "Creating..." : "Create Organization"}</button>
      </form>
    </div>
  );
}
