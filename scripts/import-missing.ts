/**
 * Idempotent import of missing data from a "missing-data.xlsx" workbook.
 *
 * Usage:
 *   npm run import:missing                       # dry-run (default)
 *   npm run import:missing -- --apply            # actually write
 *   npm run import:missing -- "<file.xlsx>"      # custom file
 *   npm run import:missing -- "<file.xlsx>" --apply
 *
 * Sheets expected:
 *   · Sayfa1 → Ar-Ge talepleri (35 rows expected)
 *   · Sayfa2 → Hareket log (335 rows expected)
 *
 * Behavior (per user decisions A1 / B1 / C1):
 *   · A1: Adds yarn_order_status to existing 25 records, full INSERT for 10 new
 *   · B1: Normalizes action_types to UPPER+TRIM, merges duplicates (e.g. "Mail Atıldı" + "MAİL ATILDI")
 *   · C1: Logs imported idempotently — composite key (record_no, log_date, action_type_id, description)
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import * as XLSX from "xlsx";
import path from "node:path";
import { eq, sql } from "drizzle-orm";
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
const APPLY = args.includes("--apply");
const DRY = !APPLY;
const filePath = path.resolve(
  args.find((a) => !a.startsWith("--")) ??
    "C:/Users/PC/NumuneAtilim/data/missing-data.xlsx"
);

// ─── Helpers ──────────────────────────────────────────────────────────
function excelSerialToISO(n: number): string {
  // Excel serial epoch: 1899-12-30 (taking 1900 leap-year bug into account)
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
    if (!t || t === "-" || t === "++" || t === "?") return null;
  }
  const n =
    typeof v === "number" ? v : Number(String(v).replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function toDecimal(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v === "string") {
    const t = v.trim();
    if (!t) return null;
    // "324 Gr/m²" → 324
    const m = t.match(/^(-?\d+(?:[.,]\d+)?)/);
    if (!m) return null;
    return String(Number(m[1].replace(",", ".")));
  }
  return null;
}

/** Excel parses "100%" as 1, "75%" as 0.75 — we want "100%" / "75%" back. */
function toYarnOrderStatus(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) {
    // Heuristic: 0 < v <= 1.5 → percent; otherwise just the number as string
    if (v >= 0 && v <= 1.5) {
      return `${Math.round(v * 100)}%`;
    }
    return String(v);
  }
  return cleanStr(v);
}

/** Excel parses "10,25$" as 10.25 — restore to "10,25$" Turkish convention. */
function toPriceStatus(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) {
    // 8 → "8$"  ;  10.25 → "10,25$"
    const fixed =
      Math.abs(v - Math.trunc(v)) < 0.001 ? String(Math.trunc(v)) : v.toFixed(2);
    return `${fixed.replace(".", ",")}$`;
  }
  return cleanStr(v);
}

/** Country normalization — title-case Turkish, multi-word safe. */
function normalizeCountry(c: string | null): string | null {
  if (!c) return null;
  const s = c.trim();
  if (!s) return null;
  // "MALEZYA" → "Malezya"; "YENİ ZELANDA" → "Yeni Zelanda"
  return s
    .split(/\s+/)
    .map((w) => {
      const lower = w.toLocaleLowerCase("tr-TR");
      return lower.charAt(0).toLocaleUpperCase("tr-TR") + lower.slice(1);
    })
    .join(" ");
}

