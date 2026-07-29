"use client";

import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Bell,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Eye,
  Filter,
  HelpCircle,
  Map,
  MoreVertical,
  RefreshCw,
  Search,
  UserRoundX,
  X,
} from "lucide-react";
import { format, formatDistanceToNowStrict } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { updateAdminBookingStatusAction } from "./actions";

export type AdminBookingStatus = "completed" | "upcoming" | "cancelled" | "no_show";
export type BookingPaymentStatus = "paid" | "unpaid" | "refunded" | "free";

export type AdminBookingRow = {
  id: string;
  bookingCode: string;
  orgId: string;
  orgSlug: string;
  orgName: string;
  orgLocation: string;
  orgLogoUrl: string | null;
  customerName: string;
  customerEmail: string;
  customerAvatarUrl: string | null;
  courtName: string;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  amountCents: number;
  status: AdminBookingStatus;
  paymentStatus: BookingPaymentStatus;
  source: string;
  createdAt: string;
};

export type AdminBookingListData = {
  range: { from: string; to: string };
  totalAvailable: number;
  metrics: Array<{
    key: string;
    label: string;
    value: number;
    change: number;
    detail?: string;
    tone: "cyan" | "green" | "purple" | "orange" | "red";
  }>;
  bookings: AdminBookingRow[];
  organizations: Array<{ id: string; name: string }>;
  notifications: Array<{ id: string; title: string; detail: string; at: string }>;
  demo: boolean;
};

type SortKey = "bookingCode" | "orgName" | "customerName" | "courtName" | "startsAt" | "amountCents" | "status";
type SortDirection = "asc" | "desc";
type TabKey = "all" | AdminBookingStatus;

const PAGE_SIZE = 8;
const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "all", label: "All Bookings" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "no_show", label: "No-Show" },
];

function dateLabel(from: string, to: string) {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
}

function money(cents: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function durationLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours && mins) return `${hours}h ${mins}m`;
  if (hours) return `${hours}h`;
  return `${mins}m`;
}

function statusLabel(status: AdminBookingStatus) {
  return status === "no_show"
    ? "No-Show"
    : `${status[0]!.toUpperCase()}${status.slice(1)}`;
}

function paymentLabel(status: BookingPaymentStatus) {
  return status === "free" ? "Free" : `${status[0]!.toUpperCase()}${status.slice(1)}`;
}

function Change({ value }: { value: number }) {
  if (value === 0) return <span className="org-change is-flat">-</span>;
  const Icon = value > 0 ? ArrowUp : ArrowDown;
  return (
    <span className={`org-change ${value > 0 ? "is-positive" : "is-negative"}`}>
      <Icon /> {Math.abs(value).toLocaleString()}
    </span>
  );
}

function MetricIcon({ tone }: { tone: AdminBookingListData["metrics"][number]["tone"] }) {
  const icons = {
    cyan: CalendarCheck2,
    green: CheckCircle2,
    purple: X,
    orange: Clock,
    red: UserRoundX,
  };
  const Icon = icons[tone];
  return <Icon />;
}

