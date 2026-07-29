"use client";

import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Filter,
  RefreshCw,
  Search,
  Timer,
  WalletCards,
  X,
} from "lucide-react";
import { format, formatDistanceToNowStrict } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export type PaymentStatus = "success" | "pending" | "failed" | "refunded";

export type AdminPaymentRow = {
  id: string;
  invoiceId: string;
  transactionId: string;
  orgId: string;
  orgSlug: string;
  orgName: string;
  orgLocation: string;
  orgLogoUrl: string | null;
  type: "payment" | "refund";
  subscription: string;
  amountCents: number;
  method: string;
  status: PaymentStatus;
  paidAt: string;
  description: string;
};

export type AdminPaymentListData = {
  range: { from: string; to: string };
  totalAvailable: number;
  metrics: Array<{
    key: string;
    label: string;
    value: number;
    change: number;
    detail?: string;
    money?: boolean;
    tone: "cyan" | "green" | "purple" | "orange" | "red";
  }>;
  payments: AdminPaymentRow[];
  notifications: Array<{ id: string; title: string; detail: string; at: string }>;
  demo: boolean;
};

type SortKey = "invoiceId" | "orgName" | "amountCents" | "status" | "paidAt";
type SortDirection = "asc" | "desc";
type TabKey = "all" | "success" | "pending" | "failed" | "refunded";

const PAGE_SIZE = 8;
const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "all", label: "All Transactions" },
  { key: "success", label: "Successful" },
  { key: "pending", label: "Pending" },
  { key: "failed", label: "Failed" },
  { key: "refunded", label: "Refunds" },
];

function dateLabel(from: string, to: string) {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
}

function money(cents: number) {
  const sign = cents < 0 ? "-" : "";
  return `${sign}${new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(Math.abs(cents) / 100)}`;
}

