/**
 * Boyahane parti durumları (Excel'deki DURUM kolonu).
 * 4 sabit durum — ilerideki SQL entegrasyonunda da bu liste değişmemeli.
 */

export const BOYAHANE_DURUM = [
  "talimat_atildi",
  "islemde",
  "islemden_gelmis",
  "islemden_iade",
] as const;

export type BoyahaneDurum = (typeof BOYAHANE_DURUM)[number];

/** Excel'deki Türkçe → enum kodu */
export const boyahaneDurumLabels: Record<BoyahaneDurum, string> = {
  talimat_atildi: "Talimat Atıldı",
  islemde: "İşlemde",
  islemden_gelmis: "İşlemden Gelmiş",
  islemden_iade: "İşlemden İade",
};

/** Normalize: Excel/UI'dan gelen string → enum kodu */
export function normalizeDurum(raw: string | null | undefined): BoyahaneDurum {
  if (!raw) return "talimat_atildi";
  const u = raw.trim().toLocaleLowerCase("tr-TR");
  if (u.includes("iade")) return "islemden_iade";
  if (u.includes("gelmiş") || u.includes("gelmis")) return "islemden_gelmis";
  if (u.includes("işlemde") || u.includes("islemde")) return "islemde";
  return "talimat_atildi";
}

/** Renk haritası — Tailwind class */
export const durumColors: Record<BoyahaneDurum, string> = {
  talimat_atildi: "bg-slate-500 hover:bg-slate-500 text-white",
  islemde: "bg-indigo-600 hover:bg-indigo-600 text-white",
  islemden_gelmis: "bg-green-600 hover:bg-green-600 text-white",
  islemden_iade: "bg-red-600 hover:bg-red-600 text-white",
};

export function isBoyahaneDurum(v: unknown): v is BoyahaneDurum {
  return typeof v === "string" && (BOYAHANE_DURUM as readonly string[]).includes(v);
}
