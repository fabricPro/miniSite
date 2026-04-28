/**
 * NUMUNE MASTER 1.0.2.xlsm → Postgres import.
 *
 * Kullanım:
 *   npm run import:excel -- "<.xlsm path>"
 *   npm run import:excel -- "<.xlsm path>" --dry        → DB'ye yazma, sadece doğrulama
 *   npm run import:excel -- "<.xlsm path>" --reset      → Mevcut arge_talepleri + hareket_log wipe (DİKKAT)
 *
 * Kaynak sheet'ler:
 *   · ArgeTalepleri (26 satır) → arge_talepleri
 *   · Log_Sayfası (233 satır) → hareket_log
 *
 * Davranış:
 *   · Müşteri (Müşteri + Ülke) → customers tablosunda yoksa eklenir
 *   · İşlem tipi (Yapılan İşlem) → action_types tablosunda yoksa eklenir (codeEn auto-slug)
 *   · recordNo zaten varsa güncellenir (upsert)
 *   · Hatalı satırlar skiplist'e yazılır, summary sonda basılır
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import * as XLSX from "xlsx";
import { eq } from "drizzle-orm";
import { db } from "../src/lib/db/client";
import {
  actionTypes,
  argeTalepleri,
  customers,
  hareketLog,
  users,
} from "../src/lib/db/schema";

// ─── CLI ──────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const xlsmPath = args.find((a) => !a.startsWith("--"));
const DRY = args.includes("--dry");
const RESET = args.includes("--reset");

if (!xlsmPath) {
  console.error(
    'Kullanım: npm run import:excel -- "<path-to-xlsm>" [--dry] [--reset]'
  );
  process.exit(1);
}

// ─── Yardımcılar ─────────────────────────────────────────────────────
function toIsoDate(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (v instanceof Date) {
    // UTC günü olarak al (Excel tarih hücreleri 21:00 UTC = TR 00:00)
    const d = new Date(
      Date.UTC(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate())
    );
    // Saat farkı varsa bile ISO günü tut
    if (v.getUTCHours() >= 12) {
      d.setUTCDate(d.getUTCDate() + 1);
    }
    return d.toISOString().slice(0, 10);
  }
  if (typeof v === "string") {
    // "01-02-2026" veya "2026-02-01"
    const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return m[0];
  }
  return null;
}

function cleanStr(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s || s === "-" || s === "—") return null;
  return s;
}

function toInt(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function toDecimal(v: unknown): string | null {
  if (v == null || v === "") return null;
  // "PARÇA UFAK ALINAMADI" gibi metinleri at
  if (typeof v === "string" && !/^-?\d+([.,]\d+)?$/.test(v.trim())) return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return String(n);
}

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

// ─── Enum eşleştirmeleri ─────────────────────────────────────────────
const DYE_TYPE: Record<string, string> = {
  "iplik boya": "yarn_dye",
  "top boya": "piece_dye",
  "parça boya": "piece_dye",
};
const BINARY: Record<string, string> = {
  yapıldı: "done",
  yapilmadi: "not_done",
  yapılmadı: "not_done",
};
const LAB: Record<string, string> = {
  yapıldı: "done",
  yapılmadı: "not_done",
  "devam ediyor": "in_progress",
};
const YARN: Record<string, string> = {
  verildi: "given",
  verilmedi: "not_given",
  "depoda var": "in_stock",
  "gerekli değil": "not_needed",
  üretilecek: "to_be_produced",
};
const WARP: Record<string, string> = {
  yapıldı: "done",
  yapılmadı: "not_done",
  "talimat verildi": "instructed",
  "i̇şletmede var": "on_loom",
  "işletmede var": "on_loom",
};
const FINAL: Record<string, string> = {
  açık: "open",
  kapalı: "closed",
  iptal: "cancelled",
  "i̇ptal": "cancelled",
};

function lookupEnum(
  map: Record<string, string>,
  v: unknown
): string | null {
  const s = cleanStr(v);
  if (!s) return null;
  const key = s.toLocaleLowerCase("tr-TR");
  return map[key] ?? null;
}

// ─── Satır tipleri ───────────────────────────────────────────────────
interface ArgeRow {
  "Kayıt No"?: string;
  "Geliş Tarihi"?: unknown;
  Termin?: unknown;
  Müşteri?: string;
  Ülke?: string;
  "Kumaş Adı/Kodu"?: string;
  "Varyant Ad."?: unknown;
  "İstenen En (cm)"?: unknown;
  "Analiz Durumu"?: string;
  "Gr/m²"?: unknown;
  "Dokuma Tipi"?: string;
  "Boya Tipi"?: string;
  "Lab. Çalışması"?: string;
  "Fiyat Durumu"?: unknown;
  "İplik Durmu"?: string;
  "Çözgü Durumu"?: string;
  "Bitiş İşlemi"?: string;
  "Final Durum"?: string;
  Not?: string;
  "Bitiş Tarihi"?: unknown;
}

interface LogRow {
  Tarih?: unknown;
  "Kayıt No"?: string;
  "Yapılan İşlem"?: string;
  Açıklama?: string;
  Yapan?: string;
}

// ─── Main ────────────────────────────────────────────────────────────
async function main() {
  console.log(`→ Excel okunuyor: ${xlsmPath}`);
  const wb = XLSX.readFile(xlsmPath!, {
    cellDates: true,
    cellFormula: false,
    cellHTML: false,
    cellStyles: false,
  });

  const argeSheet = wb.Sheets["ArgeTalepleri"];
  const logSheet = wb.Sheets["Log_Sayfası"];
  if (!argeSheet || !logSheet) {
    console.error(
      "Beklenen sheet'ler bulunamadı. Mevcut:",
      wb.SheetNames.join(", ")
    );
    process.exit(1);
  }

  // Kolon aralığını tek satıra bastırıp (16384 kolon defaultu) okur
  function tightRead<T>(ws: XLSX.WorkSheet): T[] {
    const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
    let lastCol = range.s.c;
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r: range.s.r, c });
      if (ws[addr] && ws[addr].v !== undefined && ws[addr].v !== "") {
        lastCol = c;
      }
    }
    const tight = XLSX.utils.encode_range({
      s: { r: range.s.r, c: range.s.c },
      e: { r: range.e.r, c: lastCol },
    });
    return XLSX.utils.sheet_to_json<T>(ws, {
      range: tight,
      defval: null,
      raw: true,
    });
  }

  const argeRows = tightRead<ArgeRow>(argeSheet);
  const logRows = tightRead<LogRow>(logSheet);

  console.log(
    `✓ ArgeTalepleri: ${argeRows.length} satır · Log_Sayfası: ${logRows.length} satır`
  );

  // Admin user (createdBy için)
  const [admin] = await db
    .select({ id: users.id })
    .from(users)
    .limit(1);
  if (!admin) {
    console.error(
      "Hiç kullanıcı yok — önce `npm run db:seed` çalıştır (admin yaratır)."
    );
    process.exit(1);
  }

  if (RESET && !DRY) {
    console.log("⚠ --reset: hareket_log ve arge_talepleri temizleniyor...");
    await db.delete(hareketLog);
    await db.delete(argeTalepleri);
  }

  // Müşteri cache (name → id, yoksa ekle)
  const customerRows = await db
    .select({ id: customers.id, name: customers.name })
    .from(customers);
  const customerByName = new Map(customerRows.map((c) => [c.name, c.id]));

  async function ensureCustomer(
    name: string | null,
    country: string | null
  ): Promise<string | null> {
    if (!name) return null;
    const key = name.trim();
    if (customerByName.has(key)) return customerByName.get(key)!;
    if (DRY) {
      customerByName.set(key, "dry-id");
      return "dry-id";
    }
    const [row] = await db
      .insert(customers)
      .values({
        name: key,
        country,
        isInternal: key.toLocaleUpperCase("tr-TR").includes("AR-GE"),
      })
      .returning({ id: customers.id });
    customerByName.set(key, row.id);
    console.log(`  + Müşteri eklendi: ${key}`);
    return row.id;
  }

  // Action type cache
  const actionRows = await db
    .select({
      id: actionTypes.id,
      nameTr: actionTypes.nameTr,
      codeEn: actionTypes.codeEn,
    })
    .from(actionTypes);
  const actionByName = new Map(actionRows.map((a) => [a.nameTr, a.id]));
  const actionCodes = new Set(actionRows.map((a) => a.codeEn));

  async function ensureActionType(nameTr: string | null): Promise<string | null> {
    if (!nameTr) return null;
    const key = nameTr.trim();
    if (actionByName.has(key)) return actionByName.get(key)!;
    if (DRY) {
      actionByName.set(key, "dry-id");
      return "dry-id";
    }
    let code = slugify(key) || `at_${Math.random().toString(36).slice(2, 8)}`;
    let i = 0;
    while (actionCodes.has(code)) {
      i += 1;
      code = `${code.slice(0, 55)}_${i}`;
    }
    const [row] = await db
      .insert(actionTypes)
      .values({
        nameTr: key,
        codeEn: code,
        sortOrder: 999,
        isSystem: false,
        isArchived: false,
      })
      .returning({ id: actionTypes.id });
    actionByName.set(key, row.id);
    actionCodes.add(code);
    console.log(`  + İşlem tipi eklendi: ${key} (${code})`);
    return row.id;
  }

  // User cache (creatorName → id, yoksa null — kullanıcı şifresiz yaratamayız)
  const userRows = await db
    .select({ id: users.id, name: users.name })
    .from(users);
  const userByName = new Map(userRows.map((u) => [u.name, u.id]));

  // ─── Ar-Ge satırları ───
  const argeSkipped: { recordNo: string | null; reason: string }[] = [];
  let argeInserted = 0;
  let argeUpdated = 0;

  for (const r of argeRows) {
    const recordNo = cleanStr(r["Kayıt No"]);
    const arrivalDate = toIsoDate(r["Geliş Tarihi"]);
    const dueDate = toIsoDate(r["Termin"]);

    if (!recordNo) {
      argeSkipped.push({ recordNo: null, reason: "Kayıt No boş" });
      continue;
    }
    if (!arrivalDate || !dueDate) {
      argeSkipped.push({
        recordNo,
        reason: `Tarih eksik (arrival=${arrivalDate} due=${dueDate})`,
      });
      continue;
    }

    const customerId = await ensureCustomer(
      cleanStr(r["Müşteri"]),
      cleanStr(r["Ülke"])
    );

    const row = {
      recordNo,
      arrivalDate,
      dueDate,
      completionDate: toIsoDate(r["Bitiş Tarihi"]),
      customerId,
      fabricNameCode: cleanStr(r["Kumaş Adı/Kodu"]),
      variantCount: toInt(r["Varyant Ad."]),
      requestedWidthCm: toInt(r["İstenen En (cm)"]),
      weightGsm: toDecimal(r["Gr/m²"]),
      weaveType: cleanStr(r["Dokuma Tipi"]),
      dyeType: lookupEnum(DYE_TYPE, r["Boya Tipi"]),
      analysisStatus: lookupEnum(BINARY, r["Analiz Durumu"]),
      labWorkStatus: lookupEnum(LAB, r["Lab. Çalışması"]),
      priceStatus: cleanStr(r["Fiyat Durumu"]),
      yarnStatus: lookupEnum(YARN, r["İplik Durmu"]),
      warpStatus: lookupEnum(WARP, r["Çözgü Durumu"]),
      finishingProcess: cleanStr(r["Bitiş İşlemi"]),
      finalStatus: lookupEnum(FINAL, r["Final Durum"]) ?? "open",
      note: cleanStr(r["Not"]),
      createdBy: admin.id,
    };

    if (DRY) {
      argeInserted += 1;
      continue;
    }

    // Upsert: var mı kontrol et
    const [existing] = await db
      .select({ id: argeTalepleri.id })
      .from(argeTalepleri)
      .where(eq(argeTalepleri.recordNo, recordNo))
      .limit(1);

    if (existing) {
      await db
        .update(argeTalepleri)
        .set({ ...row, updatedAt: new Date() })
        .where(eq(argeTalepleri.recordNo, recordNo));
      argeUpdated += 1;
    } else {
      await db.insert(argeTalepleri).values(row);
      argeInserted += 1;
    }
  }

  // ─── Log satırları ───
  const logSkipped: { row: number; reason: string }[] = [];
  let logInserted = 0;

  // ArgeTalepleri'nde olan recordNo'ların seti
  const existingRecordNos = DRY
    ? new Set(
        argeRows
          .map((r) => cleanStr(r["Kayıt No"]))
          .filter((v): v is string => !!v)
      )
    : new Set(
        (
          await db
            .select({ recordNo: argeTalepleri.recordNo })
            .from(argeTalepleri)
        ).map((r) => r.recordNo)
      );

  // Log'u wipe etmek için: recordNo bazlı değil toptan yapalım
  // (çünkü --reset zaten üstte yaptı; aksi halde idempotent eklemek için tarih+recordNo+description eşleşmesini kontrol etmeliydik, MVP'de atlayalım)

  for (let idx = 0; idx < logRows.length; idx++) {
    const r = logRows[idx];
    const recordNo = cleanStr(r["Kayıt No"]);
    const logDate = toIsoDate(r["Tarih"]);

    if (!recordNo) {
      logSkipped.push({ row: idx + 2, reason: "Kayıt No boş" });
      continue;
    }
    if (!logDate) {
      logSkipped.push({ row: idx + 2, reason: "Tarih boş" });
      continue;
    }
    if (!existingRecordNos.has(recordNo)) {
      logSkipped.push({
        row: idx + 2,
        reason: `Kayıt No bulunamadı: ${recordNo}`,
      });
      continue;
    }

    const actionTypeId = await ensureActionType(cleanStr(r["Yapılan İşlem"]));
    const createdBy =
      userByName.get(String(r["Yapan"] ?? "").trim()) ?? admin.id;

    if (DRY) {
      logInserted += 1;
      continue;
    }

    await db.insert(hareketLog).values({
      recordNo,
      logDate,
      actionTypeId,
      description: cleanStr(r["Açıklama"]),
      createdBy,
    });
    logInserted += 1;
  }

  // ─── Özet ───
  console.log("\n══════════════ ÖZET ══════════════");
  console.log(`Mod: ${DRY ? "DRY (yazma yok)" : "COMMIT"}`);
  console.log(`ArgeTalepleri: insert=${argeInserted}  update=${argeUpdated}`);
  console.log(`  Atlandı: ${argeSkipped.length}`);
  argeSkipped.forEach((s) =>
    console.log(`    · ${s.recordNo ?? "(no id)"}: ${s.reason}`)
  );
  console.log(`Log_Sayfası: insert=${logInserted}`);
  console.log(`  Atlandı: ${logSkipped.length}`);
  logSkipped.slice(0, 10).forEach((s) =>
    console.log(`    · row ${s.row}: ${s.reason}`)
  );
  if (logSkipped.length > 10) {
    console.log(`    · …ve ${logSkipped.length - 10} satır daha`);
  }
  console.log("══════════════════════════════════");

  process.exit(0);
}

main().catch((err) => {
  console.error("✗ Import hatası:", err);
  process.exit(1);
});
