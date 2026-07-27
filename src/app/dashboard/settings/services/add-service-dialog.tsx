"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Resource = { id: string; name: string };

export function AddServiceDialog({
  orgId,
  resources,
}: {
  orgId: string;
  resources: Resource[];
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [durationMin, setDurationMin] = useState("60");
  const [priceCents, setPriceCents] = useState("0");
  const [bufferBefore, setBufferBefore] = useState("15");
  const [bufferAfter, setBufferAfter] = useState("15");
  const [paymentMode, setPaymentMode] = useState("free");
  const [depositType, setDepositType] = useState("fixed");
  const [depositCents, setDepositCents] = useState("0");
  const [depositPercent, setDepositPercent] = useState("50");
  const [selectedResources, setSelectedResources] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { data: service, error: svcError } = await supabase
      .from("services")
      .insert({
        org_id: orgId,
        name,
        duration_min: parseInt(durationMin, 10),
        price_cents: parseInt(priceCents, 10),
        buffer_before_min: parseInt(bufferBefore, 10),
        buffer_after_min: parseInt(bufferAfter, 10),
        payment_mode: paymentMode,
        deposit_cents: paymentMode === "deposit"
          ? (depositType === "fixed"
              ? parseInt(depositCents, 10)
              : Math.round(parseInt(priceCents, 10) * parseInt(depositPercent, 10) / 100))
          : null,
      })
      .select("id")
      .single();

    if (svcError || !service) {
      setLoading(false);
      return;
    }

    // Link selected resources
    if (selectedResources.length > 0) {
      await supabase.from("service_resources").insert(
        selectedResources.map((rid) => ({
          service_id: service.id,
          resource_id: rid,
        })),
      );
    }

    setLoading(false);
    setOpen(false);
    setName("");
    setDurationMin("60");
    setPriceCents("0");
    setBufferBefore("15");
    setBufferAfter("15");
    setDepositCents("0");
    setDepositPercent("50");
    setSelectedResources([]);
    router.refresh();
  }

  function toggleResource(id: string) {
    setSelectedResources((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add service</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add service</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="svc-name">Service name</Label>
            <Input
              id="svc-name"
              placeholder="e.g. Court Rental (1 hr)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="svc-duration">Duration (min)</Label>
              <Input
                id="svc-duration"
                type="number"
                min={15}
                step={15}
                value={durationMin}
                onChange={(e) => setDurationMin(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="svc-price">Price (centavos)</Label>
              <Input
                id="svc-price"
                type="number"
                min={0}
                value={priceCents}
                onChange={(e) => setPriceCents(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="buf-before">Buffer before (min)</Label>
              <Input
                id="buf-before"
                type="number"
                min={0}
                value={bufferBefore}
                onChange={(e) => setBufferBefore(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="buf-after">Buffer after (min)</Label>
              <Input
                id="buf-after"
                type="number"
                min={0}
                value={bufferAfter}
                onChange={(e) => setBufferAfter(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Payment mode</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
            >
              <option value="free">Free booking (no payment)</option>
              <option value="deposit">Deposit required</option>
              <option value="full">Full prepayment</option>
            </select>
          </div>

          {paymentMode === "deposit" && (
            <div className="space-y-3 rounded-lg border p-4">
              <Label>Deposit amount</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`flex-1 rounded-md border px-3 py-2 text-sm ${depositType === "fixed" ? "border-primary bg-primary/10" : ""}`}
                  onClick={() => setDepositType("fixed")}
                >
                  Fixed amount
                </button>
                <button
                  type="button"
                  className={`flex-1 rounded-md border px-3 py-2 text-sm ${depositType === "percent" ? "border-primary bg-primary/10" : ""}`}
                  onClick={() => setDepositType("percent")}
                >
                  Percentage
                </button>
              </div>
              {depositType === "fixed" ? (
                <Input
                  type="number"
                  min={0}
                  value={depositCents}
                  onChange={(e) => setDepositCents(e.target.value)}
                  placeholder="Amount in centavos (e.g. 50000 = ₱500)"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={depositPercent}
                    onChange={(e) => setDepositPercent(e.target.value)}
                  />
                  <span className="text-sm text-muted-foreground">%
                    of total (₱{Math.round(parseInt(priceCents, 10) * parseInt(depositPercent || "0", 10) / 100 / 100)})</span>
                </div>
              )}
            </div>
          )}
          {resources.length > 0 && (
            <div className="space-y-2">
              <Label>Available at these resources</Label>
              <div className="space-y-1">
                {resources.map((r) => (
                  <label
                    key={r.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedResources.includes(r.id)}
                      onChange={() => toggleResource(r.id)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    {r.name}
                  </label>
                ))}
              </div>
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Adding..." : "Add service"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
