import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  sql: ReturnType<typeof postgres> | undefined;
};

// Production (Vercel serverless): max: 1 — her function invocation tek connection
//   Neon'un pooler'ı (PgBouncer) zaten dış pool yönetiyor, biz iç pool kapatıyoruz.
// Development: max: 10 — lokal docker postgres'te paralel query rahat çalışsın.
const isProduction = process.env.NODE_ENV === "production";

const sql =
  globalForDb.sql ??
  postgres(process.env.DATABASE_URL!, {
    max: isProduction ? 1 : 10,
    idle_timeout: 20,
    connect_timeout: 10,
    // Neon SSL gerektirir; production'da otomatik aktif (sslmode=require URL'de)
    // Lokal docker'da SSL kapalı — postgres-js connection string'i okur, ek config gerekmez
  });

if (!isProduction) globalForDb.sql = sql;

export const db = drizzle(sql, { schema });
export type Database = typeof db;
