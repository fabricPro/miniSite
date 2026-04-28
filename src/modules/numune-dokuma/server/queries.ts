import "server-only";
import { db } from "@/lib/db/client";
import {
  argeTalepleri,
  customers,
  numuneAtilim,
  numuneVaryant,
} from "@/lib/db/schema";
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import type { NumuneListFilterInput } from "../schemas";

/**
 * Numune listesi — her satır bir numune (header). Durum numune bazında.
 */
export type NumuneListRow = {
  id: string;
  numuneNo: string;
  date: string;
  recordNo: string | null;
  customerName: string | null;
  tezgah: string | null;
  desen: string | null;
  durum: string;
  varyantCount: number;
  updatedAt: Date;
};

export async function listNumune(
  filters: NumuneListFilterInput = {}
): Promise<NumuneListRow[]> {
  const where = [];

  if (filters.search) {
    const q = `%${filters.search}%`;
    where.push(
      or(
        ilike(numuneAtilim.numuneNo, q),
        ilike(numuneAtilim.recordNo, q),
        ilike(numuneAtilim.desen, q),
        ilike(customers.name, q)
      )
    );
  }
  if (filters.recordNo) {
    where.push(eq(numuneAtilim.recordNo, filters.recordNo));
  }
  if (filters.tezgah) {
    where.push(eq(numuneAtilim.tezgah, filters.tezgah));
  }
  if (filters.durum) {
    where.push(eq(numuneAtilim.durum, filters.durum));
  }

  const varyantCountSub = sql<number>`(
    SELECT COUNT(*)::int FROM ${numuneVaryant}
    WHERE ${numuneVaryant.numuneAtilimId} = ${numuneAtilim.id}
  )`;

  const rows = await db
    .select({
      id: numuneAtilim.id,
      numuneNo: numuneAtilim.numuneNo,
      date: numuneAtilim.date,
      recordNo: numuneAtilim.recordNo,
      customerName: customers.name,
      tezgah: numuneAtilim.tezgah,
      desen: numuneAtilim.desen,
      durum: numuneAtilim.durum,
      updatedAt: numuneAtilim.updatedAt,
      varyantCount: varyantCountSub.as("varyant_count"),
    })
    .from(numuneAtilim)
    .leftJoin(argeTalepleri, eq(argeTalepleri.recordNo, numuneAtilim.recordNo))
    .leftJoin(customers, eq(customers.id, argeTalepleri.customerId))
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(numuneAtilim.date), desc(numuneAtilim.numuneNo));

  return rows as NumuneListRow[];
}

/** Tek numune + ilişkili Ar-Ge + varyantları */
export async function getNumuneByNo(numuneNo: string) {
  const [headerRow] = await db
    .select({
      numune: numuneAtilim,
      arge: argeTalepleri,
      customer: customers,
    })
    .from(numuneAtilim)
    .leftJoin(argeTalepleri, eq(argeTalepleri.recordNo, numuneAtilim.recordNo))
    .leftJoin(customers, eq(customers.id, argeTalepleri.customerId))
    .where(eq(numuneAtilim.numuneNo, numuneNo))
    .limit(1);

  if (!headerRow) return null;

  const variants = await db
    .select()
    .from(numuneVaryant)
    .where(eq(numuneVaryant.numuneAtilimId, headerRow.numune.id))
    .orderBy(asc(numuneVaryant.varyantNo));

  return {
    numune: headerRow.numune,
    arge: headerRow.arge,
    customerName: headerRow.customer?.name ?? null,
    varyantlar: variants,
  };
}

/** Bir CSR'a bağlı tüm numuneler (Ar-Ge detay paneli için) */
export type RelatedNumuneRow = {
  id: string;
  numuneNo: string;
  date: string;
  tezgah: string | null;
  desen: string | null;
  durum: string;
  varyantCount: number;
};

export async function listByCsr(recordNo: string): Promise<RelatedNumuneRow[]> {
  const varyantCountSub = sql<number>`(
    SELECT COUNT(*)::int FROM ${numuneVaryant}
    WHERE ${numuneVaryant.numuneAtilimId} = ${numuneAtilim.id}
  )`;

  const rows = await db
    .select({
      id: numuneAtilim.id,
      numuneNo: numuneAtilim.numuneNo,
      date: numuneAtilim.date,
      tezgah: numuneAtilim.tezgah,
      desen: numuneAtilim.desen,
      durum: numuneAtilim.durum,
      varyantCount: varyantCountSub.as("varyant_count"),
    })
    .from(numuneAtilim)
    .where(eq(numuneAtilim.recordNo, recordNo))
    .orderBy(desc(numuneAtilim.date), desc(numuneAtilim.numuneNo));

  return rows as RelatedNumuneRow[];
}

/** Distinct tezgah listesi — filtre dropdown'ı için */
export async function listDistinctTezgah(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ tezgah: numuneAtilim.tezgah })
    .from(numuneAtilim)
    .where(sql`${numuneAtilim.tezgah} IS NOT NULL`)
    .orderBy(asc(numuneAtilim.tezgah));
  return rows.map((r) => r.tezgah).filter((v): v is string => !!v);
}
