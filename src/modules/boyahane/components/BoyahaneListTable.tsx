"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ExternalLink, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { DangerDialogHeader } from "@/components/ui/danger-dialog-header";
import { deleteBoyahaneParti } from "../server/actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatTR } from "@/lib/utils/dates";
import { cn } from "@/lib/utils";
import {
  BOYAHANE_DURUM,
  boyahaneDurumLabels,
  type BoyahaneDurum,
} from "../labels";
import { BoyahaneDurumBadge } from "./BoyahaneDurumBadge";
import { CopyTableButton } from "./CopyTableButton";
import type { BoyahaneListRow } from "../server/queries";

interface Props {
  rows: BoyahaneListRow[];
  fasonFirmaOptions: string[];
  boyaneOptions: string[];
}

const ALL = "__all__" as const;

function gecenGun(talepTarihi: string | null): {
  text: string;
  tone: "default" | "amber" | "red" | "green";
} {
  if (!talepTarihi) return { text: "—", tone: "default" };
  const d = new Date(talepTarihi);
  if (Number.isNaN(d.getTime())) return { text: "—", tone: "default" };
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86400_000);
  if (diff < 0) return { text: "—", tone: "default" };
  // Yeniden ayarlanan eşikler: 0-7 normal, 8-14 amber, 15+ kırmızı
  // Eskiden 3+ amber / 8+ kırmızı'ydı — her şey kırmızıya boyandığı için anlamı kaybolmuştu
  if (diff >= 15) return { text: `${diff} Gün`, tone: "red" };
  if (diff >= 8) return { text: `${diff} Gün`, tone: "amber" };
  return { text: `${diff} Gün`, tone: "default" };
}

