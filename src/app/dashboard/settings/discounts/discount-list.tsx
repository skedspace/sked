"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createDiscountCode, toggleDiscountCode, deleteDiscountCode } from "@/lib/discount-actions";
import { formatDiscountValue, generateCode } from "@/lib/discounts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

type DiscountCode = {
  id: string;
  code: string;
  type: string;
  value_percent: number | null;
  value_cents: number | null;
  max_uses: number | null;
  current_uses: number;
  min_cents: number | null;
  max_discount_cents: number | null;
  expires_at: string | null;
  is_active: boolean;
  description: string | null;
  starts_at: string;
  created_at: string;
};

export function DiscountList({
  discounts,
  orgId,
  isOwner,
}: {
  discounts: DiscountCode[];
  orgId: string;
  isOwner: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  async function handleToggle(code: DiscountCode) {
    await toggleDiscountCode(code.id, !code.is_active);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this discount code? Bookings already using it won't be affected.")) return;
    await deleteDiscountCode(id);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* Create button */}
      {isOwner && (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>Create discount code</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create discount code</DialogTitle>
            </DialogHeader>
            <CreateDiscountForm orgId={orgId} onDone={() => { setIsOpen(false); router.refresh(); }} />
          </DialogContent>
        </Dialog>
      )}

      {/* List */}
      {discounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="mb-1 font-medium">No discount codes yet</p>
            <p className="mb-4 text-sm text-muted-foreground">
              Create your first promo code to attract more bookings.
            </p>
            {isOwner && (
              <Button variant="outline" onClick={() => setIsOpen(true)}>
                Create discount code
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {discounts.map((code) => (
            <Card key={code.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold tracking-wider">
                      {code.code}
                    </span>
                    <Badge variant={code.is_active ? "default" : "secondary"}>
                      {code.is_active ? "Active" : "Disabled"}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {formatDiscountValue(code.type as "percentage" | "fixed", code.value_percent, code.value_cents)}
                    {code.description && ` — ${code.description}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Used {code.current_uses}
                    {code.max_uses ? ` / ${code.max_uses}` : ""}
                    {code.expires_at && ` · Expires ${new Date(code.expires_at).toLocaleDateString()}`}
                  </p>
                </div>
                {isOwner && (
                  <div className="ml-4 flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggle(code)}
                    >
                      {code.is_active ? "Disable" : "Enable"}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(code.id)}
                    >
                      Delete
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateDiscountForm({ orgId, onDone }: { orgId: string; onDone: () => void }) {
  const [type, setType] = useState<"percentage" | "fixed">("percentage");
  const [code, setCode] = useState(generateCode());
  const [valuePercent, setValuePercent] = useState("10");
  const [valueCents, setValueCents] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxDiscount, setMaxDiscount] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const fd = new FormData();
    fd.set("org_id", orgId);
    fd.set("code", code);
    fd.set("type", type);
    fd.set("description", description);
    if (type === "percentage") fd.set("value_percent", valuePercent);
    else fd.set("value_cents", valueCents);
    if (maxUses) fd.set("max_uses", maxUses);
    if (minAmount) fd.set("min_cents", minAmount);
    if (maxDiscount) fd.set("max_discount_cents", maxDiscount);
    if (expiresAt) fd.set("expires_at", expiresAt);

    const result = await createDiscountCode(fd);
    setSaving(false);

    if (result.error) {
      setError(result.error);
    } else {
      onDone();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Code */}
      <div className="space-y-2">
        <Label htmlFor="code">Code</Label>
        <div className="flex gap-2">
          <Input
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="SUMMER20"
            className="font-mono uppercase"
            required
          />
          <Button type="button" variant="outline" size="sm" onClick={() => setCode(generateCode())}>
            Generate
          </Button>
        </div>
      </div>

      {/* Type toggle */}
      <div className="space-y-2">
        <Label>Discount type</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={type === "percentage" ? "default" : "outline"}
            size="sm"
            onClick={() => setType("percentage")}
          >
            Percentage
          </Button>
          <Button
            type="button"
            variant={type === "fixed" ? "default" : "outline"}
            size="sm"
            onClick={() => setType("fixed")}
          >
            Fixed amount
          </Button>
        </div>
      </div>

      {/* Value */}
      <div className="space-y-2">
        <Label htmlFor="value">
          {type === "percentage" ? "Discount percentage" : "Discount amount (₱)"}
        </Label>
        {type === "percentage" ? (
          <Input
            id="value"
            type="number"
            min={1}
            max={100}
            value={valuePercent}
            onChange={(e) => setValuePercent(e.target.value)}
            placeholder="10"
            required
          />
        ) : (
          <Input
            id="value"
            type="number"
            min={0}
            step="0.01"
            value={valueCents}
            onChange={(e) => setValueCents(e.target.value)}
            placeholder="100"
            required
          />
        )}
      </div>

      {/* Limits */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="max-uses">Max uses (optional)</Label>
          <Input
            id="max-uses"
            type="number"
            min={1}
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            placeholder="No limit"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="min-amount">Min booking amount (₱)</Label>
          <Input
            id="min-amount"
            type="number"
            min={0}
            step="0.01"
            value={minAmount}
            onChange={(e) => setMinAmount(e.target.value)}
            placeholder="None"
          />
        </div>
        {type === "percentage" && (
          <div className="space-y-2">
            <Label htmlFor="max-discount">Max discount (₱)</Label>
            <Input
              id="max-discount"
              type="number"
              min={0}
              step="0.01"
              value={maxDiscount}
              onChange={(e) => setMaxDiscount(e.target.value)}
              placeholder="No cap"
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="expires">Expires (optional)</Label>
          <Input
            id="expires"
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="desc">Description (internal)</Label>
        <Input
          id="desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Summer campaign 2026"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? "Creating..." : "Create discount code"}
      </Button>
    </form>
  );
}
