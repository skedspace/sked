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
}: {
  orgId: string;
  isOwner: boolean;
  currentPlan: string;
  subscription: Subscription;
  usageCount: number;
}) {
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const currentPlanConfig = getPlan(currentPlan);

  async function handleUpgrade(planId: PlanId) {
    setLoading(true);
    setError(null);

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

    // Upsert subscription record
    if (subscription) {
      await supabase
        .from("subscriptions")
        .update({
          plan: planId,
          status: "active",
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq("id", subscription.id);
    } else {
      await supabase.from("subscriptions").insert({
        org_id: orgId,
        plan: planId,
        status: "active",
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    setLoading(false);
    router.refresh();
  }

  const planIds: PlanId[] = ["free", "starter", "pro"];

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
                  /{currentPlanConfig.bookingLimitMonthly === 99999
                    ? "∞"
                    : currentPlanConfig.bookingLimitMonthly}{" "}
                  bookings
                </span>
              </p>
            </div>
            <Badge
              variant={
                usageCount >= currentPlanConfig.bookingLimitMonthly * 0.8
                  ? "destructive"
                  : usageCount >= currentPlanConfig.bookingLimitMonthly * 0.5
                    ? "secondary"
                    : "default"
              }
            >
              {Math.round((usageCount / currentPlanConfig.bookingLimitMonthly) * 100)}%
            </Badge>
          </div>

          {subscription && (
            <div className="text-xs text-muted-foreground">
              Period:{" "}
              {new Date(subscription.current_period_start).toLocaleDateString()} —{" "}
              {new Date(subscription.current_period_end).toLocaleDateString()}
              &middot; Status: {subscription.status}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plan cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {planIds.map((planId) => {
          const plan = PLANS[planId];
          const isCurrent = planId === currentPlan;
          const isDowngrade = planIds.indexOf(planId) < planIds.indexOf(currentPlan as PlanId);

          return (
            <Card
              key={planId}
              className={`relative flex flex-col ${
                isCurrent
                  ? "border-primary ring-1 ring-primary"
                  : selectedPlan === planId
                    ? "border-primary/50"
                    : ""
              }`}
            >
              <CardHeader>
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <p className="mt-2 text-3xl font-bold">
                  ₱{(plan.priceMonthlyCents / 100).toLocaleString("en-PH")}
                  <span className="text-base font-normal text-muted-foreground">/mo</span>
                </p>
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
                    Current plan
                  </Button>
                ) : isOwner ? (
                  <Button
                    variant={isDowngrade ? "outline" : "default"}
                    className="mt-auto w-full"
                    disabled={loading}
                    onClick={() => handleUpgrade(planId)}
                  >
                    {loading
                      ? "Updating..."
                      : isDowngrade
                        ? "Downgrade"
                        : "Upgrade"}
                  </Button>
                ) : (
                  <p className="mt-auto text-center text-xs text-muted-foreground">
                    Contact an owner to upgrade
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
