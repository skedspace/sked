"use client";

import { addDays, format, isSameDay, startOfDay } from "date-fns";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Crown,
  DollarSign,
  Download,
  Filter,
  ListFilter,
  MoreHorizontal,
  Plus,
  Search,
  WalletCards,
  XCircle,
} from "lucide-react";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
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

type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone?: string | null;
};

type RelatedBooking = {
  id: string;
  org_id?: string | null;
  time_range: string | null;
  status: string;
  price_cents: number | null;
  customers: Customer | null;
  services: { id: string; name: string } | null;
  resources: { id: string; name: string; type: string | null } | null;
};

type Payment = {
  id: string;
  booking_id: string | null;
  org_id?: string | null;
  customer_id?: string | null;
  provider: string;
  provider_ref: string;
  type: "deposit" | "full" | "refund" | string;
  category?: "booking" | "subscription" | "payout" | "refund" | string | null;
  payment_method?: string | null;
  description?: string | null;
  amount_cents: number;
  status: "pending" | "succeeded" | "failed" | "refunded" | string;
  created_at: string;
  bookings?: RelatedBooking | null;
  customers?: Customer | null;
};

type PaymentCategory = "booking" | "subscription" | "payout" | "refund";

type FormState = {
  category: PaymentCategory;
  bookingId: string;
  customerId: string;
  amount: string;
  status: string;
  method: string;
  description: string;
};

const PAYMENT_TABS = [
  ["all", "All Transactions"],
  ["subscription", "Subscriptions"],
  ["payout", "Payouts"],
  ["refund", "Refunds"],
] as const;

const METHODS = ["Visa", "Mastercard", "GCash", "PayPal", "Cash", "Bank"];

