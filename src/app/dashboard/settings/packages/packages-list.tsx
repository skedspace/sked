"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";

type Package = {
  id: string;
  name: string;
  description: string | null;
  service_id: string | null;
  session_count: number;
  price_cents: number;
  duration_days: number | null;
  is_active: boolean;
  services?: { name: string } | null;
};

export function PackagesList({
  packages,
  orgId,
  isOwner,
}: {
  packages: Package[];
  orgId: string;
  isOwner: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sessionCount, setSessionCount] = useState("10");
  const [priceCents, setPriceCents] = useState("");
  const [durationDays, setDurationDays] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const { error: createError } = await supabase.from("packages").insert({
      org_id: orgId,
      name,
      description: description || null,
      session_count: parseInt(sessionCount, 10),
      price_cents: Math.round(parseFloat(priceCents) * 100),
      duration_days: durationDays ? parseInt(durationDays, 10) : null,
    });

    setSaving(false);
    if (createError) {
      setError(createError.message);
    } else {
      setOpen(false);
      setName("");
      setDescription("");
      setSessionCount("10");
      setPriceCents("");
      setDurationDays("");
      router.refresh();
    }
  }

  async function handleToggle(id: string, isActive: boolean) {
    await supabase.from("packages").update({ is_active: !isActive }).eq("id", id);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {isOwner && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Create package</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create session package</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pkg-name">Package name</Label>
                <Input id="pkg-name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. 10-Session Pass" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pkg-desc">Description (optional)</Label>
                <Input id="pkg-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Valid for all services" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pkg-sessions">Number of sessions</Label>
                  <Input id="pkg-sessions" type="number" min={1} value={sessionCount} onChange={(e) => setSessionCount(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pkg-price">Total price (₱)</Label>
                  <Input id="pkg-price" type="number" min={0} step="0.01" value={priceCents} onChange={(e) => setPriceCents(e.target.value)} required placeholder="5000" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pkg-duration">Validity (days, optional)</Label>
                <Input id="pkg-duration" type="number" min={1} value={durationDays} onChange={(e) => setDurationDays(e.target.value)} placeholder="Leave empty for no expiry" />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={saving} className="w-full">
                {saving ? "Creating..." : "Create package"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {packages.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          No packages yet. Create prepaid session bundles for your customers.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => (
            <Card key={pkg.id}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base">{pkg.name}</CardTitle>
                  {pkg.description && (
                    <p className="mt-0.5 text-sm text-muted-foreground">{pkg.description}</p>
                  )}
                </div>
                <Badge variant={pkg.is_active ? "default" : "secondary"}>
                  {pkg.is_active ? "Active" : "Inactive"}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sessions</span>
                  <span className="font-medium">{pkg.session_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price</span>
                  <span className="font-medium">{formatCurrency(pkg.price_cents)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Per session</span>
                  <span className="font-medium">
                    {formatCurrency(Math.round(pkg.price_cents / pkg.session_count))}
                  </span>
                </div>
                {pkg.duration_days && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valid for</span>
                    <span className="font-medium">{pkg.duration_days} days</span>
                  </div>
                )}
                {isOwner && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 w-full"
                    onClick={() => handleToggle(pkg.id, pkg.is_active)}
                  >
                    {pkg.is_active ? "Deactivate" : "Activate"}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
