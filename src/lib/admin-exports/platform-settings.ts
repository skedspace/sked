import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type ConfigRow = { key: string; value: string; description: string | null; updated_at: string | null };
type QueryResult<T> = { data: T[] | null; error: unknown };

function cell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function dateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function asDate(value: string | null, fallback: Date, end = false) {
  const parsed = value ? new Date(`${value}T00:00:00`) : fallback;
  const result = Number.isNaN(parsed.getTime()) ? fallback : parsed;
  result.setHours(end ? 23 : 0, end ? 59 : 0, end ? 59 : 0, end ? 999 : 0);
  return result;
}

async function withTimeout<T>(promise: PromiseLike<unknown>, fallback: T, ms = 1600): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise.then((value) => value as T),
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function GET(request: NextRequest) {
  const today = new Date();
  const monthAgo = new Date(today);
  monthAgo.setDate(monthAgo.getDate() - 30);
  const from = asDate(request.nextUrl.searchParams.get("from"), monthAgo);
  const to = asDate(request.nextUrl.searchParams.get("to"), today, true);
  const supabase = createAdminClient();
  const { data } = await withTimeout<QueryResult<ConfigRow>>(
    supabase.from("app_config").select("key, value, description, updated_at").order("key"),
    { data: [], error: null },
  );
  const rows = [
    ["key", "value", "description", "updated_at"],
    ...((data ?? []) as ConfigRow[]).map((row) => [row.key, row.value, row.description ?? "", row.updated_at ?? ""]),
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(cell).join(",")).join("\r\n")}`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sked-settings-${dateKey(from)}-${dateKey(to)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
