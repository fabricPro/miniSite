/**
 * Numune Dokuma — idempotent import from xlsx (NUMUNE ATILIM sheet).
 *
 * Usage:
 *   npm run import:numune                             # dry-run (default)
 *   npm run import:numune -- --apply                  # actually write
 *   npm run import:numune -- "<file.xlsx>"            # custom file
 *   NODE_OPTIONS="--max-old-space-size=4096" npm run import:numune  # büyük dosya
 *
 * Default file: C:/Users/PC/NumuneAtilim/data/numune-dokuma.xlsx
 *
 * Sheet expected:
 *   - NUMUNE ATILIM (her satır 1 varyant; aynı N:KOD birden fazla satır olur)
 *
 * Davranış:
 *   - Siyah/boş "ayraç" satırları skip
 *   - numune_no benzersiz (header tablosunda); varsa skip, yoksa insert
 *   - (numune_atilim_id, varyant_no) benzersiz; varsa skip, yoksa insert
 *   - CSR NO arge_talepleri'nde yoksa null FK + uyarı
 *   - Header alanları aynı numune_no için satırlar arasında farklıysa konsola uyarı
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import * as XLSX from "xlsx";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "../src/lib/db/client";
import {
  argeTalepleri,
  numuneAtilim,
  numuneVaryant,
  users,
} from "../src/lib/db/schema";

// ─── CLI ──────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const DRY = !APPLY;
const filePath = path.resolve(
  args.find((a) => !a.startsWith("--")) ??
    "C:/Users/PC/NumuneAtilim/data/numune-dokuma.xlsx"
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
    // DD.MM.YYYY
    const tr = v.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
    if (tr) {
      const d = tr[1].padStart(2, "0");
      const m2 = tr[2].padStart(2, "0");
      let y = tr[3];
      if (y.length === 2) y = "20" + y;
      return `${y}-${m2}-${d}`;
    }
  }
  return null;
}

function cleanStr(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s || s === "-" || s === "—" || s === "?" || s === "_") return null;
  return s;
}

/** "840" → "D.TRY840"; "484.2" → "D.TRY484.2"; "D.TRY840" → "D.TRY840" (idempotent) */
function normalizeNumuneNo(raw: string | null): string | null {
  if (!raw) return null;
  if (raw.startsWith("D.TRY")) return raw;
  if (/^[0-9]+(\.[0-9]+)?$/.test(raw)) return `D.TRY${raw}`;
  return raw; // Beklenmeyen format — olduğu gibi koru
}

function toInt(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "string") {
    const t = v.trim();
    if (!t || t === "-" || t === "?" || t === "++") return null;
  }
  const n =
    typeof v === "number" ? v : Number(String(v).replace(",", ".").replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function toDecimal(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v === "string") {
    const t = v.trim();
    if (!t || t === "-" || t === "?") return null;
    const m = t.match(/^(-?\d+(?:[.,]\d+)?)/);
    if (!m) return null;
    return String(Number(m[1].replace(",", ".")));
  }
  return null;
}

function normalizeVaryantNo(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim().toUpperCase();
  if (!s) return null;
  // "V01", "V1", "1" → "V01"
  if (/^V?\d+$/.test(s)) {
    const num = s.replace(/^V/, "");
    return `V${num.padStart(2, "0")}`;
  }
  return s.length <= 10 ? s : null;
}

function normalizeDurum(v: unknown): string {
  const s = cleanStr(v);
  if (!s) return "acik";
  const u = s.toLocaleUpperCase("tr-TR");
  if (u.includes("İPTAL") || u.includes("IPTAL")) return "iptal";
  if (u.includes("TAMAM") || u === "OK" || u === "TAMAMLANDI") return "tamamlandi";
  if (u.includes("KK") || u.includes("KALİTE") || u.includes("KALITE"))
    return "kalite_kontrolde";
  if (u.includes("DOKUMA") || u.includes("DOKUNUYOR")) return "dokumada";
  return "acik";
}

