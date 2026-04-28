"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsiblePanel,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { createBoyahaneBatch } from "../server/actions";
import {
  BOYAHANE_DURUM,
  boyahaneDurumLabels,
  type BoyahaneDurum,
} from "../labels";

interface NumuneRef {
  id: string;
  numuneNo: string;
  hamEn: number | null;
  mamulEn: number | null;
}

interface Props {
  numune: NumuneRef;
  fasonOptions: string[];
  trigger: React.ReactElement;
}

interface TopRow {
  // Ephemeral local id (React key)
  _key: string;
  topNo: string;
  en: string;
  istenenEn: string;
  metre: string;
  kilo: string;
  yapilacakIslem: string;
  fasonFirma: string;
}

function blankRow(numune: NumuneRef, inheritFrom?: TopRow): TopRow {
  return {
    _key: crypto.randomUUID(),
    topNo: "",
    en:
      inheritFrom?.en !== undefined && inheritFrom.en !== ""
        ? inheritFrom.en
        : numune.hamEn != null
          ? String(numune.hamEn)
          : "",
    istenenEn:
      inheritFrom?.istenenEn !== undefined && inheritFrom.istenenEn !== ""
        ? inheritFrom.istenenEn
        : numune.mamulEn != null
          ? String(numune.mamulEn)
          : "",
    metre: inheritFrom?.metre ?? "",
    kilo: inheritFrom?.kilo ?? "",
    // Akıllı miras: yeni satır son satırın işlem + fason'unu kopyalar
    yapilacakIslem: inheritFrom?.yapilacakIslem ?? "",
    fasonFirma: inheritFrom?.fasonFirma ?? "",
  };
}

const TOP_FIELDS = [
  "topNo",
  "en",
  "istenenEn",
  "metre",
  "kilo",
  "yapilacakIslem",
  "fasonFirma",
] as const;
type TopField = (typeof TOP_FIELDS)[number];

