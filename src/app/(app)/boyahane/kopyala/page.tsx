import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  listBoyahanePartileri,
  listForCopy,
} from "@/modules/boyahane/server/queries";
import { boyahaneDurumLabels, isBoyahaneDurum } from "@/modules/boyahane/labels";
import { formatTR } from "@/lib/utils/dates";

export const metadata = { title: "Boyahane Kopya — Numune Master" };

interface PageProps {
  searchParams: Promise<{ ids?: string; only?: string }>;
}

function gecenGun(talep: string | null): string {
  if (!talep) return "";
  const d = new Date(talep);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86400_000);
  if (diff < 0) return "—";
  return `${diff} Gün`;
}

function durumText(durum: string | null): string {
  if (isBoyahaneDurum(durum)) return boyahaneDurumLabels[durum];
  return durum ?? "";
}

export default async function BoyahaneKopyaSayfasi({ searchParams }: PageProps) {
  const { ids, only } = await searchParams;
  const idList = ids ? ids.split(",").filter(Boolean) : [];

  const rows = idList.length
    ? await listForCopy(idList)
    : only === "open"
      ? (await listBoyahanePartileri()).filter(
          (r) => r.satirDurumu !== "Kapalı" && r.durum !== "islemden_gelmis"
        )
      : await listBoyahanePartileri();

  return (
    <div className="p-4 space-y-3 print:p-0">
      <div className="print:hidden flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" render={<Link href="/boyahane" />}>
          <ArrowLeft className="h-4 w-4" />
          Liste
        </Button>
        <p className="text-xs text-muted-foreground">
          Tabloyu seç → Ctrl+C → maile yapıştır. {rows.length} kayıt.
        </p>
      </div>

      <table
        style={{
          borderCollapse: "collapse",
          border: "1px solid #94a3b8",
          fontFamily: "Calibri, Arial, sans-serif",
          fontSize: "11pt",
          width: "100%",
        }}
      >
        <thead>
          <tr>
            {[
              "Top Numarası",
              "Talep Tarihi",
              "Geçen Gün",
              "D.Try",
              "En",
              "İst.En",
              "Metre",
              "Kilo",
              "Desen No",
              "Yapılacak İşlem",
              "Fason Firma",
              "Durum",
            ].map((h) => (
              <th
                key={h}
                style={{
                  border: "1px solid #cbd5e1",
                  padding: "4px 8px",
                  background: "#fef3c7",
                  fontWeight: 700,
                  textAlign: "center",
                  fontSize: "11pt",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td style={cellStyle}>{r.topNo}</td>
              <td style={cellStyle}>
                {r.talepTarihi ? formatTR(r.talepTarihi) : ""}
              </td>
              <td style={cellStyle}>{gecenGun(r.talepTarihi)}</td>
              <td style={cellStyle}>{r.dTry ?? ""}</td>
              <td style={{ ...cellStyle, textAlign: "right" }}>{r.en ?? ""}</td>
              <td style={{ ...cellStyle, textAlign: "right" }}>
                {r.istenenEn ?? ""}
              </td>
              <td style={{ ...cellStyle, textAlign: "right" }}>
                {r.metre ?? ""}
              </td>
              <td style={{ ...cellStyle, textAlign: "right" }}>
                {r.kilo ?? ""}
              </td>
              <td style={cellStyle}>{r.desenNo ?? ""}</td>
              <td style={cellStyle}>{r.yapilacakIslem ?? ""}</td>
              <td style={cellStyle}>{r.fasonFirma ?? ""}</td>
              <td style={cellStyle}>{durumText(r.durum)}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={12} style={{ ...cellStyle, textAlign: "center" }}>
                Kayıt yok
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

const cellStyle: React.CSSProperties = {
  border: "1px solid #cbd5e1",
  padding: "4px 8px",
  fontFamily: "Calibri, Arial, sans-serif",
  fontSize: "11pt",
  verticalAlign: "top",
};