/** Action type name normalization — UPPER+TRIM (B1). */
function normalizeActionName(s: string): string {
  return s.trim().toLocaleUpperCase("tr-TR").replace(/\s+/g, " ");
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

function normalizeDesc(d: string | null): string {
  if (!d) return "";
  return d.trim().replace(/\s+/g, " ");
}

// ─── Enum maps (same as import-excel.ts) ──────────────────────────────
const DYE_TYPE: Record<string, string> = {
  "iplik boya": "yarn_dye",
  "top boya": "piece_dye",
  "parça boya": "piece_dye",
};
const BINARY: Record<string, string> = {
  "yapıldı": "done",
  "yapilmadi": "not_done",
  "yapılmadı": "not_done",
};
const LAB: Record<string, string> = {
  "yapıldı": "done",
  "yapılmadı": "not_done",
  "devam ediyor": "in_progress",
};
const YARN: Record<string, string> = {
  "verildi": "given",
  "verilmedi": "not_given",
  "depoda var": "in_stock",
  "yaptırılacak": "to_be_produced",
  "üretilecek": "to_be_produced",
  "gerekli değil": "not_needed",
  "gerek yok": "not_needed",
  "yok": "not_needed",
  "verilecek": "to_be_given",
};
const WARP: Record<string, string> = {
  "yapıldı": "done",
  "yapılmadı": "not_done",
  "talimat verildi": "instructed",
  "i̇şletmede var": "on_loom",
  "işletmede var": "on_loom",
  "çözüldü": "drawn",
  "çözülmedi": "not_drawn",
  "bekliyor": "waiting",
  "depoda var": "in_stock",
  "gerek yok": "not_needed",
};
const FINAL: Record<string, string> = {
  "açık": "open",
  "kapalı": "closed",
  "iptal": "cancelled",
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

// ─── Row types ────────────────────────────────────────────────────────
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
  "İplik Siparişi"?: unknown;
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

// ─── Pretty logging ───────────────────────────────────────────────────
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
  });

  const argeSheet = wb.Sheets["Sayfa1"];
  const logSheet = wb.Sheets["Sayfa2"];
  if (!argeSheet || !logSheet) {
    console.error(c.red("Beklenen sheet'ler (Sayfa1, Sayfa2) bulunamadı."));
    console.error("Mevcut:", wb.SheetNames.join(", "));
    process.exit(1);
  }

  const argeRows = XLSX.utils.sheet_to_json<ArgeRow>(argeSheet, {
    defval: null,
    raw: true,
  });
  const logRows = XLSX.utils.sheet_to_json<LogRow>(logSheet, {
    defval: null,
    raw: true,
  });

  console.log(
    `   Sayfa1 (Ar-Ge): ${argeRows.length} satır`,
    `· Sayfa2 (Log): ${logRows.length} satır`
  );

  const [admin] = await db.select({ id: users.id }).from(users).limit(1);
  if (!admin) {
    console.error(c.red("Admin user yok — önce `npm run db:seed` çalıştır."));
    process.exit(1);
  }

  // ─────────────────────────────────────────────────────────────────────
  // PHASE 1 — Action type normalization & duplicate merge (B1)
  // ─────────────────────────────────────────────────────────────────────
  header("PHASE 1 · Action types · normalize + merge duplicates");

  const allActions = await db
    .select({
      id: actionTypes.id,
      nameTr: actionTypes.nameTr,
      codeEn: actionTypes.codeEn,
      sortOrder: actionTypes.sortOrder,
      createdAt: actionTypes.createdAt,
    })
    .from(actionTypes);

  // Group by normalized name
  const byNorm = new Map<string, typeof allActions>();
  for (const a of allActions) {
    const norm = normalizeActionName(a.nameTr);
    const arr = byNorm.get(norm) ?? [];
    arr.push(a);
    byNorm.set(norm, arr);
  }

  type Merge = {
    norm: string;
    winnerId: string;
    winnerNameOld: string;
    loserIds: string[];
    loserNames: string[];
    needsRename: boolean;
  };
  const merges: Merge[] = [];
  for (const [norm, group] of byNorm) {
    if (group.length === 1) {
      const single = group[0];
      if (single.nameTr !== norm) {
        merges.push({
          norm,
          winnerId: single.id,
          winnerNameOld: single.nameTr,
          loserIds: [],
          loserNames: [],
          needsRename: true,
        });
      }
      continue;
    }
    // pick winner: lowest sortOrder, then earliest createdAt
    const sorted = [...group].sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
    const winner = sorted[0];
    const losers = sorted.slice(1);
    merges.push({
      norm,
      winnerId: winner.id,
      winnerNameOld: winner.nameTr,
      loserIds: losers.map((l) => l.id),
      loserNames: losers.map((l) => l.nameTr),
      needsRename: winner.nameTr !== norm,
    });
  }

  const willRename = merges.filter((m) => m.needsRename);
  const willMerge = merges.filter((m) => m.loserIds.length > 0);

  console.log(`   Toplam action_types: ${allActions.length}`);
  console.log(`   Yeniden adlandırılacak: ${willRename.length}`);
  for (const m of willRename) {
    console.log(`     · "${m.winnerNameOld}" → "${m.norm}"`);
  }
  console.log(`   Birleşecek (duplicate): ${willMerge.length} grup`);
  for (const m of willMerge) {
    console.log(
      `     · "${m.norm}" ← winner=${m.winnerId.slice(0, 8)} losers: ${m.loserNames
        .map((n) => `"${n}"`)
        .join(", ")}`
    );
  }

  // Apply phase 1 if not dry
  if (!DRY) {
    for (const m of merges) {
      // Re-point hareket_log from losers → winner
      for (const loserId of m.loserIds) {
        await db
          .update(hareketLog)
          .set({ actionTypeId: m.winnerId })
          .where(eq(hareketLog.actionTypeId, loserId));
      }
      // Delete losers
      for (const loserId of m.loserIds) {
        await db.delete(actionTypes).where(eq(actionTypes.id, loserId));
      }
      // Rename winner if needed
      if (m.needsRename) {
        await db
          .update(actionTypes)
          .set({ nameTr: m.norm })
          .where(eq(actionTypes.id, m.winnerId));
      }
    }
  }

  // Build canonical name → id cache (post-cleanup)
  const actionRowsAfter = DRY
    ? allActions.map((a) => ({
        ...a,
        nameTr: merges.find((m) => m.loserIds.includes(a.id))
          ? null // will be deleted
          : merges.find((m) => m.winnerId === a.id)?.norm ?? a.nameTr,
      })).filter((a) => a.nameTr !== null) as typeof allActions
    : await db
        .select({
          id: actionTypes.id,
          nameTr: actionTypes.nameTr,
          codeEn: actionTypes.codeEn,
          sortOrder: actionTypes.sortOrder,
          createdAt: actionTypes.createdAt,
        })
        .from(actionTypes);

  const actionByNorm = new Map<string, string>();
  const actionCodes = new Set<string>();
  for (const a of actionRowsAfter) {
    actionByNorm.set(normalizeActionName(a.nameTr), a.id);
    actionCodes.add(a.codeEn);
  }

  const newActionTypes: { norm: string; code: string }[] = [];

  async function ensureActionType(rawName: string | null): Promise<string | null> {
    if (!rawName) return null;
    const norm = normalizeActionName(rawName);
    if (!norm) return null;
    if (actionByNorm.has(norm)) return actionByNorm.get(norm)!;

    // Need to create
    let code = slugify(norm) || `at_${Math.random().toString(36).slice(2, 8)}`;
    let i = 0;
    while (actionCodes.has(code)) {
      i += 1;
      code = `${code.slice(0, 55)}_${i}`;
    }
    actionCodes.add(code);
    newActionTypes.push({ norm, code });

    if (DRY) {
      const fakeId = `dry-action-${newActionTypes.length}`;
      actionByNorm.set(norm, fakeId);
      return fakeId;
    }

    const [row] = await db
      .insert(actionTypes)
      .values({
        nameTr: norm,
        codeEn: code,
        sortOrder: 999,
        isSystem: false,
        isArchived: false,
      })
      .returning({ id: actionTypes.id });
    actionByNorm.set(norm, row.id);
    return row.id;
  }

  // ─────────────────────────────────────────────────────────────────────
  // PHASE 2 — Customer upserts
  // ─────────────────────────────────────────────────────────────────────
  header("PHASE 2 · Customers · insert missing + update country mismatches");

  const customerRows = await db
    .select({
      id: customers.id,
      name: customers.name,
      country: customers.country,
    })
    .from(customers);
  const customerByName = new Map(customerRows.map((c) => [c.name, c]));

  type CustChange =
    | { kind: "insert"; name: string; country: string | null }
    | { kind: "update-country"; name: string; from: string | null; to: string | null };
  const custChanges: CustChange[] = [];

  // Collect distinct (name, country) pairs from xlsx
  const xlsxCustomerInfo = new Map<string, string | null>();
  for (const r of argeRows) {
    const name = cleanStr(r.Müşteri);
    if (!name) continue;
    const country = normalizeCountry(cleanStr(r.Ülke));
    // First non-null country wins
    if (!xlsxCustomerInfo.has(name) || (xlsxCustomerInfo.get(name) === null && country)) {
      xlsxCustomerInfo.set(name, country);
    }
  }

  for (const [name, country] of xlsxCustomerInfo) {
    const existing = customerByName.get(name);
    if (!existing) {
      custChanges.push({ kind: "insert", name, country });
    } else if (country && existing.country !== country) {
      custChanges.push({
        kind: "update-country",
        name,
        from: existing.country,
        to: country,
      });
    }
  }

  console.log(`   Toplam müşteri xlsx'te: ${xlsxCustomerInfo.size}`);
  console.log(`   Yeni eklenecek: ${custChanges.filter((c) => c.kind === "insert").length}`);
  for (const ch of custChanges.filter((c) => c.kind === "insert")) {
    if (ch.kind === "insert") console.log(`     + ${ch.name} (${ch.country ?? "?"})`);
  }
  console.log(
    `   Country güncellenecek: ${
      custChanges.filter((c) => c.kind === "update-country").length
    }`
  );
  for (const ch of custChanges.filter((c) => c.kind === "update-country")) {
    if (ch.kind === "update-country")
      console.log(`     ~ ${ch.name}: "${ch.from}" → "${ch.to}"`);
  }

  if (!DRY) {
    for (const ch of custChanges) {
      if (ch.kind === "insert") {
        const [row] = await db
          .insert(customers)
          .values({
            name: ch.name,
            country: ch.country,
            isInternal: ch.name.toLocaleUpperCase("tr-TR").includes("AR-GE"),
          })
          .returning({ id: customers.id, name: customers.name, country: customers.country });
        customerByName.set(row.name, row);
      } else if (ch.kind === "update-country") {
        await db
          .update(customers)
          .set({ country: ch.to })
          .where(eq(customers.name, ch.name));
        const ex = customerByName.get(ch.name);
        if (ex) customerByName.set(ch.name, { ...ex, country: ch.to });
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // PHASE 3 — Ar-Ge upserts (existing → update yarn_order_status only;
  //                          missing → full INSERT)
  // ─────────────────────────────────────────────────────────────────────
  header("PHASE 3 · Ar-Ge talepleri · idempotent upsert");

  const existingArge = await db
    .select({
      recordNo: argeTalepleri.recordNo,
      yarnOrderStatus: argeTalepleri.yarnOrderStatus,
    })
    .from(argeTalepleri);
  const existingArgeMap = new Map(
    existingArge.map((r) => [r.recordNo, r.yarnOrderStatus])
  );

  type ArgeChange =
    | { kind: "insert"; recordNo: string; row: Record<string, unknown> }
    | {
        kind: "update-yarn";
        recordNo: string;
        from: string | null;
        to: string | null;
      };

  const argeChanges: ArgeChange[] = [];
  const argeSkipped: { recordNo: string | null; reason: string }[] = [];

  for (const r of argeRows) {
    const recordNo = cleanStr(r["Kayıt No"]);
    if (!recordNo) {
      argeSkipped.push({ recordNo: null, reason: "Kayıt No boş" });
      continue;
    }

    const yarnOrderStatus = toYarnOrderStatus(r["İplik Siparişi"]);

    if (existingArgeMap.has(recordNo)) {
      // Existing → only fill yarn_order_status if it changed
      const current = existingArgeMap.get(recordNo) ?? null;
      if (current !== yarnOrderStatus) {
        argeChanges.push({
          kind: "update-yarn",
          recordNo,
          from: current,
          to: yarnOrderStatus,
        });
      }
      continue;
    }

    // New record → full insert
    const arrivalDate = toIsoDate(r["Geliş Tarihi"]);
    const dueDate = toIsoDate(r["Termin"]);
    if (!arrivalDate || !dueDate) {
      argeSkipped.push({
        recordNo,
        reason: `Tarih eksik (geliş=${arrivalDate} termin=${dueDate})`,
      });
      continue;
    }

    const customerName = cleanStr(r.Müşteri);
    const customer = customerName ? customerByName.get(customerName) : null;

    // Note for non-numeric Gr/m² — preserve in note field
    const gsmRaw = r["Gr/m²"];
    const gsmIsTextual =
      typeof gsmRaw === "string" &&
      gsmRaw.trim() !== "" &&
      gsmRaw.trim() !== "?" &&
      !/^\d/.test(gsmRaw.trim());
    const noteFromXlsx = cleanStr(r.Not);
    const note = gsmIsTextual
      ? `${noteFromXlsx ? noteFromXlsx + " · " : ""}Gr/m²: ${(gsmRaw as string).trim()}`
      : noteFromXlsx;

    const row = {
      recordNo,
      arrivalDate,
      dueDate,
      completionDate: toIsoDate(r["Bitiş Tarihi"]),
      customerId: customer?.id ?? null,
      fabricNameCode: cleanStr(r["Kumaş Adı/Kodu"]),
      variantCount: toInt(r["Varyant Ad."]),
      requestedWidthCm: toInt(r["İstenen En (cm)"]),
      weightGsm: toDecimal(gsmRaw),
      weaveType: cleanStr(r["Dokuma Tipi"]),
      dyeType: lookupEnum(DYE_TYPE, r["Boya Tipi"]),
      analysisStatus: lookupEnum(BINARY, r["Analiz Durumu"]),
      labWorkStatus: lookupEnum(LAB, r["Lab. Çalışması"]),
      priceStatus: toPriceStatus(r["Fiyat Durumu"]),
      yarnStatus: lookupEnum(YARN, r["İplik Durmu"]),
      yarnOrderStatus,
      warpStatus: lookupEnum(WARP, r["Çözgü Durumu"]),
      finishingProcess: cleanStr(r["Bitiş İşlemi"]),
      finalStatus: lookupEnum(FINAL, r["Final Durum"]) ?? "open",
      note,
      createdBy: admin.id,
    };

    argeChanges.push({ kind: "insert", recordNo, row });
  }

  const inserts = argeChanges.filter((c) => c.kind === "insert") as Extract<
    ArgeChange,
    { kind: "insert" }
  >[];
  const yarnUpdates = argeChanges.filter((c) => c.kind === "update-yarn") as Extract<
    ArgeChange,
    { kind: "update-yarn" }
  >[];

  console.log(`   xlsx satırları: ${argeRows.length}`);
  console.log(`   Yeni eklenecek (full INSERT): ${inserts.length}`);
  for (const ch of inserts) {
    const r = ch.row;
    console.log(
      `     + ${ch.recordNo}  ${r.arrivalDate}→${r.dueDate}  müşteri=${
        r.customerId ? "✓" : c.red("?")
      }  iplikSiparişi=${r.yarnOrderStatus ?? "—"}  durum=${r.finalStatus}`
    );
  }
  console.log(`   yarn_order_status güncellenecek (mevcut kayıt): ${yarnUpdates.length}`);
  for (const ch of yarnUpdates.slice(0, 5)) {
    console.log(`     ~ ${ch.recordNo}: "${ch.from ?? "—"}" → "${ch.to ?? "—"}"`);
  }
  if (yarnUpdates.length > 5) {
    console.log(`     ~ ...ve ${yarnUpdates.length - 5} kayıt daha`);
  }
  console.log(`   Atlanacak: ${argeSkipped.length}`);
  for (const s of argeSkipped) {
    console.log(`     · ${s.recordNo ?? "?"}: ${s.reason}`);
  }

  if (!DRY) {
    for (const ch of argeChanges) {
      if (ch.kind === "insert") {
        await db.insert(argeTalepleri).values(ch.row as never);
      } else {
        await db
          .update(argeTalepleri)
          .set({ yarnOrderStatus: ch.to, updatedAt: new Date() })
          .where(eq(argeTalepleri.recordNo, ch.recordNo));
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // PHASE 4 — Logs · idempotent insert (composite key)
  // ─────────────────────────────────────────────────────────────────────
  header("PHASE 4 · Hareket log · idempotent insert");

  // Build set of existing log keys: recordNo|logDate|actionTypeId|normDescription
  const existingLogs = await db
    .select({
      recordNo: hareketLog.recordNo,
      logDate: hareketLog.logDate,
      actionTypeId: hareketLog.actionTypeId,
      description: hareketLog.description,
    })
    .from(hareketLog);
  const existingLogKeys = new Set(
    existingLogs.map(
      (l) =>
        `${l.recordNo}|${l.logDate}|${l.actionTypeId ?? ""}|${normalizeDesc(l.description)}`
    )
  );
  console.log(`   DB'de mevcut log: ${existingLogs.length}`);

  // Need fresh existingRecordNos (post phase 3 inserts)
  const existingRecordNos = new Set([
    ...existingArge.map((r) => r.recordNo),
    ...inserts.map((c) => c.recordNo),
  ]);

  const userRows = await db
    .select({ id: users.id, name: users.name })
    .from(users);
  const userByName = new Map(userRows.map((u) => [u.name, u.id]));

  type LogChange = {
    recordNo: string;
    logDate: string;
    actionTypeId: string | null;
    description: string | null;
    createdBy: string;
    actionName: string | null;
  };
  const logsToInsert: LogChange[] = [];
  const logSkipped: { row: number; reason: string }[] = [];
  let logsAlreadyExist = 0;

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

    const actionName = cleanStr(r["Yapılan İşlem"]);
    const actionTypeId = await ensureActionType(actionName);
    const description = cleanStr(r["Açıklama"]);
    const createdBy =
      userByName.get(String(r["Yapan"] ?? "").trim()) ?? admin.id;

    const key = `${recordNo}|${logDate}|${actionTypeId ?? ""}|${normalizeDesc(description)}`;
    if (existingLogKeys.has(key)) {
      logsAlreadyExist += 1;
      continue;
    }
    existingLogKeys.add(key); // also dedupe within xlsx itself
    logsToInsert.push({
      recordNo,
      logDate,
      actionTypeId: DRY && actionTypeId?.startsWith("dry-action-") ? null : actionTypeId,
      description,
      createdBy,
      actionName,
    });
  }

  console.log(`   xlsx satırları: ${logRows.length}`);
  console.log(`   Zaten mevcut (skip): ${logsAlreadyExist}`);
  console.log(`   Yeni eklenecek: ${logsToInsert.length}`);
  console.log(`   Atlandı: ${logSkipped.length}`);
  for (const s of logSkipped.slice(0, 10)) {
    console.log(`     · row ${s.row}: ${s.reason}`);
  }
  if (logSkipped.length > 10) {
    console.log(`     · ...ve ${logSkipped.length - 10} satır daha`);
  }

  if (newActionTypes.length > 0) {
    console.log(`\n   Yeni action_type'lar oluşturulacak: ${newActionTypes.length}`);
    for (const a of newActionTypes.slice(0, 20)) {
      console.log(`     + "${a.norm}" (${a.code})`);
    }
    if (newActionTypes.length > 20) {
      console.log(`     + ...ve ${newActionTypes.length - 20} tane daha`);
    }
  }

  // Group logsToInsert by recordNo for nicer diff
  const logsByCsr = new Map<string, number>();
  for (const l of logsToInsert) {
    logsByCsr.set(l.recordNo, (logsByCsr.get(l.recordNo) ?? 0) + 1);
  }
  if (logsByCsr.size > 0) {
    console.log(`\n   Log eklenecek CSR dağılımı:`);
    for (const [csr, n] of [...logsByCsr.entries()].sort()) {
      console.log(`     · ${csr}: ${n} log`);
    }
  }

  if (!DRY) {
    for (const l of logsToInsert) {
      await db.insert(hareketLog).values({
        recordNo: l.recordNo,
        logDate: l.logDate,
        actionTypeId: l.actionTypeId,
        description: l.description,
        createdBy: l.createdBy,
      });
    }
  }

  // ─── Final summary ────────────────────────────────────────────────────
  header(DRY ? "DRY-RUN ÖZET" : "APPLY ÖZET");
  console.log(`   Action types · rename: ${willRename.length}, merge: ${willMerge.length}, yeni: ${newActionTypes.length}`);
  console.log(
    `   Customers   · insert: ${
      custChanges.filter((c) => c.kind === "insert").length
    }, update: ${custChanges.filter((c) => c.kind === "update-country").length}`
  );
  console.log(
    `   Ar-Ge       · insert: ${inserts.length}, yarn_order_status update: ${yarnUpdates.length}, skip: ${argeSkipped.length}`
  );
  console.log(
    `   Hareket log · insert: ${logsToInsert.length}, dup-skip: ${logsAlreadyExist}, skip: ${logSkipped.length}`
  );

  if (DRY) {
    console.log(
      "\n" +
        c.yellow(
          "⚠ DRY-RUN — DB'ye yazma yapılmadı. Onaylamak için `--apply` flag'i ile tekrar çalıştır."
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
