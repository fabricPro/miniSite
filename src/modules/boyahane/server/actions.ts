"use server";

import { db } from "@/lib/db/client";
import { boyahanePartileri, numuneAtilim } from "@/lib/db/schema";
import { auth } from "@/lib/auth/config";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  bulkTopAddSchema,
  createBoyahaneSchema,
  updateBoyahaneSchema,
} from "../schemas";

type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Yetkisiz erişim");
  return session.user as { id: string; email: string };
}

function normalize<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = v === "" || v === undefined ? null : v;
  }
  return out as T;
}

export async function createBoyahaneParti(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = createBoyahaneSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Geçersiz form verisi",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = normalize(parsed.data);

  // numune_atilim_id verildiyse desen_no'yu (varsa) otomatik doldur
  let desenNo = (data.desenNo as string | null) ?? null;
  let dTry = (data.dTry as string | null) ?? null;
  if (data.numuneAtilimId) {
    const [n] = await db
      .select({ numuneNo: numuneAtilim.numuneNo, desen: numuneAtilim.desen })
      .from(numuneAtilim)
      .where(eq(numuneAtilim.id, data.numuneAtilimId as string))
      .limit(1);
    if (n) {
      if (!desenNo) desenNo = n.desen ?? null;
      // D.TRY840 → 840
      if (!dTry && n.numuneNo.startsWith("D.TRY")) {
        dTry = n.numuneNo.replace(/^D\.TRY/, "");
      }
    }
  }

  const [row] = await db
    .insert(boyahanePartileri)
    .values({
      topNo: parsed.data.topNo,
      satirDurumu: (data.satirDurumu as string | null) ?? "Açık",
      talepTarihi: (data.talepTarihi as string | null) ?? null,
      termin: (data.termin as string | null) ?? null,
      numuneAtilimId: (data.numuneAtilimId as string | null) ?? null,
      dTry,
      en: (data.en as number | null) ?? null,
      istenenEn: (data.istenenEn as number | null) ?? null,
      metre:
        data.metre !== null && data.metre !== undefined
          ? String(data.metre)
          : null,
      kilo:
        data.kilo !== null && data.kilo !== undefined
          ? String(data.kilo)
          : null,
      desenNo,
      yapilacakIslem: (data.yapilacakIslem as string | null) ?? null,
      fasonFirma: (data.fasonFirma as string | null) ?? null,
      aciklama: (data.aciklama as string | null) ?? null,
      icerik: (data.icerik as string | null) ?? null,
      talepEdenKisi: (data.talepEdenKisi as string | null) ?? null,
      partiNoFk: (data.partiNoFk as string | null) ?? null,
      durum: parsed.data.durum,
      gittigiBoyane: (data.gittigiBoyane as string | null) ?? null,
      gelenMt:
        data.gelenMt !== null && data.gelenMt !== undefined
          ? String(data.gelenMt)
          : null,
      gitmeTarihi: (data.gitmeTarihi as string | null) ?? null,
      gelmeTarihi: (data.gelmeTarihi as string | null) ?? null,
      createdBy: user.id,
    })
    .returning({ id: boyahanePartileri.id });

  revalidatePath("/boyahane");
  return { ok: true, data: { id: row.id } };
}

export async function updateBoyahaneParti(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  await requireUser();
  const parsed = updateBoyahaneSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Geçersiz form verisi",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { id, ...rest } = normalize(parsed.data);
  const data = rest as Record<string, unknown>;

  await db
    .update(boyahanePartileri)
    .set({
      topNo: data.topNo as string,
      satirDurumu: (data.satirDurumu as string | null) ?? null,
      talepTarihi: (data.talepTarihi as string | null) ?? null,
      termin: (data.termin as string | null) ?? null,
      numuneAtilimId: (data.numuneAtilimId as string | null) ?? null,
      dTry: (data.dTry as string | null) ?? null,
      en: (data.en as number | null) ?? null,
      istenenEn: (data.istenenEn as number | null) ?? null,
      metre:
        data.metre !== null && data.metre !== undefined
          ? String(data.metre)
          : null,
      kilo:
        data.kilo !== null && data.kilo !== undefined
          ? String(data.kilo)
          : null,
      desenNo: (data.desenNo as string | null) ?? null,
      yapilacakIslem: (data.yapilacakIslem as string | null) ?? null,
      fasonFirma: (data.fasonFirma as string | null) ?? null,
      aciklama: (data.aciklama as string | null) ?? null,
      icerik: (data.icerik as string | null) ?? null,
      talepEdenKisi: (data.talepEdenKisi as string | null) ?? null,
      partiNoFk: (data.partiNoFk as string | null) ?? null,
      durum: (data.durum as string) ?? "talimat_atildi",
      gittigiBoyane: (data.gittigiBoyane as string | null) ?? null,
      gelenMt:
        data.gelenMt !== null && data.gelenMt !== undefined
          ? String(data.gelenMt)
          : null,
      gitmeTarihi: (data.gitmeTarihi as string | null) ?? null,
      gelmeTarihi: (data.gelmeTarihi as string | null) ?? null,
      updatedAt: new Date(),
    })
    .where(eq(boyahanePartileri.id, id as string));

  revalidatePath("/boyahane");
  revalidatePath(`/boyahane/${id}`);
  return { ok: true, data: { id: id as string } };
}