function dateParam(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function transactionCode(payment: Payment) {
  const prefix =
    categoryFor(payment) === "subscription"
      ? "SUB"
      : categoryFor(payment) === "refund"
        ? "REF"
        : categoryFor(payment) === "payout"
          ? "OUT"
          : "PAY";
  return `#${prefix}-${
    payment.provider_ref?.replace(/[^a-zA-Z0-9]/g, "").slice(-5) ||
    payment.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 5)
  }`.toUpperCase();
}

function categoryFor(payment: Payment): PaymentCategory {
  if (payment.category) return payment.category as PaymentCategory;
  if (payment.type === "refund" || payment.status === "refunded")
    return "refund";
  if (payment.provider_ref?.toLowerCase().includes("sub"))
    return "subscription";
  if (payment.provider_ref?.toLowerCase().includes("payout")) return "payout";
  return "booking";
}

function customerFor(payment: Payment) {
  return payment.customers ?? payment.bookings?.customers ?? null;
}

function methodFor(payment: Payment) {
  return payment.payment_method || payment.provider || "Manual";
}

function relatedTo(payment: Payment) {
  const category = categoryFor(payment);
  if (payment.description) return payment.description;
  if (category === "subscription") return "Membership plan";
  if (category === "payout") return "Owner payout";
  if (category === "refund")
    return payment.bookings?.services?.name ?? "Refund";
  return (
    payment.bookings?.resources?.name ??
    payment.bookings?.services?.name ??
    "Booking"
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return {
    date: format(date, "MMM d, yyyy"),
    time: format(date, "hh:mm a"),
  };
}

function statusLabel(status: string) {
  if (status === "succeeded") return "Paid";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formDefaults(bookings: RelatedBooking[]): FormState {
  const booking = bookings[0];
  return {
    category: "booking",
    bookingId: booking?.id ?? "",
    customerId: booking?.customers?.id ?? "",
    amount: booking?.price_cents
      ? String((booking.price_cents / 100).toFixed(2))
      : "",
    status: "succeeded",
    method: "Visa",
    description: "",
  };
}

export function PaymentsView({
  orgId,
  payments,
  bookings,
  customers,
  selectedDate,
  weekStart,
  weekEnd,
  schemaReady,
}: {
  orgId: string;
  payments: Payment[];
  bookings: RelatedBooking[];
  customers: Customer[];
  selectedDate: string;
  weekStart: string;
  weekEnd: string;
  schemaReady: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const db = supabase as any;
  const selectedDateValue = new Date(selectedDate);
  const weekStartValue = new Date(weekStart);
  const weekEndValue = new Date(weekEnd);
  const [tab, setTabRaw] = useState("all");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [filterVisible, setFilterVisible] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>(() =>
    formDefaults(bookings),
  );

  function setTab(value: string) {
    setTabRaw(value);
    setPage(1);
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    setPage(1);
  }

  function handleTypeFilterChange(value: string) {
    setTypeFilter(value);
    setPage(1);
  }

  function handleStatusFilterChange(value: string) {
    setStatusFilter(value);
    setPage(1);
  }

  function handleMethodFilterChange(value: string) {
    setMethodFilter(value);
    setPage(1);
  }

  function clearAllFilters() {
    setTabRaw("all");
    setQuery("");
    setTypeFilter("all");
    setStatusFilter("all");
    setMethodFilter("all");
    setPage(1);
  }

  const weekPayments = useMemo(
    () =>
      payments.filter((payment) => {
        const bookingOrg = payment.bookings?.org_id;
        return !bookingOrg || bookingOrg === orgId || payment.org_id === orgId;
      }),
    [orgId, payments],
  );

  const paidTotal = sumByStatus(weekPayments, "succeeded");
  const pendingTotal = sumByStatus(weekPayments, "pending");
  const failedTotal = sumByStatus(weekPayments, "failed");
  const refundTotal = weekPayments
    .filter((payment) => categoryFor(payment) === "refund")
    .reduce((sum, payment) => sum + payment.amount_cents, 0);
  const netRevenue = Math.max(0, paidTotal - refundTotal);

  const filtered = weekPayments.filter((payment) => {
    const customer = customerFor(payment);
    const category = categoryFor(payment);
    const haystack =
      `${transactionCode(payment)} ${customer?.name ?? ""} ${customer?.email ?? ""} ${relatedTo(payment)} ${methodFor(payment)}`.toLowerCase();
    const matchesTab = tab === "all" || category === tab;
    const matchesQuery = !query || haystack.includes(query.toLowerCase());
    const matchesType = typeFilter === "all" || category === typeFilter;
    const matchesStatus =
      statusFilter === "all" || payment.status === statusFilter;
    const matchesMethod =
      methodFilter === "all" ||
      methodFor(payment).toLowerCase() === methodFilter.toLowerCase();
    return (
      matchesTab &&
      matchesQuery &&
      matchesType &&
      matchesStatus &&
      matchesMethod
    );
  });
  const perPage = 8;
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * perPage, safePage * perPage);

  const activity = weekPayments.slice(0, 3);
  const methodRows = getMethodRows(weekPayments);
  const revenueDays = getRevenueDays(weekPayments, weekStartValue);

  function navigateTo(date: Date) {
    router.push(`/dashboard/payments?date=${dateParam(date)}`);
  }

  function openAddDialog() {
    setFormError(null);
    setFormState(formDefaults(bookings));
    setDialogOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);

    const booking = bookings.find((item) => item.id === formState.bookingId);
    const customerId =
      formState.category === "booking" || formState.category === "refund"
        ? booking?.customers?.id
        : formState.customerId || null;
    const amountCents = Math.round(Number.parseFloat(formState.amount) * 100);

    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      setSaving(false);
      setFormError("Enter an amount greater than zero.");
      return;
    }

    const payload = {
      org_id: orgId,
      booking_id:
        formState.category === "booking" || formState.category === "refund"
          ? formState.bookingId || null
          : null,
      customer_id: customerId ?? null,
      provider: "manual",
      provider_ref: `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type: formState.category === "refund" ? "refund" : "full",
      category: formState.category,
      payment_method: formState.method,
      description: formState.description.trim() || null,
      amount_cents: amountCents,
      status: formState.status,
    };

    const { error } = await db.from("payments").insert(payload);
    if (!error && payload.booking_id && payload.status === "succeeded") {
      await db
        .from("bookings")
        .update({ status: "confirmed" })
        .eq("id", payload.booking_id);
    }

    setSaving(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    setDialogOpen(false);
    router.refresh();
  }

  async function updateStatus(payment: Payment, status: string) {
    const { error } = await db
      .from("payments")
      .update({ status })
      .eq("id", payment.id);
    if (!error) router.refresh();
  }

  async function createRefund(payment: Payment) {
    const { error } = await db.from("payments").insert({
      org_id: orgId,
      booking_id: payment.booking_id,
      customer_id: customerFor(payment)?.id ?? null,
      provider: "manual",
      provider_ref: `refund-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type: "refund",
      category: "refund",
      payment_method: methodFor(payment),
      description: `Refund for ${transactionCode(payment)}`,
      amount_cents: payment.amount_cents,
      status: "refunded",
    });
    if (!error) router.refresh();
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-[28px] font-black tracking-[-0.04em] text-[#11140f]">
            Payments
          </h1>
          <p className="mt-1 text-sm text-[#646861]">
            Track transactions, subscriptions and payouts.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="inline-flex h-11 min-w-64 items-center justify-between rounded-xl border border-black/[0.09] bg-white px-4 text-sm font-semibold text-[#171a16] shadow-sm"
            onClick={() => navigateTo(selectedDateValue)}
          >
            <span className="inline-flex items-center gap-3">
              <CalendarDays className="h-4 w-4" />
              {format(weekStartValue, "MMM d")} -{" "}
              {format(addDays(weekEndValue, -1), "MMM d, yyyy")}
            </span>
            <ChevronDown className="h-4 w-4 text-[#696e65]" />
          </button>
          <Button variant="outline" onClick={() => setFilterVisible((v) => !v)}>
            <Filter />
            Filters
          </Button>
          <Button
            className="bg-[#050604] px-5 text-white hover:bg-[#171a16]"
            onClick={openAddDialog}
          >
            <Plus />
            Add payment
          </Button>
        </div>
      </header>

      {!schemaReady && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          Payments are using the original booking-only schema. Run the latest
          migration to enable subscriptions, payouts, and standalone refunds.
        </div>
      )}

      <section className="grid gap-3 xl:grid-cols-4">
        <StatCard
          icon={<DollarSign />}
          label="Total Revenue"
          value={formatCurrency(netRevenue)}
          detail={`${weekPayments.length} transactions this week`}
          tone="green"
        />
        <StatCard
          icon={<CreditCard />}
          label="Paid"
          value={formatCurrency(paidTotal)}
          detail={`${percentOf(paidTotal, paidTotal + pendingTotal + failedTotal)}% of total`}
          tone="green"
        />
        <StatCard
          icon={<WalletCards />}
          label="Pending"
          value={formatCurrency(pendingTotal)}
          detail={`${percentOf(pendingTotal, paidTotal + pendingTotal + failedTotal)}% of total`}
          tone="amber"
        />
        <StatCard
          icon={<XCircle />}
          label="Failed"
          value={formatCurrency(failedTotal)}
          detail={`${percentOf(failedTotal, paidTotal + pendingTotal + failedTotal)}% of total`}
          tone="red"
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
        <section className="overflow-hidden rounded-2xl border border-black/[0.07] bg-white shadow-[0_10px_28px_rgba(23,26,22,0.05)]">
          <div className="border-b border-black/[0.07] px-6 pt-5">
            <div className="flex gap-8 overflow-x-auto">
              {PAYMENT_TABS.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTab(value)}
                  className={cn(
                    "shrink-0 border-b-2 px-0 py-4 text-sm font-semibold transition-colors",
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

          <div
            className={cn(
              "flex flex-col gap-3 p-6 lg:flex-row lg:flex-wrap lg:items-center",
              !filterVisible && "hidden",
            )}
          >
            <label className="relative flex-1 lg:min-w-72">
              <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[#6c7168]" />
              <Input
                value={query}
                onChange={(event) => handleQueryChange(event.target.value)}
                placeholder="Search by customer, booking ID or invoice..."
                className="pl-11"
              />
            </label>
            <SelectField
              value={typeFilter}
              onChange={handleTypeFilterChange}
              options={[
                { value: "all", label: "All types" },
                { value: "booking", label: "Booking" },
                { value: "subscription", label: "Subscription" },
                { value: "payout", label: "Payout" },
                { value: "refund", label: "Refund" },
              ]}
            />
            <SelectField
              value={statusFilter}
              onChange={handleStatusFilterChange}
              options={[
                { value: "all", label: "All status" },
                { value: "succeeded", label: "Paid" },
                { value: "pending", label: "Pending" },
                { value: "failed", label: "Failed" },
                { value: "refunded", label: "Refunded" },
              ]}
            />
            <SelectField
              value={methodFilter}
              onChange={handleMethodFilterChange}
              options={[
                { value: "all", label: "All payment methods" },
                ...METHODS.map((method) => ({ value: method, label: method })),
              ]}
            />
            <Button
              variant="outline"
              size="icon"
              aria-label="View options"
              onClick={() => {
                handleQueryChange("");
                handleTypeFilterChange("all");
                handleStatusFilterChange("all");
                handleMethodFilterChange("all");
              }}
            >
              <ListFilter />
            </Button>
          </div>

          <PaymentsTable
            payments={paged}
            selectedIds={selectedIds}
            onToggle={(id) =>
              setSelectedIds((ids) =>
                ids.includes(id)
                  ? ids.filter((item) => item !== id)
                  : [...ids, id],
              )
            }
            onSelect={setSelectedPayment}
          />
          <div className="flex flex-col gap-3 px-6 py-5 text-sm text-[#626860] sm:flex-row sm:items-center sm:justify-between">
            <span>
              Showing {filtered.length === 0 ? 0 : (safePage - 1) * perPage + 1} to{" "}
              {Math.min(safePage * perPage, filtered.length)} of{" "}
              {filtered.length} transactions
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
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                .map((p, idx, arr) => (
                  <span key={p} className="contents">
                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                      <span className="inline-flex items-center px-1 text-sm text-[#626860]">
                        ...
                      </span>
                    )}
                    <Button
                      variant={p === safePage ? "default" : "outline"}
                      size="icon"
                      className={
                        p === safePage ? "bg-[#11130f] text-white" : undefined
                      }
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </Button>
                  </span>
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
          <RevenueOverview total={netRevenue} days={revenueDays} />
          <PaymentMethods rows={methodRows} total={paidTotal} />
          <RecentActivity payments={activity} onViewAll={clearAllFilters} />
        </aside>
      </div>

      <Dialog
        open={Boolean(selectedPayment)}
        onOpenChange={() => setSelectedPayment(null)}
      >
        <DialogContent className="border-0 bg-white sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle>Transaction details</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <PaymentDetails
              payment={selectedPayment}
              onStatus={(status) => updateStatus(selectedPayment, status)}
              onRefund={() => createRefund(selectedPayment)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl border-0 bg-white sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle>Add payment</DialogTitle>
          </DialogHeader>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
            <FieldSelect
              id="payment-category"
              label="Type"
              value={formState.category}
              onChange={(value) =>
                setFormState((state) => ({
                  ...state,
                  category: value as PaymentCategory,
                }))
              }
              options={[
                { value: "booking", label: "Booking" },
                { value: "subscription", label: "Subscription" },
                { value: "payout", label: "Payout" },
                { value: "refund", label: "Refund" },
              ]}
            />
            <FieldSelect
              id="payment-status"
              label="Status"
              value={formState.status}
              onChange={(value) =>
                setFormState((state) => ({ ...state, status: value }))
              }
              options={[
                { value: "succeeded", label: "Paid" },
                { value: "pending", label: "Pending" },
                { value: "failed", label: "Failed" },
                { value: "refunded", label: "Refunded" },
              ]}
            />
            {(formState.category === "booking" ||
              formState.category === "refund") && (
              <FieldSelect
                id="payment-booking"
                label="Related booking"
                value={formState.bookingId}
                onChange={(value) => {
                  const booking = bookings.find((item) => item.id === value);
                  setFormState((state) => ({
                    ...state,
                    bookingId: value,
                    customerId: booking?.customers?.id ?? state.customerId,
                    amount: booking?.price_cents
                      ? String((booking.price_cents / 100).toFixed(2))
                      : state.amount,
                  }));
                }}
                options={[
                  { value: "", label: "Select booking" },
                  ...bookings.map((booking) => ({
                    value: booking.id,
                    label: `${booking.customers?.name ?? "Customer"} - ${booking.resources?.name ?? "Booking"}`,
                  })),
                ]}
              />
            )}
            {formState.category !== "booking" &&
              formState.category !== "refund" && (
                <FieldSelect
                  id="payment-customer"
                  label="Customer"
                  value={formState.customerId}
                  onChange={(value) =>
                    setFormState((state) => ({ ...state, customerId: value }))
                  }
                  options={[
                    { value: "", label: "No customer" },
                    ...customers.map((customer) => ({
                      value: customer.id,
                      label: customer.name,
                    })),
                  ]}
                />
              )}
            <FieldSelect
              id="payment-method"
              label="Method"
              value={formState.method}
              onChange={(value) =>
                setFormState((state) => ({ ...state, method: value }))
              }
              options={METHODS.map((method) => ({
                value: method,
                label: method,
              }))}
            />
            <div className="space-y-2">
              <Label htmlFor="payment-amount">Amount</Label>
              <Input
                id="payment-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={formState.amount}
                onChange={(event) =>
                  setFormState((state) => ({
                    ...state,
                    amount: event.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="payment-description">Related to</Label>
              <Input
                id="payment-description"
                value={formState.description}
                onChange={(event) =>
                  setFormState((state) => ({
                    ...state,
                    description: event.target.value,
                  }))
                }
                placeholder="Court 1, Premium plan, payout batch..."
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
                {saving ? "Saving..." : "Add payment"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function sumByStatus(payments: Payment[], status: string) {
  return payments
    .filter(
      (payment) =>
        payment.status === status && categoryFor(payment) !== "refund",
    )
    .reduce((sum, payment) => sum + payment.amount_cents, 0);
}

function percentOf(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0;
}

function getRevenueDays(payments: Payment[], weekStart: Date) {
  return Array.from({ length: 7 }).map((_, index) => {
    const day = addDays(startOfDay(weekStart), index);
    const total = payments
      .filter(
        (payment) =>
          payment.status === "succeeded" &&
          categoryFor(payment) !== "refund" &&
          isSameDay(new Date(payment.created_at), day),
      )
      .reduce((sum, payment) => sum + payment.amount_cents, 0);
    return { day, total };
  });
}

function getMethodRows(payments: Payment[]) {
  const paid = payments.filter(
    (payment) =>
      payment.status === "succeeded" && categoryFor(payment) !== "refund",
  );
  const total = paid.reduce((sum, payment) => sum + payment.amount_cents, 0);
  const rows = new Map<string, number>();
  for (const payment of paid) {
    const method = methodFor(payment);
    rows.set(method, (rows.get(method) ?? 0) + payment.amount_cents);
  }
  return Array.from(rows.entries())
    .map(([method, amount]) => ({
      method,
      amount,
      percent: percentOf(amount, total),
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);
}

function PaymentsTable({
  payments,
  selectedIds,
  onToggle,
  onSelect,
}: {
  payments: Payment[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onSelect: (payment: Payment) => void;
}) {
  if (payments.length === 0) {
    return (
      <div className="border-y border-black/[0.07] px-6 py-14 text-center text-sm text-[#6b7068]">
        No transactions match this view.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1060px] border-collapse text-left">
        <thead>
          <tr className="border-y border-black/[0.07] bg-[#fbfaf7] text-[11px] font-black text-[#5f655d] uppercase">
            <th className="w-12 px-6 py-4">
              <span className="block h-4 w-4 rounded border border-black/15" />
            </th>
            <th className="px-2 py-4">Transaction</th>
            <th className="px-2 py-4">Customer</th>
            <th className="px-2 py-4">Type</th>
            <th className="px-2 py-4">Related to</th>
            <th className="px-2 py-4">Date & Time</th>
            <th className="px-2 py-4">Method</th>
            <th className="px-2 py-4">Status</th>
            <th className="px-2 py-4 text-right">Amount</th>
            <th className="px-6 py-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => {
            const dateTime = formatDateTime(payment.created_at);
            const customer = customerFor(payment);
            return (
              <tr
                key={payment.id}
                className="border-b border-black/[0.06] transition-colors hover:bg-[#fbfcf7]"
              >
                <td className="px-6 py-4">
                  <input
                    aria-label={`Select ${transactionCode(payment)}`}
                    type="checkbox"
                    className="h-4 w-4 rounded border-black/15 accent-[#b9f34b]"
                    checked={selectedIds.includes(payment.id)}
                    onChange={() => onToggle(payment.id)}
                  />
                </td>
                <td className="px-2 py-4">
                  <button
                    type="button"
                    onClick={() => onSelect(payment)}
                    className="flex items-center gap-3 text-left"
                  >
                    <TransactionIcon payment={payment} />
                    <span>
                      <span className="block text-sm font-black">
                        {transactionCode(payment)}
                      </span>
                      <span className="mt-1 block text-xs text-[#6b7068]">
                        INV-
                        {payment.provider_ref?.slice(-4).toUpperCase() ||
                          "0000"}
                      </span>
                    </span>
                  </button>
                </td>
                <td className="px-2 py-4 text-sm">
                  <p className="font-black">
                    {customer?.name ?? "No customer"}
                  </p>
                  <p className="mt-1 text-xs text-[#6b7068]">
                    {customer?.email ?? "No email"}
                  </p>
                </td>
                <td className="px-2 py-4">
                  <TypePill category={categoryFor(payment)} />
                </td>
                <td className="px-2 py-4 text-sm">
                  <p className="font-black">{relatedTo(payment)}</p>
                  <p className="mt-1 text-xs text-[#6b7068]">
                    {payment.bookings?.services?.name ?? categoryFor(payment)}
                  </p>
                </td>
                <td className="px-2 py-4 text-sm">
                  <p className="font-black">{dateTime.date}</p>
                  <p className="mt-1 text-xs text-[#6b7068]">{dateTime.time}</p>
                </td>
                <td className="px-2 py-4 text-sm font-black">
                  {methodFor(payment)}
                </td>
                <td className="px-2 py-4">
                  <StatusPill status={payment.status} />
                </td>
                <td className="px-2 py-4 text-right text-sm font-black">
                  {formatCurrency(payment.amount_cents)}
                </td>
                <td className="px-6 py-4 text-right">
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={`Open ${transactionCode(payment)}`}
                    onClick={() => onSelect(payment)}
                  >
                    <MoreHorizontal />
                  </Button>
                </td>
              </tr>
            );
          })}
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
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
  tone: "green" | "amber" | "red";
}) {
  return (
    <article className="flex min-h-32 items-center gap-5 rounded-2xl border border-black/[0.06] bg-white px-6 shadow-[0_10px_28px_rgba(23,26,22,0.05)]">
      <span
        className={cn(
          "grid h-14 w-14 shrink-0 place-items-center rounded-full [&_svg]:h-7 [&_svg]:w-7",
          tone === "green" && "bg-[#ebf7d7] text-[#326d1e]",
          tone === "amber" && "bg-[#fff1ce] text-[#e19a12]",
          tone === "red" && "bg-[#ffe2df] text-[#df423c]",
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
        className="h-full min-w-0 flex-1 appearance-none rounded-xl bg-transparent pr-9 pl-4 text-xs font-bold outline-none"
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

function FieldSelect({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        className="focus-visible:ring-ring/40 h-11 w-full rounded-xl border border-black/10 bg-white/65 px-3.5 py-2 text-sm shadow-sm outline-none focus-visible:ring-2"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={id !== "payment-customer"}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function TransactionIcon({ payment }: { payment: Payment }) {
  const category = categoryFor(payment);
  return (
    <span
      className={cn(
        "grid h-9 w-9 place-items-center rounded-full [&_svg]:h-4 [&_svg]:w-4",
        category === "booking" && "bg-[#eff9d7] text-[#4f9c1b]",
        category === "subscription" && "bg-[#efe5ff] text-[#7f4cdf]",
        category === "payout" && "bg-[#e4f1ff] text-[#357ec9]",
        category === "refund" && "bg-[#fff1ce] text-[#e19a12]",
      )}
    >
      {category === "subscription" ? (
        <Crown />
      ) : category === "payout" ? (
        <Download />
      ) : category === "refund" ? (
        <XCircle />
      ) : (
        <Download />
      )}
    </span>
  );
}

function TypePill({ category }: { category: PaymentCategory }) {
  return (
    <span
      className={cn(
        "rounded-lg px-3 py-1.5 text-xs font-black capitalize",
        category === "booking" && "bg-[#eff9d7] text-[#32740f]",
        category === "subscription" && "bg-[#efe9ff] text-[#6946c9]",
        category === "payout" && "bg-[#eaf3ff] text-[#236fb8]",
        category === "refund" && "bg-[#fff3cf] text-[#d48b00]",
      )}
    >
      {category}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "rounded-lg px-3 py-1.5 text-xs font-black capitalize",
        status === "succeeded" && "bg-[#eff9d7] text-[#32740f]",
        status === "pending" && "bg-[#fff3cf] text-[#d48b00]",
        status === "failed" && "bg-[#ffe3df] text-[#d73933]",
        status === "refunded" && "bg-[#f1f1ed] text-[#5f655d]",
      )}
    >
      {statusLabel(status)}
    </span>
  );
}

function RevenueOverview({
  total,
  days,
}: {
  total: number;
  days: Array<{ day: Date; total: number }>;
}) {
  const max = Math.max(...days.map((day) => day.total), 1);
  const points = days
    .map((day, index) => {
      const x = 18 + index * 44;
      const y = 112 - (day.total / max) * 78;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <section className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-[0_10px_28px_rgba(23,26,22,0.05)]">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black">Revenue overview</h2>
        <SelectField
          value="week"
          onChange={() => undefined}
          options={[{ value: "week", label: "This week" }]}
        />
      </div>
      <p className="mt-5 text-2xl font-black tracking-[-0.04em]">
        {formatCurrency(total)}
      </p>
      <p className="mt-2 text-xs font-bold text-[#4f9c1b]">
        {days.some((day) => day.total > 0)
          ? "Live totals from payments"
          : "No paid transactions yet"}
      </p>
      <svg
        className="mt-5 h-32 w-full"
        viewBox="0 0 304 132"
        role="img"
        aria-label="Revenue by day"
      >
        {[28, 60, 92, 124].map((y) => (
          <line
            key={y}
            x1="0"
            x2="304"
            y1={y}
            y2={y}
            stroke="#e9e7df"
            strokeWidth="1"
          />
        ))}
        <polygon
          points={`18,118 ${points} 282,118`}
          fill="#ebf7d7"
          opacity="0.8"
        />
        <polyline
          points={points}
          fill="none"
          stroke="#62b91f"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {days.map((day, index) => {
          const x = 18 + index * 44;
          const y = 112 - (day.total / max) * 78;
          return (
            <circle
              key={day.day.toISOString()}
              cx={x}
              cy={y}
              r="3"
              fill="#62b91f"
            />
          );
        })}
      </svg>
      <div className="grid grid-cols-7 text-center text-xs font-bold text-[#626860]">
        {days.map((day) => (
          <span key={day.day.toISOString()}>{format(day.day, "EEE")}</span>
        ))}
      </div>
    </section>
  );
}

function PaymentMethods({
  rows,
  total,
}: {
  rows: Array<{ method: string; amount: number; percent: number }>;
  total: number;
}) {
  const colors = ["#62c51c", "#f0ae2b", "#5b9fe8", "#8e62d9", "#cfcfc9"];
  return (
    <section className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-[0_10px_28px_rgba(23,26,22,0.05)]">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black">Payment methods</h2>
        <SelectField
          value="week"
          onChange={() => undefined}
          options={[{ value: "week", label: "This week" }]}
        />
      </div>
      <div className="mt-6 flex items-center gap-5">
        <div
          className="grid h-28 w-28 place-items-center rounded-full bg-[#eff9d7]"
          style={{
            background: donutGradient(
              rows.map((row, index) => ({
                percent: row.percent,
                color: colors[index] ?? "#cfcfc9",
              })),
            ),
          }}
        >
          <span className="grid h-16 w-16 place-items-center rounded-full bg-white text-center shadow-sm">
            <span>
              <span className="block text-sm font-black">
                {formatCurrency(total)}
              </span>
              <span className="text-[10px] text-[#6b7068]">Total</span>
            </span>
          </span>
        </div>
        <div className="flex-1 space-y-3 text-sm">
          {rows.length === 0 ? (
            <p className="text-sm text-[#6b7068]">No paid methods yet.</p>
          ) : (
            rows.map((row, index) => (
              <div
                key={row.method}
                className="grid grid-cols-[1fr_42px_82px] items-center gap-2"
              >
                <span className="flex items-center gap-2 font-semibold">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: colors[index] }}
                  />
                  {row.method}
                </span>
                <span className="text-right text-xs font-black">
                  {row.percent}%
                </span>
                <span className="text-right text-xs font-semibold">
                  {formatCurrency(row.amount)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function donutGradient(rows: Array<{ percent: number; color: string }>) {
  if (rows.length === 0) return "conic-gradient(#e8e7df 0deg 360deg)";
  let start = 0;
  const stops = rows.map((row) => {
    const end = start + row.percent * 3.6;
    const stop = `${row.color} ${start}deg ${end}deg`;
    start = end;
    return stop;
  });
  return `conic-gradient(${stops.join(", ")}, #e8e7df ${start}deg 360deg)`;
}

function RecentActivity({
  payments,
  onViewAll,
}: {
  payments: Payment[];
  onViewAll?: () => void;
}) {
  return (
    <section className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-[0_10px_28px_rgba(23,26,22,0.05)]">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black">Recent activity</h2>
        <button
          type="button"
          className="text-xs font-bold text-[#547b14]"
          onClick={onViewAll}
        >
          View all
        </button>
      </div>
      <div className="mt-5 space-y-4">
        {payments.length === 0 ? (
          <p className="text-sm text-[#6b7068]">No payment activity yet.</p>
        ) : (
          payments.map((payment) => {
            const customer = customerFor(payment);
            return (
              <div
                key={payment.id}
                className="grid grid-cols-[36px_1fr_auto] items-center gap-3"
              >
                <TransactionIcon payment={payment} />
                <span>
                  <span className="block text-sm font-black">
                    {statusLabel(payment.status)} payment
                    {customer?.name ? ` from ${customer.name}` : ""}
                  </span>
                  <span className="mt-1 block text-xs text-[#6b7068]">
                    {relatedTo(payment)} -{" "}
                    {format(new Date(payment.created_at), "MMM d, hh:mm a")}
                  </span>
                </span>
                <span className="text-sm font-black">
                  {formatCurrency(payment.amount_cents)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

function PaymentDetails({
  payment,
  onStatus,
  onRefund,
}: {
  payment: Payment;
  onStatus: (status: string) => void;
  onRefund: () => void;
}) {
  const customer = customerFor(payment);
  const dateTime = formatDateTime(payment.created_at);
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 rounded-xl bg-[#f6f7f2] p-4">
        <TransactionIcon payment={payment} />
        <span>
          <p className="text-lg font-black">{transactionCode(payment)}</p>
          <p className="mt-1 text-sm text-[#626860]">{payment.provider_ref}</p>
        </span>
      </div>
      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <Detail label="Customer" value={customer?.name ?? "No customer"} />
        <Detail label="Amount" value={formatCurrency(payment.amount_cents)} />
        <Detail label="Status" value={statusLabel(payment.status)} />
        <Detail label="Method" value={methodFor(payment)} />
        <Detail label="Date" value={dateTime.date} />
        <Detail label="Time" value={dateTime.time} />
      </div>
      <Detail label="Related to" value={relatedTo(payment)} />
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={() => onStatus("succeeded")}
          disabled={payment.status === "succeeded"}
        >
          Mark paid
        </Button>
        <Button
          variant="outline"
          onClick={() => onStatus("pending")}
          disabled={payment.status === "pending"}
        >
          Mark pending
        </Button>
        <Button
          variant="outline"
          onClick={() => onStatus("failed")}
          disabled={payment.status === "failed"}
        >
          Mark failed
        </Button>
        <Button
          className="bg-[#11130f] text-white hover:bg-[#22251f]"
          onClick={onRefund}
          disabled={categoryFor(payment) === "refund"}
        >
          Create refund
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
