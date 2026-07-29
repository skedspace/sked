"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PLANS, getPlan, type PlanId } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

type Subscription = {
  id: string;
  plan: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
} | null;

export function PlanManagement({
  orgId,
  isOwner,
  currentPlan,
  subscription,
  usageCount,
  monthlyPriceCents,
}: {
  orgId: string;
  isOwner: boolean;
  currentPlan: string;
  subscription: Subscription;
  usageCount: number;
  monthlyPriceCents: number;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const currentPlanConfig = getPlan(currentPlan);

  async function handleUpgrade(planId: PlanId) {
    setLoading(true);
    setError(null);
    const periodStart = new Date();
    const periodDays = planId === "trial" ? 14 : 30;
    const periodEnd = new Date(periodStart.getTime() + periodDays * 24 * 60 * 60 * 1000);

    // Update org plan
    const { error: orgError } = await supabase
      .from("organizations")
      .update({ plan: planId })
      .eq("id", orgId);

    if (orgError) {
      setError(orgError.message);
      setLoading(false);
      return;
    }

    // Preserve each plan period so platform conversion and churn reporting
    // remains cohort-accurate instead of losing the trial on upgrade.
    if (subscription && subscription.plan !== planId) {
      const { error: closeError } = await supabase
        .from("subscriptions")
        .update({
          status: "canceled",
          canceled_at: periodStart.toISOString(),
        })
        .eq("id", subscription.id);

      if (closeError) {
        setError(closeError.message);
        setLoading(false);
        return;
      }

      const { error: insertError } = await supabase.from("subscriptions").insert({
        org_id: orgId,
        plan: planId,
        status: "active",
        current_period_start: periodStart.toISOString(),
        current_period_end: periodEnd.toISOString(),
      });

      if (insertError) {
        setError(insertError.message);
        setLoading(false);
        return;
      }
    } else if (subscription) {
      const { error: renewError } = await supabase
        .from("subscriptions")
        .update({
          status: "active",
          current_period_start: periodStart.toISOString(),
          current_period_end: periodEnd.toISOString(),
          canceled_at: null,
        })
        .eq("id", subscription.id);

      if (renewError) {
        setError(renewError.message);
        setLoading(false);
        return;
      }
    } else {
      const { error: insertError } = await supabase.from("subscriptions").insert({
        org_id: orgId,
        plan: planId,
        status: "active",
        current_period_start: periodStart.toISOString(),
        current_period_end: periodEnd.toISOString(),
      });

      if (insertError) {
        setError(insertError.message);
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    router.refresh();
  }

  const planIds: PlanId[] = ["trial", "monthly"];

  return (
    <div className="space-y-8">
      {/* Current plan summary */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>
            Your organization is on the <strong>{currentPlanConfig.name}</strong> plan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Monthly usage</p>
              <p className="text-2xl font-bold">
                {usageCount}
                <span className="text-base font-normal text-muted-foreground">
                  /∞ bookings
                </span>
              </p>
            </div>
            <Badge variant="default">Unlimited</Badge>
          </div>

          {subscription && (
            <div className="text-xs text-muted-foreground">
              Period:{" "}
              {new Date(subscription.current_period_start).toLocaleDateString()} —{" "}
              {new Date(subscription.current_period_end).toLocaleDateString()}
              &middot; Status: {subscription.status}
            </div>
          )}

          {currentPlan === "trial" && !subscription && (
            <p className="text-sm text-amber-600">
              Your 14-day free trial is active. No limits during trial.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Plan cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {planIds.map((planId) => {
          const plan = PLANS[planId];
          const isCurrent = planId === currentPlan;

          // Override monthly price with admin-configured value
          const displayPriceCents =
            planId === "monthly" ? monthlyPriceCents : plan.priceMonthlyCents;

          return (
            <Card
              key={planId}
              className={`relative flex flex-col ${
                isCurrent
                  ? "border-primary ring-1 ring-primary"
                  : ""
              }`}
            >
              <CardHeader>
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <p className="mt-2 text-3xl font-bold">
                  {displayPriceCents === 0 ? (
                    "Free"
                  ) : (
                    <>
                      ₱{(displayPriceCents / 100).toLocaleString("en-PH")}
                      <span className="text-base font-normal text-muted-foreground">/mo</span>
                    </>
                  )}
                </p>
                {plan.trialDays && (
                  <p className="text-xs text-muted-foreground">
                    {plan.trialDays}-day trial, unlimited everything
                  </p>
                )}
              </CardHeader>
              <CardContent className="flex flex-1 flex-col space-y-4">
                <ul className="space-y-2 text-sm">
                  {plan.highlights.map((h) => (
                    <li key={h} className="flex items-center gap-2">
                      <span className="text-primary">✓</span>
                      {h}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <Button disabled className="mt-auto w-full">
                    {planId === "trial" ? "Current trial" : "Current plan"}
                  </Button>
                ) : isOwner ? (
                  <Button
                    variant={planId === "trial" ? "outline" : "default"}
                    className="mt-auto w-full"
                    disabled={loading}
                    onClick={() => handleUpgrade(planId)}
                  >
                    {loading
                      ? "Updating..."
                      : planId === "monthly"
                        ? "Subscribe now"
                        : "Switch to trial"}
                  </Button>
                ) : (
                  <p className="mt-auto text-center text-xs text-muted-foreground">
                    Contact an owner to change plan
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
