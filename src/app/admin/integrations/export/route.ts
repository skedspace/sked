import { NextRequest } from "next/server";
import { readPlatformConfig } from "@/lib/platform-config";

export const dynamic = "force-dynamic";

function csv(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export async function GET(request: NextRequest) {
  const config = await readPlatformConfig();
  const from = request.nextUrl.searchParams.get("from") || "";
  const to = request.nextUrl.searchParams.get("to") || "";
  const integrationRows = config.rows.filter((row) => row.key.startsWith("integration_") || row.key === "platform_webhook_endpoints");
  const rows = [
    ["report_from", from],
    ["report_to", to],
    ["configuration_source", config.source],
    ["database_connected", config.databaseHealthy],
    [],
    ["key", "value", "updated_at"],
    ...integrationRows.map((row) => [
      row.key,
      row.key === "platform_webhook_endpoints" ? `${JSON.parse(row.value || "[]").length} endpoint(s)` : row.value,
      row.updated_at || "",
    ]),
  ];
  return new Response(`\uFEFF${rows.map((row) => row.map(csv).join(",")).join("\r\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sked-integrations-${from || "all"}-${to || "current"}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
