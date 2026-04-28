/**
 * Numune Dokuma — varyant durum etiketleri (TR).
 * DB'de kod kalır (acik/dokumada/...), UI'da label gösterilir.
 */

export const NUMUNE_DURUM = [
  "acik",
  "dokumada",
  "kalite_kontrolde",
  "tamamlandi",
  "iptal",
] as const;

export type NumuneDurum = (typeof NUMUNE_DURUM)[number];

export const numuneDurumLabels: Record<NumuneDurum, string> = {
  acik: "Açık",
  dokumada: "Dokumada",
  kalite_kontrolde: "Kalite Kontrolde",
  tamamlandi: "Tamamlandı",
  iptal: "İptal",
};

export const numuneDurumOrder: Record<NumuneDurum, number> = {
  acik: 0,
  dokumada: 1,
  kalite_kontrolde: 2,
  tamamlandi: 3,
  iptal: 4,
};

export function isNumuneDurum(v: unknown): v is NumuneDurum {
  return typeof v === "string" && (NUMUNE_DURUM as readonly string[]).includes(v);
}

export function toNumuneDurumOptions(): Array<{ value: NumuneDurum; label: string }> {
  return NUMUNE_DURUM.map((value) => ({ value, label: numuneDurumLabels[value] }));
}
