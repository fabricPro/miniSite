/**
 * Enum değerleri → Türkçe etiketler. UI'da dropdown / badge için kullanılır.
 * DB'de İngilizce kodlar saklanır (kod-data sözlüğü gereği).
 */

import type {
  FinalStatus,
  DyeType,
  BinaryStatus,
  LabWorkStatus,
  YarnStatus,
  WarpStatus,
} from "@/modules/shared/types";

export const finalStatusLabels: Record<FinalStatus, string> = {
  open: "Açık",
  closed: "Kapalı",
  cancelled: "İptal",
};

export const dyeTypeLabels: Record<DyeType, string> = {
  yarn_dye: "İplik boya",
  piece_dye: "Parça boya",
};

export const binaryStatusLabels: Record<BinaryStatus, string> = {
  done: "Yapıldı",
  not_done: "Yapılmadı",
};

export const labWorkStatusLabels: Record<LabWorkStatus, string> = {
  done: "Yapıldı",
  not_done: "Yapılmadı",
  in_progress: "Devam ediyor",
};

export const yarnStatusLabels: Record<YarnStatus, string> = {
  given: "Verildi",
  not_given: "Verilmedi",
  in_stock: "Stoktan",
  not_needed: "Gerek yok",
  to_be_produced: "Üretilecek",
};

export const warpStatusLabels: Record<WarpStatus, string> = {
  done: "Hazır",
  not_done: "Hazır değil",
  instructed: "Talimat verildi",
  on_loom: "Tezgâhta",
};

// Helper: enum değerlerini option listesine dönüştür
export function toOptions<T extends string>(
  labels: Record<T, string>
): Array<{ value: T; label: string }> {
  return (Object.entries(labels) as Array<[T, string]>).map(([value, label]) => ({
    value,
    label,
  }));
}
