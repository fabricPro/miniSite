import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { eq, desc, asc } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import {
  actionTypes,
  argeTalepleri,
  customers,
  hareketLog,
  users,
} from "@/lib/db/schema";

// Ham SQL kullanıldığı için static optimization devre dışı
export const dynamic = "force-dynamic";

// ─── Enum → TR etiket (Excel round-trip için) ────────────────────
const DYE_TR: Record<string, string> = {
  yarn_dye: "İplik Boya",
  piece_dye: "Top Boya",
};
const BINARY_TR: Record<string, string> = {
  done: "Yapıldı",
  not_done: "Yapılmadı",
};
const LAB_TR: Record<string, string> = {
  done: "Yapıldı",
  not_done: "Yapılmadı",
  in_progress: "Devam Ediyor",
};
const YARN_TR: Record<string, string> = {
  given: "Verildi",
  not_given: "Verilmedi",
  in_stock: "Depoda Var",
  not_needed: "Gerekli Değil",
  to_be_produced: "Üretilecek",
};
const WARP_TR: Record<string, string> = {
  done: "Yapıldı",
  not_done: "Yapılmadı",
  instructed: "Talimat Verildi",
  on_loom: "İşletmede Var",
};
const FINAL_TR: Record<string, string> = {
  open: "Açık",
  closed: "Kapalı",
  cancelled: "İptal",
};

function tr<T extends Record<string, string>>(
  map: T,
  v: string | null
): string | null {
  if (!v) return null;
  return map[v] ?? v;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const argeRows = await db
    .select({
      recordNo: argeTalepleri.recordNo,
      arrivalDate: argeTalepleri.arrivalDate,
      dueDate: argeTalepleri.dueDate,
      completionDate: argeTalepleri.completionDate,
      customerName: customers.name,
      customerCountry: customers.country,
      fabricNameCode: argeTalepleri.fabricNameCode,
      variantCount: argeTalepleri.variantCount,
      requestedWidthCm: argeTalepleri.requestedWidthCm,
      weightGsm: argeTalepleri.weightGsm,
      weaveType: argeTalepleri.weaveType,
      dyeType: argeTalepleri.dyeType,
      analysisStatus: argeTalepleri.analysisStatus,
      labWorkStatus: argeTalepleri.labWorkStatus,
      priceStatus: argeTalepleri.priceStatus,
      yarnStatus: argeTalepleri.yarnStatus,
      warpStatus: argeTalepleri.warpStatus,
      finishingProcess: argeTalepleri.finishingProcess,
      finalStatus: argeTalepleri.finalStatus,
      note: argeTalepleri.note,
    })
    .from(argeTalepleri)
    .leftJoin(customers, eq(customers.id, argeTalepleri.customerId))
    .orderBy(desc(argeTalepleri.arrivalDate), asc(argeTalepleri.recordNo));

  const logRowsDb = await db
    .select({
      logDate: hareketLog.logDate,
      recordNo: hareketLog.recordNo,
      actionTypeNameTr: actionTypes.nameTr,
      description: hareketLog.description,
      creatorName: users.name,
    })
    .from(hareketLog)
    .leftJoin(actionTypes, eq(actionTypes.id, hareketLog.actionTypeId))
    .leftJoin(users, eq(users.id, hareketLog.createdBy))
    .orderBy(desc(hareketLog.logDate), asc(hareketLog.recordNo));

  // ─── Sheet 1: ArgeTalepleri ───
  const argeData = argeRows.map((r) => ({
    "Kayıt No": r.recordNo,
    "Geliş Tarihi": r.arrivalDate,
    Termin: r.dueDate,
    "Bitiş Tarihi": r.completionDate ?? "",
    Müşteri: r.customerName ?? "",
    Ülke: r.customerCountry ?? "",
    "Kumaş Adı/Kodu": r.fabricNameCode ?? "",
    "Varyant Ad.": r.variantCount ?? "",
    "İstenen En (cm)": r.requestedWidthCm ?? "",
    "Gr/m²": r.weightGsm ?? "",
    "Dokuma Tipi": r.weaveType ?? "",
    "Boya Tipi": tr(DYE_TR, r.dyeType) ?? "",
    "Analiz Durumu": tr(BINARY_TR, r.analysisStatus) ?? "",
    "Lab. Çalışması": tr(LAB_TR, r.labWorkStatus) ?? "",
    "Fiyat Durumu": r.priceStatus ?? "",
    "İplik Durumu": tr(YARN_TR, r.yarnStatus) ?? "",
    "Çözgü Durumu": tr(WARP_TR, r.warpStatus) ?? "",
    "Bitiş İşlemi": r.finishingProcess ?? "",
    "Final Durum": tr(FINAL_TR, r.finalStatus) ?? "",
    Not: r.note ?? "",
  }));

  const logData = logRowsDb.map((r) => ({
    Tarih: r.logDate,
    "Kayıt No": r.recordNo,
    "Yapılan İşlem": r.actionTypeNameTr ?? "",
    Açıklama: r.description ?? "",
    Yapan: r.creatorName ?? "",
  }));

  const wb = XLSX.utils.book_new();
  const argeSheet = XLSX.utils.json_to_sheet(argeData);
  const logSheet = XLSX.utils.json_to_sheet(logData);

  // Kolon genişliklerini otomatik ayarla
  function autoWidth<T extends Record<string, unknown>>(data: T[]) {
    if (data.length === 0) return [];
    const keys = Object.keys(data[0]);
    return keys.map((k) => ({
      wch: Math.min(
        40,
        Math.max(
          k.length + 2,
          ...data.map((row) => String(row[k] ?? "").length + 2)
        )
      ),
    }));
  }
  argeSheet["!cols"] = autoWidth(argeData);
  logSheet["!cols"] = autoWidth(logData);

  XLSX.utils.book_append_sheet(wb, argeSheet, "ArgeTalepleri");
  XLSX.utils.book_append_sheet(wb, logSheet, "Log_Sayfası");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  const today = new Date().toISOString().slice(0, 10);
  const filename = `numune-master-${today}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
