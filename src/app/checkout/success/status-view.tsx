"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock3, CircleX } from "lucide-react";

type Status = "pending" | "paid" | "failed" | "expired" | "canceled";

export function CheckoutStatusView({ checkoutId }: { checkoutId: string }) {
  const [status, setStatus] = useState<Status>("pending");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    let attempts = 0;
    const check = async () => {
      try {
        const response = await fetch(`/api/platform-subscriptions/status?checkout_id=${encodeURIComponent(checkoutId)}`, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Could not verify payment.");
        if (active) setStatus(data.status);
        attempts += 1;
        if (active && data.status === "pending" && attempts < 30) setTimeout(check, 2000);
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "Could not verify payment.");
      }
    };
    check();
    return () => { active = false; };
  }, [checkoutId]);

  const paid = status === "paid";
  const pending = status === "pending";
  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f6ef] p-6">
      <section className="w-full max-w-lg rounded-3xl border border-black/10 bg-white p-8 text-center shadow-xl">
        <span className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${paid ? "bg-lime-100 text-lime-700" : pending ? "bg-cyan-100 text-cyan-700" : "bg-red-100 text-red-700"}`}>
          {paid ? <CheckCircle2 /> : pending ? <Clock3 className="animate-pulse" /> : <CircleX />}
        </span>
        <h1 className="mt-6 text-3xl font-black tracking-tight">
          {paid ? "Premium is active" : pending ? "Confirming your payment" : "Payment not completed"}
        </h1>
        <p className="mt-3 text-muted-foreground">
          {paid
            ? "Your verified payment has been recorded and your organization now has Premium access."
            : pending
              ? "PayMongo has returned you to SKED. We are waiting for the signed payment webhook before granting access."
              : `This checkout is ${status}. Your organization was not upgraded.`}
        </p>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        <Link href={paid ? "/dashboard" : "/pricing"} className="mt-8 inline-flex rounded-full bg-[#171a16] px-6 py-3 text-sm font-bold text-white">
          {paid ? "Open dashboard" : "Return to pricing"}
        </Link>
      </section>
    </main>
  );
}
