"use client";

import { addDays, format, isWithinInterval, subDays } from "date-fns";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Flag,
  Laugh,
  ListFilter,
  MoreHorizontal,
  Plus,
  Search,
  Star,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
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
import { cn } from "@/lib/utils";

type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone?: string | null;
};

type Resource = {
  id: string;
  name: string;
  type: string | null;
  is_active?: boolean;
};

type Booking = {
  id: string;
  time_range: string | null;
  status: string;
  customers?: Customer | null;
  resources?: Resource | null;
};

type Review = {
  id: string;
  org_id: string;
  customer_id: string | null;
  resource_id: string | null;
  booking_id: string | null;
  title: string;
  body: string;
  rating: number;
  source: "web_app" | "mobile_app" | "google" | "facebook" | "manual" | string;
  status: "published" | "pending" | "unpublished" | "flagged" | string;
  response: string | null;
  reviewed_at: string;
  created_at: string;
  customers?: Customer | null;
  resources?: Resource | null;
  bookings?: Booking | null;
};

type FormState = {
  customerId: string;
  resourceId: string;
  bookingId: string;
  title: string;
  body: string;
  rating: string;
  source: string;
  status: string;
};

const REVIEW_TABS = [
  ["all", "All Reviews"],
  ["published", "Published"],
  ["pending", "Pending"],
  ["unpublished", "Unpublished"],
  ["flagged", "Flagged"],
] as const;

const SOURCE_LABELS: Record<string, string> = {
  web_app: "Web App",
  mobile_app: "Mobile App",
  google: "Google",
  facebook: "Facebook",
  manual: "Manual",
};

