"use client";

import { formatDate, formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  no_show_count: number;
  created_at: string;
};

type Booking = {
  id: string;
  created_at: string;
  status: string;
  price_cents: number;
  services: { name: string } | null;
  resources: { name: string } | null;
};

const statusColors: Record<string, "default" | "secondary" | "destructive"> = {
  confirmed: "default",
  completed: "default",
  cancelled: "secondary",
  no_show: "destructive",
};

export function CustomerDetail({
  customer,
  bookings,
}: {
  customer: Customer;
  bookings: Booking[];
}) {
  const totalSpent = bookings
    .filter((b) => b.status === "completed")
    .reduce((sum, b) => sum + b.price_cents, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{customer.name}</h1>
        <p className="text-muted-foreground">
          {customer.email ?? customer.phone ?? "No contact info"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Total Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{bookings.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Total Spent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalSpent)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              No-Shows
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive text-2xl font-bold">
              {customer.no_show_count}
            </p>
          </CardContent>
        </Card>
      </div>

      {customer.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">{customer.notes}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Booking History</CardTitle>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <p className="text-muted-foreground text-sm">No bookings yet.</p>
          ) : (
            <div className="space-y-2">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {booking.services?.name ?? "Unknown service"}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {booking.resources?.name ?? "—"} &middot;{" "}
                      {formatDate(booking.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={statusColors[booking.status] ?? "secondary"}
                    >
                      {booking.status}
                    </Badge>
                    <span className="text-sm font-medium">
                      {formatCurrency(booking.price_cents)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
