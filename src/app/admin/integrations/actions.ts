"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertSuperAdmin } from "@/lib/admin-access";
import { readPlatformConfig, savePlatformConfig } from "@/lib/platform-config";

export type WebhookEndpoint = {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

type ActionResult = {
  ok: boolean;
  message: string;
};

const endpointSchema = z.object({
  url: z.string().url().refine((value) => {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  }, "Use HTTPS for external webhook endpoints."),
  events: z.array(z.enum([
    "subscription.created",
    "subscription.renewed",
    "subscription.cancelled",
    "payment.succeeded",
    "payment.failed",
  ])).min(1, "Select at least one event."),
});

function parseEndpoints(value: string | undefined): WebhookEndpoint[] {
  try {
    const parsed = JSON.parse(value || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is WebhookEndpoint =>
      Boolean(item && typeof item.id === "string" && typeof item.url === "string" && Array.isArray(item.events)),
    );
  } catch {
    return [];
  }
}

async function endpoints() {
  const config = await readPlatformConfig();
  return parseEndpoints(config.rows.find((row) => row.key === "platform_webhook_endpoints")?.value);
}

async function persistEndpoints(value: WebhookEndpoint[]): Promise<ActionResult> {
  const result = await savePlatformConfig(
    "platform_webhook_endpoints",
    JSON.stringify(value),
    "Administrator-managed outbound platform webhook endpoints.",
  );
  revalidatePath("/admin/integrations");
  return {
    ok: result.persisted,
    message: result.persisted
      ? result.source === "database"
        ? "Webhook settings saved to Supabase."
        : "Webhook settings saved to the local preview store."
      : result.error || "Webhook settings could not be saved.",
  };
}

export async function addWebhookEndpointAction(input: {
  url: string;
  events: string[];
}): Promise<ActionResult> {
  const access = await assertSuperAdmin();
  if (!access.ok) return { ok: false, message: access.error };
  const parsed = endpointSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message || "Invalid endpoint." };

  const current = await endpoints();
  if (current.some((endpoint) => endpoint.url.toLowerCase() === parsed.data.url.toLowerCase())) {
    return { ok: false, message: "That webhook endpoint already exists." };
  }

  const now = new Date().toISOString();
  return persistEndpoints([
    ...current,
    {
      id: crypto.randomUUID(),
      url: parsed.data.url,
      events: parsed.data.events,
      active: true,
      createdAt: now,
      updatedAt: now,
    },
  ]);
}

export async function toggleWebhookEndpointAction(id: string): Promise<ActionResult> {
  const access = await assertSuperAdmin();
  if (!access.ok) return { ok: false, message: access.error };
  const current = await endpoints();
  if (!current.some((endpoint) => endpoint.id === id)) return { ok: false, message: "Webhook endpoint not found." };
  const now = new Date().toISOString();
  return persistEndpoints(current.map((endpoint) =>
    endpoint.id === id ? { ...endpoint, active: !endpoint.active, updatedAt: now } : endpoint,
  ));
}

export async function deleteWebhookEndpointAction(id: string): Promise<ActionResult> {
  const access = await assertSuperAdmin();
  if (!access.ok) return { ok: false, message: access.error };
  const current = await endpoints();
  if (!current.some((endpoint) => endpoint.id === id)) return { ok: false, message: "Webhook endpoint not found." };
  return persistEndpoints(current.filter((endpoint) => endpoint.id !== id));
}

export async function setPayMongoEnabledAction(enabled: boolean): Promise<ActionResult> {
  const access = await assertSuperAdmin();
  if (!access.ok) return { ok: false, message: access.error };
  if (enabled && (!process.env.PAYMONGO_SECRET_KEY || !process.env.PAYMONGO_PUBLIC_KEY)) {
    return { ok: false, message: "Add both PayMongo server environment keys before enabling the gateway." };
  }
  const result = await savePlatformConfig(
    "integration_paymongo_enabled",
    String(enabled),
    "Whether the SKED platform subscription PayMongo gateway is enabled.",
  );
  revalidatePath("/admin/integrations");
  revalidatePath("/admin/platform-settings");
  return {
    ok: result.persisted,
    message: result.persisted
      ? `${enabled ? "Enabled" : "Disabled"} PayMongo${result.source === "local" ? " in the local preview store" : ""}.`
      : result.error || "PayMongo settings could not be saved.",
  };
}

export async function testPayMongoConnectionAction(): Promise<ActionResult> {
  const access = await assertSuperAdmin();
  if (!access.ok) return { ok: false, message: access.error };
  const secret = process.env.PAYMONGO_SECRET_KEY;
  if (!secret) return { ok: false, message: "PAYMONGO_SECRET_KEY is not configured on the server." };

  try {
    const response = await fetch("https://api.paymongo.com/v1/webhooks", {
      headers: { Authorization: `Basic ${Buffer.from(`${secret}:`).toString("base64")}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return { ok: false, message: `PayMongo rejected the credentials (${response.status}).` };
    await savePlatformConfig("integration_paymongo_last_sync_at", new Date().toISOString(), "Last successful PayMongo credential check.");
    revalidatePath("/admin/integrations");
    return { ok: true, message: "PayMongo connection verified successfully." };
  } catch {
    return { ok: false, message: "PayMongo could not be reached. Check the server network and credentials." };
  }
}
