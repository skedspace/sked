"use client";

import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Bell,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  UserCog,
  UserRound,
  UserX,
  Users,
  X,
} from "lucide-react";
import { format, formatDistanceToNowStrict } from "date-fns";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState, useTransition } from "react";
import {
  createAdminUserAction,
  updateAdminUserRoleAction,
  updateAdminUserStatusAction,
} from "./actions";

export type AdminUserRole = "super_admin" | "admin" | "manager" | "staff" | "viewer";
export type AdminUserStatus = "active" | "inactive";

export type AdminUserRow = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: AdminUserRole;
  status: AdminUserStatus;
  orgId: string;
  orgName: string;
  orgLocation: string;
  orgLogoUrl: string | null;
  lastActiveAt: string | null;
  joinedAt: string;
};

export type AdminUserListData = {
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
  users: AdminUserRow[];
  superAdminUserId: string | null;
  roleAccess: Array<{
    role: AdminUserRole;
    label: string;
    scope: string;
    powers: string;
  }>;
  organizations: Array<{ id: string; name: string; location: string }>;
  notifications: Array<{ id: string; title: string; detail: string; at: string }>;
  demo: boolean;
};

type SortKey = "name" | "role" | "orgName" | "status" | "lastActiveAt" | "joinedAt";
type SortDirection = "asc" | "desc";

const PAGE_SIZE = 8;

function dateLabel(from: string, to: string) {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
}

function roleLabel(role: AdminUserRole) {
  const labels: Record<AdminUserRole, string> = {
    super_admin: "Super Admin",
    admin: "Admin",
    manager: "Manager",
    staff: "Staff",
    viewer: "Viewer",
  };
  return labels[role];
}

function statusLabel(status: AdminUserStatus) {
  return status === "active" ? "Active" : "Inactive";
}

