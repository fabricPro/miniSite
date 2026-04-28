import { z } from "zod";

/**
 * Ar-Ge talebi için giriş şeması (form).
 * - Tarihler: HTML `<input type="date">` "YYYY-MM-DD" döner, string tutarız
 * - Numeric alanlar: formdan string gelir, `z.coerce.number` ile çevrilir
 * - Enum'lar `src/modules/shared/types.ts`'teki tiplerle eşleşir
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

const optionalUuid = z
  .string()
  .uuid()
  .optional()
  .or(z.literal("").transform(() => undefined));

const optionalInt = z
  .union([z.coerce.number().int().nonnegative(), z.literal("").transform(() => undefined)])
  .optional();

const optionalDecimal = z
  .union([
    z.coerce.number().nonnegative(),
    z.literal("").transform(() => undefined),
  ])
  .optional();

export const finalStatusEnum = z.enum(["open", "closed", "cancelled"]);
export const dyeTypeEnum = z.enum(["yarn_dye", "piece_dye"]);
export const binaryEnum = z.enum(["done", "not_done"]);
export const labWorkEnum = z.enum(["done", "not_done", "in_progress"]);
export const yarnStatusEnum = z.enum([
  "given",
  "not_given",
  "in_stock",
  "not_needed",
  "to_be_produced",
]);
export const warpStatusEnum = z.enum([
  "done",
  "not_done",
  "instructed",
  "on_loom",
]);

// Dropdown'dan "" (seçim yok) geldiğinde undefined yap
const optionalEnum = <T extends z.ZodEnum>(schema: T) =>
  schema.optional().or(z.literal("").transform(() => undefined));

export const createArgeSchema = z.object({
  // Kimlik
  arrivalDate: isoDate,
  dueDate: isoDate,
  customerId: optionalUuid,
  finalStatus: finalStatusEnum.default("open"),
  completionDate: optionalIsoDate,

  // Kumaş özellikleri
  fabricNameCode: emptyToNull(z.string().max(200)),
  variantCount: optionalInt,
  requestedWidthCm: optionalInt,
  weightGsm: optionalDecimal,
  weaveType: emptyToNull(z.string().max(200)),
  dyeType: optionalEnum(dyeTypeEnum),

  // Süreç durumları
  analysisStatus: optionalEnum(binaryEnum),
  labWorkStatus: optionalEnum(labWorkEnum),
  priceStatus: emptyToNull(z.string().max(120)),
  yarnStatus: optionalEnum(yarnStatusEnum),
  warpStatus: optionalEnum(warpStatusEnum),

  // Bitiş
  finishingProcess: emptyToNull(z.string()),
  note: emptyToNull(z.string()),
});

export type CreateArgeInput = z.infer<typeof createArgeSchema>;

export const updateArgeSchema = createArgeSchema.extend({
  recordNo: z.string().min(1).max(20),
});

export type UpdateArgeInput = z.infer<typeof updateArgeSchema>;

export const listFilterSchema = z.object({
  search: z.string().trim().optional(),
  status: finalStatusEnum.optional(),
  customerId: z.string().uuid().optional(),
});

export type ListFilterInput = z.infer<typeof listFilterSchema>;

// === HAREKET LOG ===

export const createHareketLogSchema = z.object({
  recordNo: z.string().min(1).max(20),
  logDate: isoDate,
  // Serbest metin — server tarafında action_types'a normalize edip upsert ediliyor
  actionTypeName: emptyToNull(z.string().trim().max(120)),
  description: emptyToNull(z.string().max(2000)),
});

export type CreateHareketLogInput = z.infer<typeof createHareketLogSchema>;

// === ACTION TYPE (lookup) ===

export const createActionTypeSchema = z.object({
  nameTr: z.string().trim().min(1, "Türkçe ad gerekli").max(120),
  codeEn: z
    .string()
    .trim()
    .min(1, "İngilizce kod gerekli")
    .max(60)
    .regex(/^[a-z0-9_]+$/, "Sadece küçük harf, rakam, alt çizgi"),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export type CreateActionTypeInput = z.infer<typeof createActionTypeSchema>;

export const updateActionTypeSchema = createActionTypeSchema.extend({
  id: z.string().uuid(),
  isArchived: z.boolean().optional(),
});

export type UpdateActionTypeInput = z.infer<typeof updateActionTypeSchema>;
