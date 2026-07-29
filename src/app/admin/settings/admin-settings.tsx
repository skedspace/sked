"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_MONTHLY_PRICE_CENTS } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AdminSettings({ config }: { config: Record<string, string> }) {
  const [priceCents, setPriceCents] = useState(
    config.monthly_price_cents ?? String(DEFAULT_MONTHLY_PRICE_CENTS),
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const supabase = createClient();

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    const { error } = await supabase.rpc("set_config", {
      p_key: "monthly_price_cents",
      p_value: priceCents,
      p_description: "Monthly subscription price in cents.",
    });

    setSaving(false);

    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage("Saved. The new price will be used across the platform.");
    }
  }

  const pricePesos = (Number(priceCents) / 100).toLocaleString("en-PH");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Platform-wide configuration.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pricing</CardTitle>
          <CardDescription>
            Configure the monthly subscription price. This is used across all
            organizations. Current display price: ₱{pricePesos}/mo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-xs space-y-2">
            <Label htmlFor="monthly-price">Monthly price (cents)</Label>
            <Input
              id="monthly-price"
              type="number"
              min={0}
              value={priceCents}
              onChange={(e) => setPriceCents(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              In cents (e.g. 129900 = ₱1,299). Default:{" "}
              {DEFAULT_MONTHLY_PRICE_CENTS}
            </p>
          </div>

          <Button onClick={handleSave} disabled={saving}>
            <Save />
            {saving ? "Saving..." : "Save"}
          </Button>

          {message && (
            <p
              className={`text-sm ${
                message.startsWith("Error") ? "text-destructive" : "text-green-600"
              }`}
            >
              {message}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
