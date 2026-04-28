import "server-only";
import { db } from "@/lib/db/client";
import { sql } from "drizzle-orm";

/**
 * Sıradaki numune kodunu üretir. Pattern: D.TRY001, D.TRY002, ...
 *
 * NOT: JS template literal'larda `\d` ve `\.` sequences backslash'i kaybediyor
 * (`\d` → `d`, `\.` → `.`). Postgres regex için `[0-9]` ve `\\.` (literal dot) kullan.
 */
export async function nextNumuneNo(): Promise<string> {
  const rows = await db.execute<{ max_num: number | null }>(
    sql`SELECT COALESCE(MAX(CAST(SUBSTRING(numune_no FROM '^D\\.TRY([0-9]+)') AS INTEGER)), 0) AS max_num
        FROM numune_atilim
        WHERE numune_no ~ '^D\\.TRY[0-9]+'`
  );
  const current = rows[0]?.max_num ?? 0;
  const next = current + 1;
  return `D.TRY${String(next).padStart(3, "0")}`;
}

/** Bir numune için sıradaki varyant kodunu üretir (V01, V02, ...). */
export async function nextVaryantNo(numuneAtilimId: string): Promise<string> {
  const rows = await db.execute<{ max_num: number | null }>(
    sql`SELECT COALESCE(MAX(CAST(SUBSTRING(varyant_no FROM '^V([0-9]+)') AS INTEGER)), 0) AS max_num
        FROM numune_varyant
        WHERE numune_atilim_id = ${numuneAtilimId}
          AND varyant_no ~ '^V[0-9]+'`
  );
  const current = rows[0]?.max_num ?? 0;
  const next = current + 1;
  return `V${String(next).padStart(2, "0")}`;
}
