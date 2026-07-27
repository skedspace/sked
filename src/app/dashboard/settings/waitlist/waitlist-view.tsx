"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type WaitlistEntry = {
  id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  desired_date: string;
  desired_start_time: string;
  status: string;
  notified_at: string | null;
  created_at: string;
  services: { name: string } | null;
  resources: { name: string } | null;
};

const statusColors: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  waiting: "default",
  notified: "secondary",
  expired: "outline",
  cancelled: "destructive",
};

export function WaitlistView({
  entries,
  isOwner,
}: {
  entries: WaitlistEntry[];
  isOwner: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();

  async function handleCancel(id: string) {
    await supabase
      .from("waitlist_entries")
      .update({ status: "cancelled" })
      .eq("id", id);
    router.refresh();
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <p className="mb-1 font-medium">No waitlist entries</p>
          <p className="text-sm text-muted-foreground">
            When customers try to book a taken slot, they can join the waitlist.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <Card key={entry.id}>
          <CardContent className="flex items-center justify-between p-4">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{entry.customer_name}</p>
              <p className="text-sm text-muted-foreground">
                {entry.services?.name ?? "—"} &middot;{" "}
                {entry.resources?.name ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(entry.desired_date).toLocaleDateString()} at{" "}
                {entry.desired_start_time.slice(0, 5)}
                {entry.customer_email && ` · ${entry.customer_email}`}
                {entry.customer_phone && ` · ${entry.customer_phone}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={statusColors[entry.status] ?? "outline"}>
                {entry.status}
              </Badge>
              {entry.status === "waiting" && isOwner && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleCancel(entry.id)}
                >
                  Remove
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
