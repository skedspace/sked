"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Toast, ToastProvider, ToastViewport } from "@/components/ui/toast";

export function OrgSettingsForm({ orgId }: { orgId: string }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [loadingForm, setLoadingForm] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      setLoadingForm(true);
      const { data } = await supabase
        .from("organizations")
        .select("name, slug, contact_email")
        .eq("id", orgId)
        .single();
      if (data) {
        setName(data.name);
        setSlug(data.slug);
        setContactEmail(data.contact_email ?? "");
      }
      setLoadingForm(false);
    }
    load();
  }, [orgId, supabase]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: saveError } = await supabase
      .from("organizations")
      .update({ name, contact_email: contactEmail || null })
      .eq("id", orgId);
    setLoading(false);
    if (saveError) {
      setError(saveError.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingForm ? (
            <>
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-10 w-full rounded-[12px]" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <div className="flex items-center gap-1">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-10 flex-1 rounded-[12px]" />
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-10 w-full rounded-[12px]" />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Business name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Page link</Label>
                <div className="flex items-center gap-1 text-sm">
                  <span className="text-muted-foreground">sked.space/p/</span>
                  <Input id="slug" value={slug} disabled className="bg-muted" />
                </div>
                <p className="text-xs text-muted-foreground">Slug can only be set once.</p>
              </div>
              <div className="space-y-2">
                <Label>Your page URLs</Label>
                <div className="space-y-1 rounded-lg border bg-muted/30 p-3 text-sm">
                  <p>
                    <span className="text-muted-foreground">Main: </span>
                    <span>sked.space/p/{slug || "…"}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Short: </span>
                    <span>{slug || "…"}.sked.space</span>
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Contact email</Label>
                <Input
                  id="email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="marco@example.com"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {loadingForm ? (
        <Skeleton className="h-10 w-32 rounded-[12px]" />
      ) : (
        <>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <Button type="submit" disabled={loading}>
            {saved ? "Saved!" : loading ? "Saving..." : "Save changes"}
          </Button>
        </>
      )}
    </form>
  );
}
