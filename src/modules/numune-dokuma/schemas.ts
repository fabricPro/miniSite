import { z } from "zod";
import { NUMUNE_DURUM } from "./labels";

/**
 * Numune Dokuma — form/giriş şemaları.
 * Pattern: arge/schemas.ts ile aynı.
 */

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Geçersiz tarih (YYYY-MM-DD)");

const optionalIsoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Geçersiz tarih")
  .optional()
  .or(z.literal("").transform(() => undefined));

const emptyToNull = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(
    (v) => (v === "" || v === undefined ? null : v),
    schema.nullable().optional()
  );

const optionalInt = z
  .union([
    z.coerce.number().int().nonnegative(),
    z.literal("").transform(() => undefined),
  ])
  .optional();

const optionalIroNo = z
  .union([
    z.coerce.number().int().min(1).max(8),
    z.literal("").transform(() => undefined),
  ])
  .optional()
  .nullable();

const optionalDecimal = z
  .union([
    z.coerce.number().nonnegative(),
    z.literal("").transform(() => undefined),
  ])
  .optional();

export const numuneDurumEnum = z.enum(NUMUNE_DURUM);

// === NUMUNE_ATILIM (header) — durum/kg/ham_en/mamul_en de burada ===

export const createNumuneSchema = z.object({
  // recordNo opsiyonel — "boş atış"
  recordNo: emptyToNull(z.string().max(20)),
  date: isoDate,
  tezgah: emptyToNull(z.string().max(60)),
  desen: emptyToNull(z.string().max(200)),
  siklik: emptyToNull(z.string().max(60)),
  rapor: emptyToNull(z.string().max(60)),
  cozguAdi: emptyToNull(z.string()),
  // Atkı 1 zorunlu (default), 2-8 opsiyonel
  atki1: z.string().trim().min(1, "En az bir atkı ipliği gerekli").max(2000),
  atki2: emptyToNull(z.string()),
  atki3: emptyToNull(z.string()),
  atki4: emptyToNull(z.string()),
  atki5: emptyToNull(z.string()),
  atki6: emptyToNull(z.string()),
  atki7: emptyToNull(z.string()),
  atki8: emptyToNull(z.string()),
  // İro numarası (1-8) — atki_N için fiziksel iro
  iro1: optionalIroNo,
  iro2: optionalIroNo,
  iro3: optionalIroNo,
  iro4: optionalIroNo,
  iro5: optionalIroNo,
  iro6: optionalIroNo,
  iro7: optionalIroNo,
  iro8: optionalIroNo,
  aciklama: emptyToNull(z.string()),
  // Üretim/KK çıktıları (opsiyonel) — Top No artık boyahane_partileri'nde
  kg: optionalDecimal,
  hamEn: optionalInt,
  mamulEn: optionalInt,
  durum: numuneDurumEnum.default("acik"),
  completionDate: optionalIsoDate,
});

export type CreateNumuneInput = z.infer<typeof createNumuneSchema>;

export const updateNumuneSchema = createNumuneSchema.extend({
  numuneNo: z.string().min(1).max(30),
});

export type UpdateNumuneInput = z.infer<typeof updateNumuneSchema>;

// === NUMUNE_VARYANT — sadece renk + metre ===

export const createVaryantSchema = z.object({
  numuneAtilimId: z.string().uuid(),
  varyantNo: z
    .string()
    .trim()
    .min(1, "Varyant no gerekli")
    .max(10)
    .regex(/^V\d+$/, "Format: V01, V02, ..."),
  renk1: emptyToNull(z.string().max(100)),
  renk2: emptyToNull(z.string().max(100)),
  renk3: emptyToNull(z.string().max(100)),
  renk4: emptyToNull(z.string().max(100)),
  renk5: emptyToNull(z.string().max(100)),
  renk6: emptyToNull(z.string().max(100)),
  renk7: emptyToNull(z.string().max(100)),
  renk8: emptyToNull(z.string().max(100)),
  metre: optionalDecimal,
});

export type CreateVaryantInput = z.infer<typeof createVaryantSchema>;

export const updateVaryantSchema = createVaryantSchema
  .extend({
    id: z.string().uuid(),
  })
  .omit({ numuneAtilimId: true });

export type UpdateVaryantInput = z.infer<typeof updateVaryantSchema>;

// === LIST FILTERS ===

export const numuneListFilterSchema = z.object({
  search: z.string().trim().optional(),
  durum: numuneDurumEnum.optional(),
  recordNo: emptyToNull(z.string().max(20)),
  tezgah: emptyToNull(z.string().max(60)),
});

export type NumuneListFilterInput = z.infer<typeof numuneListFilterSchema>;
