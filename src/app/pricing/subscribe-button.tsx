"use client";

import { useState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";

export function SubscribeButton({
  termMonths,
  className,
  children,
}: {
  termMonths: number;
  className: string;
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function startCheckout() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/platform-subscriptions/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({ termMonths }),
      });
      if (response.status === 401 || response.status === 403) {
        window.location.href = `/signup?plan=premium&billing=${termMonths === 1 ? "monthly" : "annual"}&term=${termMonths}`;
        return;
      }
      const data = await response.json();
      if (!response.ok || !data.checkoutUrl) throw new Error(data.error ?? "Checkout could not be started.");
      window.location.href = data.checkoutUrl;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Checkout could not be started.");
      setLoading(false);
    }
  }
  return (
    <div>
      <button type="button" onClick={startCheckout} disabled={loading} className={className}>
        {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : children}
        {!loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
      </button>
      {error && <p className="mt-2 text-center text-xs text-red-600">{error}</p>}
    </div>
  );
}
