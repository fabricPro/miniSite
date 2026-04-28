/**
 * Boyahane — boyane.xlsx → boyahane_partileri import (idempotent).
 *
 * Usage:
 *   npm run import:boyane                  # dry-run
 *   npm run import:boyane -- --apply       # commit
 *   NODE_OPTIONS="--max-old-space-size=4096" npm run import:boyane
 *
 * Default file: C:/Users/PC/NumuneAtilim/data/boyane.xlsx
 * Sheet: BOYAHANE TAKİP
 *
 * Davranış:
 *   - uniq_sira (Excel orijinal sıra) üzerinden idempotent: varsa skip
 *   - D.Try numerik ise → "D.TRY{N}" formatında numune_atilim'a match
 *   - DA-prefixli / text D.Try → null FK ile insert (kabul)
 *   - DURUM normalize: Türkçe metni enum'a çevir
 *   - Tarih: Excel serial → ISO
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import * as XLSX from "xlsx";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "../src/lib/db/client";
import {
  boyahanePartileri,
  numuneAtilim,
  users,
} from "../src/lib/db/schema";
import { normalizeDurum } from "../src/modules/boyahane/labels";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const DRY = !APPLY;
const filePath = path.resolve(
  args.find((a) => !a.startsWith("--")) ??
    "C:/Users/PC/NumuneAtilim/data/boyane.xlsx"
);

// ─── Helpers ──────────────────────────────────────────────────────────
function excelSerialToISO(n: number): string {
  const ms = (n - 25569) * 86400 * 1000;
  return new Date(ms).toISOString().slice(0, 10);
}

function toIsoDate(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return excelSerialToISO(v);
  if (v instanceof Date) {
    return new Date(
      Date.UTC(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate())
    )
      .toISOString()
      .slice(0, 10);
  }
  if (typeof v === "string") {
    const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return m[0];
    const tr = v.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
    if (tr) {
      const d = tr[1].padStart(2, "0");
      const mm = tr[2].padStart(2, "0");
      let y = tr[3];
      if (y.length === 2) y = "20" + y;
      return `${y}-${mm}-${d}`;
    }
  }
  return null;
}

function cleanStr(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s || s === "-" || s === "—" || s === "?") return null;
  return s;
}

function toInt(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "string") {
    const t = v.trim();
    if (!t || t === "?" || t === "-") return null;
  }
  const n =
    typeof v === "number"
      ? v
      : Number(String(v).replace(",", ".").replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function toDecimal(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v === "string") {
    const t = v.trim();
    if (!t || t === "?" || t === "-") return null;
    const m = t.match(/^(-?\d+(?:[.,]\d+)?)/);
    if (!m) return null;
    return String(Number(m[1].replace(",", ".")));
  }
  return null;
}

/**
 * D.Try numerik → "D.TRY{N}". Excel serial date'leri (>9999) skip et.
 * Bizim numune_no'lar D.TRY1..D.TRY999+ (4 haneye kadar makul); 40000+ Excel
 * serial date'i (2009 sonrası) — kayıp formatlama, numune değil.
 */
function dTryToNumuneNo(raw: string | null): string | null {
  if (!raw) return null;
  const t = raw.trim();
  if (/^[0-9]+(\.[0-9]+)?$/.test(t)) {
    const n = Number(t);
    if (n > 9999) return null; // Excel serial date olabilir → skip
    return `D.TRY${t}`;
  }
  return null;
}

/** D.Try ham değeri çok büyük numerik ise (Excel date), null'a çek */
function cleanDtry(raw: string | null): string | null {
  if (!raw) return null;
  const t = raw.trim();
  if (/^[0-9]+(\.[0-9]+)?$/.test(t) && Number(t) > 9999) return null;
  return t;
}

