"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function EmbedSnippet({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://sked.space";

  const snippet = `<script src="${appUrl}/embed.js" data-slug="${slug}"></script>`;

  async function handleCopy() {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Embed code</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Copy this code and paste it into your website&apos;s HTML where you
            want the booking widget to appear.
          </p>

          <div className="relative">
            <pre className="overflow-x-auto rounded-lg border bg-muted p-4 text-xs">
              <code>{snippet}</code>
            </pre>
          </div>

          <Button onClick={handleCopy}>
            {copied ? "Copied!" : "Copy to clipboard"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Customization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Add optional attributes to customize the widget:
          </p>
          <div className="space-y-2 rounded-lg border p-3">
            <code className="text-xs">
              data-button-text="Book a session"
            </code>
            <p className="text-xs text-muted-foreground">
              Changes the button text (default: &ldquo;Book now&rdquo;)
            </p>
          </div>
          <div className="space-y-2 rounded-lg border p-3">
            <code className="text-xs">data-primary="#ff6b4a"</code>
            <p className="text-xs text-muted-foreground">
              Changes the button color (default: SKED lime)
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Example:{" "}
            <code className="text-xs">
              {`<script src="${appUrl}/embed.js" data-slug="${slug}" data-button-text="Book a court" data-primary="#b9f34b"></script>`}
            </code>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            This is how the widget will look on your site:
          </p>
          <div className="flex justify-center rounded-lg border bg-white p-6">
            <iframe
              src={`/embed/${slug}`}
              className="h-[520px] w-full max-w-[400px] rounded-xl border shadow-lg"
              title="SKED booking widget preview"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
