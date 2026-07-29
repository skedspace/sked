import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isDevAuthEnabled } from "@/lib/dev-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type PlatformConfigRow = {
  key: string;
  value: string;
  updated_at: string | null;
};

const localConfigPath = path.join(process.cwd(), ".next", "cache", "platform-settings-config.json");

async function withTimeout<T>(promise: PromiseLike<T>, ms = 1500): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Database request timed out.")), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function readLocalRows(): Promise<PlatformConfigRow[]> {
  try {
    const file = await readFile(localConfigPath, "utf8");
    const parsed = JSON.parse(file) as PlatformConfigRow[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeLocalRows(rows: PlatformConfigRow[]) {
  await mkdir(path.dirname(localConfigPath), { recursive: true });
  await writeFile(localConfigPath, JSON.stringify(rows, null, 2), "utf8");
}

export async function readPlatformConfig() {
  if (isDevAuthEnabled()) {
    const localRows = await readLocalRows();
    return { rows: localRows, databaseHealthy: false, source: "local" as const };
  }

  try {
    const supabase = createAdminClient();
    const result = await withTimeout(
      supabase.from("app_config").select("key, value, updated_at").limit(5000),
    );
    if (result.error) throw result.error;
    return {
      rows: (result.data ?? []) as PlatformConfigRow[],
      databaseHealthy: true,
      source: "database" as const,
    };
  } catch {
    return { rows: [], databaseHealthy: false, source: "database" as const };
  }
}

export async function savePlatformConfig(key: string, value: string, description: string) {
  const updatedAt = new Date().toISOString();

  if (isDevAuthEnabled()) {
    const localRows = await readLocalRows();
    const nextRows = [
      ...localRows.filter((row) => row.key !== key),
      { key, value, updated_at: updatedAt },
    ];
    await writeLocalRows(nextRows);
    return { persisted: true, source: "local" as const };
  }

  try {
    const supabase = createAdminClient();
    const result = await withTimeout(
      supabase.rpc("set_config", {
        p_key: key,
        p_value: value,
        p_description: description,
      }),
    );
    if (result.error) throw result.error;
    return { persisted: true, source: "database" as const };
  } catch (error) {
    return {
      persisted: false,
      source: "database" as const,
      error: error instanceof Error ? error.message : "Database is unavailable.",
    };
  }
}
