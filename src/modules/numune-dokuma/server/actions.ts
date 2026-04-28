"use server";

import { db } from "@/lib/db/client";
import { numuneAtilim, numuneVaryant } from "@/lib/db/schema";
import { auth } from "@/lib/auth/config";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  createNumuneSchema,
  createVaryantSchema,
  updateNumuneSchema,
  updateVaryantSchema,
} from "../schemas";
import { nextNumuneNo, nextVaryantNo } from "./numune-no";

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

// ─── NUMUNE ATILIM (header) ────────────────────────────────────────────

/** Yeni numune oluştur + V01 varyantı otomatik ekle */
export async function createNumune(
  input: unknown
): Promise<ActionResult<{ numuneNo: string }>> {
  const user = await requireUser();

  const parsed = createNumuneSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Geçersiz form verisi",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = normalize(parsed.data);

  let numuneNo: string;
  let createdId: string | null = null;
  let attempts = 0;
  while (true) {
    numuneNo = await nextNumuneNo();
    try {
      const [row] = await db
        .insert(numuneAtilim)
        .values({
          numuneNo,
          recordNo: (data.recordNo as string | null) ?? null,
          date: data.date as string,
          tezgah: (data.tezgah as string | null) ?? null,
          desen: (data.desen as string | null) ?? null,
          siklik: (data.siklik as string | null) ?? null,
          rapor: (data.rapor as string | null) ?? null,
          cozguAdi: (data.cozguAdi as string | null) ?? null,
          atki1: data.atki1 as string,
          atki2: (data.atki2 as string | null) ?? null,
          atki3: (data.atki3 as string | null) ?? null,
          atki4: (data.atki4 as string | null) ?? null,
          atki5: (data.atki5 as string | null) ?? null,
          atki6: (data.atki6 as string | null) ?? null,
          atki7: (data.atki7 as string | null) ?? null,
          atki8: (data.atki8 as string | null) ?? null,
          iro1: (data.iro1 as number | null) ?? null,
          iro2: (data.iro2 as number | null) ?? null,
          iro3: (data.iro3 as number | null) ?? null,
          iro4: (data.iro4 as number | null) ?? null,
          iro5: (data.iro5 as number | null) ?? null,
          iro6: (data.iro6 as number | null) ?? null,
          iro7: (data.iro7 as number | null) ?? null,
          iro8: (data.iro8 as number | null) ?? null,
          aciklama: (data.aciklama as string | null) ?? null,
          kg:
            data.kg !== null && data.kg !== undefined ? String(data.kg) : null,
          hamEn: (data.hamEn as number | null) ?? null,
          mamulEn: (data.mamulEn as number | null) ?? null,
          durum: (parsed.data.durum as string) ?? "acik",
          completionDate: (data.completionDate as string | null) ?? null,
          createdBy: user.id,
        })
        .returning({ id: numuneAtilim.id });
      createdId = row.id;
      break;
    } catch (err) {
      if (++attempts > 3) {
        console.error("createNumune: insert failed after retries", err);
        return { ok: false, error: "Numune kodu üretimi başarısız oldu" };
      }
    }
  }

  // İlk varyant V01'i otomatik ekle
  if (createdId) {
    await db.insert(numuneVaryant).values({
      numuneAtilimId: createdId,
      varyantNo: "V01",
    });
  }

  revalidatePath("/numune-dokuma");
  if (data.recordNo) revalidatePath(`/arge/${data.recordNo}`);
  return { ok: true, data: { numuneNo } };
}

export async function updateNumune(
  input: unknown
): Promise<ActionResult<{ numuneNo: string }>> {
  await requireUser();

  const parsed = updateNumuneSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Geçersiz form verisi",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { numuneNo, ...rest } = normalize(parsed.data);
  const data = rest as Record<string, unknown>;

  // durum tamamlandi olunca completionDate auto-fill (kullanıcı override etmediyse)
  let completionDate = (data.completionDate as string | null) ?? null;
  if (parsed.data.durum === "tamamlandi" && !completionDate) {
    completionDate = new Date().toISOString().slice(0, 10);
  }

  await db
    .update(numuneAtilim)
    .set({
      recordNo: (data.recordNo as string | null) ?? null,
      date: data.date as string,
      tezgah: (data.tezgah as string | null) ?? null,
      desen: (data.desen as string | null) ?? null,
      siklik: (data.siklik as string | null) ?? null,
      rapor: (data.rapor as string | null) ?? null,
      cozguAdi: (data.cozguAdi as string | null) ?? null,
      atki1: data.atki1 as string,
      atki2: (data.atki2 as string | null) ?? null,
      atki3: (data.atki3 as string | null) ?? null,
      atki4: (data.atki4 as string | null) ?? null,
      atki5: (data.atki5 as string | null) ?? null,
      atki6: (data.atki6 as string | null) ?? null,
      atki7: (data.atki7 as string | null) ?? null,
      atki8: (data.atki8 as string | null) ?? null,
      iro1: (data.iro1 as number | null) ?? null,
      iro2: (data.iro2 as number | null) ?? null,
      iro3: (data.iro3 as number | null) ?? null,
      iro4: (data.iro4 as number | null) ?? null,
      iro5: (data.iro5 as number | null) ?? null,
      iro6: (data.iro6 as number | null) ?? null,
      iro7: (data.iro7 as number | null) ?? null,
      iro8: (data.iro8 as number | null) ?? null,
      aciklama: (data.aciklama as string | null) ?? null,
      kg: data.kg !== null && data.kg !== undefined ? String(data.kg) : null,
      hamEn: (data.hamEn as number | null) ?? null,
      mamulEn: (data.mamulEn as number | null) ?? null,
      durum: (parsed.data.durum as string) ?? "acik",
      completionDate,
      updatedAt: new Date(),
    })
    .where(eq(numuneAtilim.numuneNo, numuneNo as string));

  revalidatePath("/numune-dokuma");
  revalidatePath(`/numune-dokuma/${numuneNo}`);
  if (data.recordNo) revalidatePath(`/arge/${data.recordNo}`);
  return { ok: true, data: { numuneNo: numuneNo as string } };
}

