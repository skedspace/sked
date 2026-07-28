/**
 * Shared availability utilities for checking booking conflicts
 * and computing the next available slot. Works client-side using
 * the already-loaded bookings list (no extra DB queries).
 */

export type SimpleBooking = {
  id?: string;
  time_range: string;
  resource_id?: string;
  resources?: { id?: string; name: string } | null;
  customers?: { name?: string | null } | null;
  status?: string;
};

export type SimpleResource = {
  id: string;
  name: string;
};

export type SimpleService = {
  id: string;
  name: string;
  duration_min: number;
  price_cents?: number;
};

/**
 * Parse a TSTZRANGE string `[start,end)` into start/end Date objects.
 */
export function parseTimeRange(range: string): { start: Date; end: Date } | null {
  const match = range?.match(/\[([^,]+),([^\])]+)/);
  if (!match?.[1] || !match?.[2]) return null;
  const normalize = (raw: string) => {
    const trimmed = raw.trim().replace(" ", "T");
    const withOffset = /[+-]\d{2}$/.test(trimmed) ? `${trimmed}:00` : trimmed;
    return new Date(/[zZ]|[+-]\d{2}:\d{2}$/.test(withOffset) ? withOffset : `${withOffset}Z`);
  };
  const start = normalize(match[1]);
  const end = normalize(match[2]);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return { start, end };
}

/**
 * Check if a new booking starting at `start` with `durationMinutes`
 * on `resourceId` conflicts with any existing booking.
 * Only considers active bookings (held, pending, confirmed).
 */
export function findConflicts(
  bookings: SimpleBooking[],
  resourceId: string,
  start: Date,
  end: Date,
): SimpleBooking[] {
  const activeStatuses = new Set(["held", "pending", "confirmed"]);
  return bookings.filter((b) => {
    if (!activeStatuses.has(b.status ?? "confirmed")) return false;
    // Match by resource
    const bResourceId = b.resource_id ?? b.resources?.id;
    if (bResourceId && bResourceId !== resourceId) return false;
    if (!bResourceId && b.resources?.name !== resourceId) return false;

    const range = parseTimeRange(b.time_range);
    if (!range) return false;

    // Check overlap: existing.start < new.end AND existing.end > new.start
    return range.start < end && range.end > start;
  });
}

/**
 * Compute the next available time slot for a given resource + service + date.
 * Returns the earliest start time (as "HH:MM" string) that doesn't conflict
 * with existing bookings. Falls back to "09:00" if no conflicts exist.
 *
 * @param bookings - All bookings for the current week
 * @param resourceId - The resource/court to check
 * @param serviceDuration - Duration in minutes
 * @param date - The date string (YYYY-MM-DD)
 * @param hourStart - Earliest hour to consider (default 7)
 * @param hourEnd - Latest hour to consider (default 22)
 */
export function getNextAvailableTime(
  bookings: SimpleBooking[],
  resourceId: string,
  serviceDuration: number,
  date: string,
  hourStart = 7,
  hourEnd = 22,
): string {
  // Try every 30-minute slot starting from current time (or hourStart)
  const now = new Date();
  const isToday = date === now.toISOString().split("T")[0];

  let startHour = isToday ? Math.max(now.getHours() + 1, hourStart) : hourStart;
  // Round up to nearest half hour
  if (isToday) {
    const minutes = now.getMinutes();
    if (minutes >= 30) startHour = Math.max(startHour, now.getHours() + 1);
  }

  for (let h = startHour; h < hourEnd; h++) {
    for (const m of [0, 30]) {
      const candidateStart = new Date(`${date}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`);
      const candidateEnd = new Date(candidateStart.getTime() + serviceDuration * 60_000);

      if (candidateEnd.getHours() > hourEnd) continue; // Past closing

      const conflicts = findConflicts(bookings, resourceId, candidateStart, candidateEnd);
      if (conflicts.length === 0) {
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      }
    }
  }

  // Fallback
  return "09:00";
}

/**
 * Build a human-readable conflict summary string.
 */
export function conflictMessage(conflicts: SimpleBooking[]): string | null {
  if (conflicts.length === 0) return null;
  const names = conflicts
    .map((b) => b.customers && "name" in b.customers ? (b.customers as { name?: string }).name : null)
    .filter(Boolean);
  const who = names.length > 0 ? ` (${names.join(", ")})` : "";
  return `⚠ This time conflicts with ${conflicts.length} existing booking${conflicts.length > 1 ? "s" : ""}${who}`;
}
