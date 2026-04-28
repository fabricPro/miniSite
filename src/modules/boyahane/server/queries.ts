import "server-only";
import { db } from "@/lib/db/client";
import { boyahanePartileri, numuneAtilim } from "@/lib/db/schema";
import { and, asc, desc, eq, gte, ilike, inArray, lte, or } from "drizzle-orm";
import type { ListBoyahaneFilterInput } from "../schemas";

export type BoyahaneListRow = {
  id: string;
  uniqSira: number | null;
  satirDurumu: string | null;
  topNo: string;
  talepTarihi: string | null;
  termin: string | null;
  dTry: string | null;
  numuneAtilimId: string | null;
  numuneNo: string | null;
  en: number | null;
  istenenEn: number | null;
  metre: string | null;
  kilo: string | null;
  desenNo: string | null;
  yapilacakIslem: string | null;
  fasonFirma: string | null;
  aciklama: string | null;
  icerik: string | null;
  talepEdenKisi: string | null;
  partiNoFk: string | null;
  durum: string | null;
  gittigiBoyane: string | null;
  gelenMt: string | null;
  gitmeTarihi: string | null;
  gelmeTarihi: string | null;
};

export async function listBoyahanePartileri(
  filters: ListBoyahaneFilterInput = {}
): Promise<BoyahaneListRow[]> {
  const where = [];

  if (filters.search) {
    const q = `%${filters.search}%`;
    where.push(
      or(
        ilike(boyahanePartileri.topNo, q),
        ilike(boyahanePartileri.dTry, q),
        ilike(boyahanePartileri.desenNo, q),
        ilike(boyahanePartileri.yapilacakIslem, q),
        ilike(boyahanePartileri.fasonFirma, q),
        ilike(boyahanePartileri.gittigiBoyane, q)
      )
    );
  }
  if (filters.durum) where.push(eq(boyahanePartileri.durum, filters.durum));
  if (filters.fasonFirma) where.push(eq(boyahanePartileri.fasonFirma, filters.fasonFirma));
  if (filters.gittigiBoyane) where.push(eq(boyahanePartileri.gittigiBoyane, filters.gittigiBoyane));
  if (filters.satirDurumu) where.push(eq(boyahanePartileri.satirDurumu, filters.satirDurumu));
  if (filters.dateFrom) where.push(gte(boyahanePartileri.talepTarihi, filters.dateFrom));
  if (filters.dateTo) where.push(lte(boyahanePartileri.talepTarihi, filters.dateTo));

  const rows = await db
    .select({
      id: boyahanePartileri.id,
      uniqSira: boyahanePartileri.uniqSira,
      satirDurumu: boyahanePartileri.satirDurumu,
      topNo: boyahanePartileri.topNo,
      talepTarihi: boyahanePartileri.talepTarihi,
      termin: boyahanePartileri.termin,
      dTry: boyahanePartileri.dTry,
      numuneAtilimId: boyahanePartileri.numuneAtilimId,
      numuneNo: numuneAtilim.numuneNo,
      en: boyahanePartileri.en,
      istenenEn: boyahanePartileri.istenenEn,
      metre: boyahanePartileri.metre,
      kilo: boyahanePartileri.kilo,
      desenNo: boyahanePartileri.desenNo,
      yapilacakIslem: boyahanePartileri.yapilacakIslem,
      fasonFirma: boyahanePartileri.fasonFirma,
      aciklama: boyahanePartileri.aciklama,
      icerik: boyahanePartileri.icerik,
      talepEdenKisi: boyahanePartileri.talepEdenKisi,
      partiNoFk: boyahanePartileri.partiNoFk,
      durum: boyahanePartileri.durum,
      gittigiBoyane: boyahanePartileri.gittigiBoyane,
      gelenMt: boyahanePartileri.gelenMt,
      gitmeTarihi: boyahanePartileri.gitmeTarihi,
      gelmeTarihi: boyahanePartileri.gelmeTarihi,
    })
    .from(boyahanePartileri)
    .leftJoin(
      numuneAtilim,
      eq(numuneAtilim.id, boyahanePartileri.numuneAtilimId)
    )
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(boyahanePartileri.talepTarihi), asc(boyahanePartileri.topNo));

  return rows as BoyahaneListRow[];
}