export function BulkTopDialog({ numune, fasonOptions, trigger }: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  // Ortak alanlar (her topa aynı uygulanır — tarih, durum, talep eden, vs.)
  const [talepTarihi, setTalepTarihi] = React.useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [talepEdenKisi, setTalepEdenKisi] = React.useState("");
  const [icerik, setIcerik] = React.useState("");
  const [aciklama, setAciklama] = React.useState("");
  const [durum, setDurum] = React.useState<BoyahaneDurum>("talimat_atildi");

  // Top satırları
  const [rows, setRows] = React.useState<TopRow[]>(() => [blankRow(numune)]);

  function resetState() {
    setRows([blankRow(numune)]);
    setTalepTarihi(new Date().toISOString().slice(0, 10));
    setTalepEdenKisi("");
    setIcerik("");
    setAciklama("");
    setDurum("talimat_atildi");
  }

  function handleOpenChange(o: boolean) {
    setOpen(o);
    if (!o) resetState();
  }

  /** Yeni satır eklenince son satırın işlem + fason değerlerini kopyala (akıllı miras) */
  function addRow() {
    setRows((prev) => {
      const last = prev[prev.length - 1];
      return [...prev, blankRow(numune, last)];
    });
  }

  function removeRow(key: string) {
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((r) => r._key !== key)));
  }

  function updateCell(key: string, field: TopField, value: string) {
    setRows((prev) =>
      prev.map((r) => (r._key === key ? { ...r, [field]: value } : r))
    );
  }

  /** Tab klavye navigasyonu — son hücrede yeni satır oluştur, ilk hücreye odaklan */
  function handleCellKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIdx: number,
    fieldIdx: number
  ) {
    if (e.key === "Tab" && !e.shiftKey) {
      const isLastField = fieldIdx === TOP_FIELDS.length - 1;
      const isLastRow = rowIdx === rows.length - 1;
      if (isLastField && isLastRow && rows[rowIdx].topNo.trim() !== "") {
        e.preventDefault();
        addRow();
        // Yeni satırın topNo input'una odaklan (next tick)
        setTimeout(() => {
          const next = document.querySelector<HTMLInputElement>(
            `input[data-row-idx="${rowIdx + 1}"][data-field="topNo"]`
          );
          next?.focus();
        }, 30);
      }
    }
  }

  function isValidRow(r: TopRow): boolean {
    return r.topNo.trim() !== "";
  }

  function handleSubmit() {
    const validRows = rows.filter(isValidRow);
    if (validRows.length === 0) {
      toast.error("En az bir top no gerekli");
      return;
    }

    // Top no duplicate check (batch içinde)
    const seen = new Set<string>();
    for (const r of validRows) {
      const key = r.topNo.trim().toLocaleUpperCase("tr-TR");
      if (seen.has(key)) {
        toast.error(`"${r.topNo}" iki kez girilmiş`);
        return;
      }
      seen.add(key);
    }

    const payload = {
      numuneAtilimId: numune.id,
      talepTarihi: talepTarihi || undefined,
      talepEdenKisi: talepEdenKisi.trim() || null,
      icerik: icerik.trim() || null,
      aciklama: aciklama.trim() || null,
      durum,
      toplar: validRows.map((r) => ({
        topNo: r.topNo.trim(),
        en: r.en === "" ? "" : Number(r.en),
        istenenEn: r.istenenEn === "" ? "" : Number(r.istenenEn),
        metre: r.metre === "" ? "" : Number(r.metre.replace(",", ".")),
        kilo: r.kilo === "" ? "" : Number(r.kilo.replace(",", ".")),
        yapilacakIslem: r.yapilacakIslem.trim() || null,
        fasonFirma: r.fasonFirma.trim() || null,
      })),
    };

    startTransition(async () => {
      const result = await createBoyahaneBatch(payload);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        `${result.data.count} top eklendi · ${numune.numuneNo}`
      );
      setOpen(false);
      router.refresh();
    });
  }

  const validCount = rows.filter(isValidRow).length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent
        className="max-w-[95vw] sm:max-w-[95vw] w-[95vw] max-h-[95vh] overflow-auto"
        style={{
          resize: "both",
          minWidth: "640px",
          minHeight: "480px",
        }}
      >
        <DialogHeader>
          <DialogTitle>
            Top Ekle — <span className="font-mono">{numune.numuneNo}</span>
          </DialogTitle>
          <DialogDescription>
            Bir numune&apos;den çıkan tüm topları tek seferde ekle. Ortak
            bilgiler (işlem, fason firma vs.) tüm satırlara uygulanır.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* ORTAK BİLGİLER (collapsible) — gerçekten her topa aynı uygulananlar */}
          <Collapsible defaultOpen>
            <CollapsibleTrigger
              render={
                <button
                  type="button"
                  className="group flex w-full items-center justify-between gap-2 rounded-md bg-muted/40 px-3 py-2 text-left hover:bg-muted/60 transition-colors"
                />
              }
            >
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Ortak Bilgiler (tüm toplara aynı)
              </span>
              <ChevronDown
                className="h-4 w-4 text-muted-foreground transition-transform group-data-[panel-open]:rotate-180"
                aria-hidden="true"
              />
            </CollapsibleTrigger>
            <CollapsiblePanel>
              <div className="pt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-medium">Talep Tarihi</label>
                  <Input
                    type="date"
                    value={talepTarihi}
                    onChange={(e) => setTalepTarihi(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Durum</label>
                  <Select
                    value={durum}
                    onValueChange={(v) => setDurum(v as BoyahaneDurum)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BOYAHANE_DURUM.map((d) => (
                        <SelectItem key={d} value={d}>
                          {boyahaneDurumLabels[d]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium">Talep Eden</label>
                  <Input
                    placeholder="DEGRAPE / Furkan"
                    value={talepEdenKisi}
                    onChange={(e) => setTalepEdenKisi(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">İçerik</label>
                  <Input
                    placeholder="%100 PES"
                    value={icerik}
                    onChange={(e) => setIcerik(e.target.value)}
                  />
                </div>
                <div className="col-span-2 md:col-span-4">
                  <label className="text-xs font-medium">Açıklama</label>
                  <Textarea
                    rows={2}
                    placeholder="Tüm topların ortak notu (opsiyonel)"
                    value={aciklama}
                    onChange={(e) => setAciklama(e.target.value)}
                  />
                </div>
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">
                ⓘ <strong>Yapılacak İşlem</strong> ve <strong>Fason Firma</strong> her topa özel
                — tablo satırlarında gir. Yeni satır eklenince son satırın
                değerleri otomatik kopyalanır.
              </p>
            </CollapsiblePanel>
          </Collapsible>

          {/* TOP SATIRLARI */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Toplar ({validCount} geçerli / {rows.length})
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addRow}
                disabled={pending}
              >
                <Plus className="h-3 w-3" />
                Top Ekle
              </Button>
            </div>

            <div className="rounded-md border bg-card overflow-x-auto">
              <table className="w-full text-xs" style={{ minWidth: 1100 }}>
                <thead className="bg-muted/60 border-b">
                  <tr>
                    <th className="text-left px-2 py-2 w-10 text-muted-foreground">
                      #
                    </th>
                    <th
                      className="text-left px-2 py-2 font-medium text-muted-foreground"
                      style={{ width: 130 }}
                    >
                      Top No *
                    </th>
                    <th
                      className="text-right px-2 py-2 font-medium text-muted-foreground"
                      style={{ width: 60 }}
                    >
                      En
                    </th>
                    <th
                      className="text-right px-2 py-2 font-medium text-muted-foreground"
                      style={{ width: 60 }}
                    >
                      İst.En
                    </th>
                    <th
                      className="text-right px-2 py-2 font-medium text-muted-foreground"
                      style={{ width: 70 }}
                    >
                      Metre
                    </th>
                    <th
                      className="text-right px-2 py-2 font-medium text-muted-foreground"
                      style={{ width: 70 }}
                    >
                      Kilo
                    </th>
                    <th
                      className="text-left px-2 py-2 font-medium text-muted-foreground"
                      style={{ width: 280 }}
                    >
                      Yapılacak İşlem
                    </th>
                    <th
                      className="text-left px-2 py-2 font-medium text-muted-foreground"
                      style={{ width: 160 }}
                    >
                      Fason Firma
                    </th>
                    <th className="w-10 px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <tr
                      key={r._key}
                      className={cn(
                        "border-b last:border-b-0",
                        !r.topNo.trim() && "opacity-60"
                      )}
                    >
                      <td className="px-2 py-1 text-muted-foreground tabular-nums">
                        {idx + 1}
                      </td>
                      {TOP_FIELDS.map((field, fieldIdx) => {
                        const isText =
                          field === "topNo" ||
                          field === "yapilacakIslem" ||
                          field === "fasonFirma";
                        const isFason = field === "fasonFirma";
                        return (
                          <td
                            key={field}
                            className={cn(
                              "px-1 py-1",
                              !isText && "text-right"
                            )}
                          >
                            <Input
                              data-row-idx={idx}
                              data-field={field}
                              list={
                                isFason ? "bulk-fason-options" : undefined
                              }
                              value={r[field]}
                              onChange={(e) =>
                                updateCell(r._key, field, e.target.value)
                              }
                              onKeyDown={(e) =>
                                handleCellKeyDown(e, idx, fieldIdx)
                              }
                              placeholder={
                                field === "topNo"
                                  ? "D000082041"
                                  : field === "yapilacakIslem"
                                    ? "YIKAMA APRE // BOYER"
                                    : field === "fasonFirma"
                                      ? "MORAL TEKSTİL"
                                      : "—"
                              }
                              type={isText ? "text" : "number"}
                              inputMode={isText ? "text" : "decimal"}
                              step={
                                field === "metre" || field === "kilo"
                                  ? "0.01"
                                  : "1"
                              }
                              className="h-8 px-2 py-0 text-xs"
                            />
                          </td>
                        );
                      })}
                      <td className="px-1 py-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          tabIndex={-1}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => removeRow(r._key)}
                          disabled={rows.length === 1 || pending}
                          title="Satırı sil"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <datalist id="bulk-fason-options">
                {fasonOptions.map((f) => (
                  <option key={f} value={f} />
                ))}
              </datalist>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Tab → sonraki hücre · son hücrede Tab → otomatik yeni satır
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Vazgeç
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={pending || validCount === 0}
          >
            {pending
              ? "Ekleniyor..."
              : `${validCount} Top Ekle`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