const c = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  blue: (s: string) => `\x1b[34m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

function header(t: string) {
  console.log("\n" + c.bold(c.blue("━".repeat(70))));
  console.log(c.bold(c.blue(`  ${t}`)));
  console.log(c.bold(c.blue("━".repeat(70))));
}

interface BoyaneRow {
  UniqeSıra?: unknown;
  "Satır Durumu"?: unknown;
  "Top Numarası"?: unknown;
  "Talep Tarihi"?: unknown;
  Termin?: unknown;
  "D.Try"?: unknown;
  En?: unknown;
  "İstenen En"?: unknown;
  Metre?: unknown;
  Kilo?: unknown;
  "Desen No"?: unknown;
  "Yapılacak İşlem"?: unknown;
  "Fason Firma"?: unknown;
  Açıklama?: unknown;
  İÇERİK?: unknown;
  "Talep Eden Kişi"?: unknown;
  "Parti NO F.K"?: unknown;
  DURUM?: unknown;
  "GİTTİĞİ BOYANE"?: unknown;
  "GELEN MT"?: unknown;
  "Gitme Tarihi"?: unknown;
  "Gelme Tarihi"?: unknown;
  [key: string]: unknown;
}

async function main() {
  console.log(
    c.bold(`\n📂 File: ${filePath}`),
    DRY ? c.yellow("[DRY-RUN]") : c.green("[APPLY]")
  );

  const wb = XLSX.readFile(filePath, {
    cellDates: false,
    cellFormula: false,
    cellHTML: false,
    cellStyles: false,
    raw: true,
    sheets: ["BOYAHANE TAKİP"],
  });

  const sheet = wb.Sheets["BOYAHANE TAKİP"];
  if (!sheet) {
    console.error(c.red("'BOYAHANE TAKİP' sheet'i bulunamadı."));
    process.exit(1);
  }

  const rows = XLSX.utils.sheet_to_json<BoyaneRow>(sheet, {
    defval: null,
    raw: true,
  });
  console.log(`   Toplam satır: ${rows.length}`);

  // ─── Phase 1: Numune cache ─────────────────────────────────────────
  header("PHASE 1 · Numune cache");
  const numuneRows = await db
    .select({ id: numuneAtilim.id, numuneNo: numuneAtilim.numuneNo })
    .from(numuneAtilim);
  const numuneByNo = new Map(numuneRows.map((n) => [n.numuneNo, n.id]));
  console.log(`   ${numuneRows.length} numune yüklendi`);

  // ─── Phase 2: Mevcut partiler ──────────────────────────────────────
  header("PHASE 2 · Mevcut boyahane_partileri (idempotent için)");
  const existingParti = await db
    .select({
      uniqSira: boyahanePartileri.uniqSira,
    })
    .from(boyahanePartileri);
  const existingSiraSet = new Set(
    existingParti.map((p) => p.uniqSira).filter((v): v is number => v != null)
  );
  console.log(`   ${existingParti.length} mevcut parti`);

  // ─── Phase 3: Admin user ───────────────────────────────────────────
  const [admin] = await db.select({ id: users.id }).from(users).limit(1);
  if (!admin) {
    console.error(c.red("Hiç kullanıcı yok — önce `npm run db:seed`."));
    process.exit(1);
  }

  // ─── Phase 4: Insert ───────────────────────────────────────────────
  header("PHASE 4 · Idempotent insert");

  let inserted = 0;
  let skippedDup = 0;
  let skippedEmpty = 0;
  let matchedNumune = 0;
  let unmatchedDtry = 0;
  const unmatchedSamples: string[] = [];

  for (const r of rows) {
    const uniqSira = toInt(r.UniqeSıra);
    const topNo = cleanStr(r["Top Numarası"]);
    if (!topNo) {
      skippedEmpty++;
      continue;
    }
    if (uniqSira != null && existingSiraSet.has(uniqSira)) {
      skippedDup++;
      continue;
    }

    // D.Try resolve — Excel serial date'leri filtre
    const dTryRaw = cleanDtry(cleanStr(r["D.Try"]));
    const candidateNumuneNo = dTryToNumuneNo(dTryRaw);
    let numuneAtilimId: string | null = null;
    if (candidateNumuneNo) {
      const id = numuneByNo.get(candidateNumuneNo);
      if (id) {
        numuneAtilimId = id;
        matchedNumune++;
      } else if (dTryRaw) {
        unmatchedDtry++;
        if (unmatchedSamples.length < 10) {
          unmatchedSamples.push(`${topNo} → D.Try=${dTryRaw}`);
        }
      }
    } else if (dTryRaw) {
      // DA-prefixed veya text D.Try — match denenmiyor, kabul ediyoruz
      unmatchedDtry++;
    }

    if (DRY) {
      inserted++;
      if (uniqSira != null) existingSiraSet.add(uniqSira);
      continue;
    }

    await db.insert(boyahanePartileri).values({
      uniqSira,
      satirDurumu: cleanStr(r["Satır Durumu"]),
      topNo,
      dTry: dTryRaw,
      numuneAtilimId,
      talepTarihi: toIsoDate(r["Talep Tarihi"]),
      termin: toIsoDate(r["Termin"]),
      en: toInt(r.En),
      istenenEn: toInt(r["İstenen En"]),
      metre: toDecimal(r.Metre),
      kilo: toDecimal(r.Kilo),
      desenNo: cleanStr(r["Desen No"]),
      yapilacakIslem: cleanStr(r["Yapılacak İşlem"]),
      fasonFirma: cleanStr(r["Fason Firma"]),
      aciklama: cleanStr(r["Açıklama"]),
      icerik: cleanStr(r["İÇERİK"]),
      talepEdenKisi: cleanStr(r["Talep Eden Kişi"]),
      partiNoFk: cleanStr(r["Parti NO F.K"]),
      durum: normalizeDurum(cleanStr(r["DURUM"])),
      gittigiBoyane: cleanStr(r["GİTTİĞİ BOYANE"]),
      gelenMt: toDecimal(r["GELEN MT"]),
      gitmeTarihi: toIsoDate(r["Gitme Tarihi"]),
      gelmeTarihi: toIsoDate(r["Gelme Tarihi"]),
      createdBy: admin.id,
    });
    inserted++;
    if (uniqSira != null) existingSiraSet.add(uniqSira);
  }

  // ─── Özet ──────────────────────────────────────────────────────────
  header(DRY ? "DRY-RUN ÖZET" : "APPLY ÖZET");
  console.log(`   Insert: ${inserted}`);
  console.log(`   Skip (dup): ${skippedDup}`);
  console.log(`   Skip (top no boş): ${skippedEmpty}`);
  console.log(`   Numune match: ${matchedNumune}`);
  console.log(`   Numune match yok (D.Try DA-prefix/text): ${unmatchedDtry}`);
  if (unmatchedSamples.length > 0) {
    console.log(`   Eşleşmeyen örnekler:`);
    unmatchedSamples.forEach((s) => console.log(`     · ${s}`));
  }

  if (DRY) {
    console.log(
      "\n" +
        c.yellow(
          "⚠ DRY-RUN — DB'ye yazma yapılmadı. Onaylamak için `--apply` ile çalıştır."
        )
    );
  } else {
    console.log("\n" + c.green("✓ APPLY tamamlandı."));
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(c.red("\n✗ Import hatası:"), err);
  process.exit(1);
});

void eq; // suppress unused if not used
