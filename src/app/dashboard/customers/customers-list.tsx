"use client";

import { addDays, format, isAfter, subDays } from "date-fns";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Crown,
  Filter,
  ListFilter,
  MoreHorizontal,
  Plus,
  Search,
  UserCheck,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { cn, formatCurrency } from "@/lib/utils";

type Payment = {
  id: string;
  amount_cents: number;
  status: string;
};

type Booking = {
  id: string;
  time_range: string;
  status: string;
  price_cents: number;
  created_at: string;
  resources: { id?: string; name: string } | null;
  services: { id?: string; name: string } | null;
  payments?: Payment[];
};

type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  no_show_count: number;
  created_at: string;
  bookings?: Booking[];
};

type CustomerMetric = {
  customer: Customer;
  bookings: Booking[];
  totalBookings: number;
  totalSpent: number;
  lastBooking: Booking | null;
  lastBookingStart: Date | null;
  status: "active" | "inactive";
  membership: "Premium" | "Standard" | "Basic";
  isVip: boolean;
};

type FormState = {
  id: string | null;
  name: string;
  email: string;
  phone: string;
  notes: string;
  noShowCount: string;
};

const CUSTOMER_TABS = [
  ["all", "All Customers"],
  ["active", "Active"],
  ["inactive", "Inactive"],
  ["vip", "VIP"],
] as const;