function statusLabel(status: PaymentStatus) {
  return status === "success"
    ? "Success"
    : status === "refunded"
      ? "Refunded"
      : `${status[0]!.toUpperCase()}${status.slice(1)}`;
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

function MetricIcon({ tone }: { tone: AdminPaymentListData["metrics"][number]["tone"] }) {
  const icons = {
    cyan: CheckCircle2,
    green: WalletCards,
    purple: WalletCards,
    orange: Timer,
    red: AlertCircle,
  };
  const Icon = icons[tone];
  return <Icon />;
}

export function AdminPaymentList({ data }: { data: AdminPaymentListData }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [method, setMethod] = useState("all");
  const [tab, setTab] = useState<TabKey>("all");
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("paidAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [rangeFrom, setRangeFrom] = useState(data.range.from);
  const [rangeTo, setRangeTo] = useState(data.range.to);
  const [selected, setSelected] = useState<AdminPaymentRow | null>(null);
  const [message, setMessage] = useState("");
  const methods = useMemo(
    () => Array.from(new Set(data.payments.map((row) => methodFamily(row.method)))).sort(),
    [data.payments],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.payments
      .filter((payment) => {
        return (
          (!query ||
            payment.invoiceId.toLowerCase().includes(query) ||
            payment.transactionId.toLowerCase().includes(query) ||
            payment.orgName.toLowerCase().includes(query)) &&
          (tab === "all" || payment.status === tab) &&
          (status === "all" || payment.status === status) &&
          (method === "all" || methodFamily(payment.method) === method)
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
  }, [data.payments, method, search, sortDirection, sortKey, status, tab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const hasFilters = Boolean(search || status !== "all" || method !== "all" || tab !== "all");

  function setFilter(callback: () => void) {
    callback();
    setPage(0);
  }

  function clearFilters() {
    setSearch("");
    setStatus("all");
    setMethod("all");
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
    router.push(`/admin/payments?${new URLSearchParams({ from, to })}`);
  }

  function downloadReceipt(payment: AdminPaymentRow) {
    const receipt = [
      "SKED Payment Receipt",
      `Invoice: ${payment.invoiceId}`,
      `Transaction: ${payment.transactionId}`,
      `Organization: ${payment.orgName}`,
      `Type: ${payment.type}`,
      `Subscription: ${payment.subscription}`,
      `Amount: ${money(payment.amountCents)}`,
      `Method: ${payment.method}`,
      `Status: ${statusLabel(payment.status)}`,
      `Paid At: ${format(new Date(payment.paidAt), "MMM d, yyyy h:mm a")}`,
    ].join("\n");
    const url = URL.createObjectURL(new Blob([receipt], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${payment.invoiceId}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage(`Receipt downloaded for ${payment.invoiceId}.`);
  }

  return (
    <div className="command-center organizations-page payments-page">
      <header className="command-header organizations-header">
        <div>
          <h1>Payments</h1>
          <p>Monitor transactions, invoices, and payment status.</p>
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
          <Link className="admin-action-button" href={`/admin/payments/export?from=${data.range.from}&to=${data.range.to}`}>
            <Download /> <span>Export</span>
          </Link>
          <details className="admin-popover notification-popover">
            <summary className="notification-button" aria-label="Open payment notifications">
              <Bell />
              {data.notifications.length > 0 && <span>{data.notifications.length}</span>}
            </summary>
            <div className="admin-popover-panel notification-panel">
              <div className="notification-heading">
                <div><strong>Payment Activity</strong><small>Recent transaction events</small></div>
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
                {data.notifications.length === 0 && <p>No payment notifications yet.</p>}
              </div>
              <Link href="/admin/audit-logs">View all activity <ArrowRight /></Link>
            </div>
          </details>
          <span className="organizations-admin-avatar" title="Klein Conejos">KC</span>
        </div>
      </header>

      {message && (
        <button className="org-toast" type="button" onClick={() => setMessage("")}>
          {message}<X />
        </button>
      )}

      <section className="organizations-metrics" aria-label="Payment metrics">
        {data.metrics.map((metric) => (
          <article className={`organization-metric metric-${metric.tone}`} key={metric.key}>
            <span className="organization-metric-icon"><MetricIcon tone={metric.tone} /></span>
            <div>
              <small>{metric.label}</small>
              <strong>{metric.money ? money(metric.value).replace(".00", "") : metric.value.toLocaleString()}</strong>
              {metric.detail && <span className="user-metric-detail">{metric.detail}</span>}
              <p><Change value={metric.change} /> <span>vs previous period</span></p>
            </div>
          </article>
        ))}
      </section>

      <section className="organizations-filter-panel payments-filter-panel">
        <label className="org-search">
          <Search />
          <input
            aria-label="Search payments"
            placeholder="Search organization, invoice, or transaction..."
            value={search}
            onChange={(event) => setFilter(() => setSearch(event.target.value))}
          />
        </label>
        <label className="org-select"><span>Status</span>
          <select value={status} onChange={(event) => setFilter(() => setStatus(event.target.value))}>
            <option value="all">All Status</option>
            <option value="success">Successful</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select><ChevronDown />
        </label>
        <label className="org-select"><span>Payment Method</span>
          <select value={method} onChange={(event) => setFilter(() => setMethod(event.target.value))}>
            <option value="all">All Methods</option>
            {methods.map((item) => <option key={item} value={item}>{item}</option>)}
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
        <button className="org-clear-button" type="button" onClick={clearFilters} disabled={!hasFilters}>Clear Filters</button>
        <button className="org-clear-button payment-filter-button" type="button" onClick={() => setMessage("Advanced filters are ready in this view.")}><Filter /> Filters</button>
      </section>

      <section className="payment-tabs" aria-label="Payment status tabs">
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

      <section className="organizations-table-panel payments-table-panel">
        <div className="organizations-table-scroll">
          <table>
            <thead>
              <tr>
                <SortableHeader label="Invoice / Transaction ID" sortKey="invoiceId" activeKey={sortKey} direction={sortDirection} onSort={sortBy} />
                <SortableHeader label="Organization" sortKey="orgName" activeKey={sortKey} direction={sortDirection} onSort={sortBy} />
                <th>Type</th>
                <th>Subscription</th>
                <SortableHeader label="Amount" sortKey="amountCents" activeKey={sortKey} direction={sortDirection} onSort={sortBy} />
                <th>Payment Method</th>
                <SortableHeader label="Status" sortKey="status" activeKey={sortKey} direction={sortDirection} onSort={sortBy} />
                <SortableHeader label="Paid At" sortKey="paidAt" activeKey={sortKey} direction={sortDirection} onSort={sortBy} />
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((payment) => (
                <tr key={payment.id}>
                  <td>
                    <div className="payment-invoice">
                      <span><FileText /></span>
                      <div><strong>{payment.invoiceId}</strong><small>{payment.transactionId}</small></div>
                    </div>
                  </td>
                  <td>
                    <button className="org-entity payment-org" type="button" onClick={() => setSelected(payment)}>
                      <OrganizationAvatar payment={payment} />
                      <span><strong>{payment.orgName}</strong><small>{payment.orgLocation}</small></span>
                    </button>
                  </td>
                  <td>
                    <span className="payment-type"><WalletCards /> {payment.type === "refund" ? "Refund" : "Payment"}</span>
                    <small className="subscription-subline">{payment.description}</small>
                  </td>
                  <td>{payment.subscription}</td>
                  <td className={payment.amountCents < 0 ? "payment-amount-negative" : ""}>{money(payment.amountCents)}</td>
                  <td><PaymentMethod method={payment.method} /></td>
                  <td><span className={`payment-status status-${payment.status}`}><i />{statusLabel(payment.status)}</span></td>
                  <td><span>{format(new Date(payment.paidAt), "MMM d, yyyy")}<small>{format(new Date(payment.paidAt), "hh:mm a")}</small></span></td>
                  <td>
                    <div className="org-actions">
                      <button type="button" onClick={() => setSelected(payment)} aria-label={`View ${payment.invoiceId}`}><Eye /></button>
                      <button type="button" onClick={() => downloadReceipt(payment)} aria-label={`Download ${payment.invoiceId}`}><Download /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pageRows.length === 0 && <div className="org-empty"><Search /><strong>No payments found</strong><small>Adjust the filters and try again.</small></div>}
        </div>
        <footer className="organizations-pagination">
          <p>
            Showing {filtered.length === 0 ? 0 : safePage * PAGE_SIZE + 1} to {Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} of {hasFilters ? filtered.length : data.totalAvailable} transactions
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

      {selected && <PaymentDetails payment={selected} onClose={() => setSelected(null)} onDownload={downloadReceipt} />}
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

function OrganizationAvatar({ payment }: { payment: AdminPaymentRow }) {
  if (payment.orgLogoUrl) {
    // Tenant logos can be hosted outside Next's configured image domains.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={payment.orgLogoUrl} alt="" />;
  }
  return <span>{payment.orgName.split(/\s+/).slice(0, 2).map((word) => word[0]).join("")}</span>;
}

function methodFamily(method: string) {
  const lowered = method.toLowerCase();
  if (lowered.includes("visa")) return "Visa";
  if (lowered.includes("master")) return "Mastercard";
  if (lowered.includes("gcash")) return "GCash";
  if (lowered.includes("maya")) return "Maya";
  return method.split(" ")[0] || "Manual";
}

function PaymentMethod({ method }: { method: string }) {
  const family = methodFamily(method);
  return (
    <span className={`payment-method method-${family.toLowerCase()}`}>
      <strong>{family}</strong>
      {method.replace(family, "").trim() && <small>{method.replace(family, "").trim()}</small>}
    </span>
  );
}

function PaymentDetails({
  payment,
  onClose,
  onDownload,
}: {
  payment: AdminPaymentRow;
  onClose: () => void;
  onDownload: (payment: AdminPaymentRow) => void;
}) {
  return (
    <div className="org-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="org-modal org-detail-modal" role="dialog" aria-modal="true" aria-labelledby="payment-detail-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="org-modal-close" type="button" onClick={onClose} aria-label="Close details"><X /></button>
        <div className="org-detail-heading">
          <OrganizationAvatar payment={payment} />
          <div><h2 id="payment-detail-title">{payment.invoiceId}</h2><p>{payment.orgName} - {payment.transactionId}</p></div>
        </div>
        <div className="org-detail-grid">
          <div><small>Amount</small><strong>{money(payment.amountCents)}</strong></div>
          <div><small>Status</small><strong>{statusLabel(payment.status)}</strong></div>
          <div><small>Method</small><strong>{payment.method}</strong></div>
          <div><small>Type</small><strong>{payment.type}</strong></div>
          <div><small>Subscription</small><strong>{payment.subscription}</strong></div>
          <div><small>Paid At</small><strong>{format(new Date(payment.paidAt), "MMM d, yyyy h:mm a")}</strong></div>
        </div>
        <div className="org-modal-actions">
          <button type="button" onClick={() => onDownload(payment)}><Download /> Download Receipt</button>
          <Link href={`/admin/organizations?org=${payment.orgId}`}><Eye /> Organization</Link>
        </div>
      </section>
    </div>
  );
}