export function AdminBookingList({ data }: { data: AdminBookingListData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState(data.bookings);
  const [search, setSearch] = useState("");
  const [organization, setOrganization] = useState("all");
  const [status, setStatus] = useState("all");
  const [tab, setTab] = useState<TabKey>("all");
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("startsAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [rangeFrom, setRangeFrom] = useState(data.range.from);
  const [rangeTo, setRangeTo] = useState(data.range.to);
  const [selected, setSelected] = useState<AdminBookingRow | null>(null);
  const [message, setMessage] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows
      .filter((booking) => {
        return (
          (!query ||
            booking.bookingCode.toLowerCase().includes(query) ||
            booking.orgName.toLowerCase().includes(query) ||
            booking.customerName.toLowerCase().includes(query) ||
            booking.customerEmail.toLowerCase().includes(query)) &&
          (organization === "all" || booking.orgId === organization) &&
          (status === "all" || booking.status === status) &&
          (tab === "all" || booking.status === tab)
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
  }, [organization, rows, search, sortDirection, sortKey, status, tab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const hasFilters = Boolean(search || organization !== "all" || status !== "all" || tab !== "all");

  function setFilter(callback: () => void) {
    callback();
    setPage(0);
  }

  function clearFilters() {
    setSearch("");
    setOrganization("all");
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
      from = format(start, "yyyy-MM-dd");
      to = format(end, "yyyy-MM-dd");
      setRangeFrom(from);
      setRangeTo(to);
    }
    router.push(`/admin/bookings?${new URLSearchParams({ from, to })}`);
  }

  function updateDemoRow(id: string, nextStatus: AdminBookingStatus) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, status: nextStatus } : row)));
  }

  function changeStatus(booking: AdminBookingRow, nextStatus: AdminBookingStatus) {
    if (data.demo) {
      updateDemoRow(booking.id, nextStatus);
      setMessage(`${booking.bookingCode} updated in demo mode.`);
      return;
    }
    startTransition(async () => {
      const result = await updateAdminBookingStatusAction(booking.id, nextStatus);
      setMessage(result.ok ? `${booking.bookingCode} updated.` : result.error || "Update failed.");
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="command-center organizations-page bookings-page">
      <header className="command-header organizations-header">
        <div>
          <h1>Bookings</h1>
          <p>View and manage all court bookings across your platform.</p>
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
          <Link className="admin-action-button" href={`/admin/bookings/export?from=${data.range.from}&to=${data.range.to}`}>
            <Download /> <span>Export</span>
          </Link>
          <Link className="admin-action-button help-button" href="/admin/pricing">
            <HelpCircle /> <span>Help</span>
          </Link>
          <details className="admin-popover notification-popover">
            <summary className="notification-button" aria-label="Open booking notifications">
              <Bell />
              {data.notifications.length > 0 && <span>{data.notifications.length}</span>}
            </summary>
            <div className="admin-popover-panel notification-panel">
              <div className="notification-heading">
                <div><strong>Booking Activity</strong><small>Live booking events</small></div>
                <button type="button" onClick={() => router.refresh()} title="Refresh notifications"><RefreshCw /></button>
              </div>
              <div className="org-notification-list">
                {data.notifications.map((notification) => (
                  <div key={notification.id}>
                    <span><CalendarCheck2 /></span>
                    <div><strong>{notification.title}</strong><small>{notification.detail}</small></div>
                    <time>{formatDistanceToNowStrict(new Date(notification.at), { addSuffix: true })}</time>
                  </div>
                ))}
                {data.notifications.length === 0 && <p>No booking notifications yet.</p>}
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

      <section className="organizations-metrics" aria-label="Booking metrics">
        {data.metrics.map((metric) => (
          <article className={`organization-metric metric-${metric.tone}`} key={metric.key}>
            <span className="organization-metric-icon"><MetricIcon tone={metric.tone} /></span>
            <div>
              <small>{metric.label}</small>
              <strong>{metric.value.toLocaleString()}</strong>
              {metric.detail && <span className="user-metric-detail">{metric.detail}</span>}
              <p><Change value={metric.change} /> <span>vs previous period</span></p>
            </div>
          </article>
        ))}
      </section>

      <section className="organizations-filter-panel bookings-filter-panel">
        <label className="org-search">
          <Search />
          <input
            aria-label="Search bookings"
            placeholder="Search organization, customer, or booking ID..."
            value={search}
            onChange={(event) => setFilter(() => setSearch(event.target.value))}
          />
        </label>
        <label className="org-select"><span>Organization</span>
          <select value={organization} onChange={(event) => setFilter(() => setOrganization(event.target.value))}>
            <option value="all">All Organizations</option>
            {data.organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
          </select><ChevronDown />
        </label>
        <details className="admin-popover payment-date-filter">
          <summary className="admin-action-button"><CalendarDays /> <span>{dateLabel(data.range.from, data.range.to)}</span> <ChevronDown /></summary>
          <div className="admin-popover-panel date-panel">
            <label>From<input type="date" value={rangeFrom} onChange={(event) => setRangeFrom(event.target.value)} /></label>
            <label>To<input type="date" value={rangeTo} onChange={(event) => setRangeTo(event.target.value)} /></label>
            <button className="date-apply" type="button" onClick={() => applyRange()}>Apply date range</button>
          </div>
        </details>
        <label className="org-select"><span>Status</span>
          <select value={status} onChange={(event) => setFilter(() => setStatus(event.target.value))}>
            <option value="all">All Status</option>
            <option value="upcoming">Upcoming</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No-Show</option>
          </select><ChevronDown />
        </label>
        <button className="org-clear-button" type="button" onClick={clearFilters} disabled={!hasFilters}>Clear Filters</button>
        <button className="org-add-button" type="button" onClick={() => setMessage("Booking filters are ready in this view.")}><Filter /> Filters</button>
      </section>

      <section className="payment-tabs booking-tabs" aria-label="Booking status tabs">
        {tabs.map((item) => (
          <button
            type="button"
            key={item.key}
            className={tab === item.key ? "is-active" : ""}
            onClick={() => setFilter(() => setTab(item.key))}
          >
            {item.label}
          </button>
        ))}
      </section>

      <section className="organizations-table-panel bookings-table-panel">
        <div className="organizations-table-scroll">
          <table>
            <thead>
              <tr>
                <SortableHeader label="Booking ID" sortKey="bookingCode" activeKey={sortKey} direction={sortDirection} onSort={sortBy} />
                <SortableHeader label="Organization" sortKey="orgName" activeKey={sortKey} direction={sortDirection} onSort={sortBy} />
                <SortableHeader label="Customer" sortKey="customerName" activeKey={sortKey} direction={sortDirection} onSort={sortBy} />
                <SortableHeader label="Court" sortKey="courtName" activeKey={sortKey} direction={sortDirection} onSort={sortBy} />
                <SortableHeader label="Date & Time" sortKey="startsAt" activeKey={sortKey} direction={sortDirection} onSort={sortBy} />
                <th>Duration</th>
                <SortableHeader label="Amount" sortKey="amountCents" activeKey={sortKey} direction={sortDirection} onSort={sortBy} />
                <SortableHeader label="Status" sortKey="status" activeKey={sortKey} direction={sortDirection} onSort={sortBy} />
                <th>Payment</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((booking) => (
                <tr key={booking.id}>
                  <td><strong className="booking-code">{booking.bookingCode}</strong></td>
                  <td>
                    <button className="org-entity booking-org" type="button" onClick={() => setSelected(booking)}>
                      <OrganizationAvatar booking={booking} />
                      <span><strong>{booking.orgName}</strong><small>{booking.orgLocation}</small></span>
                    </button>
                  </td>
                  <td>
                    <div className="booking-customer">
                      <CustomerAvatar booking={booking} />
                      <span><strong>{booking.customerName}</strong><small>{booking.customerEmail}</small></span>
                    </div>
                  </td>
                  <td><span className="booking-court"><Map /> {booking.courtName}</span></td>
                  <td><span>{format(new Date(booking.startsAt), "MMM d, yyyy")}<small>{format(new Date(booking.startsAt), "h:mm a")} - {format(new Date(booking.endsAt), "h:mm a")}</small></span></td>
                  <td>{durationLabel(booking.durationMinutes)}</td>
                  <td>{money(booking.amountCents)}</td>
                  <td><span className={`booking-status status-${booking.status}`}><i />{statusLabel(booking.status)}</span></td>
                  <td><span className={`booking-payment payment-${booking.paymentStatus}`}><i />{paymentLabel(booking.paymentStatus)}</span></td>
                  <td>
                    <div className="org-actions">
                      <button type="button" onClick={() => setSelected(booking)} aria-label={`View ${booking.bookingCode}`}><Eye /></button>
                      <details>
                        <summary aria-label={`Actions for ${booking.bookingCode}`}><MoreVertical /></summary>
                        <div>
                          <button type="button" onClick={() => setSelected(booking)}>View details</button>
                          <button type="button" disabled={pending} onClick={() => changeStatus(booking, "upcoming")}>Mark upcoming</button>
                          <button type="button" disabled={pending} onClick={() => changeStatus(booking, "completed")}>Mark completed</button>
                          <button type="button" disabled={pending} onClick={() => changeStatus(booking, "cancelled")}>Cancel booking</button>
                          <button type="button" disabled={pending} onClick={() => changeStatus(booking, "no_show")}>Mark no-show</button>
                        </div>
                      </details>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pageRows.length === 0 && <div className="org-empty"><Search /><strong>No bookings found</strong><small>Adjust the filters and try again.</small></div>}
        </div>
        <footer className="organizations-pagination">
          <p>
            Showing {filtered.length === 0 ? 0 : safePage * PAGE_SIZE + 1} to {Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} of {hasFilters ? filtered.length : data.totalAvailable} bookings
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

      {selected && <BookingDetails booking={selected} onClose={() => setSelected(null)} />}
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

function OrganizationAvatar({ booking }: { booking: AdminBookingRow }) {
  if (booking.orgLogoUrl) {
    // Tenant logos can be hosted outside Next's configured image domains.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={booking.orgLogoUrl} alt="" />;
  }
  return <span>{booking.orgName.split(/\s+/).slice(0, 2).map((word) => word[0]).join("")}</span>;
}

function CustomerAvatar({ booking }: { booking: AdminBookingRow }) {
  if (booking.customerAvatarUrl) {
    // Future profile avatars may be remote.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={booking.customerAvatarUrl} alt="" />;
  }
  return <span>{booking.customerName.split(/\s+/).slice(0, 2).map((word) => word[0]).join("")}</span>;
}

function BookingDetails({ booking, onClose }: { booking: AdminBookingRow; onClose: () => void }) {
  return (
    <div className="org-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="org-modal org-detail-modal" role="dialog" aria-modal="true" aria-labelledby="booking-detail-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="org-modal-close" type="button" onClick={onClose} aria-label="Close details"><X /></button>
        <div className="org-detail-heading">
          <OrganizationAvatar booking={booking} />
          <div><h2 id="booking-detail-title">{booking.bookingCode}</h2><p>{booking.orgName} - {booking.courtName}</p></div>
        </div>
        <div className="org-detail-grid">
          <div><small>Customer</small><strong>{booking.customerName}</strong></div>
          <div><small>Status</small><strong>{statusLabel(booking.status)}</strong></div>
          <div><small>Payment</small><strong>{paymentLabel(booking.paymentStatus)}</strong></div>
          <div><small>Date</small><strong>{format(new Date(booking.startsAt), "MMM d, yyyy")}</strong></div>
          <div><small>Time</small><strong>{format(new Date(booking.startsAt), "h:mm a")} - {format(new Date(booking.endsAt), "h:mm a")}</strong></div>
          <div><small>Amount</small><strong>{money(booking.amountCents)}</strong></div>
        </div>
        <div className="org-modal-actions">
          <Link href={`/admin/organizations?org=${booking.orgId}`}><Eye /> Organization</Link>
          <Link href={`/p/${booking.orgSlug}`} target="_blank"><CalendarCheck2 /> Public Page</Link>
        </div>
      </section>
    </div>
  );
}
