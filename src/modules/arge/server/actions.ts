"use server";

import { db } from "@/lib/db/client";
import { actionTypes, argeTalepleri, hareketLog } from "@/lib/db/schema";
import { auth } from "@/lib/auth/config";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  createActionTypeSchema,
  createArgeSchema,
  createHareketLogSchema,
  updateActionTypeSchema,
  updateArgeSchema,
} from "../schemas";
import { nextRecordNo } from "./record-no";

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

/**
 * Ar-Ge talebi oluştur. Record no otomatik üretilir.
 */
export async function createArgeTalebi(
  input: unknown
): Promise<ActionResult<{ recordNo: string }>> {
  const user = await requireUser();

  const parsed = createArgeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Geçersiz form verisi",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = normalize(parsed.data);

  // Record no üretimi — collision olursa tekrar dene (küçük ekip, düşük risk)
  let recordNo: string;
  let attempts = 0;
  while (true) {
    recordNo = await nextRecordNo();
    try {
      await db.insert(argeTalepleri).values({
        recordNo,
        arrivalDate: data.arrivalDate as string,
        dueDate: data.dueDate as string,
        completionDate: (data.completionDate as string | null) ?? null,
        customerId: (data.customerId as string | null) ?? null,
        fabricNameCode: (data.fabricNameCode as string | null) ?? null,
        variantCount: (data.variantCount as number | null) ?? null,
        requestedWidthCm: (data.requestedWidthCm as number | null) ?? null,
        weightGsm:
          data.weightGsm !== null && data.weightGsm !== undefined
            ? String(data.weightGsm)
            : null,
        weaveType: (data.weaveType as string | null) ?? null,
        dyeType: (data.dyeType as string | null) ?? null,
        analysisStatus: (data.analysisStatus as string | null) ?? null,
        labWorkStatus: (data.labWorkStatus as string | null) ?? null,
        priceStatus: (data.priceStatus as string | null) ?? null,
        yarnStatus: (data.yarnStatus as string | null) ?? null,
        warpStatus: (data.warpStatus as string | null) ?? null,
        finishingProcess: (data.finishingProcess as string | null) ?? null,
        finalStatus: (data.finalStatus as string) ?? "open",
        note: (data.note as string | null) ?? null,
        createdBy: user.id,
      });
      break;
    } catch (err) {
      if (++attempts > 3) {
        console.error("createArgeTalebi: insert failed after retries", err);
        return { ok: false, error: "Kayıt numarası üretimi başarısız oldu" };
      }
      // Unique violation'sa döngü yeni numara alacak
    }
  }

  revalidatePath("/arge");
  return { ok: true, data: { recordNo } };
}

export async function updateArgeTalebi(
  input: unknown
): Promise<ActionResult<{ recordNo: string }>> {
  const user = await requireUser();
  void user;

  const parsed = updateArgeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Geçersiz form verisi",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { recordNo, ...rest } = normalize(parsed.data);
  const data = rest as Record<string, unknown>;

  await db
    .update(argeTalepleri)
    .set({
      arrivalDate: data.arrivalDate as string,
      dueDate: data.dueDate as string,
      completionDate: (data.completionDate as string | null) ?? null,
      customerId: (data.customerId as string | null) ?? null,
      fabricNameCode: (data.fabricNameCode as string | null) ?? null,
      variantCount: (data.variantCount as number | null) ?? null,
      requestedWidthCm: (data.requestedWidthCm as number | null) ?? null,
      weightGsm:
        data.weightGsm !== null && data.weightGsm !== undefined
          ? String(data.weightGsm)
          : null,
      weaveType: (data.weaveType as string | null) ?? null,
      dyeType: (data.dyeType as string | null) ?? null,
      analysisStatus: (data.analysisStatus as string | null) ?? null,
      labWorkStatus: (data.labWorkStatus as string | null) ?? null,
      priceStatus: (data.priceStatus as string | null) ?? null,
      yarnStatus: (data.yarnStatus as string | null) ?? null,
      warpStatus: (data.warpStatus as string | null) ?? null,
      finishingProcess: (data.finishingProcess as string | null) ?? null,
      finalStatus: (data.finalStatus as string) ?? "open",
      note: (data.note as string | null) ?? null,
      updatedAt: new Date(),
    })
    .where(eq(argeTalepleri.recordNo, recordNo as string));

  revalidatePath("/arge");
  revalidatePath(`/arge/${recordNo}`);
  return { ok: true, data: { recordNo: recordNo as string } };
}

export async function deleteArgeTalebi(recordNo: string): Promise<ActionResult> {
  await requireUser();
  await db.delete(argeTalepleri).where(eq(argeTalepleri.recordNo, recordNo));
  revalidatePath("/arge");
  return { ok: true, data: null };
}

// === HAREKET LOG ===

/** Action type adını UPPER+TRIM normalize et — import-missing.ts ile tutarlı */
function normalizeActionName(s: string): string {
  return s.trim().toLocaleUpperCase("tr-TR").replace(/\s+/g, " ");
}

