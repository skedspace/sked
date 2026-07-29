"use client";

import {
  Armchair,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Bell,
  CalendarDays,
  Car,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Edit3,
  Eye,
  HelpCircle,
  Lightbulb,
  Map,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { format, formatDistanceToNowStrict } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState, useTransition } from "react";
import { createCourtAction, updateCourtAction, updateCourtStatusAction } from "./actions";

export type CourtStatus = "active" | "maintenance" | "disabled";

export type AdminCourtRow = {
  id: string;
  code: string;
  name: string;
  orgId: string;
  orgSlug: string;
  orgName: string;
  orgLocation: string;
  orgLogoUrl: string | null;
  type: "indoor" | "outdoor";
  status: CourtStatus;
  surface: string;
  capacity: number;
  amenities: Array<"lights" | "seating" | "parking">;
  lastMaintenanceAt: string | null;
  photoUrl: string | null;
  utilization: number;
  locationId: string;
};

export type AdminCourtListData = {
  range: { from: string; to: string };
  totalAvailable: number;
  metrics: Array<{
    key: string;
    label: string;
    value: number;
    change: number;
    detail?: string;
    suffix?: string;
    tone: "cyan" | "green" | "purple" | "orange" | "red";
  }>;
  courts: AdminCourtRow[];
  organizations: Array<{ id: string; name: string }>;
  locations: Array<{ id: string; orgId: string; name: string; address: string | null }>;
  notifications: Array<{ id: string; title: string; detail: string; at: string }>;
  demo: boolean;
};

type SortKey = "name" | "orgName" | "type" | "status" | "surface" | "capacity" | "lastMaintenanceAt";
type SortDirection = "asc" | "desc";

const PAGE_SIZE = 8;

function dateLabel(from: string, to: string) {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
}

function statusLabel(status: CourtStatus) {
  return status === "maintenance" ? "Under Maintenance" : `${status[0]!.toUpperCase()}${status.slice(1)}`;
}

