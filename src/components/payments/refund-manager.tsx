"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type PaymentRecord = {
  id: string;
  booking_id: string;
  provider: string;
  provider_ref: string;
  type: string;
  amount_cents: number;
  status: string;
  created_at: string;
};

export function RefundManager({
  bookingId,
  payments,
}: {
  bookingId: string;
  payments: PaymentRecord[];
}) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const succeededPayments = payments.filter((p) => p.status === "succeeded");
  const totalRefundable = succeededPayments.reduce(
    (sum, p) => sum + p.amount_cents,
    0,
  );

  async function handleRefund() {
    if (!reason.trim()) {
      setError("Please provide a reason for the refund.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      for (const payment of succeededPayments) {
        // Mark original payment as refunded
        await supabase
          .from("payments")
          .update({ status: "refunded" })
          .eq("id", payment.id);

        // Create refund record
        await supabase.from("payments").insert({
          booking_id: bookingId,
          provider: payment.provider,
          provider_ref: `refund-${payment.provider_ref}`,
          type: "refund",
          amount_cents: payment.amount_cents,
          status: "succeeded",
        });
      }

      // Cancel the booking
      await supabase
        .from("bookings")
        .update({
          status: "cancelled",
          cancellation_reason: `Refunded: ${reason}`,
        })
        .eq("id", bookingId);

      setOpen(false);
      setReason("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refund failed.");
    } finally {
      setLoading(false);
    }
  }

  if (succeededPayments.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          Refund {formatCurrency(totalRefundable)}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Process Refund</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            {succeededPayments.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg border p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{formatCurrency(p.amount_cents)}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.provider} &middot; {formatDate(p.created_at)}
                  </p>
                </div>
                <Badge variant="outline">{p.type}</Badge>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="refund-reason">Reason for refund</Label>
            <Input
              id="refund-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Customer cancelled within policy"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRefund}
              disabled={loading || !reason.trim()}
            >
              {loading ? "Processing..." : `Refund ${formatCurrency(totalRefundable)}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
