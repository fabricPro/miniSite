import "server-only";
import { db } from "@/lib/db/client";
import { sql } from "drizzle-orm";

/**
 * Sıradaki CSR kodunu üretir. Pattern: CSR001, CSR002, ... CSR999.
 *
 * Mevcut `record_no`'lardan numerik kısmı çıkar (CSR011.1 → 11), max bul, +1.
 * Paralel kayıt riskine karşı server action içinde unique constraint catch ediyoruz.
 */
export async function nextRecordNo(): Promise<string> {
  // NOT: JS template literal'larda `\d` → `d`. Postgres regex için `[0-9]`.
  const rows = await db.execute<{ max_num: number | null }>(
    sql`SELECT COALESCE(MAX(CAST(SUBSTRING(record_no FROM '^CSR([0-9]+)') AS INTEGER)), 0) AS max_num
        FROM arge_talepleri
        WHERE record_no ~ '^CSR[0-9]+'`
  );
  const current = rows[0]?.max_num ?? 0;
  const next = current + 1;
  return `CSR${String(next).padStart(3, "0")}`;
}