// ─── xlsx row type (gerçek başlıklar — boşluklara dikkat!) ───────────
interface NumuneRow {
  TARİH?: unknown;
  "N : KOD"?: unknown; // boşluklar etrafında
  VARYANT?: unknown;
  "ÖRGÜ "?: unknown; // sonda boşluk var
  RAPOR?: unknown;
  "ÇÖZGÜ ADI"?: unknown;
  "ATKI 1"?: unknown;
  "ATKI 2"?: unknown;
  "ATKI 3"?: unknown;
  "ATKI 4"?: unknown;
  "ATKI 5"?: unknown;
  "RENK 1"?: unknown;
  "RENK 2"?: unknown;
  "RENK 3"?: unknown;
  "RENK 4"?: unknown;
  "RENK 5"?: unknown;
  SIKLIK?: unknown;
  METRE?: unknown;
  TEZGAH?: unknown;
  AÇIKLAMA?: unknown;
  "CSR NO"?: unknown;
  KG?: unknown;
  "HAM EN"?: unknown;
  "MAMÜL EN"?: unknown;
  DURUM?: unknown;
  [key: string]: unknown;
}

// xlsx header'larındaki extra boşlukları normalleştir (defansif)
function getCol(r: NumuneRow, ...candidates: string[]): unknown {
  for (const c of candidates) {
    if (c in r) {
      const v = (r as Record<string, unknown>)[c];
      if (v !== undefined && v !== null && v !== "") return v;
    }
  }
  return null;
}

