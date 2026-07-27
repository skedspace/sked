"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Payment = {
  id: string;
  booking_id: string;
  provider: string;
  provider_ref: string;
  type: string;
  amount_cents: number;
  status: string;
  created_at: string;
};

type BookingWithPayment = {
  id: string;
  customers: { name: string } | null;
  services: { name: string } | null;
  status: string;
  payments: Payment[];
};

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  succeeded: "default",
  pending: "secondary",
  failed: "destructive",
  refunded: "outline",
};

export function PaymentHistory({ bookings }: { bookings: BookingWithPayment[] }) {
  const [markingId, setMarkingId] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const allPayments = bookings.flatMap((b) =>
    (b.payments ?? []).map((p) => ({
      ...p,
      customerName: b.customers?.name ?? "Unknown",
      serviceName: b.services?.name ?? "—",
      bookingStatus: b.status,
    })),
  ).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  async function handleMarkPaid(bookingId: string, amountCents: number) {
    setMarkingId(bookingId);
    await supabase.from("payments").insert({
      booking_id: bookingId,
      provider: "manual",
      provider_ref: `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type: "full",
      amount_cents: amountCents,
      status: "succeeded",
    });
    await supabase
      .from("bookings")
      .update({ status: "confirmed" })
      .eq("id", bookingId);
    setMarkingId(null);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment History</CardTitle>
      </CardHeader>
      <CardContent>
        {allPayments.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No payments yet.
          </p>
        ) : (
          <div className="space-y-2">
            {allPayments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {payment.customerName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {payment.serviceName} &middot;{" "}
                    {formatDate(payment.created_at)} &middot;{" "}
                    {payment.provider}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {formatCurrency(payment.amount_cents)}
                  </span>
                  <Badge variant={statusColors[payment.status] ?? "outline"}>
                    {payment.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Manual mark-as-paid section */}
        <div className="mt-6 border-t pt-4">
          <h3 className="mb-2 text-sm font-medium">Mark as Paid (Manual)</h3>
          {bookings
            .filter((b) => b.status === "pending" || b.status === "confirmed")
            .slice(0, 5)
            .map((booking) => (
              <div
                key={booking.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="text-sm">
                    {booking.customers?.name ?? "Unknown"}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground flex-wrap">
                    {booking.services?.name ?? "—"} &middot;{" "}
                    <Badge variant="outline" className="text-xs">
                      {booking.status}
                    </Badge>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={markingId === booking.id}
                  onClick={() => handleMarkPaid(booking.id, 0)}
                >
                  {markingId === booking.id ? "..." : "Mark paid"}
                </Button>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}