function lastActiveLabel(value: string | null) {
  if (!value) return "Never";
  return formatDistanceToNowStrict(new Date(value), { addSuffix: true }).replace(" ago", " ago");
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

function MetricIcon({ tone }: { tone: AdminUserListData["metrics"][number]["tone"] }) {
  const icons = {
    cyan: Users,
    green: ShieldCheck,
    purple: Shield,
    orange: UserCog,
    red: UserX,
  };
  const Icon = icons[tone];
  return <Icon />;
}

export function AdminUserList({ data }: { data: AdminUserListData }) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [organization, setOrganization] = useState(params.get("org") || "all");
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("joinedAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [rangeFrom, setRangeFrom] = useState(data.range.from);
  const [rangeTo, setRangeTo] = useState(data.range.to);
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<AdminUserRow | null>(null);
  const [editing, setEditing] = useState<AdminUserRow | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [demoUsers, setDemoUsers] = useState(data.users);
  const users = data.demo ? demoUsers : data.users;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users
      .filter((user) => {
        return (
          (!query ||
            user.name.toLowerCase().includes(query) ||
            user.email.toLowerCase().includes(query) ||
            user.orgName.toLowerCase().includes(query)) &&
          (role === "all" || user.role === role) &&
          (status === "all" || user.status === status) &&
          (organization === "all" || user.orgId === organization)
        );
      })
      .sort((left, right) => {
        const a = left[sortKey];
        const b = right[sortKey];
        const comparison = String(a ?? "").localeCompare(String(b ?? ""));
        return sortDirection === "asc" ? comparison : -comparison;
      });
  }, [organization, role, search, sortDirection, sortKey, status, users]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const hasFilters = Boolean(search || role !== "all" || status !== "all" || organization !== "all");

  function setFilter(callback: () => void) {
    callback();
    setPage(0);
  }

  function clearFilters() {
    setSearch("");
    setRole("all");
    setStatus("all");
    setOrganization("all");
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
    router.push(`/admin/users?${new URLSearchParams({ from, to })}`);
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await createAdminUserAction({
        name: String(form.get("name") || ""),
        email: String(form.get("email") || ""),
        role: String(form.get("role") || "staff") as AdminUserRole,
        orgId: String(form.get("orgId") || ""),
      });
      if (!result.ok) {
        setMessage(result.error || "Unable to add user.");
        return;
      }
      setMessage(result.inviteSent ? "User added and invite sent." : "User added.");
      setShowCreate(false);
      router.refresh();
    });
  }

  async function updateRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const form = new FormData(event.currentTarget);
    const nextRole = String(form.get("role") || editing.role) as AdminUserRole;
    const nextStatus = String(form.get("status") || editing.status) as AdminUserStatus;
    if (data.demo) {
      setDemoUsers((current) =>
        current.map((user) =>
          user.id === editing.id ? { ...user, role: nextRole, status: nextStatus } : user,
        ),
      );
      setMessage(`${editing.name} updated in demo mode.`);
      setEditing(null);
      return;
    }
    startTransition(async () => {
      const roleResult = await updateAdminUserRoleAction(editing.id, nextRole, editing.orgId);
      const statusResult = await updateAdminUserStatusAction(editing.id, nextStatus);
      const error = roleResult.error || statusResult.error;
      setMessage(error || `${editing.name} updated.`);
      if (!error) {
        setEditing(null);
        router.refresh();
      }
    });
  }

  function changeStatus(user: AdminUserRow, nextStatus: AdminUserStatus) {
    if (data.demo) {
      setDemoUsers((current) =>
        current.map((row) => (row.id === user.id ? { ...row, status: nextStatus } : row)),
      );
      setMessage(`${user.name} ${nextStatus === "active" ? "activated" : "deactivated"} in demo mode.`);
      return;
    }
    startTransition(async () => {
      const result = await updateAdminUserStatusAction(user.id, nextStatus);
      setMessage(result.ok ? `${user.name} updated.` : result.error || "Update failed.");
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="command-center organizations-page users-page">
      <header className="command-header organizations-header">
        <div>
          <h1>Users</h1>
          <p>Manage platform users, their roles, and access across organizations.</p>
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
          <Link className="admin-action-button" href={`/admin/users/export?from=${data.range.from}&to=${data.range.to}`}>
            <Download /> <span>Export</span>
          </Link>
          <details className="admin-popover notification-popover">
            <summary className="notification-button" aria-label="Open user notifications">
              <Bell />
              {data.notifications.length > 0 && <span>{data.notifications.length}</span>}
            </summary>
            <div className="admin-popover-panel notification-panel">
              <div className="notification-heading">
                <div><strong>User Activity</strong><small>Important access events</small></div>
                <button type="button" onClick={() => router.refresh()} title="Refresh notifications"><RefreshCw /></button>
              </div>
              <div className="org-notification-list">
                {data.notifications.map((notification) => (
                  <div key={notification.id}>
                    <span><UserRound /></span>
                    <div><strong>{notification.title}</strong><small>{notification.detail}</small></div>
                    <time>{formatDistanceToNowStrict(new Date(notification.at), { addSuffix: true })}</time>
                  </div>
                ))}
                {data.notifications.length === 0 && <p>No user notifications yet.</p>}
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

      <section className="organizations-metrics" aria-label="User metrics">
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

      <section className="organizations-filter-panel users-filter-panel">
        <label className="org-search">
          <Search />
          <input
            aria-label="Search users"
            placeholder="Search users..."
            value={search}
            onChange={(event) => setFilter(() => setSearch(event.target.value))}
          />
        </label>
        <label className="org-select"><span>Role</span>
          <select value={role} onChange={(event) => setFilter(() => setRole(event.target.value))}>
            <option value="all">All Roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="staff">Staff</option>
            <option value="viewer">Viewer</option>
          </select><ChevronDown />
        </label>
        <label className="org-select"><span>Status</span>
          <select value={status} onChange={(event) => setFilter(() => setStatus(event.target.value))}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select><ChevronDown />
        </label>
        <label className="org-select"><span>Organization</span>
          <select value={organization} onChange={(event) => setFilter(() => setOrganization(event.target.value))}>
            <option value="all">All Organizations</option>
            {data.organizations.map((org) => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select><ChevronDown />
        </label>
        <button className="org-clear-button" type="button" onClick={clearFilters} disabled={!hasFilters}>Clear filters</button>
        <button className="org-add-button" type="button" onClick={() => { setMessage(""); setShowCreate(true); }}>
          <Plus /> Add User
        </button>
      </section>

      <section className="organizations-table-panel users-table-panel">
        <div className="organizations-table-scroll">
          <table>
            <thead>
              <tr>
                <SortableHeader label="User" sortKey="name" activeKey={sortKey} direction={sortDirection} onSort={sortBy} />
                <SortableHeader label="Role" sortKey="role" activeKey={sortKey} direction={sortDirection} onSort={sortBy} />
                <SortableHeader label="Organization" sortKey="orgName" activeKey={sortKey} direction={sortDirection} onSort={sortBy} />
                <SortableHeader label="Status" sortKey="status" activeKey={sortKey} direction={sortDirection} onSort={sortBy} />
                <SortableHeader label="Last Active" sortKey="lastActiveAt" activeKey={sortKey} direction={sortDirection} onSort={sortBy} />
                <SortableHeader label="Joined" sortKey="joinedAt" activeKey={sortKey} direction={sortDirection} onSort={sortBy} />
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((user) => (
                <tr key={user.id}>
                  <td>
                    <button className="org-entity user-entity" type="button" onClick={() => setSelected(user)}>
                      <UserAvatar user={user} />
                      <span><strong>{user.name}</strong><small>{user.email}</small></span>
                    </button>
                  </td>
                  <td><span className={`user-role role-${user.role}`}>{roleLabel(user.role)}</span></td>
                  <td>
                    <button className="org-entity user-org-entity" type="button" onClick={() => setOrganization(user.orgId)}>
                      <OrganizationAvatar user={user} />
                      <span><strong>{user.orgName}</strong><small>{user.orgLocation}</small></span>
                    </button>
                  </td>
                  <td><span className={`org-status status-${user.status}`}><i />{statusLabel(user.status)}</span></td>
                  <td><span className={`user-last-active ${user.status === "inactive" ? "is-stale" : ""}`}><i />{lastActiveLabel(user.lastActiveAt)}</span></td>
                  <td>{format(new Date(user.joinedAt), "MMM d, yyyy")}</td>
                  <td>
                    <div className="org-actions">
                      <button type="button" onClick={() => setEditing(user)} aria-label={`Edit ${user.name}`}><Edit3 /></button>
                      <details>
                        <summary aria-label={`Actions for ${user.name}`}><MoreVertical /></summary>
                        <div>
                          <button type="button" onClick={() => setSelected(user)}>View profile</button>
                          <button type="button" onClick={() => setEditing(user)}>Edit access</button>
                          <Link href={`/admin/organizations?org=${user.orgId}`}>View organization</Link>
                          <button type="button" disabled={pending || user.status === "active"} onClick={() => changeStatus(user, "active")}>Activate</button>
                          <button type="button" disabled={pending || user.status === "inactive"} onClick={() => changeStatus(user, "inactive")}>Deactivate</button>
                        </div>
                      </details>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pageRows.length === 0 && <div className="org-empty"><Search /><strong>No users found</strong><small>Adjust the filters and try again.</small></div>}
        </div>
        <footer className="organizations-pagination">
          <p>
            Showing {filtered.length === 0 ? 0 : safePage * PAGE_SIZE + 1} to {Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} of {hasFilters ? filtered.length : data.totalAvailable} users
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

      {selected && <UserDetails user={selected} onClose={() => setSelected(null)} />}
      {editing && (
        <EditUser
          user={editing}
          pending={pending}
          superAdminUserId={data.superAdminUserId}
          roleAccess={data.roleAccess}
          onClose={() => setEditing(null)}
          onSubmit={updateRole}
        />
      )}
      {showCreate && (
        <CreateUser
          organizations={data.organizations}
          pending={pending}
          roleAccess={data.roleAccess}
          superAdminUserId={data.superAdminUserId}
          onClose={() => setShowCreate(false)}
          onSubmit={createUser}
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

function UserAvatar({ user }: { user: AdminUserRow }) {
  if (user.avatarUrl) {
    // External avatar domains are controlled by tenant auth providers.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={user.avatarUrl} alt="" />;
  }
  return <span>{user.name.split(/\s+/).slice(0, 2).map((word) => word[0]).join("")}</span>;
}

function OrganizationAvatar({ user }: { user: AdminUserRow }) {
  if (user.orgLogoUrl) {
    // Tenant logos can be hosted outside Next's configured image domains.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={user.orgLogoUrl} alt="" />;
  }
  return <span>{user.orgName.split(/\s+/).slice(0, 2).map((word) => word[0]).join("")}</span>;
}

function UserDetails({ user, onClose }: { user: AdminUserRow; onClose: () => void }) {
  return (
    <div className="org-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="org-modal org-detail-modal" role="dialog" aria-modal="true" aria-labelledby="user-detail-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="org-modal-close" type="button" onClick={onClose} aria-label="Close details"><X /></button>
        <div className="org-detail-heading">
          <UserAvatar user={user} />
          <div><h2 id="user-detail-title">{user.name}</h2><p>{user.email}</p></div>
        </div>
        <div className="org-detail-grid">
          <div><small>Role</small><strong>{roleLabel(user.role)}</strong></div>
          <div><small>Status</small><strong>{statusLabel(user.status)}</strong></div>
          <div><small>Organization</small><strong>{user.orgName}</strong></div>
          <div><small>Location</small><strong>{user.orgLocation}</strong></div>
          <div><small>Last Active</small><strong>{lastActiveLabel(user.lastActiveAt)}</strong></div>
          <div><small>Joined</small><strong>{format(new Date(user.joinedAt), "MMM d, yyyy")}</strong></div>
        </div>
        <div className="org-modal-actions">
          <Link href={`/admin/organizations?org=${user.orgId}`}><Building2 /> Organization</Link>
          <a href={`mailto:${user.email}`}><UserRound /> Email User</a>
        </div>
      </section>
    </div>
  );
}

function EditUser({
  user,
  pending,
  superAdminUserId,
  roleAccess,
  onClose,
  onSubmit,
}: {
  user: AdminUserRow;
  pending: boolean;
  superAdminUserId: string | null;
  roleAccess: AdminUserListData["roleAccess"];
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const lockSuperAdmin = user.role === "super_admin";
  return (
    <div className="org-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="org-modal org-create-modal" onSubmit={onSubmit} onMouseDown={(event) => event.stopPropagation()}>
        <button className="org-modal-close" type="button" onClick={onClose} aria-label="Close form"><X /></button>
        <h2>Edit User Access</h2>
        <p>{user.name} - {user.orgName}</p>
        {lockSuperAdmin && (
          <p className="admin-access-warning">
            This is the only Super Admin. The role and active status are protected.
          </p>
        )}
        <label>Role<select name="role" defaultValue={user.role} disabled={lockSuperAdmin}><RoleOptions superAdminUserId={superAdminUserId} userId={user.id} /></select></label>
        {lockSuperAdmin && <input type="hidden" name="role" value="super_admin" />}
        <label>Status<select name="status" defaultValue={user.status} disabled={lockSuperAdmin}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
        {lockSuperAdmin && <input type="hidden" name="status" value="active" />}
        <RoleAccessSummary roleAccess={roleAccess} />
        <button className="org-create-submit" type="submit" disabled={pending}>{pending ? "Saving..." : "Save Changes"}</button>
      </form>
    </div>
  );
}

function CreateUser({
  organizations,
  pending,
  roleAccess,
  superAdminUserId,
  onClose,
  onSubmit,
}: {
  organizations: AdminUserListData["organizations"];
  pending: boolean;
  roleAccess: AdminUserListData["roleAccess"];
  superAdminUserId: string | null;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="org-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="org-modal org-create-modal" onSubmit={onSubmit} onMouseDown={(event) => event.stopPropagation()}>
        <button className="org-modal-close" type="button" onClick={onClose} aria-label="Close form"><X /></button>
        <h2>Add User</h2>
        <p>Create a platform user and attach them to an organization.</p>
        <label>Full name<input name="name" required minLength={2} placeholder="Maria Santos" /></label>
        <label>Email<input name="email" type="email" required placeholder="maria@example.com" /></label>
        <label>Role<select name="role" defaultValue="staff"><RoleOptions superAdminUserId={superAdminUserId} /></select></label>
        <label>Organization<select name="orgId" required defaultValue={organizations[0]?.id || ""}>
          {organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
        </select></label>
        <RoleAccessSummary roleAccess={roleAccess} />
        <button className="org-create-submit" type="submit" disabled={pending || organizations.length === 0}>{pending ? "Adding..." : "Add User"}</button>
      </form>
    </div>
  );
}

function RoleOptions({
  superAdminUserId,
  userId,
}: {
  superAdminUserId: string | null;
  userId?: string;
}) {
  const superAdminTaken = Boolean(superAdminUserId && superAdminUserId !== userId);
  return (
    <>
      <option value="super_admin" disabled={superAdminTaken}>Super Admin</option>
      <option value="admin">Admin</option>
      <option value="manager">Manager</option>
      <option value="staff">Staff</option>
      <option value="viewer">Viewer</option>
    </>
  );
}

function RoleAccessSummary({
  roleAccess,
}: {
  roleAccess: AdminUserListData["roleAccess"];
}) {
  return (
    <div className="admin-role-access">
      <strong>Role and access</strong>
      {roleAccess.map((item) => (
        <div key={item.role}>
          <span>{item.label}</span>
          <small>{item.scope}</small>
          <p>{item.powers}</p>
        </div>
      ))}
    </div>
  );
}
