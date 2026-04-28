import * as XLSX from "xlsx";

const wb = XLSX.readFile("C:/Users/PC/NumuneAtilim/data/boyane.xlsx", {
  raw: true,
  sheets: ["BOYAHANE TAKİP"],
});
const sheet = wb.Sheets["BOYAHANE TAKİP"];
const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
  defval: null,
  raw: true,
});

// Sadece boyane'a özgü kolonları göster, __EMPTY'leri filtrele
const RELEVANT = [
  "UniqeSıra",
  "Satır Durumu",
  "Top Numarası",
  "Talep Tarihi",
  "Termin",
  "Geçen Gün",
  "D.Try",
  "En",
  "İstenen En",
  "Metre",
  "Kilo",
  "Desen No",
  "Yapılacak İşlem",
  "Fason Firma",
  "Açıklama",
  "İÇERİK",
  "Talep Eden Kişi",
  "Parti NO F.K",
  "DURUM",
  "GİTTİĞİ BOYANE",
  "GELEN MT",
  "Gitme Tarihi",
  "Gelme Tarihi",
  "YIL",
  "AY",
];

console.log(`Total rows: ${rows.length}\n`);

// İlk 5 dolu satırı göster
let shown = 0;
for (let i = 0; i < rows.length && shown < 5; i++) {
  const r = rows[i];
  const filtered: Record<string, unknown> = {};
  let hasData = false;
  for (const k of RELEVANT) {
    if (r[k] != null && r[k] !== "") {
      filtered[k] = r[k];
      hasData = true;
    }
  }
  if (hasData) {
    console.log(`--- Row ${i + 2} ---`);
    console.log(JSON.stringify(filtered, null, 2));
    shown++;
  }
}

// Son 3 satır
console.log("\n--- LAST 3 ROWS ---");
for (let i = Math.max(0, rows.length - 3); i < rows.length; i++) {
  const r = rows[i];
  const filtered: Record<string, unknown> = {};
  let hasData = false;
  for (const k of RELEVANT) {
    if (r[k] != null && r[k] !== "") {
      filtered[k] = r[k];
      hasData = true;
    }
  }
  if (hasData) {
    console.log(`--- Row ${i + 2} ---`);
    console.log(JSON.stringify(filtered, null, 2));
  }
}

// İstatistikler
console.log("\n--- STATS ---");
let withTopNo = 0;
let withDtry = 0;
let withParti = 0;
let withDurum = 0;
let withBoyane = 0;
const dtryCodes = new Set<string>();
const fasonFirmas = new Set<string>();
const islemler = new Set<string>();
const durumlar = new Set<string>();
const boyanaler = new Set<string>();

for (const r of rows) {
  if (r["Top Numarası"] != null && String(r["Top Numarası"]).trim() !== "") withTopNo++;
  if (r["D.Try"] != null && String(r["D.Try"]).trim() !== "") {
    withDtry++;
    dtryCodes.add(String(r["D.Try"]));
  }
  if (r["Parti NO F.K"] != null && String(r["Parti NO F.K"]).trim() !== "") withParti++;
  if (r["DURUM"] != null && String(r["DURUM"]).trim() !== "") {
    withDurum++;
    durumlar.add(String(r["DURUM"]));
  }
  if (r["GİTTİĞİ BOYANE"] != null && String(r["GİTTİĞİ BOYANE"]).trim() !== "") {
    withBoyane++;
    boyanaler.add(String(r["GİTTİĞİ BOYANE"]));
  }
  if (r["Fason Firma"] != null && String(r["Fason Firma"]).trim() !== "") fasonFirmas.add(String(r["Fason Firma"]));
  if (r["Yapılacak İşlem"] != null && String(r["Yapılacak İşlem"]).trim() !== "") islemler.add(String(r["Yapılacak İşlem"]));
}

console.log(`Top No dolu: ${withTopNo} / ${rows.length}`);
console.log(`D.Try dolu: ${withDtry} / ${rows.length}`);
console.log(`Parti NO F.K dolu: ${withParti} / ${rows.length}`);
console.log(`DURUM dolu: ${withDurum} / ${rows.length}`);
console.log(`GİTTİĞİ BOYANE dolu: ${withBoyane} / ${rows.length}`);
console.log(`\nDistinct DTRY: ${dtryCodes.size}`);
console.log(`Distinct Fason Firma: ${fasonFirmas.size} - ${Array.from(fasonFirmas).slice(0, 10).join(", ")}`);
console.log(`Distinct DURUM: ${durumlar.size} - ${Array.from(durumlar).slice(0, 10).join(", ")}`);
console.log(`Distinct GİTTİĞİ BOYANE: ${boyanaler.size} - ${Array.from(boyanaler).slice(0, 10).join(", ")}`);
console.log(`Distinct Yapılacak İşlem: ${islemler.size}`);
console.log(`First 5 işlem: ${Array.from(islemler).slice(0, 5).join(" | ")}`);

// DTRY format örnekleri
console.log("\n--- DTRY FORMAT SAMPLES ---");
const dtrySamples = Array.from(dtryCodes).slice(0, 20);
console.log(dtrySamples.join("\n"));