export async function deleteNumune(numuneNo: string): Promise<ActionResult> {
  await requireUser();
  const [existing] = await db
    .select({ recordNo: numuneAtilim.recordNo })
    .from(numuneAtilim)
    .where(eq(numuneAtilim.numuneNo, numuneNo))
    .limit(1);

  await db.delete(numuneAtilim).where(eq(numuneAtilim.numuneNo, numuneNo));

  revalidatePath("/numune-dokuma");
  if (existing?.recordNo) revalidatePath(`/arge/${existing.recordNo}`);
  return { ok: true, data: null };
}

// ─── NUMUNE VARYANT (sadece renk + metre) ─────────────────────────────

export async function addVaryant(
  numuneAtilimId: string
): Promise<ActionResult<{ id: string; varyantNo: string }>> {
  await requireUser();

  const [exists] = await db
    .select({ numuneNo: numuneAtilim.numuneNo })
    .from(numuneAtilim)
    .where(eq(numuneAtilim.id, numuneAtilimId))
    .limit(1);
  if (!exists) return { ok: false, error: "Numune bulunamadı" };

  let varyantNo: string;
  let createdId: string;
  let attempts = 0;
  while (true) {
    varyantNo = await nextVaryantNo(numuneAtilimId);
    try {
      const [row] = await db
        .insert(numuneVaryant)
        .values({
          numuneAtilimId,
          varyantNo,
        })
        .returning({ id: numuneVaryant.id });
      createdId = row.id;
      break;
    } catch (err) {
      if (++attempts > 3) {
        console.error("addVaryant: insert failed", err);
        return { ok: false, error: "Varyant eklenemedi" };
      }
    }
  }

  revalidatePath(`/numune-dokuma/${exists.numuneNo}`);
  return { ok: true, data: { id: createdId, varyantNo } };
}

export async function updateVaryant(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  await requireUser();

  const parsed = updateVaryantSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Geçersiz veri",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = normalize(parsed.data);

  const [parent] = await db
    .select({ numuneNo: numuneAtilim.numuneNo })
    .from(numuneVaryant)
    .innerJoin(numuneAtilim, eq(numuneAtilim.id, numuneVaryant.numuneAtilimId))
    .where(eq(numuneVaryant.id, parsed.data.id))
    .limit(1);

  await db
    .update(numuneVaryant)
    .set({
      varyantNo: parsed.data.varyantNo,
      renk1: (data.renk1 as string | null) ?? null,
      renk2: (data.renk2 as string | null) ?? null,
      renk3: (data.renk3 as string | null) ?? null,
      renk4: (data.renk4 as string | null) ?? null,
      renk5: (data.renk5 as string | null) ?? null,
      renk6: (data.renk6 as string | null) ?? null,
      renk7: (data.renk7 as string | null) ?? null,
      renk8: (data.renk8 as string | null) ?? null,
      metre:
        data.metre !== null && data.metre !== undefined
          ? String(data.metre)
          : null,
    })
    .where(eq(numuneVaryant.id, parsed.data.id));

  if (parent) {
    revalidatePath(`/numune-dokuma/${parent.numuneNo}`);
  }
  revalidatePath("/numune-dokuma");
  return { ok: true, data: { id: parsed.data.id } };
}

export async function deleteVaryant(id: string): Promise<ActionResult> {
  await requireUser();

  const [parent] = await db
    .select({ numuneNo: numuneAtilim.numuneNo })
    .from(numuneVaryant)
    .innerJoin(numuneAtilim, eq(numuneAtilim.id, numuneVaryant.numuneAtilimId))
    .where(eq(numuneVaryant.id, id))
    .limit(1);

  await db.delete(numuneVaryant).where(eq(numuneVaryant.id, id));

  if (parent) revalidatePath(`/numune-dokuma/${parent.numuneNo}`);
  revalidatePath("/numune-dokuma");
  return { ok: true, data: null };
}

export async function addVaryantWithData(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  await requireUser();
  const parsed = createVaryantSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Geçersiz veri",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = normalize(parsed.data);
  const [row] = await db
    .insert(numuneVaryant)
    .values({
      numuneAtilimId: parsed.data.numuneAtilimId,
      varyantNo: parsed.data.varyantNo,
      renk1: (data.renk1 as string | null) ?? null,
      renk2: (data.renk2 as string | null) ?? null,
      renk3: (data.renk3 as string | null) ?? null,
      renk4: (data.renk4 as string | null) ?? null,
      renk5: (data.renk5 as string | null) ?? null,
      renk6: (data.renk6 as string | null) ?? null,
      renk7: (data.renk7 as string | null) ?? null,
      renk8: (data.renk8 as string | null) ?? null,
      metre:
        data.metre !== null && data.metre !== undefined
          ? String(data.metre)
          : null,
    })
    .returning({ id: numuneVaryant.id });

  const [parent] = await db
    .select({ numuneNo: numuneAtilim.numuneNo })
    .from(numuneAtilim)
    .where(eq(numuneAtilim.id, parsed.data.numuneAtilimId))
    .limit(1);
  if (parent) revalidatePath(`/numune-dokuma/${parent.numuneNo}`);
  revalidatePath("/numune-dokuma");

  return { ok: true, data: { id: row.id } };
}