function dateParam(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function reviewCode(review: Review) {
  return `#REV-${review.id
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 5)
    .toUpperCase()}`;
}

function customerFor(review: Review) {
  return review.customers ?? review.bookings?.customers ?? null;
}

function resourceFor(review: Review) {
  return review.resources ?? review.bookings?.resources ?? null;
}

function customerCode(customer?: Customer | null) {
  if (!customer?.id) return "No customer";
  return `#CUST-${customer.id
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 4)
    .toUpperCase()}`;
}

function initials(name?: string | null) {
  return (name ?? "Guest")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function defaultForm(
  bookings: Booking[],
  customers: Customer[],
  resources: Resource[],
): FormState {
  const booking = bookings[0];
  return {
    customerId: booking?.customers?.id ?? customers[0]?.id ?? "",
    resourceId: booking?.resources?.id ?? resources[0]?.id ?? "",
    bookingId: booking?.id ?? "",
    title: "",
    body: "",
    rating: "5",
    source: "manual",
    status: "published",
  };
}

export function ReviewsView({
  orgId,
  orgSlug,
  selectedDate,
  weekStart,
  weekEnd,
  reviews,
  customers,
  resources,
  bookings,
  schemaReady,
}: {
  orgId: string;
  orgSlug: string;
  selectedDate: string;
  weekStart: string;
  weekEnd: string;
  reviews: Review[];
  customers: Customer[];
  resources: Resource[];
  bookings: Booking[];
  schemaReady: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const db = supabase as any;
  const selectedDateValue = new Date(selectedDate);
  // Memoized so the useMemo hooks below don't recompute on every render.
  const weekStartValue = useMemo(() => new Date(weekStart), [weekStart]);
  const weekEndValue = useMemo(() => new Date(weekEnd), [weekEnd]);
  const [tab, setTab] = useState("all");
  const [page, setPage] = useState(1);
  const [showFilterToolbar, setShowFilterToolbar] = useState(true);
  const [allSelected, setAllSelected] = useState(false);
  const [query, setQuery] = useState("");
  const [courtFilter, setCourtFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [responseDraft, setResponseDraft] = useState("");
  const [formState, setFormState] = useState<FormState>(() =>
    defaultForm(bookings, customers, resources),
  );

  const currentWeekReviews = useMemo(
    () =>
      reviews.filter((review) =>
        isWithinInterval(new Date(review.reviewed_at), {
          start: weekStartValue,
          end: weekEndValue,
        }),
      ),
    [reviews, weekEndValue, weekStartValue],
  );
  const previousWeekReviews = useMemo(
    () =>
      reviews.filter((review) =>
        isWithinInterval(new Date(review.reviewed_at), {
          start: subDays(weekStartValue, 7),
          end: weekStartValue,
        }),
      ),
    [reviews, weekStartValue],
  );

  const positive = reviews.filter((review) => review.rating >= 4).length;
  const neutral = reviews.filter((review) => review.rating === 3).length;
  const negative = reviews.filter((review) => review.rating <= 2).length;
  const average = reviews.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;
  const change = previousWeekReviews.length
    ? Math.round(
        ((currentWeekReviews.length - previousWeekReviews.length) /
          previousWeekReviews.length) *
          100,
      )
    : currentWeekReviews.length
      ? 100
      : 0;

  const filtered = reviews.filter((review) => {
    const customer = customerFor(review);
    const resource = resourceFor(review);
    const haystack =
      `${review.title} ${review.body} ${customer?.name ?? ""} ${customer?.email ?? ""} ${resource?.name ?? ""}`.toLowerCase();
    const matchesTab = tab === "all" || review.status === tab;
    const matchesQuery = !query || haystack.includes(query.toLowerCase());
    const matchesCourt = courtFilter === "all" || resource?.id === courtFilter;
    const matchesRating =
      ratingFilter === "all" || String(review.rating) === ratingFilter;
    const matchesStatus =
      statusFilter === "all" || review.status === statusFilter;
    return (
      matchesTab &&
      matchesQuery &&
      matchesCourt &&
      matchesRating &&
      matchesStatus
    );
  });
  const PAGE_SIZE = 8;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const ratingRows = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: reviews.filter((review) => review.rating === rating).length,
  }));
  const topCourts = getTopCourts(reviews);
  const sourceRows = getSourceRows(reviews);
  const flagged = reviews
    .filter((review) => review.status === "flagged")
    .slice(0, 3);

  function navigateTo(date: Date) {
    router.push(`/dashboard/reviews?date=${dateParam(date)}`);
  }

  function openAddDialog() {
    setFormError(null);
    setFormState(defaultForm(bookings, customers, resources));
    setDialogOpen(true);
  }

  function openReview(review: Review) {
    setSelectedReview(review);
    setResponseDraft(review.response ?? "");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    const booking = bookings.find((item) => item.id === formState.bookingId);
    const payload = {
      org_id: orgId,
      customer_id: booking?.customers?.id || formState.customerId || null,
      resource_id: booking?.resources?.id || formState.resourceId || null,
      booking_id: formState.bookingId || null,
      title: formState.title.trim(),
      body: formState.body.trim(),
      rating: Number(formState.rating),
      source: formState.source,
      status: formState.status,
      reviewed_at: new Date().toISOString(),
    };

    const { error } = await db.from("reviews").insert(payload);
    setSaving(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    setDialogOpen(false);
    router.refresh();
  }

  async function updateReview(review: Review, patch: Partial<Review>) {
    const { error } = await db
      .from("reviews")
      .update(patch)
      .eq("id", review.id);
    if (!error) router.refresh();
  }

  async function saveResponse() {
    if (!selectedReview) return;
    await updateReview(selectedReview, {
      response: responseDraft,
    } as Partial<Review>);
    setSelectedReview(null);
  }

  return (
    <div className="space-y-5">
      <CollectReviewsCard orgSlug={orgSlug} />
      <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-[28px] font-black tracking-[-0.04em] text-[#11140f]">
            Reviews
          </h1>
          <p className="mt-1 text-sm text-[#646861]">
            Manage customer reviews and feedback.
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
          <Button
            variant="outline"
            onClick={() => setShowFilterToolbar(!showFilterToolbar)}
          >
            <Filter />
            Filters
          </Button>
          <Button
            className="bg-[#050604] px-5 text-white hover:bg-[#171a16]"
            onClick={openAddDialog}
          >
            <Plus />
            Add review
          </Button>
        </div>
      </header>

      {!schemaReady && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          Run the reviews migration to persist customer reviews.
        </div>
      )}

      <section className="grid gap-3 xl:grid-cols-5">
        <StatCard
          icon={<Star />}
          label="Total Reviews"
          value={String(reviews.length)}
          detail={`${change >= 0 ? "+" : ""}${change}% vs last week`}
          tone="green"
        />
        <StatCard
          icon={<ThumbsUp />}
          label="Positive"
          value={String(positive)}
          detail={`${percentOf(positive, reviews.length)}% of total`}
          tone="green"
        />
        <StatCard
          icon={<Laugh />}
          label="Neutral"
          value={String(neutral)}
          detail={`${percentOf(neutral, reviews.length)}% of total`}
          tone="amber"
        />
        <StatCard
          icon={<ThumbsDown />}
          label="Negative"
          value={String(negative)}
          detail={`${percentOf(negative, reviews.length)}% of total`}
          tone="red"
        />
        <StatCard
          icon={<Star />}
          label="Average Rating"
          value={average ? average.toFixed(1) : "0.0"}
          detail={<Stars rating={average} />}
          tone="green"
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
        <section className="overflow-hidden rounded-2xl border border-black/[0.07] bg-white shadow-[0_10px_28px_rgba(23,26,22,0.05)]">
          <div className="border-b border-black/[0.07] px-6 pt-5">
            <div className="flex gap-8 overflow-x-auto">
              {REVIEW_TABS.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setTab(value);
                    setPage(1);
                  }}
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
          {showFilterToolbar && (
          <div className="flex flex-col gap-3 p-6 lg:flex-row lg:flex-wrap lg:items-center">
            <label className="relative flex-1 lg:min-w-72">
              <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[#6c7168]" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by customer, court or review..."
                className="pl-11"
              />
            </label>
            <SelectField
              value={courtFilter}
              onChange={(v) => { setCourtFilter(v); setPage(1); }}
              options={[
                { value: "all", label: "All courts" },
                ...resources.map((resource) => ({
                  value: resource.id,
                  label: resource.name,
                })),
              ]}
            />
            <SelectField
              value={ratingFilter}
              onChange={(v) => { setRatingFilter(v); setPage(1); }}
              options={[
                { value: "all", label: "All ratings" },
                ...[5, 4, 3, 2, 1].map((rating) => ({
                  value: String(rating),
                  label: `${rating} stars`,
                })),
              ]}
            />
            <SelectField
              value={statusFilter}
              onChange={(v) => { setStatusFilter(v); setPage(1); }}
              options={[
                { value: "all", label: "All status" },
                ...REVIEW_TABS.slice(1).map(([value, label]) => ({
                  value,
                  label,
                })),
              ]}
            />
            <Button
              variant="outline"
              size="icon"
              aria-label="Clear filters"
              onClick={() => {
                setCourtFilter("all");
                setRatingFilter("all");
                setStatusFilter("all");
                setQuery("");
                setPage(1);
              }}
            >
              <ListFilter />
            </Button>
          </div>
          )}
          <ReviewsTable
            reviews={paged}
            selectedIds={selectedIds}
            onToggle={(id) => {
              setSelectedIds((ids) => {
                const next = ids.includes(id)
                  ? ids.filter((item) => item !== id)
                  : [...ids, id];
                if (next.length !== paged.length) setAllSelected(false);
                return next;
              });
            }}
            onSelect={openReview}
            allSelected={allSelected}
            onSelectAll={() => {
              if (allSelected) {
                setSelectedIds([]);
                setAllSelected(false);
              } else {
                setSelectedIds(paged.map((r) => r.id));
                setAllSelected(true);
              }
            }}
          />
          <div className="flex flex-col gap-3 px-6 py-5 text-sm text-[#626860] sm:flex-row sm:items-center sm:justify-between">
            <span>
              {filtered.length === 0
                ? "No reviews"
                : `Showing ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filtered.length)} of ${filtered.length} reviews`}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (p) => (
                  <Button
                    key={p}
                    size="icon"
                    onClick={() => setPage(p)}
                    className={
                      p === safePage
                        ? "bg-[#11130f] text-white"
                        : "border border-black/[0.07] bg-white text-[#5f655d]"
                    }
                  >
                    {p}
                  </Button>
                ),
              )}
              <Button
                variant="outline"
                size="icon"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <RatingOverview
            average={average}
            total={reviews.length}
            rows={ratingRows}
          />
          <TopCourts rows={topCourts} onViewAll={() => { setTab("all"); setCourtFilter("all"); setRatingFilter("all"); setStatusFilter("all"); setPage(1); }} />
          <SourceBreakdown rows={sourceRows} total={reviews.length} />
          <FlaggedReviews reviews={flagged} onSelect={openReview} onViewAll={() => { setTab("flagged"); setPage(1); }} />
        </aside>
      </div>

      <Dialog
        open={Boolean(selectedReview)}
        onOpenChange={() => setSelectedReview(null)}
      >
        <DialogContent className="max-w-xl border-0 bg-white sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle>Review details</DialogTitle>
          </DialogHeader>
          {selectedReview && (
            <ReviewDetails
              review={selectedReview}
              response={responseDraft}
              onResponse={setResponseDraft}
              onSaveResponse={saveResponse}
              onStatus={(status) =>
                updateReview(selectedReview, { status } as Partial<Review>)
              }
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl border-0 bg-white sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle>Add review</DialogTitle>
          </DialogHeader>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
            <FieldSelect
              id="review-booking"
              label="Related booking"
              value={formState.bookingId}
              onChange={(value) => {
                const booking = bookings.find((item) => item.id === value);
                setFormState((state) => ({
                  ...state,
                  bookingId: value,
                  customerId: booking?.customers?.id ?? state.customerId,
                  resourceId: booking?.resources?.id ?? state.resourceId,
                }));
              }}
              options={[
                { value: "", label: "No booking" },
                ...bookings.map((booking) => ({
                  value: booking.id,
                  label: `${booking.customers?.name ?? "Customer"} - ${booking.resources?.name ?? "Court"}`,
                })),
              ]}
            />
            <FieldSelect
              id="review-customer"
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
            <FieldSelect
              id="review-resource"
              label="Court"
              value={formState.resourceId}
              onChange={(value) =>
                setFormState((state) => ({ ...state, resourceId: value }))
              }
              options={[
                { value: "", label: "No court" },
                ...resources.map((resource) => ({
                  value: resource.id,
                  label: resource.name,
                })),
              ]}
            />
            <FieldSelect
              id="review-rating"
              label="Rating"
              value={formState.rating}
              onChange={(value) =>
                setFormState((state) => ({ ...state, rating: value }))
              }
              options={[5, 4, 3, 2, 1].map((rating) => ({
                value: String(rating),
                label: `${rating} stars`,
              }))}
            />
            <FieldSelect
              id="review-source"
              label="Source"
              value={formState.source}
              onChange={(value) =>
                setFormState((state) => ({ ...state, source: value }))
              }
              options={Object.entries(SOURCE_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
            />
            <FieldSelect
              id="review-status"
              label="Status"
              value={formState.status}
              onChange={(value) =>
                setFormState((state) => ({ ...state, status: value }))
              }
              options={REVIEW_TABS.slice(1).map(([value, label]) => ({
                value,
                label,
              }))}
            />
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="review-title">Title</Label>
              <Input
                id="review-title"
                value={formState.title}
                onChange={(event) =>
                  setFormState((state) => ({
                    ...state,
                    title: event.target.value,
                  }))
                }
                required
                placeholder="Great courts and friendly staff"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="review-body">Review</Label>
              <textarea
                id="review-body"
                value={formState.body}
                onChange={(event) =>
                  setFormState((state) => ({
                    ...state,
                    body: event.target.value,
                  }))
                }
                required
                rows={4}
                className="focus-visible:ring-ring/40 w-full rounded-xl border border-black/10 bg-white/65 px-3.5 py-2 text-sm shadow-sm outline-none focus-visible:ring-2"
                placeholder="What did the customer say?"
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
                {saving ? "Saving..." : "Add review"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function percentOf(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0;
}

function getTopCourts(reviews: Review[]) {
  const map = new Map<
    string,
    { resource: Resource; count: number; sum: number }
  >();
  for (const review of reviews) {
    const resource = resourceFor(review);
    if (!resource) continue;
    const row = map.get(resource.id) ?? { resource, count: 0, sum: 0 };
    row.count += 1;
    row.sum += review.rating;
    map.set(resource.id, row);
  }
  return Array.from(map.values())
    .map((row) => ({ ...row, average: row.count ? row.sum / row.count : 0 }))
    .sort((a, b) => b.average - a.average || b.count - a.count)
    .slice(0, 5);
}

function getSourceRows(reviews: Review[]) {
  const colors = ["#62c51c", "#f0ae2b", "#5b9fe8", "#8e62d9", "#cfcfc9"];
  return Object.entries(SOURCE_LABELS).map(([source, label], index) => ({
    source,
    label,
    count: reviews.filter((review) => review.source === source).length,
    color: colors[index] ?? "#cfcfc9",
  }));
}

function ReviewsTable({
  reviews,
  selectedIds,
  onToggle,
  onSelect,
  allSelected,
  onSelectAll,
}: {
  reviews: Review[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onSelect: (review: Review) => void;
  allSelected: boolean;
  onSelectAll: () => void;
}) {
  if (reviews.length === 0) {
    return (
      <div className="border-y border-black/[0.07] px-6 py-14 text-center text-sm text-[#6b7068]">
        No reviews match this view.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1040px] border-collapse text-left">
        <thead>
          <tr className="border-y border-black/[0.07] bg-[#fbfaf7] text-[11px] font-black text-[#5f655d] uppercase">
            <th className="w-12 px-6 py-4">
              <input
                aria-label="Select all reviews"
                type="checkbox"
                className="h-4 w-4 rounded border-black/15 accent-[#b9f34b]"
                checked={allSelected}
                onChange={onSelectAll}
              />
            </th>
            <th className="px-2 py-4">Review</th>
            <th className="px-2 py-4">Rating</th>
            <th className="px-2 py-4">Court</th>
            <th className="px-2 py-4">Customer</th>
            <th className="px-2 py-4">Date</th>
            <th className="px-2 py-4">Status</th>
            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {reviews.map((review) => {
            const customer = customerFor(review);
            const resource = resourceFor(review);
            return (
              <tr
                key={review.id}
                className="border-b border-black/[0.06] transition-colors hover:bg-[#fbfcf7]"
              >
                <td className="px-6 py-4">
                  <input
                    aria-label={`Select ${review.title}`}
                    type="checkbox"
                    className="h-4 w-4 rounded border-black/15 accent-[#b9f34b]"
                    checked={selectedIds.includes(review.id)}
                    onChange={() => onToggle(review.id)}
                  />
                </td>
                <td className="px-2 py-4">
                  <button
                    type="button"
                    className="flex max-w-md items-start gap-3 text-left"
                    onClick={() => onSelect(review)}
                  >
                    <Avatar name={customer?.name} />
                    <span>
                      <span className="block text-sm font-black">
                        {review.title}
                      </span>
                      <span className="mt-1 line-clamp-2 block text-xs leading-5 text-[#626860]">
                        {review.body}
                      </span>
                    </span>
                  </button>
                </td>
                <td className="px-2 py-4">
                  <Stars rating={review.rating} />
                </td>
                <td className="px-2 py-4 text-sm">
                  <p className="font-black">{resource?.name ?? "No court"}</p>
                  <p className="mt-1 text-xs text-[#626860]">
                    {resource?.type ?? "Court"}
                  </p>
                </td>
                <td className="px-2 py-4 text-sm">
                  <p className="font-black">{customer?.name ?? "Guest"}</p>
                  <p className="mt-1 text-xs text-[#626860]">
                    {customerCode(customer)}
                  </p>
                </td>
                <td className="px-2 py-4 text-sm">
                  <p className="font-black">
                    {format(new Date(review.reviewed_at), "MMM d, yyyy")}
                  </p>
                  <p className="mt-1 text-xs text-[#626860]">
                    {format(new Date(review.reviewed_at), "hh:mm a")}
                  </p>
                </td>
                <td className="px-2 py-4">
                  <StatusPill status={review.status} />
                </td>
                <td className="px-6 py-4 text-right">
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={`Open ${review.title}`}
                    onClick={() => onSelect(review)}
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
  detail: ReactNode;
  tone: "green" | "amber" | "red";
}) {
  return (
    <article className="flex min-h-28 items-center gap-4 rounded-2xl border border-black/[0.06] bg-white px-5 shadow-[0_10px_28px_rgba(23,26,22,0.05)]">
      <span
        className={cn(
          "grid h-12 w-12 shrink-0 place-items-center rounded-full [&_svg]:h-6 [&_svg]:w-6",
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
        <span className="mt-2 block text-2xl leading-none font-black tracking-[-0.04em] text-[#090a08]">
          {value}
        </span>
        <span className="mt-3 block text-xs font-semibold text-[#32740f]">
          {detail}
        </span>
      </span>
    </article>
  );
}

function RatingOverview({
  average,
  total,
  rows,
}: {
  average: number;
  total: number;
  rows: Array<{ rating: number; count: number }>;
}) {
  return (
    <section className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-[0_10px_28px_rgba(23,26,22,0.05)]">
      <h2 className="text-sm font-black">Rating overview</h2>
      <div className="mt-5 flex items-center gap-3">
        <span className="text-3xl font-black">
          {average ? average.toFixed(1) : "0.0"}
        </span>
        <Stars rating={average} />
      </div>
      <p className="mt-2 text-xs text-[#626860]">Based on {total} reviews</p>
      <div className="mt-5 space-y-3">
        {rows.map((row) => (
          <div
            key={row.rating}
            className="grid grid-cols-[52px_1fr_64px] items-center gap-3 text-xs"
          >
            <span>{row.rating} Stars</span>
            <span className="h-2 rounded-full bg-[#e8e7df]">
              <span
                className={cn(
                  "block h-full rounded-full",
                  row.rating <= 2
                    ? "bg-[#ef554d]"
                    : row.rating === 3
                      ? "bg-[#f0ae2b]"
                      : "bg-[#62c51c]",
                )}
                style={{ width: `${percentOf(row.count, total)}%` }}
              />
            </span>
            <span className="text-right font-black">
              {row.count} ({percentOf(row.count, total)}%)
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function TopCourts({
  rows,
  onViewAll,
}: {
  rows: Array<{ resource: Resource; count: number; average: number }>;
  onViewAll?: () => void;
}) {
  return (
    <section className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-[0_10px_28px_rgba(23,26,22,0.05)]">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black">Top rated courts</h2>
        <button
          type="button"
          onClick={onViewAll}
          className="text-xs font-bold text-[#547b14]"
        >
          View all
        </button>
      </div>
      <div className="mt-5 space-y-4">
        {rows.length === 0 ? (
          <p className="text-sm text-[#626860]">No court reviews yet.</p>
        ) : (
          rows.map((row) => (
            <div
              key={row.resource.id}
              className="grid grid-cols-[48px_1fr_auto] items-center gap-3"
            >
              <span className="grid h-10 w-12 place-items-center rounded-lg bg-[#dce8ff] text-xs font-black text-[#326d1e]">
                CT
              </span>
              <span>
                <span className="block text-sm font-black">
                  {row.resource.name}
                </span>
                <span className="text-xs text-[#626860]">
                  {row.resource.type ?? "Court"}
                </span>
              </span>
              <span className="flex items-center gap-1 text-xs font-black text-[#171a16]">
                <Star className="h-3.5 w-3.5 fill-[#f0ae2b] text-[#f0ae2b]" />{" "}
                {row.average.toFixed(1)} ({row.count})
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function SourceBreakdown({
  rows,
  total,
}: {
  rows: Array<{ source: string; label: string; count: number; color: string }>;
  total: number;
}) {
  return (
    <section className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-[0_10px_28px_rgba(23,26,22,0.05)]">
      <h2 className="text-sm font-black">Reviews by source</h2>
      <div className="mt-6 flex items-center gap-5">
        <Donut
          rows={rows.map((row) => ({
            percent: percentOf(row.count, total),
            color: row.color,
          }))}
          total={total}
        />
        <div className="flex-1 space-y-3 text-sm">
          {rows.map((row) => (
            <div
              key={row.source}
              className="flex items-center justify-between gap-3"
            >
              <span className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: row.color }}
                />
                {row.label}
              </span>
              <span className="font-black">
                {row.count} ({percentOf(row.count, total)}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FlaggedReviews({
  reviews,
  onSelect,
  onViewAll,
}: {
  reviews: Review[];
  onSelect: (review: Review) => void;
  onViewAll?: () => void;
}) {
  return (
    <section className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-[0_10px_28px_rgba(23,26,22,0.05)]">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black">Recent flagged reviews</h2>
        <button
          type="button"
          onClick={onViewAll}
          className="text-xs font-bold text-[#547b14]"
        >
          View all
        </button>
      </div>
      <div className="mt-5 space-y-4">
        {reviews.length === 0 ? (
          <p className="text-sm text-[#626860]">No flagged reviews.</p>
        ) : (
          reviews.map((review) => (
            <button
              key={review.id}
              type="button"
              onClick={() => onSelect(review)}
              className="grid w-full grid-cols-[36px_1fr_auto] items-center gap-3 text-left"
            >
              <Avatar name={customerFor(review)?.name} />
              <span>
                <span className="block text-sm font-black">
                  {customerFor(review)?.name ?? "Guest"}
                </span>
                <span className="mt-1 block text-xs text-[#626860]">
                  {resourceFor(review)?.name ?? "No court"}
                </span>
              </span>
              <Flag className="h-4 w-4 text-[#ef554d]" />
            </button>
          ))
        )}
      </div>
    </section>
  );
}

function ReviewDetails({
  review,
  response,
  onResponse,
  onSaveResponse,
  onStatus,
}: {
  review: Review;
  response: string;
  onResponse: (value: string) => void;
  onSaveResponse: () => void;
  onStatus: (status: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-[#f6f7f2] p-4">
        <div className="flex items-start gap-3">
          <Avatar name={customerFor(review)?.name} />
          <div>
            <p className="text-lg font-black">{review.title}</p>
            <p className="mt-1 text-sm text-[#626860]">
              {reviewCode(review)} -{" "}
              {SOURCE_LABELS[review.source] ?? review.source}
            </p>
            <div className="mt-2">
              <Stars rating={review.rating} />
            </div>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-[#171a16]">{review.body}</p>
      </div>
      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <Detail label="Customer" value={customerFor(review)?.name ?? "Guest"} />
        <Detail label="Court" value={resourceFor(review)?.name ?? "No court"} />
        <Detail
          label="Date"
          value={format(new Date(review.reviewed_at), "MMM d, yyyy hh:mm a")}
        />
        <Detail label="Status" value={review.status} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="review-response">Public response</Label>
        <textarea
          id="review-response"
          value={response}
          onChange={(event) => onResponse(event.target.value)}
          rows={4}
          className="focus-visible:ring-ring/40 w-full rounded-xl border border-black/10 bg-white/65 px-3.5 py-2 text-sm shadow-sm outline-none focus-visible:ring-2"
          placeholder="Thank the customer or explain how you handled the feedback."
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => onStatus("published")}>
          Publish
        </Button>
        <Button variant="outline" onClick={() => onStatus("pending")}>
          Mark pending
        </Button>
        <Button variant="outline" onClick={() => onStatus("unpublished")}>
          Unpublish
        </Button>
        <Button variant="outline" onClick={() => onStatus("flagged")}>
          Flag
        </Button>
        <Button
          className="bg-[#11130f] text-white hover:bg-[#22251f]"
          onClick={onSaveResponse}
        >
          Save response
        </Button>
      </div>
    </div>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, index) => {
        const filled = rating >= index + 1;
        return (
          <Star
            key={index}
            className={cn(
              "h-4 w-4",
              filled
                ? "fill-[#62c51c] text-[#62c51c]"
                : "fill-[#d8d8d2] text-[#d8d8d2]",
            )}
          />
        );
      })}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "rounded-lg px-3 py-1.5 text-xs font-black capitalize",
        status === "published" && "bg-[#eff9d7] text-[#32740f]",
        status === "pending" && "bg-[#fff3cf] text-[#d48b00]",
        status === "unpublished" && "bg-[#f1f1ed] text-[#626860]",
        status === "flagged" && "bg-[#ffe3df] text-[#d73933]",
      )}
    >
      {status}
    </span>
  );
}

function Avatar({ name }: { name?: string | null }) {
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#1f241e] text-[10px] font-black text-white">
      {initials(name)}
    </span>
  );
}

function Donut({
  rows,
  total,
}: {
  rows: Array<{ percent: number; color: string }>;
  total: number;
}) {
  let start = 0;
  const stops = rows
    .filter((row) => row.percent > 0)
    .map((row) => {
      const end = start + row.percent * 3.6;
      const stop = `${row.color} ${start}deg ${end}deg`;
      start = end;
      return stop;
    });
  return (
    <div
      className="grid h-28 w-28 shrink-0 place-items-center rounded-full"
      style={{
        background: stops.length
          ? `conic-gradient(${stops.join(", ")}, #e8e7df ${start}deg 360deg)`
          : "conic-gradient(#e8e7df 0deg 360deg)",
      }}
    >
      <span className="grid h-16 w-16 place-items-center rounded-full bg-white text-center shadow-sm">
        <span>
          <span className="block text-xl font-black">{total}</span>
          <span className="text-[10px] text-[#626860]">Total</span>
        </span>
      </span>
    </div>
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

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold text-[#777c73]">{label}</p>
      <p className="mt-1 font-black text-[#171a16] capitalize">{value}</p>
    </div>
  );
}

/**
 * The acquisition half of the review feature.
 *
 * `submit_public_review` verifies a reviewer by booking lookup, but nothing
 * brings a customer to the form — nobody navigates to a venue's page to leave
 * a review unprompted. The intended entry point is a QR printed and stood up
 * at the venue, which reaches the player at the moment they finish playing.
 * That path needs no email pipeline and no booking-completion job, which is
 * why it ships ahead of both.
 */
function CollectReviewsCard({ orgSlug }: { orgSlug: string }) {
  const [copied, setCopied] = useState(false);
  // Filled in after mount rather than during render. The origin only exists in
  // the browser, so deriving it inline makes the server and client markup
  // disagree — React would keep the server's relative path and warn. An effect
  // runs after hydration, so the upgrade to an absolute URL is safe.
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  // After the hooks, never before — an early return above them would change
  // hook order between renders.
  if (!orgSlug) return null;

  const path = `/p/${orgSlug}/review`;
  const reviewUrl = origin ? `${origin}${path}` : path;

  async function copy() {
    try {
      await navigator.clipboard.writeText(reviewUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard is blocked without a user gesture or on insecure origins;
      // the link stays selectable on screen, so this is not worth surfacing.
    }
  }

  return (
    <section className="rounded-2xl border border-black/[0.09] bg-white p-5 shadow-sm">
      <h2 className="text-sm font-black text-[#11140f]">Collect reviews at the venue</h2>
      <p className="mt-1 text-sm leading-6 text-[#646861]">
        Turn this link into a QR code and stand it at the counter or on the net
        post. Players scan it right after they finish, and the date is already
        filled in for them.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-xl bg-[#f6f7f3] px-3 py-2.5 text-sm text-[#171a16]">
          {reviewUrl}
        </code>
        <button
          type="button"
          onClick={copy}
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-black/[0.09] bg-white px-4 text-sm font-semibold text-[#171a16] shadow-sm"
        >
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
    </section>
  );
}