const c = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  blue: (s: string) => `\x1b[34m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

function header(title: string) {
  console.log("\n" + c.bold(c.blue("━".repeat(70))));
  console.log(c.bold(c.blue(`  ${title}`)));
  console.log(c.bold(c.blue("━".repeat(70))));
}

// ─── Main ─────────────────────────────────────────────────────────────
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
    sheets: ["NUMUNE ATILIM"], // Sadece bu sheet'i yükle (FORM sheet'i atla, OOM'u önle)
  });

  const sheet = wb.Sheets["NUMUNE ATILIM"];
  if (!sheet) {
    console.error(c.red("'NUMUNE ATILIM' sheet'i bulunamadı."));
    console.error("Mevcut sheet'ler:", wb.SheetNames.join(", "));
    process.exit(1);
  }

  const allRows = XLSX.utils.sheet_to_json<NumuneRow>(sheet, {
    defval: null,
    raw: true,
  });

  console.log(`   Toplam satır (raw): ${allRows.length}`);

  // ─── PHASE 0: Ayraç satırlarını filtrele ────────────────────────────
  header("PHASE 0 · Ayraç/boş satırları filtrele");

  const validRows: NumuneRow[] = [];
  let skippedSeparator = 0;

  for (const r of allRows) {
    const numuneNo = cleanStr(getCol(r, "N : KOD", "N: KOD", "N:KOD"));
    const varyantNo = cleanStr(r.VARYANT);
    const tarih = r.TARİH;
    // Ayraç satırı: numune_no boş VE tüm key alanlar boş
    if (!numuneNo && !varyantNo && (tarih == null || tarih === "")) {
      skippedSeparator++;
      continue;
    }
    validRows.push(r);
  }

  console.log(`   Ayraç satırları (skip): ${skippedSeparator}`);
  console.log(`   Geçerli satır: ${validRows.length}`);

  // ─── PHASE 0.5: Forward-fill (Excel'deki merge cell etkisi) ─────────
  // N:KOD ve TARİH önceki satırdan miras alır eğer mevcut satır bunlardan
  // birini içermiyor ama VARYANT veya başka veri içeriyorsa.
  header("PHASE 0.5 · N:KOD / TARİH forward-fill");
  let lastNumuneNo: string | null = null;
  let lastTarih: unknown = null;
  let lastTezgah: unknown = null;
  let lastDesen: unknown = null;
  let lastSiklik: unknown = null;
  let lastRapor: unknown = null;
  let lastCozguAdi: unknown = null;
  let lastAtki1: unknown = null;
  let lastAtki2: unknown = null;
  let lastAtki3: unknown = null;
  let lastAtki4: unknown = null;
  let lastAtki5: unknown = null;
  let lastCsr: unknown = null;
  let filled = 0;

  for (const r of validRows) {
    const currentNumuneNo = cleanStr(getCol(r, "N : KOD", "N: KOD", "N:KOD"));
    if (currentNumuneNo) {
      lastNumuneNo = currentNumuneNo;
      lastTarih = r.TARİH;
      lastTezgah = r.TEZGAH;
      lastDesen = getCol(r, "ÖRGÜ ", "ÖRGÜ", "DESEN");
      lastSiklik = r.SIKLIK;
      lastRapor = r.RAPOR;
      lastCozguAdi = r["ÇÖZGÜ ADI"];
      lastAtki1 = r["ATKI 1"];
      lastAtki2 = r["ATKI 2"];
      lastAtki3 = r["ATKI 3"];
      lastAtki4 = r["ATKI 4"];
      lastAtki5 = r["ATKI 5"];
      lastCsr = r["CSR NO"];
    } else if (lastNumuneNo) {
      // Forward-fill: önceki numune'nin grubundaki bir varyant satırı
      (r as Record<string, unknown>)["N : KOD"] = lastNumuneNo;
      if (r.TARİH == null || r.TARİH === "") r.TARİH = lastTarih;
      if (r.TEZGAH == null || r.TEZGAH === "") r.TEZGAH = lastTezgah;
      const desenKey = "ÖRGÜ ";
      if (
        (r as Record<string, unknown>)[desenKey] == null ||
        (r as Record<string, unknown>)[desenKey] === ""
      )
        (r as Record<string, unknown>)[desenKey] = lastDesen;
      if (r.SIKLIK == null || r.SIKLIK === "") r.SIKLIK = lastSiklik;
      if (r.RAPOR == null || r.RAPOR === "") r.RAPOR = lastRapor;
      if (r["ÇÖZGÜ ADI"] == null || r["ÇÖZGÜ ADI"] === "")
        r["ÇÖZGÜ ADI"] = lastCozguAdi;
      if (r["ATKI 1"] == null || r["ATKI 1"] === "") r["ATKI 1"] = lastAtki1;
      if (r["ATKI 2"] == null || r["ATKI 2"] === "") r["ATKI 2"] = lastAtki2;
      if (r["ATKI 3"] == null || r["ATKI 3"] === "") r["ATKI 3"] = lastAtki3;
      if (r["ATKI 4"] == null || r["ATKI 4"] === "") r["ATKI 4"] = lastAtki4;
      if (r["ATKI 5"] == null || r["ATKI 5"] === "") r["ATKI 5"] = lastAtki5;
      if (r["CSR NO"] == null || r["CSR NO"] === "") r["CSR NO"] = lastCsr;
      filled++;
    }
  }

  console.log(`   Forward-fill (önceki satırdan miras): ${filled}`);

  // ─── PHASE 1: Header dedup (numune_no bazında group) ────────────────
  header("PHASE 1 · Numune header'larını grupla");

  type HeaderRow = {
    numuneNo: string;
    date: string;
    tezgah: string | null;
    desen: string | null;
    siklik: string | null;
    rapor: string | null;
    cozguAdi: string | null;
    atki1: string | null;
    atki2: string | null;
    atki3: string | null;
    atki4: string | null;
    atki5: string | null;
    aciklama: string | null;
    recordNo: string | null;
    durum: string;
    completionDate: string | null;
    kg: string | null;
    hamEn: number | null;
    mamulEn: number | null;
  };

  const headerByNo = new Map<string, HeaderRow>();
  const variantsByNumuneNo = new Map<string, NumuneRow[]>();
  const headerConflicts: { numuneNo: string; field: string; values: string[] }[] = [];
  const skippedRowsNoHeader: number[] = [];

  for (let i = 0; i < validRows.length; i++) {
    const r = validRows[i];
    const numuneNo = normalizeNumuneNo(
      cleanStr(getCol(r, "N : KOD", "N: KOD", "N:KOD"))
    );
    if (!numuneNo) {
      skippedRowsNoHeader.push(i + 2);
      continue;
    }

    const date = toIsoDate(r.TARİH);
    if (!date) {
      // Tarih yoksa header oluşturamayız
      skippedRowsNoHeader.push(i + 2);
      continue;
    }

    if (!headerByNo.has(numuneNo)) {
      const durumRaw = normalizeDurum(r.DURUM);
      headerByNo.set(numuneNo, {
        numuneNo,
        date,
        tezgah: cleanStr(r.TEZGAH),
        desen: cleanStr(getCol(r, "ÖRGÜ ", "ÖRGÜ", "DESEN")),
        siklik: cleanStr(r.SIKLIK),
        rapor: cleanStr(r.RAPOR),
        cozguAdi: cleanStr(r["ÇÖZGÜ ADI"]),
        atki1: cleanStr(r["ATKI 1"]),
        atki2: cleanStr(r["ATKI 2"]),
        atki3: cleanStr(r["ATKI 3"]),
        atki4: cleanStr(r["ATKI 4"]),
        atki5: cleanStr(r["ATKI 5"]),
        aciklama: cleanStr(r.AÇIKLAMA),
        recordNo: cleanStr(r["CSR NO"]),
        durum: durumRaw,
        completionDate: durumRaw === "tamamlandi" ? date : null,
        kg: toDecimal(r.KG),
        hamEn: toInt(r["HAM EN"]),
        mamulEn: toInt(r["MAMÜL EN"]),
      });
    } else {
      // Header zaten var — alanlar tutarlı mı kontrol et
      const existing = headerByNo.get(numuneNo)!;
      const checks: Array<[keyof HeaderRow, unknown]> = [
        ["tezgah", cleanStr(r.TEZGAH)],
        ["siklik", cleanStr(r.SIKLIK)],
        ["cozguAdi", cleanStr(r["ÇÖZGÜ ADI"])],
        ["atki1", cleanStr(r["ATKI 1"])],
      ];
      for (const [field, newVal] of checks) {
        const oldVal = existing[field];
        if (oldVal != null && newVal != null && oldVal !== newVal) {
          headerConflicts.push({
            numuneNo,
            field: String(field),
            values: [String(oldVal), String(newVal)],
          });
        }
      }
    }

    if (!variantsByNumuneNo.has(numuneNo)) variantsByNumuneNo.set(numuneNo, []);
    variantsByNumuneNo.get(numuneNo)!.push(r);
  }

  console.log(`   Distinct numune (header): ${headerByNo.size}`);
  console.log(`   Header conflict (uyarı): ${headerConflicts.length}`);
  if (headerConflicts.length > 0) {
    headerConflicts.slice(0, 5).forEach((c) =>
      console.log(`     ! ${c.numuneNo}.${c.field}: "${c.values[0]}" vs "${c.values[1]}"`)
    );
    if (headerConflicts.length > 5) {
      console.log(`     ! ...ve ${headerConflicts.length - 5} tane daha`);
    }
  }
  console.log(`   N:KOD/TARİH eksik (skip): ${skippedRowsNoHeader.length}`);

  // ─── PHASE 2: CSR FK resolve ────────────────────────────────────────
  header("PHASE 2 · CSR FK e\u015fle\u015ftirme");

  const existingArge = await db
    .select({ recordNo: argeTalepleri.recordNo })
    .from(argeTalepleri);
  const argeRecordSet = new Set(existingArge.map((r) => r.recordNo));

  let csrMatched = 0;
  let csrUnmatched = 0;
  const unmatchedSamples: string[] = [];

  for (const h of headerByNo.values()) {
    if (h.recordNo) {
      if (argeRecordSet.has(h.recordNo)) {
        csrMatched++;
      } else {
        csrUnmatched++;
        if (unmatchedSamples.length < 10) unmatchedSamples.push(`${h.numuneNo} → ${h.recordNo}`);
        h.recordNo = null; // FK'ya null koy
      }
    }
  }

  console.log(`   CSR e\u015fle\u015fti: ${csrMatched}`);
  console.log(`   CSR e\u015fle\u015fmedi (null'a \u00e7evrildi): ${csrUnmatched}`);
  unmatchedSamples.forEach((s) => console.log(`     ? ${s}`));

  // ─── PHASE 3: Numune insert ─────────────────────────────────────────
  header("PHASE 3 · Numune (header) idempotent insert");

  const [admin] = await db.select({ id: users.id }).from(users).limit(1);
  if (!admin) {
    console.error(c.red("Hi\u00e7 kullan\u0131c\u0131 yok \u2014 \u00f6nce \`npm run db:seed\`."));
    process.exit(1);
  }

  const existingNumune = await db
    .select({ id: numuneAtilim.id, numuneNo: numuneAtilim.numuneNo })
    .from(numuneAtilim);
  const numuneByNo = new Map(existingNumune.map((n) => [n.numuneNo, n.id]));

  let numuneInserted = 0;
  let numuneSkipped = 0;
  const numuneInsertList: { numuneNo: string; date: string }[] = [];

  for (const h of headerByNo.values()) {
    if (numuneByNo.has(h.numuneNo)) {
      numuneSkipped++;
      continue;
    }
    numuneInsertList.push({ numuneNo: h.numuneNo, date: h.date });

    if (DRY) {
      numuneByNo.set(h.numuneNo, `dry-${h.numuneNo}`);
      numuneInserted++;
      continue;
    }

    const [row] = await db
      .insert(numuneAtilim)
      .values({
        numuneNo: h.numuneNo,
        recordNo: h.recordNo,
        date: h.date,
        tezgah: h.tezgah,
        desen: h.desen,
        siklik: h.siklik,
        rapor: h.rapor,
        cozguAdi: h.cozguAdi,
        atki1: h.atki1,
        atki2: h.atki2,
        atki3: h.atki3,
        atki4: h.atki4,
        atki5: h.atki5,
        // İro sayıları default olarak slot indeksi (atki_N → iro N)
        iro1: h.atki1 ? 1 : null,
        iro2: h.atki2 ? 2 : null,
        iro3: h.atki3 ? 3 : null,
        iro4: h.atki4 ? 4 : null,
        iro5: h.atki5 ? 5 : null,
        aciklama: h.aciklama,
        durum: h.durum,
        completionDate: h.completionDate,
        kg: h.kg,
        hamEn: h.hamEn,
        mamulEn: h.mamulEn,
        createdBy: admin.id,
      })
      .returning({ id: numuneAtilim.id });
    numuneByNo.set(h.numuneNo, row.id);
    numuneInserted++;
  }

  console.log(`   Numune insert: ${numuneInserted}`);
  console.log(`   Numune zaten mevcut (skip): ${numuneSkipped}`);
  if (numuneInsertList.length > 0 && numuneInsertList.length <= 20) {
    numuneInsertList.forEach((n) => console.log(`     + ${n.numuneNo} (${n.date})`));
  } else if (numuneInsertList.length > 20) {
    numuneInsertList.slice(0, 10).forEach((n) =>
      console.log(`     + ${n.numuneNo} (${n.date})`)
    );
    console.log(`     + ...ve ${numuneInsertList.length - 10} tane daha`);
  }

  // ─── PHASE 4: Variant insert ────────────────────────────────────────
  header("PHASE 4 · Varyant idempotent insert");

  // Mevcut varyantları yükle: (numune_atilim_id, varyant_no) → bool
  const existingVariants = await db
    .select({
      numuneAtilimId: numuneVaryant.numuneAtilimId,
      varyantNo: numuneVaryant.varyantNo,
    })
    .from(numuneVaryant);
  const variantKeySet = new Set(
    existingVariants.map((v) => `${v.numuneAtilimId}|${v.varyantNo}`)
  );

  let variantInserted = 0;
  let variantSkippedDup = 0;
  const variantSkippedNoNumune: number[] = [];
  const variantSkippedNoVarNo: number[] = [];

  for (const [numuneNo, rows] of variantsByNumuneNo) {
    const numuneId = numuneByNo.get(numuneNo);
    if (!numuneId) {
      // Header oluşturulamadı (date eksik vs.)
      rows.forEach((_, idx) => variantSkippedNoNumune.push(idx + 2));
      continue;
    }

    // Aynı satırlar arasında varyantların sırası önemli
    // Eğer aynı varyant_no birden fazla satırda varsa ilkini al
    const seenVaryant = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const varyantNo = normalizeVaryantNo(r.VARYANT);
      if (!varyantNo) {
        variantSkippedNoVarNo.push(i + 2);
        continue;
      }
      if (seenVaryant.has(varyantNo)) {
        // xlsx içinde aynı (numuneNo, varyantNo) — ilkini almıştık, atla
        continue;
      }
      seenVaryant.add(varyantNo);

      const dryNumuneId = String(numuneId).startsWith("dry-")
        ? numuneId
        : numuneId;
      const key = `${dryNumuneId}|${varyantNo}`;
      if (variantKeySet.has(key)) {
        variantSkippedDup++;
        continue;
      }
      variantKeySet.add(key);

      if (DRY) {
        variantInserted++;
        continue;
      }

      await db.insert(numuneVaryant).values({
        numuneAtilimId: numuneId,
        varyantNo,
        renk1: cleanStr(r["RENK 1"]),
        renk2: cleanStr(r["RENK 2"]),
        renk3: cleanStr(r["RENK 3"]),
        renk4: cleanStr(r["RENK 4"]),
        renk5: cleanStr(r["RENK 5"]),
        metre: toDecimal(r.METRE),
      });
      variantInserted++;
    }
  }

  console.log(`   Varyant insert: ${variantInserted}`);
  console.log(`   Varyant zaten mevcut (dup-skip): ${variantSkippedDup}`);
  console.log(`   Varyant atland\u0131 (numune yok): ${variantSkippedNoNumune.length}`);
  console.log(`   Varyant atland\u0131 (varyant_no eksik): ${variantSkippedNoVarNo.length}`);

  // ─── Final summary ────────────────────────────────────────────────────
  header(DRY ? "DRY-RUN \u00d6ZET" : "APPLY \u00d6ZET");
  console.log(`   Numune (header) \u00b7 insert: ${numuneInserted}, skip: ${numuneSkipped}`);
  console.log(
    `   Varyant         \u00b7 insert: ${variantInserted}, dup-skip: ${variantSkippedDup}, no-numune: ${variantSkippedNoNumune.length}, no-varyant: ${variantSkippedNoVarNo.length}`
  );
  console.log(`   CSR FK          \u00b7 e\u015fle\u015fti: ${csrMatched}, e\u015fle\u015fmedi: ${csrUnmatched}`);
  console.log(`   Ayra\u00e7/atlanan  \u00b7 separator: ${skippedSeparator}, eksik header: ${skippedRowsNoHeader.length}`);
  console.log(`   Header conflict \u00b7 uyar\u0131: ${headerConflicts.length}`);

  if (DRY) {
    console.log(
      "\n" +
        c.yellow(
          "\u26a0 DRY-RUN \u2014 DB'ye yazma yap\u0131lmad\u0131. Onaylamak i\u00e7in `--apply` flag'i ile tekrar \u00e7al\u0131\u015ft\u0131r."
        )
    );
  } else {
    console.log("\n" + c.green("\u2713 APPLY tamamland\u0131."));
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(c.red("\n\u2717 Import hatas\u0131:"), err);
  process.exit(1);
});