function dateParam(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function customerCode(id: string) {
  return `#CUST-${
    id
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 5)
      .toUpperCase() || "00000"
  }`;
}

function initials(name?: string | null) {
  return (name ?? "Guest")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function normalizeRangeDate(raw: string) {
  const trimmed = raw.trim().replace(" ", "T");
  const withOffset = /[+-]\d{2}$/.test(trimmed) ? `${trimmed}:00` : trimmed;
  return new Date(
    /[zZ]|[+-]\d{2}:\d{2}$/.test(withOffset) ? withOffset : `${withOffset}Z`,
  );
}

function parseRange(range: string) {
  const match = range?.match(/\[([^,]+),([^\])]+)/);
  if (!match?.[1] || !match?.[2]) return null;
  const start = normalizeRangeDate(match[1]);
  const end = normalizeRangeDate(match[2]);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return { start, end };
}

function customerSpend(bookings: Booking[]) {
  return bookings.reduce((sum, booking) => {
    const paid =
      booking.payments?.filter((payment) => payment.status === "succeeded") ??
      [];
    if (paid.length > 0) {
      return (
        sum +
        paid.reduce(
          (paymentSum, payment) => paymentSum + payment.amount_cents,
          0,
        )
      );
    }
    return booking.status === "completed" ? sum + booking.price_cents : sum;
  }, 0);
}

function metricFor(customer: Customer): CustomerMetric {
  const bookings = customer.bookings ?? [];
  const sortedBookings = bookings.slice().sort((a, b) => {
    const aRange = parseRange(a.time_range);
    const bRange = parseRange(b.time_range);
    return (bRange?.start.getTime() ?? 0) - (aRange?.start.getTime() ?? 0);
  });
  const lastBooking = sortedBookings[0] ?? null;
  const lastBookingStart = lastBooking
    ? (parseRange(lastBooking.time_range)?.start ?? null)
    : null;
  const totalSpent = customerSpend(bookings);
  const totalBookings = bookings.length;
  const status =
    lastBookingStart && isAfter(lastBookingStart, subDays(new Date(), 90))
      ? "active"
      : "inactive";
  const membership =
    totalSpent >= 30000 || totalBookings >= 10
      ? "Premium"
      : totalSpent >= 10000 || totalBookings >= 4
        ? "Standard"
        : "Basic";
  const isVip = totalSpent >= 30000 || totalBookings >= 12;

  return {
    customer,
    bookings,
    totalBookings,
    totalSpent,
    lastBooking,
    lastBookingStart,
    status,
    membership,
    isVip,
  };
}

function formDefaults(customer: Customer | null): FormState {
  return {
    id: customer?.id ?? null,
    name: customer?.name ?? "",
    email: customer?.email ?? "",
    phone: customer?.phone ?? "",
    notes: customer?.notes ?? "",
    noShowCount: String(customer?.no_show_count ?? 0),
  };
}

export function CustomersList({
  orgId,
  customers,
  totalCount,
  selectedDate,
  weekStart,
  weekEnd,
}: {
  orgId: string;
  customers: Customer[];
  totalCount: number;
  selectedDate: string;
  weekStart: string;
  weekEnd: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const db = supabase as any;
  const selectedDateValue = new Date(selectedDate);
  const weekStartValue = new Date(weekStart);
  const weekEndValue = new Date(weekEnd);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("all");
  const [membershipFilter, setMembershipFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formState, setFormState] = useState<FormState>(() =>
    formDefaults(null),
  );

  const metrics = useMemo(() => customers.map(metricFor), [customers]);
  const activeCount = metrics.filter((item) => item.status === "active").length;
  const vipCount = metrics.filter((item) => item.isVip).length;
  const newCount = customers.filter((customer) =>
    isAfter(new Date(customer.created_at), subDays(new Date(), 30)),
  ).length;
  const topCustomers = metrics
    .slice()
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 5);
  const recentSignups = customers
    .slice()
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, 5);

  const filtered = metrics.filter((item) => {
    const customer = item.customer;
    const haystack =
      `${customer.name} ${customer.email ?? ""} ${customer.phone ?? ""}`.toLowerCase();
    const matchesQuery = !query || haystack.includes(query.toLowerCase());
    const matchesTab =
      tab === "all" || (tab === "vip" ? item.isVip : item.status === tab);
    const matchesMembership =
      membershipFilter === "all" ||
      item.membership.toLowerCase() === membershipFilter;
    const matchesStatus =
      statusFilter === "all" ||
      item.status === statusFilter ||
      (statusFilter === "vip" && item.isVip);
    return matchesQuery && matchesTab && matchesMembership && matchesStatus;
  });
  const perPage = 8;
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * perPage, safePage * perPage);

  function navigateTo(date: Date) {
    router.push(`/dashboard/customers?date=${dateParam(date)}`);
  }

  function handleViewAll() {
    setTab("all");
    setMembershipFilter("all");
    setStatusFilter("all");
    setQuery("");
    setPage(1);
  }

  function openAddDialog() {
    setFormError(null);
    setFormState(formDefaults(null));
    setDialogOpen(true);
  }

  function openEditDialog(customer: Customer) {
    setFormError(null);
    setSelectedCustomer(customer);
    setFormState(formDefaults(customer));
    setDialogOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSaving(true);
    const payload = {
      org_id: orgId,
      name: formState.name.trim(),
      email: formState.email.trim() || null,
      phone: formState.phone.trim() || null,
      notes: formState.notes.trim() || null,
      no_show_count: Math.max(
        0,
        Number.parseInt(formState.noShowCount, 10) || 0,
      ),
    };

    const { error } = formState.id
      ? await db.from("customers").update(payload).eq("id", formState.id)
      : await db.from("customers").insert(payload);

    setSaving(false);
    if (error) {
      setFormError(error.message);
      return;
    }

    setDialogOpen(false);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-[28px] font-black tracking-[-0.04em] text-[#11140f]">
            Customers
          </h1>
          <p className="mt-1 text-sm text-[#646861]">
            Manage your customers and their activity.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="inline-flex h-11 w-fit items-center gap-2 rounded-xl border border-black/[0.09] bg-white px-4 text-sm font-semibold text-[#171a16] shadow-sm"
            onClick={() => navigateTo(new Date())}
          >
            <span className="inline-flex items-center gap-3">
              <CalendarDays className="h-4 w-4" />
              {format(weekStartValue, "MMM d")} -{" "}
              {format(addDays(weekEndValue, -1), "MMM d, yyyy")}
            </span>
          </button>
          <Button variant="outline" onClick={() => setShowFilters((v) => !v)}>
            <Filter />
            Filters
          </Button>
          <Button
            className="bg-[#050604] px-5 text-white hover:bg-[#171a16]"
            onClick={openAddDialog}
          >
            <Plus />
            Add customer
          </Button>
        </div>
      </header>

      <section className="grid gap-3 xl:grid-cols-4">
        <StatCard
          icon={<UsersRound />}
          label="Total Customers"
          value={String(totalCount)}
          detail="All customers"
          tone="green"
        />
        <StatCard
          icon={<UserCheck />}
          label="Active Customers"
          value={String(activeCount)}
          detail={`${totalCount ? Math.round((activeCount / totalCount) * 100) : 0}% of total`}
          tone="green"
        />
        <StatCard
          icon={<CalendarDays />}
          label="New Customers"
          value={String(newCount)}
          detail="Last 30 days"
          tone="amber"
        />
        <StatCard
          icon={<Crown />}
          label="VIP Customers"
          value={String(vipCount)}
          detail={`${totalCount ? Math.round((vipCount / totalCount) * 100) : 0}% of total`}
          tone="purple"
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
        <section className="overflow-hidden rounded-2xl border border-black/[0.07] bg-white shadow-[0_10px_28px_rgba(23,26,22,0.05)]">
          <div className="border-b border-black/[0.07] px-6 pt-5">
            <div className="flex gap-8">
              {CUSTOMER_TABS.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => { setTab(value); setPage(1); }}
                  className={cn(
                    "border-b-2 px-0 py-4 text-sm font-semibold transition-colors",
                    tab === value
                      ? "border-[#62c51c] text-[#171a16]"
                      : "border-transparent text-[#5f655d]",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 p-6 lg:flex-row lg:items-center">
            <label className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[#6c7168]" />
              <Input
                value={query}
                onChange={(event) => { setQuery(event.target.value); setPage(1); }}
                placeholder="Search by name, email or phone..."
                className="pl-11"
              />
            </label>
            <SelectField
              value={membershipFilter}
              onChange={(value) => { setMembershipFilter(value); setPage(1); }}
              options={[
                { value: "all", label: "All membership plans" },
                { value: "premium", label: "Premium" },
                { value: "standard", label: "Standard" },
                { value: "basic", label: "Basic" },
              ]}
            />
            <SelectField
              value={statusFilter}
              onChange={(value) => { setStatusFilter(value); setPage(1); }}
              options={[
                { value: "all", label: "All status" },
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
                { value: "vip", label: "VIP" },
              ]}
            />
            <Button
              variant="outline"
              size="icon"
              aria-label="View options"
              onClick={() => {
                setMembershipFilter("all");
                setStatusFilter("all");
                setQuery("");
                setPage(1);
              }}
            >
              <ListFilter />
            </Button>
          </div>

          <CustomersTable
            customers={paged}
            selectedIds={selectedIds}
            onToggle={(id) =>
              setSelectedIds((ids) =>
                ids.includes(id)
                  ? ids.filter((item) => item !== id)
                  : [...ids, id],
              )
            }
            onSelect={setSelectedCustomer}
            onEdit={openEditDialog}
          />
          <div className="flex flex-col gap-3 px-6 py-5 text-sm text-[#626860] sm:flex-row sm:items-center sm:justify-between">
            <span>
              Showing {filtered.length === 0 ? 0 : (safePage - 1) * perPage + 1} to{" "}
              {Math.min(safePage * perPage, filtered.length)} of{" "}
              {filtered.length} customers
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                disabled={safePage <= 1}
                onClick={() => setPage(safePage - 1)}
              >
                <ChevronLeft />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Button
                  key={p}
                  size="icon"
                  variant={p === safePage ? "default" : "outline"}
                  className={
                    p === safePage ? "bg-[#11130f] text-white" : undefined
                  }
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              ))}
              <Button
                variant="outline"
                size="icon"
                disabled={safePage >= totalPages}
                onClick={() => setPage(safePage + 1)}
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <OverviewCard
            total={totalCount}
            active={activeCount}
            inactive={totalCount - activeCount}
            vip={vipCount}
          />
          <TopCustomers items={topCustomers} onSelect={setSelectedCustomer} onViewAll={handleViewAll} />
          <RecentSignups
            customers={recentSignups}
            onSelect={setSelectedCustomer}
            onViewAll={handleViewAll}
          />
        </aside>
      </div>

      <Dialog
        open={Boolean(selectedCustomer)}
        onOpenChange={() => setSelectedCustomer(null)}
      >
        <DialogContent className="border-0 bg-white sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle>Customer details</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <CustomerDetails
              metric={metricFor(selectedCustomer)}
              onEdit={() => openEditDialog(selectedCustomer)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl border-0 bg-white sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {formState.id ? "Edit customer" : "Add customer"}
            </DialogTitle>
          </DialogHeader>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="customer-name">Customer name</Label>
              <Input
                id="customer-name"
                value={formState.name}
                onChange={(event) =>
                  setFormState((state) => ({
                    ...state,
                    name: event.target.value,
                  }))
                }
                placeholder="Alex Rivera"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-email">Email</Label>
              <Input
                id="customer-email"
                type="email"
                value={formState.email}
                onChange={(event) =>
                  setFormState((state) => ({
                    ...state,
                    email: event.target.value,
                  }))
                }
                placeholder="alex@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-phone">Phone</Label>
              <Input
                id="customer-phone"
                value={formState.phone}
                onChange={(event) =>
                  setFormState((state) => ({
                    ...state,
                    phone: event.target.value,
                  }))
                }
                placeholder="+1 555-123-4567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-noshow">No-shows</Label>
              <Input
                id="customer-noshow"
                type="number"
                min={0}
                value={formState.noShowCount}
                onChange={(event) =>
                  setFormState((state) => ({
                    ...state,
                    noShowCount: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="customer-notes">Notes</Label>
              <Input
                id="customer-notes"
                value={formState.notes}
                onChange={(event) =>
                  setFormState((state) => ({
                    ...state,
                    notes: event.target.value,
                  }))
                }
                placeholder="Preferred court, membership notes, etc."
              />
            </div>
            {formError && (
              <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">
                {formError}
              </p>
            )}
            <div className="flex justify-end gap-3 sm:col-span-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving
                  ? "Saving..."
                  : formState.id
                    ? "Save changes"
                    : "Add customer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CustomersTable({
  customers,
  selectedIds,
  onToggle,
  onSelect,
  onEdit,
}: {
  customers: CustomerMetric[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onSelect: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
}) {
  if (customers.length === 0) {
    return (
      <div className="border-y border-black/[0.07] px-6 py-14 text-center text-sm text-[#6b7068]">
        No customers match this view.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] border-collapse text-left">
        <thead>
          <tr className="border-y border-black/[0.07] bg-[#fbfaf7] text-[11px] font-black text-[#5f655d] uppercase">
            <th className="w-12 px-6 py-4">
              <span className="block h-4 w-4 rounded border border-black/15" />
            </th>
            <th className="px-2 py-4">Customer</th>
            <th className="px-2 py-4">Contact</th>
            <th className="px-2 py-4">Membership</th>
            <th className="px-2 py-4">Total bookings</th>
            <th className="px-2 py-4">Total spent</th>
            <th className="px-2 py-4">Last booking</th>
            <th className="px-2 py-4">Status</th>
            <th className="px-6 py-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((item) => (
            <tr
              key={item.customer.id}
              className="border-b border-black/[0.06] transition-colors hover:bg-[#fbfcf7]"
            >
              <td className="px-6 py-4">
                <input
                  aria-label={`Select ${item.customer.name}`}
                  type="checkbox"
                  className="h-4 w-4 rounded border-black/15 accent-[#b9f34b]"
                  checked={selectedIds.includes(item.customer.id)}
                  onChange={() => onToggle(item.customer.id)}
                />
              </td>
              <td className="px-2 py-4">
                <button
                  type="button"
                  onClick={() => onSelect(item.customer)}
                  className="flex items-center gap-3 text-left"
                >
                  <Avatar name={item.customer.name} />
                  <span>
                    <span className="block text-sm font-black">
                      {item.customer.name}
                    </span>
                    <span className="mt-1 block text-xs text-[#6b7068]">
                      {customerCode(item.customer.id)}
                    </span>
                  </span>
                </button>
              </td>
              <td className="px-2 py-4 text-sm">
                <p className="font-semibold">
                  {item.customer.email ?? "No email"}
                </p>
                <p className="mt-1 text-xs text-[#6b7068]">
                  {item.customer.phone ?? "No phone"}
                </p>
              </td>
              <td className="px-2 py-4">
                <MembershipPill value={item.membership} />
              </td>
              <td className="px-2 py-4 text-sm font-black">
                {item.totalBookings}
              </td>
              <td className="px-2 py-4 text-sm font-black">
                {formatCurrency(item.totalSpent)}
              </td>
              <td className="px-2 py-4 text-sm">
                {item.lastBookingStart ? (
                  <>
                    <p className="font-semibold">
                      {format(item.lastBookingStart, "MMM d, yyyy")}
                    </p>
                    <p className="mt-1 text-xs text-[#6b7068]">
                      {item.lastBooking?.resources?.name ?? "No court"} ·{" "}
                      {format(item.lastBookingStart, "h:mm a")}
                    </p>
                  </>
                ) : (
                  <span className="text-[#6b7068]">No bookings</span>
                )}
              </td>
              <td className="px-2 py-4">
                <StatusPill status={item.status} />
              </td>
              <td className="px-6 py-4 text-right">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={`Edit ${item.customer.name}`}
                  onClick={() => onEdit(item.customer)}
                >
                  <MoreHorizontal />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  tone: "green" | "amber" | "purple";
}) {
  return (
    <article className="flex min-h-32 items-center gap-5 rounded-2xl border border-black/[0.06] bg-white px-6 shadow-[0_10px_28px_rgba(23,26,22,0.05)]">
      <span
        className={cn(
          "grid h-14 w-14 shrink-0 place-items-center rounded-full [&_svg]:h-7 [&_svg]:w-7",
          tone === "green" && "bg-[#ebf7d7] text-[#326d1e]",
          tone === "amber" && "bg-[#fff1ce] text-[#e19a12]",
          tone === "purple" && "bg-[#efe5ff] text-[#7c45d8]",
        )}
      >
        {icon}
      </span>
      <span>
        <span className="block text-xs font-semibold text-[#1a1d18]">
          {label}
        </span>
        <span className="mt-2 block text-[28px] leading-none font-black tracking-[-0.04em] text-[#090a08]">
          {value}
        </span>
        <span className="mt-3 block text-xs font-semibold text-[#5f655d]">
          {detail}
        </span>
      </span>
    </article>
  );
}

function SelectField({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="relative inline-flex h-10 min-w-44 items-center rounded-xl border border-black/[0.08] bg-white text-sm font-semibold shadow-sm">
      <select
        className="h-full min-w-0 flex-1 appearance-none rounded-xl bg-transparent pr-9 pl-4 text-xs font-bold capitalize outline-none"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-[#626860]" />
    </label>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <span className="grid h-9 w-9 place-items-center rounded-full bg-[#1f241e] text-[10px] font-black text-white">
      {initials(name)}
    </span>
  );
}

function MembershipPill({ value }: { value: CustomerMetric["membership"] }) {
  const style =
    value === "Premium"
      ? "bg-[#eff9d7] text-[#32740f]"
      : value === "Standard"
        ? "bg-[#eaf3ff] text-[#1d59a8]"
        : "bg-[#f4f3ef] text-[#5f655d]";
  return (
    <span className={cn("rounded-lg px-3 py-1.5 text-xs font-black", style)}>
      {value}
    </span>
  );
}

function StatusPill({ status }: { status: CustomerMetric["status"] }) {
  return (
    <span
      className={cn(
        "rounded-lg px-3 py-1.5 text-xs font-black capitalize",
        status === "active"
          ? "bg-[#eff9d7] text-[#32740f]"
          : "bg-[#f4f3ef] text-[#5f655d]",
      )}
    >
      {status}
    </span>
  );
}

function OverviewCard({
  total,
  active,
  inactive,
  vip,
}: {
  total: number;
  active: number;
  inactive: number;
  vip: number;
}) {
  return (
    <section className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-[0_10px_28px_rgba(23,26,22,0.05)]">
      <h2 className="text-sm font-black">Customers overview</h2>
      <div className="mt-6 flex items-center gap-5">
        <div className="grid h-28 w-28 place-items-center rounded-full border-[18px] border-[#62c51c] bg-white shadow-inner">
          <span className="text-center">
            <span className="block text-2xl font-black">{total}</span>
            <span className="text-[10px] text-[#6b7068]">Total</span>
          </span>
        </div>
        <div className="flex-1 space-y-3 text-sm">
          <SummaryRow
            label="Active"
            count={active}
            total={total}
            color="bg-[#62c51c]"
          />
          <SummaryRow
            label="Inactive"
            count={inactive}
            total={total}
            color="bg-[#5b9fe8]"
          />
          <SummaryRow
            label="VIP"
            count={vip}
            total={total}
            color="bg-[#f0c21b]"
          />
        </div>
      </div>
    </section>
  );
}

function TopCustomers({
  items,
  onSelect,
  onViewAll,
}: {
  items: CustomerMetric[];
  onSelect: (customer: Customer) => void;
  onViewAll: () => void;
}) {
  return (
    <section className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-[0_10px_28px_rgba(23,26,22,0.05)]">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black">Top customers</h2>
        <button type="button" className="text-xs font-bold text-[#547b14]" onClick={onViewAll}>
          View all
        </button>
      </div>
      <div className="mt-5 space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-[#6b7068]">No customer spend yet.</p>
        ) : (
          items.map((item) => (
            <button
              key={item.customer.id}
              type="button"
              onClick={() => onSelect(item.customer)}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <span className="flex items-center gap-3">
                <Avatar name={item.customer.name} />
                <span>
                  <span className="block text-sm font-black">
                    {item.customer.name}
                  </span>
                  <span className="mt-1 block text-xs text-[#6b7068]">
                    {item.totalBookings} bookings
                  </span>
                </span>
              </span>
              <span className="text-sm font-black">
                {formatCurrency(item.totalSpent)}
              </span>
            </button>
          ))
        )}
      </div>
    </section>
  );
}

function RecentSignups({
  customers,
  onSelect,
  onViewAll,
}: {
  customers: Customer[];
  onSelect: (customer: Customer) => void;
  onViewAll: () => void;
}) {
  return (
    <section className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-[0_10px_28px_rgba(23,26,22,0.05)]">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black">Recent signups</h2>
        <button type="button" className="text-xs font-bold text-[#547b14]" onClick={onViewAll}>
          View all
        </button>
      </div>
      <div className="mt-5 space-y-4">
        {customers.length === 0 ? (
          <p className="text-sm text-[#6b7068]">No signups yet.</p>
        ) : (
          customers.map((customer) => (
            <button
              key={customer.id}
              type="button"
              onClick={() => onSelect(customer)}
              className="grid w-full grid-cols-[36px_1fr_auto] items-center gap-3 text-left"
            >
              <Avatar name={customer.name} />
              <span className="text-sm font-black">{customer.name}</span>
              <span className="text-xs text-[#6b7068]">
                {format(new Date(customer.created_at), "MMM d, h:mm a")}
              </span>
            </button>
          ))
        )}
      </div>
    </section>
  );
}

function SummaryRow({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2">
        <span className={cn("h-2 w-2 rounded-full", color)} />
        {label}
      </span>
      <span className="font-black">
        {count}{" "}
        <span className="font-semibold text-[#6b7068]">
          ({total ? Math.round((count / total) * 100) : 0}%)
        </span>
      </span>
    </div>
  );
}

function CustomerDetails({
  metric,
  onEdit,
}: {
  metric: CustomerMetric;
  onEdit: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 rounded-xl bg-[#f6f7f2] p-4">
        <Avatar name={metric.customer.name} />
        <span>
          <p className="text-lg font-black">{metric.customer.name}</p>
          <p className="mt-1 text-sm text-[#626860]">
            {customerCode(metric.customer.id)}
          </p>
        </span>
      </div>
      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <Detail label="Email" value={metric.customer.email ?? "No email"} />
        <Detail label="Phone" value={metric.customer.phone ?? "No phone"} />
        <Detail label="Membership" value={metric.membership} />
        <Detail label="Status" value={metric.status} />
        <Detail label="Total bookings" value={String(metric.totalBookings)} />
        <Detail label="Total spent" value={formatCurrency(metric.totalSpent)} />
      </div>
      {metric.customer.notes && (
        <div>
          <p className="text-xs font-bold text-[#777c73]">Notes</p>
          <p className="mt-1 text-sm text-[#171a16]">{metric.customer.notes}</p>
        </div>
      )}
      <div className="flex gap-2">
        <Button onClick={onEdit}>Edit customer</Button>
        <Button asChild variant="outline">
          <Link href={`/dashboard/customers/${metric.customer.id}`}>
            Open profile
          </Link>
        </Button>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold text-[#777c73]">{label}</p>
      <p className="mt-1 font-black text-[#171a16]">{value}</p>
    </div>
  );
}
