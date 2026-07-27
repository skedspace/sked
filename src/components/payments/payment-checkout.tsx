"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { useAnalytics } from "@/lib/analytics";

type ServicePaymentInfo = {
  payment_mode: "free" | "deposit" | "full";
  price_cents: number;
  deposit_cents: number | null;
};

type CheckoutProps = {
  service: ServicePaymentInfo;
  bookingId: string;
  onSuccess?: () => void;
  onBack?: () => void;
};

export function PaymentCheckout({ service, bookingId, onSuccess, onBack }: CheckoutProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const supabase = createClient();
  const analytics = useAnalytics();

  const depositAmount = service.deposit_cents ?? service.price_cents;
  const displayAmount = service.payment_mode === "deposit" ? depositAmount : service.price_cents;

  async function handlePayLater() {
    // For deposit/offline: mark payment as pending, booking stays confirmed
    setPaid(true);
    analytics.trackPaymentOutcome(service.payment_mode, "pay_later", displayAmount);
    if (onSuccess) onSuccess();
  }

  async function handlePayOnline() {
    setLoading(true);
    setError(null);
    try {
      // In production, this would create a PayMongo payment intent
      // and redirect to the GCash/checkout URL.
      // For now, simulate successful payment and record it.
      const { error: payError } = await supabase.from("payments").insert({
        booking_id: bookingId,
        provider: "paymongo",
        provider_ref: `pending-${Date.now()}`,
        type: service.payment_mode === "deposit" ? "deposit" : "full",
        amount_cents: displayAmount,
        status: "succeeded",
      });

      if (payError) throw payError;

      await supabase
        .from("bookings")
        .update({ status: "confirmed" })
        .eq("id", bookingId);

      setPaid(true);
      analytics.trackPaymentOutcome(service.payment_mode, "paid", displayAmount);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed. Please try again.");
      analytics.trackPaymentOutcome(service.payment_mode, "failed", displayAmount);
    } finally {
      setLoading(false);
    }
  }

  if (paid) {
    return (
      <Card className="border-green-500 bg-green-50 dark:bg-green-950">
        <CardContent className="p-6 text-center">
          <p className="mb-2 text-2xl">✓</p>
          <h3 className="mb-1 text-lg font-semibold">Booking confirmed!</h3>
          <p className="text-sm text-muted-foreground">
            {service.payment_mode === "free"
              ? "No payment needed."
              : `${formatCurrency(displayAmount)} has been processed.`}
          </p>
          <p className="text-xs text-muted-foreground">
            Reference: {bookingId.slice(0, 8)}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-medium">
        {service.payment_mode === "deposit" ? "Deposit required" : "Complete payment"}
      </h3>

      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Amount</span>
            <span className="text-lg font-bold">{formatCurrency(displayAmount)}</span>
          </div>
          {service.payment_mode === "deposit" && (
            <p className="mt-1 text-xs text-muted-foreground">
              {formatCurrency(service.price_cents)} total — remaining balance due at arrival
            </p>
          )}
        </CardContent>
      </Card>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="flex gap-2">
        {onBack && (
          <Button type="button" variant="outline" onClick={onBack} className="flex-1">
            Back
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={handlePayLater}
          className="flex-1"
          disabled={loading}
        >
          Pay at venue
        </Button>
        <Button
          type="button"
          onClick={handlePayOnline}
          className="flex-1"
          disabled={loading}
        >
          {loading ? "Processing..." : `Pay ${formatCurrency(displayAmount)}`}
        </Button>
      </div>
    </div>
  );
}