/** Slug — code_en için */
function slugify(s: string): string {
  return s
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

/** Action type'ı ada göre bul; yoksa oluştur. Normalize UPPER+TRIM ile case-insensitive. */
async function ensureActionType(rawName: string | null): Promise<string | null> {
  if (!rawName) return null;
  const norm = normalizeActionName(rawName);
  if (!norm) return null;

  // Mevcut bir kayıt var mı? (case-insensitive eşleşme)
  const existing = await db
    .select({ id: actionTypes.id, nameTr: actionTypes.nameTr })
    .from(actionTypes);
  const match = existing.find((a) => normalizeActionName(a.nameTr) === norm);
  if (match) return match.id;

  // Yoksa oluştur — code_en uniqueness için suffix ekle
  let code = slugify(norm) || `at_${Math.random().toString(36).slice(2, 8)}`;
  const codes = new Set(existing.map((a) => a.id));
  void codes;
  // Drizzle unique violation'da hata atar — try/catch ile retry
  let attempts = 0;
  while (true) {
    try {
      const [row] = await db
        .insert(actionTypes)
        .values({
          nameTr: norm,
          codeEn: code,
          sortOrder: 999,
          isSystem: false,
          isArchived: false,
        })
        .returning({ id: actionTypes.id });
      return row.id;
    } catch (err) {
      if (++attempts > 5) {
        console.error("ensureActionType: insert failed after retries", err);
        return null;
      }
      code = `${slugify(norm).slice(0, 55)}_${attempts}`;
    }
  }
}

export async function appendHareketLog(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();

  const parsed = createHareketLogSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Geçersiz log verisi",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  // Kayıt mevcut mu?
  const [exists] = await db
    .select({ id: argeTalepleri.id })
    .from(argeTalepleri)
    .where(eq(argeTalepleri.recordNo, parsed.data.recordNo))
    .limit(1);
  if (!exists) return { ok: false, error: "Kayıt bulunamadı" };

  const actionTypeId = await ensureActionType(parsed.data.actionTypeName ?? null);

  const [row] = await db
    .insert(hareketLog)
    .values({
      recordNo: parsed.data.recordNo,
      logDate: parsed.data.logDate,
      actionTypeId,
      description: parsed.data.description ?? null,
      createdBy: user.id,
    })
    .returning({ id: hareketLog.id });

  revalidatePath("/arge");
  revalidatePath(`/arge/${parsed.data.recordNo}`);
  return { ok: true, data: { id: row.id } };
}

export async function deleteHareketLog(id: string): Promise<ActionResult> {
  await requireUser();
  const [row] = await db
    .delete(hareketLog)
    .where(eq(hareketLog.id, id))
    .returning({ recordNo: hareketLog.recordNo });
  if (row) {
    revalidatePath("/arge");
    revalidatePath(`/arge/${row.recordNo}`);
  }
  return { ok: true, data: null };
}

// === ACTION TYPE (lookup) ===

export async function createActionType(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  await requireUser();
  const parsed = createActionTypeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Geçersiz form verisi",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  try {
    const [row] = await db
      .insert(actionTypes)
      .values({
        nameTr: parsed.data.nameTr,
        codeEn: parsed.data.codeEn,
        sortOrder: parsed.data.sortOrder,
        isSystem: false,
        isArchived: false,
      })
      .returning({ id: actionTypes.id });
    revalidatePath("/ayarlar/islem-tipleri");
    return { ok: true, data: { id: row.id } };
  } catch (err) {
    console.error("createActionType failed", err);
    return { ok: false, error: "Bu kod zaten kullanımda olabilir" };
  }
}

export async function updateActionType(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  await requireUser();
  const parsed = updateActionTypeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Geçersiz form verisi",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  // Sistem kayıtları yalnızca isArchived ve sortOrder değişebilir — ama MVP için
  // tam güncellemeye izin ver, sadece silme engelli.
  await db
    .update(actionTypes)
    .set({
      nameTr: parsed.data.nameTr,
      codeEn: parsed.data.codeEn,
      sortOrder: parsed.data.sortOrder,
      isArchived: parsed.data.isArchived ?? false,
    })
    .where(eq(actionTypes.id, parsed.data.id));
  revalidatePath("/ayarlar/islem-tipleri");
  return { ok: true, data: { id: parsed.data.id } };
}

export async function toggleActionTypeArchive(
  id: string,
  archived: boolean
): Promise<ActionResult> {
  await requireUser();
  await db
    .update(actionTypes)
    .set({ isArchived: archived })
    .where(eq(actionTypes.id, id));
  revalidatePath("/ayarlar/islem-tipleri");
  return { ok: true, data: null };
}

export async function deleteActionType(id: string): Promise<ActionResult> {
  await requireUser();
  // Sistem kayıtları silinemez
  const [existing] = await db
    .select({ isSystem: actionTypes.isSystem })
    .from(actionTypes)
    .where(eq(actionTypes.id, id))
    .limit(1);
  if (!existing) return { ok: false, error: "Kayıt bulunamadı" };
  if (existing.isSystem) {
    return {
      ok: false,
      error: "Sistem kayıtları silinemez — arşivlemeyi dene",
    };
  }
  // Log'larda kullanılıyor mu?
  const [usage] = await db
    .select({ id: hareketLog.id })
    .from(hareketLog)
    .where(eq(hareketLog.actionTypeId, id))
    .limit(1);
  if (usage) {
    return {
      ok: false,
      error: "Bu tip log kayıtlarında kullanılıyor — arşivle",
    };
  }
  await db.delete(actionTypes).where(eq(actionTypes.id, id));
  revalidatePath("/ayarlar/islem-tipleri");
  return { ok: true, data: null };
}