export function BoyahaneListTable({
  rows,
  fasonFirmaOptions,
  boyaneOptions,
}: Props) {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [durumFilter, setDurumFilter] = React.useState<string>("");
  const [fasonFilter, setFasonFilter] = React.useState<string>("");
  const [boyaneFilter, setBoyaneFilter] = React.useState<string>("");
  const [satirFilter, setSatirFilter] = React.useState<string>("");
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = React.useState<{
    id: string;
    topNo: string;
  } | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  async function handleConfirmDelete() {
    if (!confirmDelete) return;
    setDeletingId(confirmDelete.id);
    try {
      const result = await deleteBoyahaneParti(confirmDelete.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`${confirmDelete.topNo} silindi`);
      setConfirmDelete(null);
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  const hasActiveFilter = Boolean(
    search || durumFilter || fasonFilter || boyaneFilter || satirFilter
  );

  const filteredRows = React.useMemo(() => {
    const q = search.trim().toLocaleLowerCase("tr-TR");
    return rows.filter((r) => {
      if (durumFilter && r.durum !== durumFilter) return false;
      if (fasonFilter && r.fasonFirma !== fasonFilter) return false;
      if (boyaneFilter && r.gittigiBoyane !== boyaneFilter) return false;
      if (satirFilter && r.satirDurumu !== satirFilter) return false;
      if (q) {
        const hay =
          (r.topNo ?? "").toLocaleLowerCase("tr-TR") +
          " " +
          (r.dTry ?? "").toLocaleLowerCase("tr-TR") +
          " " +
          (r.desenNo ?? "").toLocaleLowerCase("tr-TR") +
          " " +
          (r.yapilacakIslem ?? "").toLocaleLowerCase("tr-TR") +
          " " +
          (r.fasonFirma ?? "").toLocaleLowerCase("tr-TR");
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, durumFilter, fasonFilter, boyaneFilter, satirFilter]);

  const tableContainerRef = React.useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: filteredRows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 36,
    overscan: 12,
  });

  /** D.Try'a göre grup index'leri — aynı kod ardışık olduğunda aynı grup */
  const groupIdxByRow = React.useMemo(() => {
    const result: number[] = [];
    let group = 0;
    for (let i = 0; i < filteredRows.length; i++) {
      if (i > 0 && filteredRows[i].dTry !== filteredRows[i - 1].dTry) {
        group++;
      }
      result.push(group);
    }
    return result;
  }, [filteredRows]);

  const allFilteredIds = React.useMemo(
    () => filteredRows.map((r) => r.id),
    [filteredRows]
  );
  const allFilteredSelected =
    allFilteredIds.length > 0 &&
    allFilteredIds.every((id) => selectedIds.has(id));

  function toggleAll() {
    if (allFilteredSelected) {
      const next = new Set(selectedIds);
      allFilteredIds.forEach((id) => next.delete(id));
      setSelectedIds(next);
    } else {
      const next = new Set(selectedIds);
      allFilteredIds.forEach((id) => next.add(id));
      setSelectedIds(next);
    }
  }

  function toggleOne(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  function clearFilters() {
    setSearch("");
    setDurumFilter("");
    setFasonFilter("");
    setBoyaneFilter("");
    setSatirFilter("");
  }

  const selectedRows = React.useMemo(
    () => filteredRows.filter((r) => selectedIds.has(r.id)),
    [filteredRows, selectedIds]
  );

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Input
          placeholder="Top no, D.Try, desen, işlem ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select
          value={durumFilter || ALL}
          onValueChange={(v) => setDurumFilter(!v || v === ALL ? "" : v)}
        >
          <SelectTrigger className="h-9 w-[160px]">
            <SelectValue placeholder="Durum" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Durum: Tümü</SelectItem>
            {BOYAHANE_DURUM.map((d) => (
              <SelectItem key={d} value={d}>
                {boyahaneDurumLabels[d as BoyahaneDurum]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={fasonFilter || ALL}
          onValueChange={(v) => setFasonFilter(!v || v === ALL ? "" : v)}
        >
          <SelectTrigger className="h-9 w-[160px]">
            <SelectValue placeholder="Fason Firma" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Fason: Tümü</SelectItem>
            {fasonFirmaOptions.map((f) => (
              <SelectItem key={f} value={f}>
                {f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={boyaneFilter || ALL}
          onValueChange={(v) => setBoyaneFilter(!v || v === ALL ? "" : v)}
        >
          <SelectTrigger className="h-9 w-[180px]">
            <SelectValue placeholder="Boyane" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Boyane: Tümü</SelectItem>
            {boyaneOptions.map((b) => (
              <SelectItem key={b} value={b}>
                {b.length > 28 ? b.slice(0, 28) + "…" : b}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={satirFilter || ALL}
          onValueChange={(v) => setSatirFilter(!v || v === ALL ? "" : v)}
        >
          <SelectTrigger className="h-9 w-[120px]">
            <SelectValue placeholder="Satır" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tümü</SelectItem>
            <SelectItem value="Açık">Açık</SelectItem>
            <SelectItem value="Kapalı">Kapalı</SelectItem>
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          disabled={!hasActiveFilter}
          title="Filtreleri temizle"
        >
          <X className="h-4 w-4" />
          Temizle
        </Button>
        <span className="text-xs text-muted-foreground tabular-nums">
          {filteredRows.length} / {rows.length}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <CopyTableButton rows={selectedRows} />
        </div>
      </div>

      <div
        ref={tableContainerRef}
        className="flex-1 overflow-auto rounded-md border bg-card"
      >
        <table
          className="text-xs"
          style={{ tableLayout: "fixed", width: 1500 }}
        >
          <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur border-b">
            <tr>
              <th className="px-2 py-2" style={{ width: 32 }}>
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={toggleAll}
                  className="cursor-pointer"
                  title="Tümünü seç"
                />
              </th>
              <th className="text-left px-2 py-2 font-medium text-muted-foreground" style={{ width: 120 }}>
                Top No
              </th>
              <th className="text-left px-2 py-2 font-medium text-muted-foreground" style={{ width: 90 }}>
                Talep
              </th>
              <th className="text-left px-2 py-2 font-medium text-muted-foreground" style={{ width: 80 }}>
                Geçen
              </th>
              <th className="text-left px-2 py-2 font-medium text-muted-foreground" style={{ width: 90 }}>
                D.Try
              </th>
              <th className="text-right px-2 py-2 font-medium text-muted-foreground" style={{ width: 60 }}>
                En
              </th>
              <th className="text-right px-2 py-2 font-medium text-muted-foreground" style={{ width: 60 }}>
                İst.En
              </th>
              <th className="text-right px-2 py-2 font-medium text-muted-foreground" style={{ width: 70 }}>
                Metre
              </th>
              <th className="text-right px-2 py-2 font-medium text-muted-foreground" style={{ width: 70 }}>
                Kilo
              </th>
              <th className="text-left px-2 py-2 font-medium text-muted-foreground" style={{ width: 110 }}>
                Desen
              </th>
              <th className="text-left px-2 py-2 font-medium text-muted-foreground" style={{ width: 280 }}>
                Yapılacak İşlem
              </th>
              <th className="text-left px-2 py-2 font-medium text-muted-foreground" style={{ width: 150 }}>
                Fason
              </th>
              <th className="text-left px-2 py-2 font-medium text-muted-foreground" style={{ width: 160 }}>
                Durum
              </th>
              <th className="px-2 py-2" style={{ width: 130 }}></th>
            </tr>
          </thead>
          <tbody
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              position: "relative",
              display: "block",
            }}
          >
            {filteredRows.length === 0 ? (
              <tr>
                <td
                  colSpan={14}
                  className="p-8 text-center text-muted-foreground"
                >
                  {hasActiveFilter
                    ? "Filtreyle eşleşen kayıt yok."
                    : "Boyahane kaydı yok."}
                </td>
              </tr>
            ) : (
              rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const r = filteredRows[virtualRow.index];
                const gecen = gecenGun(r.talepTarihi);
                const checked = selectedIds.has(r.id);
                const isReturned = r.durum === "islemden_gelmis";
                const groupIdx = groupIdxByRow[virtualRow.index] ?? 0;
                const isGroupStart =
                  virtualRow.index === 0 ||
                  groupIdxByRow[virtualRow.index - 1] !== groupIdx;

                // Status-bazlı satır tinti — tek bakışta blok blok renk hissi (Excel paterni)
                // selection (checked) bu tinti override eder
                let statusBg: string | undefined;
                if (!checked) {
                  switch (r.durum) {
                    case "islemden_gelmis":
                      statusBg =
                        "color-mix(in oklch, var(--success) 6%, transparent)";
                      break;
                    case "islemden_iade":
                      statusBg =
                        "color-mix(in oklch, var(--destructive) 6%, transparent)";
                      break;
                    case "talimat_atildi":
                      statusBg =
                        "color-mix(in oklch, var(--warning) 6%, transparent)";
                      break;
                    // "islemde" → tint yok (default akış, görsel olarak nötr)
                  }
                }

                // D.Try grup ayracı: 3px renkli üst şerit (mod-numune ile renk kodu hissi)
                const groupBorder =
                  isGroupStart && virtualRow.index > 0
                    ? "inset 0 3px 0 0 color-mix(in oklch, var(--mod-numune) 40%, transparent)"
                    : undefined;

                return (
                  <tr
                    key={r.id}
                    className={cn(
                      "border-b flex absolute top-0 left-0 w-full transition-colors",
                      "hover:bg-muted/50",
                      checked && "bg-indigo-50/60 dark:bg-indigo-950/30"
                    )}
                    style={{
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                      ...(statusBg && { background: statusBg }),
                      ...(groupBorder && { boxShadow: groupBorder }),
                    }}
                  >
                    <td
                      className="px-2 py-1.5 shrink-0 flex items-center"
                      style={{ width: 32 }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleOne(r.id)}
                        className="cursor-pointer"
                      />
                    </td>
                    <td
                      className="px-2 py-1.5 shrink-0 truncate font-mono text-[11px] font-medium flex items-center"
                      style={{ width: 120, color: "var(--mod-boyane)" }}
                    >
                      {r.topNo}
                    </td>
                    <td
                      className="px-2 py-1.5 shrink-0 tabular-nums flex items-center"
                      style={{ width: 90 }}
                    >
                      {r.talepTarihi ? formatTR(r.talepTarihi) : "—"}
                    </td>
                    <td
                      className="px-2 py-1.5 shrink-0 tabular-nums flex items-center"
                      style={{ width: 80 }}
                    >
                      {isReturned ? (
                        <span className="text-muted-foreground">
                          {gecen.text}
                        </span>
                      ) : (
                        <span
                          className={cn(
                            gecen.tone === "red" && "font-semibold",
                            gecen.tone === "amber" && "font-medium",
                            gecen.tone === "default" && "text-muted-foreground"
                          )}
                          style={
                            gecen.tone === "red"
                              ? { color: "var(--destructive)" }
                              : gecen.tone === "amber"
                                ? { color: "var(--warning)" }
                                : undefined
                          }
                        >
                          {gecen.text}
                        </span>
                      )}
                    </td>
                    <td
                      className="px-2 py-1.5 shrink-0 truncate flex items-center"
                      style={{ width: 90 }}
                    >
                      {r.numuneNo ? (
                        <Link
                          href={`/numune-dokuma/${r.numuneNo}`}
                          className="hover:underline font-mono text-[11px] font-medium"
                          style={{ color: "var(--mod-numune)" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {r.numuneNo}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">{r.dTry ?? "—"}</span>
                      )}
                    </td>
                    <td
                      className="px-2 py-1.5 shrink-0 text-right tabular-nums flex items-center justify-end"
                      style={{ width: 60 }}
                    >
                      {r.en ?? "—"}
                    </td>
                    <td
                      className="px-2 py-1.5 shrink-0 text-right tabular-nums flex items-center justify-end"
                      style={{ width: 60 }}
                    >
                      {r.istenenEn ?? "—"}
                    </td>
                    <td
                      className="px-2 py-1.5 shrink-0 text-right tabular-nums flex items-center justify-end"
                      style={{ width: 70 }}
                    >
                      {r.metre ?? "—"}
                    </td>
                    <td
                      className="px-2 py-1.5 shrink-0 text-right tabular-nums flex items-center justify-end"
                      style={{ width: 70 }}
                    >
                      {r.kilo ?? "—"}
                    </td>
                    <td
                      className="px-2 py-1.5 shrink-0 truncate flex items-center"
                      style={{ width: 110 }}
                    >
                      {r.desenNo ?? "—"}
                    </td>
                    <td
                      className="px-2 py-1.5 shrink-0 truncate flex items-center"
                      style={{ width: 280 }}
                      title={r.yapilacakIslem ?? ""}
                    >
                      {r.yapilacakIslem ?? "—"}
                    </td>
                    <td
                      className="px-2 py-1.5 shrink-0 truncate flex items-center text-muted-foreground"
                      style={{ width: 150 }}
                    >
                      {r.fasonFirma ?? "—"}
                    </td>
                    <td
                      className="px-2 py-1.5 shrink-0 flex items-center"
                      style={{ width: 160 }}
                    >
                      <BoyahaneDurumBadge durum={r.durum} size="xs" />
                    </td>
                    <td
                      className="px-2 py-1.5 shrink-0 flex items-center justify-end gap-1"
                      style={{ width: 130 }}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => router.push(`/boyahane/${r.id}`)}
                        title="Detay"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDelete({ id: r.id, topNo: r.topNo });
                        }}
                        disabled={deletingId === r.id}
                        title="Sil"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Dialog
        open={confirmDelete !== null}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <DialogContent className="max-w-md">
          <DangerDialogHeader title="Boyahane partisini sil">
            <strong className="font-mono">{confirmDelete?.topNo}</strong>{" "}
            kalıcı olarak silinecek. Bu işlem geri alınamaz.
          </DangerDialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(null)}
              disabled={deletingId !== null}
            >
              Vazgeç
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deletingId !== null}
            >
              {deletingId ? "Siliniyor..." : "Evet, sil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