export async function getBoyahanePartiById(id: string) {
  const [row] = await db
    .select({
      parti: boyahanePartileri,
      numuneNo: numuneAtilim.numuneNo,
    })
    .from(boyahanePartileri)
    .leftJoin(numuneAtilim, eq(numuneAtilim.id, boyahanePartileri.numuneAtilimId))
    .where(eq(boyahanePartileri.id, id))
    .limit(1);
  return row ?? null;
}

/** Bir numune'ye bağlı tüm boyahane partileri (NumuneDetailPanel için) */
export type RelatedBoyahaneRow = {
  id: string;
  topNo: string;
  talepTarihi: string | null;
  durum: string | null;
  yapilacakIslem: string | null;
  fasonFirma: string | null;
  gittigiBoyane: string | null;
  metre: string | null;
};

export async function listByNumune(
  numuneAtilimId: string
): Promise<RelatedBoyahaneRow[]> {
  const rows = await db
    .select({
      id: boyahanePartileri.id,
      topNo: boyahanePartileri.topNo,
      talepTarihi: boyahanePartileri.talepTarihi,
      durum: boyahanePartileri.durum,
      yapilacakIslem: boyahanePartileri.yapilacakIslem,
      fasonFirma: boyahanePartileri.fasonFirma,
      gittigiBoyane: boyahanePartileri.gittigiBoyane,
      metre: boyahanePartileri.metre,
    })
    .from(boyahanePartileri)
    .where(eq(boyahanePartileri.numuneAtilimId, numuneAtilimId))
    .orderBy(desc(boyahanePartileri.talepTarihi));
  return rows as RelatedBoyahaneRow[];
}

/** Mail-paste için seçili kayıtları getir */
export async function listForCopy(ids: string[]): Promise<BoyahaneListRow[]> {
  if (ids.length === 0) return [];
  const rows = await db
    .select({
      id: boyahanePartileri.id,
      uniqSira: boyahanePartileri.uniqSira,
      satirDurumu: boyahanePartileri.satirDurumu,
      topNo: boyahanePartileri.topNo,
      talepTarihi: boyahanePartileri.talepTarihi,
      termin: boyahanePartileri.termin,
      dTry: boyahanePartileri.dTry,
      numuneAtilimId: boyahanePartileri.numuneAtilimId,
      numuneNo: numuneAtilim.numuneNo,
      en: boyahanePartileri.en,
      istenenEn: boyahanePartileri.istenenEn,
      metre: boyahanePartileri.metre,
      kilo: boyahanePartileri.kilo,
      desenNo: boyahanePartileri.desenNo,
      yapilacakIslem: boyahanePartileri.yapilacakIslem,
      fasonFirma: boyahanePartileri.fasonFirma,
      aciklama: boyahanePartileri.aciklama,
      icerik: boyahanePartileri.icerik,
      talepEdenKisi: boyahanePartileri.talepEdenKisi,
      partiNoFk: boyahanePartileri.partiNoFk,
      durum: boyahanePartileri.durum,
      gittigiBoyane: boyahanePartileri.gittigiBoyane,
      gelenMt: boyahanePartileri.gelenMt,
      gitmeTarihi: boyahanePartileri.gitmeTarihi,
      gelmeTarihi: boyahanePartileri.gelmeTarihi,
    })
    .from(boyahanePartileri)
    .leftJoin(numuneAtilim, eq(numuneAtilim.id, boyahanePartileri.numuneAtilimId))
    .where(inArray(boyahanePartileri.id, ids))
    .orderBy(desc(boyahanePartileri.talepTarihi));
  return rows as BoyahaneListRow[];
}

/** Distinct firma listeleri (filtre dropdown için) */
export async function listDistinctFasonFirma(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ name: boyahanePartileri.fasonFirma })
    .from(boyahanePartileri)
    .orderBy(asc(boyahanePartileri.fasonFirma));
  return rows.map((r) => r.name).filter((v): v is string => !!v);
}

export async function listDistinctGittigiBoyane(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ name: boyahanePartileri.gittigiBoyane })
    .from(boyahanePartileri)
    .orderBy(asc(boyahanePartileri.gittigiBoyane));
  return rows.map((r) => r.name).filter((v): v is string => !!v);
}
