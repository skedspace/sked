"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { performDraw, createCommitment } from "@/lib/campaigns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";

type Campaign = {
  id: string;
  name: string;
  description: string | null;
  prize: string;
  prize_cents: number;
  starts_at: string;
  ends_at: string;
  draw_type: string;
  draw_nonce?: string | null;
  draw_block_hash?: string | null;
  winner_count: number;
  status: string;
  max_entries_per_person: number;
};

const statusColors: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "secondary",
  active: "default",
  drawn: "outline",
  cancelled: "destructive",
};

export function CampaignsList({
  campaigns,
  orgId,
  isOwner,
}: {
  campaigns: Campaign[];
  orgId: string;
  isOwner: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [prize, setPrize] = useState("");
  const [prizeCents, setPrizeCents] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [winnerCount, setWinnerCount] = useState("1");
  const [maxEntries, setMaxEntries] = useState("1");
  const [drawType, setDrawType] = useState<"standard" | "provably_fair">("standard");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const { error: createError } = await supabase.from("campaigns").insert({
      org_id: orgId,
      name,
      description: description || null,
      prize,
      prize_cents: Math.round(parseFloat(prizeCents) * 100),
      ends_at: new Date(endsAt).toISOString(),
      winner_count: parseInt(winnerCount, 10),
      max_entries_per_person: parseInt(maxEntries, 10),
      draw_type: drawType,
    });

    setSaving(false);
    if (createError) {
      setError(createError.message);
    } else {
      setOpen(false);
      setName(""); setDescription(""); setPrize(""); setPrizeCents("");
      setEndsAt(""); setWinnerCount("1"); setMaxEntries("1");
      router.refresh();
    }
  }

  async function handleActivate(id: string) {
    await supabase.from("campaigns").update({ status: "active" }).eq("id", id);
    router.refresh();
  }

  async function handleDraw(campaign: Campaign) {
    if (!confirm(`Run the draw for "${campaign.name}"? This will select ${campaign.winner_count} winner(s).`)) return;

    const { data: entries } = await supabase
      .from("campaign_entries")
      .select("id, customer_name")
      .eq("campaign_id", campaign.id)
      .eq("otp_verified", true);

    if (!entries || entries.length === 0) {
      alert("No verified entries to draw from.");
      return;
    }

    if (entries.length < campaign.winner_count) {
      alert(`Only ${entries.length} entries. Need at least ${campaign.winner_count} for a draw.`);
      return;
    }

    const nonce = crypto.randomUUID();
    // In production, use a real Bitcoin block hash. For now, use a random hash.
    const blockHash = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const winners = await performDraw(entries, nonce, blockHash, campaign.winner_count);

    // Mark winners
    for (const w of winners) {
      await supabase
        .from("campaign_entries")
        .update({ is_winner: true, winner_position: winners.indexOf(w) + 1 })
        .eq("id", w.entryId);
    }

    // Update campaign
    const commitment = await createCommitment(nonce, blockHash);
    await supabase
      .from("campaigns")
      .update({
        status: "drawn",
        draw_nonce: nonce,
        draw_block_hash: blockHash,
        draw_commitment: commitment,
      })
      .eq("id", campaign.id);

    router.refresh();
  }

  async function handleCancel(id: string) {
    if (!confirm("Cancel this campaign?")) return;
    await supabase.from("campaigns").update({ status: "cancelled" }).eq("id", id);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {isOwner && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Create campaign</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create campaign</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="c-name">Campaign name</Label>
                <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Summer Giveaway" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-desc">Description (optional)</Label>
                <Input id="c-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Win a free session!" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="c-prize">Prize name</Label>
                  <Input id="c-prize" value={prize} onChange={(e) => setPrize(e.target.value)} required placeholder="e.g. 1 Month Free" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-prize-value">Prize value (₱)</Label>
                  <Input id="c-prize-value" type="number" min={0} step="0.01" value={prizeCents} onChange={(e) => setPrizeCents(e.target.value)} placeholder="0" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="c-ends">End date</Label>
                  <Input id="c-ends" type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-winners">Number of winners</Label>
                  <Input id="c-winners" type="number" min={1} value={winnerCount} onChange={(e) => setWinnerCount(e.target.value)} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="c-entries">Max entries per person</Label>
                  <Input id="c-entries" type="number" min={1} value={maxEntries} onChange={(e) => setMaxEntries(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Draw type</Label>
                  <div className="flex gap-2 pt-1">
                    <Button type="button" variant={drawType === "standard" ? "default" : "outline"} size="sm" onClick={() => setDrawType("standard")}>Standard</Button>
                    <Button type="button" variant={drawType === "provably_fair" ? "default" : "outline"} size="sm" onClick={() => setDrawType("provably_fair")}>Provably Fair</Button>
                  </div>
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={saving} className="w-full">
                {saving ? "Creating..." : "Create campaign"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="mb-1 font-medium">No campaigns yet</p>
            <p className="mb-4 text-sm text-muted-foreground">
              Create giveaways and raffles to attract more customers.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {campaigns.map((camp) => {
            const entryCount = 0; // Would fetch count from DB
            return (
              <Card key={camp.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{camp.name}</h3>
                        <Badge variant={statusColors[camp.status] ?? "outline"}>
                          {camp.status}
                        </Badge>
                      </div>
                      {camp.description && (
                        <p className="mt-0.5 text-sm text-muted-foreground">{camp.description}</p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>Prize: {camp.prize} ({formatCurrency(camp.prize_cents)})</span>
                        <span>Ends: {new Date(camp.ends_at).toLocaleDateString()}</span>
                        <span>Winners: {camp.winner_count}</span>
                        <span>Entries/person: {camp.max_entries_per_person}</span>
                        {camp.draw_type === "provably_fair" && <span>🔐 Provably fair</span>}
                      </div>
                    </div>
                    {isOwner && camp.status === "draft" && (
                      <div className="ml-4 flex gap-1">
                        <Button size="sm" onClick={() => handleActivate(camp.id)}>Activate</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleCancel(camp.id)}>Cancel</Button>
                      </div>
                    )}
                    {isOwner && camp.status === "active" && (
                      <div className="ml-4 flex gap-1">
                        <Button size="sm" onClick={() => handleDraw(camp)}>Draw winners</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleCancel(camp.id)}>Cancel</Button>
                      </div>
                    )}
                    {camp.status === "drawn" && camp.draw_nonce && (
                      <div className="ml-4 max-w-[200px] truncate text-xs text-muted-foreground">
                        <p title={`Nonce: ${camp.draw_nonce}`}>Nonce: {camp.draw_nonce.slice(0, 16)}...</p>
                        {camp.draw_block_hash && (
                          <p title={`Block: ${camp.draw_block_hash}`}>Block: {camp.draw_block_hash.slice(0, 16)}...</p>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
