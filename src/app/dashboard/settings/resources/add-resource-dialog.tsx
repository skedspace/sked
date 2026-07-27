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

type Location = { id: string; name: string };

export function AddResourceDialog({
  orgId,
  locations,
}: {
  orgId: string;
  locations: Location[];
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [capacity, setCapacity] = useState("4");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("resources").insert({
      org_id: orgId,
      location_id: locationId,
      name,
      capacity: parseInt(capacity, 10),
    });
    setLoading(false);
    if (!error) {
      setOpen(false);
      setName("");
      setCapacity("4");
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add resource</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add resource</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="res-name">Resource name</Label>
            <Input
              id="res-name"
              placeholder="e.g. Court 1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="res-location">Location</Label>
            <select
              id="res-location"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              required
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="res-capacity">Capacity (people)</Label>
            <Input
              id="res-capacity"
              type="number"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Adding..." : "Add resource"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