export async function deleteBoyahaneParti(id: string): Promise<ActionResult> {
  await requireUser();
  // numune revalidate için önce bul
  const [parent] = await db
    .select({ numuneAtilimId: boyahanePartileri.numuneAtilimId })
    .from(boyahanePartileri)
    .where(eq(boyahanePartileri.id, id))
    .limit(1);

  await db.delete(boyahanePartileri).where(eq(boyahanePartileri.id, id));
  revalidatePath("/boyahane");
  if (parent?.numuneAtilimId) {
    // Numune detay sayfasını da yenile
    const [n] = await db
      .select({ numuneNo: numuneAtilim.numuneNo })
      .from(numuneAtilim)
      .where(eq(numuneAtilim.id, parent.numuneAtilimId))
      .limit(1);
    if (n) revalidatePath(`/numune-dokuma/${n.numuneNo}`);
  }
  return { ok: true, data: null };
}

/**
 * Bulk top ekleme: bir numune'den çıkan N top için tek seferde N parti yaratır.
 * Ortak alanlar (yapilacakIslem, fasonFirma, durum, vs.) her partiye kopyalanır.
 */
export async function createBoyahaneBatch(
  input: unknown
): Promise<ActionResult<{ count: number; ids: string[] }>> {
  const user = await requireUser();
  const parsed = bulkTopAddSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Geçersiz veri",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = parsed.data;

  // Numune var mı?
  const [n] = await db
    .select({
      id: numuneAtilim.id,
      numuneNo: numuneAtilim.numuneNo,
      desen: numuneAtilim.desen,
    })
    .from(numuneAtilim)
    .where(eq(numuneAtilim.id, data.numuneAtilimId))
    .limit(1);
  if (!n) return { ok: false, error: "Numune bulunamadı" };

  const dTry = n.numuneNo.startsWith("D.TRY")
    ? n.numuneNo.replace(/^D\.TRY/, "")
    : null;

  // Tek transaction'da N satır insert
  const ids: string[] = [];
  for (const t of data.toplar) {
    const [row] = await db
      .insert(boyahanePartileri)
      .values({
        topNo: t.topNo,
        satirDurumu: "Açık",
        talepTarihi:
          (data.talepTarihi as string | null) ??
          new Date().toISOString().slice(0, 10),
        numuneAtilimId: n.id,
        dTry,
        en: (t.en as number | null) ?? null,
        istenenEn: (t.istenenEn as number | null) ?? null,
        metre: t.metre != null ? String(t.metre) : null,
        kilo: t.kilo != null ? String(t.kilo) : null,
        desenNo: n.desen ?? null,
        // Per-top: işlem + fason her topta farklı olabilir
        yapilacakIslem: t.yapilacakIslem ?? null,
        fasonFirma: t.fasonFirma ?? null,
        aciklama: data.aciklama ?? null,
        icerik: data.icerik ?? null,
        talepEdenKisi: data.talepEdenKisi ?? null,
        durum: data.durum,
        createdBy: user.id,
      })
      .returning({ id: boyahanePartileri.id });
    ids.push(row.id);
  }

  revalidatePath("/boyahane");
  revalidatePath(`/numune-dokuma/${n.numuneNo}`);
  return { ok: true, data: { count: ids.length, ids } };
}