function typeLabel(type: AdminCourtRow["type"]) {
  return type === "indoor" ? "Indoor" : "Outdoor";
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

function MetricIcon({ tone, metricKey }: { tone: AdminCourtListData["metrics"][number]["tone"]; metricKey: string }) {
  if (metricKey === "utilization") return <Clock />;
  const icons = {
    cyan: Map,
    green: CheckCircle2,
    purple: Clock,
    orange: Wrench,
    red: X,
  };
  const Icon = icons[tone];
  return <Icon />;
}

export function AdminCourtList({ data }: { data: AdminCourtListData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState(data.courts);
  const [search, setSearch] = useState("");
  const [organization, setOrganization] = useState("all");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [rangeFrom, setRangeFrom] = useState(data.range.from);
  const [rangeTo, setRangeTo] = useState(data.range.to);
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<AdminCourtRow | null>(null);
  const [editing, setEditing] = useState<AdminCourtRow | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows
      .filter((court) => {
        return (
          (!query ||
            court.name.toLowerCase().includes(query) ||
            court.orgName.toLowerCase().includes(query) ||
            court.code.toLowerCase().includes(query)) &&
          (organization === "all" || court.orgId === organization) &&
          (status === "all" || court.status === status) &&
          (type === "all" || court.type === type)
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
  }, [organization, rows, search, sortDirection, sortKey, status, type]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const hasFilters = Boolean(search || organization !== "all" || status !== "all" || type !== "all");

  function setFilter(callback: () => void) {
    callback();
    setPage(0);
  }

  function clearFilters() {
    setSearch("");
    setOrganization("all");
    setStatus("all");
    setType("all");
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
    router.push(`/admin/courts?${new URLSearchParams({ from, to })}`);
  }

  function updateDemoRow(id: string, patch: Partial<AdminCourtRow>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function changeStatus(court: AdminCourtRow, nextStatus: CourtStatus) {
    if (data.demo) {
      updateDemoRow(court.id, { status: nextStatus });
      setMessage(`${court.name} updated in demo mode.`);
      return;
    }
    startTransition(async () => {
      const result = await updateCourtStatusAction(court.id, nextStatus);
      setMessage(result.ok ? `${court.name} updated.` : result.error || "Update failed.");
      if (result.ok) router.refresh();
    });
  }

  async function createCourt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    const orgId = String(form.get("orgId") || "");
    const locationId = String(form.get("locationId") || "");
    const selectedType = String(form.get("type") || "Outdoor - Acrylic");
    const selectedStatus = String(form.get("status") || "active") as CourtStatus;
    const capacity = Number(form.get("capacity") || 4);
    const photoUrl = String(form.get("photoUrl") || "");
    if (data.demo) {
      const org = data.organizations.find((item) => item.id === orgId);
      const location = data.locations.find((item) => item.id === locationId);
      const nextIndex = rows.length + 1;
      const courtName = name || `Court ${nextIndex}`;
      const isIndoor = selectedType.toLowerCase().includes("indoor");
      const newCourt: AdminCourtRow = {
        id: `mock-court-${Date.now()}`,
        code: `C${String(nextIndex).padStart(3, "0")}`,
        name: courtName,
        orgId,
        orgSlug: orgId.replace(/^mock-org-/, ""),
        orgName: org?.name || "Demo Organization",
        orgLocation: location?.address || location?.name || "Location not set",
        orgLogoUrl: null,
        type: isIndoor ? "indoor" : "outdoor",
        status: selectedStatus,
        surface: selectedType.toLowerCase().includes("wood") ? "Wood" : isIndoor ? "Premium Indoor" : "Acrylic",
        capacity,
        amenities: isIndoor ? ["lights", "seating"] : ["lights", "seating", "parking"],
        lastMaintenanceAt: selectedStatus === "disabled" ? null : new Date().toISOString(),
        photoUrl: photoUrl || null,
        utilization: 0,
        locationId,
      };
      setRows((current) => [newCourt, ...current]);
      setSearch(courtName);
      setPage(0);
      setMessage("Court created in demo mode.");
      setShowCreate(false);
      return;
    }
    startTransition(async () => {
      const result = await createCourtAction({
        orgId,
        locationId,
        name,
        type: selectedType,
        capacity,
        status: selectedStatus,
        photoUrl,
      });
      setMessage(result.ok ? "Court created." : result.error || "Unable to create court.");
      if (result.ok) {
        setShowCreate(false);
        router.refresh();
      }
    });
  }

  async function editCourt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const form = new FormData(event.currentTarget);
    const patch = {
      name: String(form.get("name") || ""),
      type: String(form.get("type") || "Outdoor - Acrylic"),
      capacity: Number(form.get("capacity") || 4),
      status: String(form.get("status") || "active") as CourtStatus,
      photoUrl: String(form.get("photoUrl") || ""),
    };
    if (data.demo) {
      updateDemoRow(editing.id, {
        name: patch.name,
        type: patch.type.toLowerCase().includes("indoor") ? "indoor" : "outdoor",
        status: patch.status,
        capacity: patch.capacity,
        surface: patch.type.toLowerCase().includes("premium") ? "Premium Indoor" : "Acrylic",
        photoUrl: patch.photoUrl || editing.photoUrl,
      });
      setSearch(patch.name);
      setPage(0);
      setMessage(`${editing.name} updated in demo mode.`);
      setEditing(null);
      return;
    }
    startTransition(async () => {
      const result = await updateCourtAction(editing.id, patch);
      setMessage(result.ok ? `${editing.name} updated.` : result.error || "Unable to update court.");
      if (result.ok) {
        setEditing(null);
        router.refresh();
      }
    });
  }

  return (
    <div className="command-center organizations-page courts-page">
      <header className="command-header organizations-header">
        <div>
          <h1>Courts</h1>
          <p>View and manage all courts across organizations.</p>
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
          <Link className="admin-action-button" href={`/admin/courts/export?from=${data.range.from}&to=${data.range.to}`}>
            <Download /> <span>Export</span>
          </Link>
          <Link className="admin-action-button help-button" href="/admin/pricing">
            <HelpCircle /> <span>Help</span>
          </Link>
          <details className="admin-popover notification-popover">
            <summary className="notification-button" aria-label="Open court notifications">
              <Bell />
              {data.notifications.length > 0 && <span>{data.notifications.length}</span>}
            </summary>
            <div className="admin-popover-panel notification-panel">
              <div className="notification-heading">
                <div><strong>Court Activity</strong><small>Maintenance and utilization alerts</small></div>
                <button type="button" onClick={() => router.refresh()} title="Refresh notifications"><RefreshCw /></button>
              </div>
              <div className="org-notification-list">
                {data.notifications.map((notification) => (
                  <div key={notification.id}>
                    <span><Map /></span>
                    <div><strong>{notification.title}</strong><small>{notification.detail}</small></div>
                    <time>{formatDistanceToNowStrict(new Date(notification.at), { addSuffix: true })}</time>
                  </div>
                ))}
                {data.notifications.length === 0 && <p>No court notifications yet.</p>}
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

      <section className="organizations-metrics" aria-label="Court metrics">
        {data.metrics.map((metric) => (
          <article className={`organization-metric metric-${metric.tone}`} key={metric.key}>
            <span className="organization-metric-icon"><MetricIcon tone={metric.tone} metricKey={metric.key} /></span>
            <div>
              <small>{metric.label}</small>
              <strong>{metric.value.toLocaleString()}{metric.suffix || ""}</strong>
              {metric.detail && <span className="user-metric-detail">{metric.detail}</span>}
              <p><Change value={metric.change} /> <span>vs previous period</span></p>
            </div>
          </article>
        ))}
      </section>

      <section className="organizations-filter-panel courts-filter-panel">
        <label className="org-search">
          <Search />
          <input
            aria-label="Search courts"
            placeholder="Search court name or organization..."
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
        <label className="org-select"><span>Status</span>
          <select value={status} onChange={(event) => setFilter(() => setStatus(event.target.value))}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="maintenance">Under Maintenance</option>
            <option value="disabled">Disabled</option>
          </select><ChevronDown />
        </label>
        <label className="org-select"><span>Court Type</span>
          <select value={type} onChange={(event) => setFilter(() => setType(event.target.value))}>
            <option value="all">All Types</option>
            <option value="outdoor">Outdoor</option>
            <option value="indoor">Indoor</option>
          </select><ChevronDown />
        </label>
        <button className="org-clear-button" type="button" onClick={clearFilters} disabled={!hasFilters}>Clear Filters</button>
        <button className="org-add-button" type="button" onClick={() => setShowCreate(true)}><Plus /> Add Court</button>
      </section>

      <section className="organizations-table-panel courts-table-panel">
        <div className="organizations-table-scroll">
          <table>
            <thead>
              <tr>
                <SortableHeader label="Court" sortKey="name" activeKey={sortKey} direction={sortDirection} onSort={sortBy} />
                <SortableHeader label="Organization" sortKey="orgName" activeKey={sortKey} direction={sortDirection} onSort={sortBy} />
                <SortableHeader label="Type" sortKey="type" activeKey={sortKey} direction={sortDirection} onSort={sortBy} />
                <SortableHeader label="Status" sortKey="status" activeKey={sortKey} direction={sortDirection} onSort={sortBy} />
                <SortableHeader label="Surface" sortKey="surface" activeKey={sortKey} direction={sortDirection} onSort={sortBy} />
                <SortableHeader label="Capacity" sortKey="capacity" activeKey={sortKey} direction={sortDirection} onSort={sortBy} />
                <th>Amenities</th>
                <SortableHeader label="Last Maintenance" sortKey="lastMaintenanceAt" activeKey={sortKey} direction={sortDirection} onSort={sortBy} />
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((court) => (
                <tr key={court.id}>
                  <td>
                    <button className="court-entity" type="button" onClick={() => setSelected(court)}>
                      <CourtPhoto court={court} />
                      <span><strong>{court.name}</strong><small>ID: {court.code}</small></span>
                    </button>
                  </td>
                  <td>
                    <button className="org-entity court-org" type="button" onClick={() => setOrganization(court.orgId)}>
                      <OrganizationAvatar court={court} />
                      <span><strong>{court.orgName}</strong><small>{court.orgLocation}</small></span>
                    </button>
                  </td>
                  <td><span className={`court-type type-${court.type}`}>{typeLabel(court.type)}</span></td>
                  <td><span className={`court-status status-${court.status}`}><i />{statusLabel(court.status)}</span></td>
                  <td>{court.surface}</td>
                  <td><span className="court-capacity"><Users /> {court.capacity}</span></td>
                  <td><AmenityIcons amenities={court.amenities} /></td>
                  <td>
                    {court.lastMaintenanceAt ? (
                      <span>{format(new Date(court.lastMaintenanceAt), "MMM d, yyyy")}<small>{formatDistanceToNowStrict(new Date(court.lastMaintenanceAt), { addSuffix: true })}</small></span>
                    ) : (
                      <span>-<small>Never</small></span>
                    )}
                  </td>
                  <td>
                    <div className="org-actions">
                      <button type="button" onClick={() => setEditing(court)} aria-label={`Edit ${court.name}`}><Edit3 /></button>
                      <details>
                        <summary aria-label={`Actions for ${court.name}`}><MoreVertical /></summary>
                        <div>
                          <button type="button" onClick={() => setSelected(court)}>View details</button>
                          <button type="button" disabled={pending} onClick={() => changeStatus(court, "active")}>Mark active</button>
                          <button type="button" disabled={pending} onClick={() => changeStatus(court, "maintenance")}>Mark maintenance</button>
                          <button type="button" disabled={pending} onClick={() => changeStatus(court, "disabled")}>Disable court</button>
                        </div>
                      </details>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pageRows.length === 0 && <div className="org-empty"><Search /><strong>No courts found</strong><small>Adjust the filters and try again.</small></div>}
        </div>
        <footer className="organizations-pagination">
          <p>
            Showing {filtered.length === 0 ? 0 : safePage * PAGE_SIZE + 1} to {Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} of {hasFilters ? filtered.length : data.totalAvailable} courts
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

      {selected && <CourtDetails court={selected} onClose={() => setSelected(null)} />}
      {editing && <CourtForm title="Edit Court" court={editing} data={data} pending={pending} onClose={() => setEditing(null)} onSubmit={editCourt} />}
      {showCreate && <CourtForm title="Add Court" data={data} pending={pending} onClose={() => setShowCreate(false)} onSubmit={createCourt} />}
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

function CourtPhoto({ court }: { court: AdminCourtRow }) {
  if (court.photoUrl) {
    // Tenant court images may be hosted outside Next's image domains.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={court.photoUrl} alt="" />;
  }
  return <span><Map /></span>;
}

function OrganizationAvatar({ court }: { court: AdminCourtRow }) {
  if (court.orgLogoUrl) {
    // Tenant logos may be hosted externally.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={court.orgLogoUrl} alt="" />;
  }
  return <span>{court.orgName.split(/\s+/).slice(0, 2).map((word) => word[0]).join("")}</span>;
}

function AmenityIcons({ amenities }: { amenities: AdminCourtRow["amenities"] }) {
  const icons = { lights: Lightbulb, seating: Armchair, parking: Car };
  return (
    <span className="court-amenities">
      {amenities.map((amenity) => {
        const Icon = icons[amenity];
        return <i key={amenity} title={amenity}><Icon /></i>;
      })}
    </span>
  );
}

function CourtDetails({ court, onClose }: { court: AdminCourtRow; onClose: () => void }) {
  return (
    <div className="org-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="org-modal org-detail-modal" role="dialog" aria-modal="true" aria-labelledby="court-detail-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="org-modal-close" type="button" onClick={onClose} aria-label="Close details"><X /></button>
        <div className="org-detail-heading">
          <CourtPhoto court={court} />
          <div><h2 id="court-detail-title">{court.name}</h2><p>{court.orgName} - {court.orgLocation}</p></div>
        </div>
        <div className="org-detail-grid">
          <div><small>Status</small><strong>{statusLabel(court.status)}</strong></div>
          <div><small>Type</small><strong>{typeLabel(court.type)}</strong></div>
          <div><small>Surface</small><strong>{court.surface}</strong></div>
          <div><small>Capacity</small><strong>{court.capacity}</strong></div>
          <div><small>Utilization</small><strong>{court.utilization}%</strong></div>
          <div><small>Last Maintenance</small><strong>{court.lastMaintenanceAt ? format(new Date(court.lastMaintenanceAt), "MMM d, yyyy") : "Never"}</strong></div>
        </div>
        <div className="org-modal-actions">
          <Link href={`/admin/organizations?org=${court.orgId}`}><Eye /> Organization</Link>
          <Link href={`/p/${court.orgSlug}`} target="_blank"><Map /> Public Page</Link>
        </div>
      </section>
    </div>
  );
}

function CourtForm({
  title,
  court,
  data,
  pending,
  onClose,
  onSubmit,
}: {
  title: string;
  court?: AdminCourtRow;
  data: AdminCourtListData;
  pending: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [orgId, setOrgId] = useState(court?.orgId || data.organizations[0]?.id || "");
  const availableLocations = data.locations.filter((location) => location.orgId === orgId);
  const locationDefault = court?.locationId || availableLocations[0]?.id || "";
  return (
    <div className="org-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="org-modal org-create-modal" onSubmit={onSubmit} onMouseDown={(event) => event.stopPropagation()}>
        <button className="org-modal-close" type="button" onClick={onClose} aria-label="Close form"><X /></button>
        <h2>{title}</h2>
        <p>{court ? "Update court setup and availability." : "Create a court resource for an organization."}</p>
        <label>Court name<input name="name" required minLength={2} defaultValue={court?.name || ""} placeholder="Court 1" /></label>
        {!court && (
          <label>Organization<select name="orgId" required value={orgId} onChange={(event) => setOrgId(event.target.value)}>
            {data.organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
          </select></label>
        )}
        <label>Location<select name="locationId" required defaultValue={locationDefault}>
          {availableLocations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
        </select></label>
        <div className="org-create-fields">
          <label>Court type<select name="type" defaultValue={court?.type === "indoor" ? "Indoor - Pro Surface" : "Outdoor - Acrylic"}>
            <option value="Outdoor - Acrylic">Outdoor - Acrylic</option>
            <option value="Indoor - Pro Surface">Indoor - Pro Surface</option>
            <option value="Indoor - Wood">Indoor - Wood</option>
            <option value="Outdoor - Hard Court">Outdoor - Hard Court</option>
          </select></label>
          <label>Status<select name="status" defaultValue={court?.status || "active"}>
            <option value="active">Active</option>
            <option value="maintenance">Under Maintenance</option>
            <option value="disabled">Disabled</option>
          </select></label>
        </div>
        <div className="org-create-fields">
          <label>Capacity<input name="capacity" type="number" min={1} max={24} defaultValue={court?.capacity || 4} /></label>
          <label>Photo URL<input name="photoUrl" type="url" defaultValue={court?.photoUrl || ""} placeholder="https://example.com/court.jpg" /></label>
        </div>
        <button className="org-create-submit" type="submit" disabled={pending || (!court && availableLocations.length === 0)}>{pending ? "Saving..." : title}</button>
      </form>
    </div>
  );
}
