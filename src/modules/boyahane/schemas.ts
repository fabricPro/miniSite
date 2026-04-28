import { z } from "zod";
import { BOYAHANE_DURUM } from "./labels";

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

const optionalDecimal = z
  .union([
    z.coerce.number().nonnegative(),
    z.literal("").transform(() => undefined),
  ])
  .optional();

export const boyahaneDurumEnum = z.enum(BOYAHANE_DURUM);

export const createBoyahaneSchema = z.object({
  topNo: z.string().trim().min(1, "Top No gerekli").max(60),
  talepTarihi: optionalIsoDate,
  termin: optionalIsoDate,
  numuneAtilimId: z
    .string()
    .uuid()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  dTry: emptyToNull(z.string().max(60)),
  desenNo: emptyToNull(z.string().max(120)),
  en: optionalInt,
  istenenEn: optionalInt,
  metre: optionalDecimal,
  kilo: optionalDecimal,
  yapilacakIslem: emptyToNull(z.string()),
  fasonFirma: emptyToNull(z.string().max(120)),
  aciklama: emptyToNull(z.string()),
  icerik: emptyToNull(z.string().max(120)),
  talepEdenKisi: emptyToNull(z.string().max(120)),
  satirDurumu: emptyToNull(z.string().max(20)),
  // ERP/manuel alanlar
  partiNoFk: emptyToNull(z.string().max(60)),
  durum: boyahaneDurumEnum.default("talimat_atildi"),
  gittigiBoyane: emptyToNull(z.string().max(200)),
  gelenMt: optionalDecimal,
  gitmeTarihi: optionalIsoDate,
  gelmeTarihi: optionalIsoDate,
});

export type CreateBoyahaneInput = z.infer<typeof createBoyahaneSchema>;

export const updateBoyahaneSchema = createBoyahaneSchema.extend({
  id: z.string().uuid(),
});

export type UpdateBoyahaneInput = z.infer<typeof updateBoyahaneSchema>;

/**
 * Bulk top ekleme — bir numune'den çıkan N top için tek seferde.
 * Ortak alanlar (yapilacakIslem, fasonFirma, vs.) tüm satırlara uygulanır;
 * her satır kendi top_no, en, kilo, metre vs. değerlerini içerir.
 */
export const bulkTopRowSchema = z.object({
  topNo: z.string().trim().min(1, "Top No gerekli").max(60),
  en: optionalInt,
  istenenEn: optionalInt,
  metre: optionalDecimal,
  kilo: optionalDecimal,
  // Per-top — her top farklı işleme/fasona gidebilir
  yapilacakIslem: emptyToNull(z.string()),
  fasonFirma: emptyToNull(z.string().max(120)),
});

export const bulkTopAddSchema = z.object({
  numuneAtilimId: z.string().uuid(),
  // Ortak alanlar — gerçekten her topa aynı (tarih, talep eden, içerik vs.)
  talepTarihi: optionalIsoDate,
  talepEdenKisi: emptyToNull(z.string().max(120)),
  icerik: emptyToNull(z.string().max(120)),
  aciklama: emptyToNull(z.string()),
  durum: boyahaneDurumEnum.default("talimat_atildi"),
  // Top satırları
  toplar: z.array(bulkTopRowSchema).min(1, "En az bir top gerekli"),
});

export type BulkTopAddInput = z.infer<typeof bulkTopAddSchema>;
export type BulkTopRowInput = z.infer<typeof bulkTopRowSchema>;

export const listBoyahaneFilterSchema = z.object({
  search: z.string().trim().optional(),
  durum: boyahaneDurumEnum.optional(),
  fasonFirma: emptyToNull(z.string()),
  gittigiBoyane: emptyToNull(z.string()),
  satirDurumu: emptyToNull(z.string()),
  dateFrom: optionalIsoDate,
  dateTo: optionalIsoDate,
});

export type ListBoyahaneFilterInput = z.infer<typeof listBoyahaneFilterSchema>;

void isoDate; // future use
