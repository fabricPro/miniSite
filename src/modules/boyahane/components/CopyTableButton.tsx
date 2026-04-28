"use client";

import * as React from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { BoyahaneListRow } from "../server/queries";
import { boyahaneDurumLabels, isBoyahaneDurum } from "../labels";

interface Props {
  rows: BoyahaneListRow[];
  disabled?: boolean;
}

/**
 * Excel'den Ctrl+C/V akışını taklit et:
 *  - Clipboard'a `text/html` olarak inline-styled <table> yaz
 *  - Aynı zamanda `text/plain` (tab-separated) fallback yaz
 *  - Outlook/Gmail'de yapıştırınca tablo formatında görünür
 */
export function CopyTableButton({ rows, disabled }: Props) {
  const [copied, setCopied] = React.useState(false);

  const isDisabled = disabled || rows.length === 0;

  function formatTR(iso: string | null): string {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return `${String(d.getUTCDate()).padStart(2, "0")}.${String(
      d.getUTCMonth() + 1
    ).padStart(2, "0")}.${String(d.getUTCFullYear()).slice(2)}`;
  }

  function gecenGun(talep: string | null): string {
    if (!talep) return "";
    const d = new Date(talep);
    if (Number.isNaN(d.getTime())) return "";
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const diff = Math.round(
      (today.getTime() - d.getTime()) / 86400_000
    );
    if (diff < 0) return "—";
    return `${diff} Gün`;
  }

  function durumText(durum: string | null): string {
    if (isBoyahaneDurum(durum)) return boyahaneDurumLabels[durum];
    return durum ?? "";
  }

  function buildHtml(): string {
    const cellStyle =
      "border:1px solid #cbd5e1; padding:4px 8px; font-family:Calibri,Arial,sans-serif; font-size:11pt; vertical-align:top;";
    const headerStyle = `${cellStyle} background:#fef3c7; font-weight:bold; text-align:center;`;
    const headers = [
      "Top Numarası",
      "Talep Tarihi",
      "Geçen Gün",
      "D.Try",
      "En",
      "İstenen En",
      "Metre",
      "Kilo",
      "Desen No",
      "Yapılacak İşlem",
      "Fason Firma",
      "Durum",
    ];
    const headerRow = headers
      .map((h) => `<th style="${headerStyle}">${h}</th>`)
      .join("");

    const bodyRows = rows
      .map((r) => {
        const cells = [
          r.topNo ?? "",
          formatTR(r.talepTarihi),
          gecenGun(r.talepTarihi),
          r.dTry ?? "",
          r.en != null ? String(r.en) : "",
          r.istenenEn != null ? String(r.istenenEn) : "",
          r.metre ?? "",
          r.kilo ?? "",
          r.desenNo ?? "",
          r.yapilacakIslem ?? "",
          r.fasonFirma ?? "",
          durumText(r.durum),
        ];
        return (
          "<tr>" +
          cells
            .map((c) => `<td style="${cellStyle}">${escapeHtml(c)}</td>`)
            .join("") +
          "</tr>"
        );
      })
      .join("");

    return `<table style="border-collapse:collapse; border:1px solid #94a3b8;"><thead><tr>${headerRow}</tr></thead><tbody>${bodyRows}</tbody></table>`;
  }

  function buildPlain(): string {
    const headers = [
      "Top Numarası",
      "Talep Tarihi",
      "Geçen Gün",
      "D.Try",
      "En",
      "İstenen En",
      "Metre",
      "Kilo",
      "Desen No",
      "Yapılacak İşlem",
      "Fason Firma",
      "Durum",
    ].join("\t");
    const lines = rows.map((r) =>
      [
        r.topNo ?? "",
        formatTR(r.talepTarihi),
        gecenGun(r.talepTarihi),
        r.dTry ?? "",
        r.en != null ? String(r.en) : "",
        r.istenenEn != null ? String(r.istenenEn) : "",
        r.metre ?? "",
        r.kilo ?? "",
        r.desenNo ?? "",
        (r.yapilacakIslem ?? "").replace(/\s+/g, " "),
        r.fasonFirma ?? "",
        durumText(r.durum),
      ].join("\t")
    );
    return [headers, ...lines].join("\n");
  }

  async function handleCopy() {
    if (isDisabled) return;
    const html = buildHtml();
    const plain = buildPlain();
    try {
      // Modern Clipboard API — HTML + plain text aynı anda
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        typeof window !== "undefined" &&
        "ClipboardItem" in window
      ) {
        const item = new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([plain], { type: "text/plain" }),
        });
        await navigator.clipboard.write([item]);
      } else {
        // Fallback: text-only
        await navigator.clipboard.writeText(plain);
      }
      setCopied(true);
      toast.success(`${rows.length} satır kopyalandı — mail/Excel'e yapıştır`);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Clipboard write failed", err);
      toast.error(
        "Kopyalama başarısız (tarayıcı yetki vermedi). 'Yeni sekmede aç' seçeneğini dene."
      );
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleCopy}
      disabled={isDisabled}
      title="Seçili satırları HTML tablo olarak kopyala (mail/Excel'e yapıştırılabilir)"
    >
      {copied ? (
        <>
          <Check className="h-4 w-4" />
          Kopyalandı
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" />
          Tabloyu Kopyala ({rows.length})
        </>
      )}
    </Button>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
