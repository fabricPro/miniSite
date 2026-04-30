"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ChevronDown,
  ExternalLink,
  History,
  Layers3,
  ScrollText,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/modules/shared/ui/StatusBadge";
import { RemainingDaysBadge } from "@/modules/shared/ui/RemainingDaysBadge";
import { formatTRLong } from "@/lib/utils/dates";
import { ArgeForm } from "./ArgeForm";
import { HareketLogPanel } from "./HareketLogPanel";
import { RelatedNumunelerPanel } from "@/modules/numune-dokuma/components/RelatedNumunelerPanel";
import type { RelatedNumuneRow } from "@/modules/numune-dokuma/server/queries";
import { deleteArgeTalebi, updateArgeTalebi } from "../server/actions";
import type { CreateArgeInput } from "../schemas";
import type {
  ActionTypeOption,
  HareketLogRow,
} from "../server/queries";
import type {
  FinalStatus,
  DyeType,
  BinaryStatus,
  LabWorkStatus,
  YarnStatus,
  WarpStatus,
} from "@/modules/shared/types";

interface CustomerOption {
  id: string;
  name: string;
}

interface ArgeRecord {
  id: string;
  recordNo: string;
  arrivalDate: string;
  dueDate: string;
  completionDate: string | null;
  customerId: string | null;
  fabricNameCode: string | null;
  variantCount: number | null;
  requestedWidthCm: number | null;
  weightGsm: string | null;
  weaveType: string | null;
  dyeType: string | null;
  analysisStatus: string | null;
  labWorkStatus: string | null;
  priceStatus: string | null;
  yarnStatus: string | null;
  warpStatus: string | null;
  finishingProcess: string | null;
  finalStatus: string;
  note: string | null;
}

interface Props {
  record: ArgeRecord;
  customerName: string | null;
  customers: CustomerOption[];
  logs: HareketLogRow[];
  actionTypes: ActionTypeOption[];
  relatedNumuneler?: RelatedNumuneRow[];
  onClose?: () => void;
}

export function ArgeDetailPanel({
  record,
  customerName,
  customers,
  logs,
  actionTypes,
  relatedNumuneler = [],
  onClose,
}: Props) {
  const router = useRouter();

  const defaults = React.useMemo<Partial<CreateArgeInput>>(
    () => ({
      arrivalDate: record.arrivalDate,
      dueDate: record.dueDate,
      customerId: record.customerId ?? undefined,
      finalStatus: (record.finalStatus as FinalStatus) ?? "open",
      completionDate: record.completionDate ?? undefined,
      fabricNameCode: record.fabricNameCode,
      variantCount: record.variantCount ?? undefined,
      requestedWidthCm: record.requestedWidthCm ?? undefined,
      weightGsm:
        record.weightGsm !== null && record.weightGsm !== ""
          ? (Number(record.weightGsm) as number)
          : undefined,
      weaveType: record.weaveType,
      dyeType: (record.dyeType as DyeType | null) ?? undefined,
      analysisStatus: (record.analysisStatus as BinaryStatus | null) ?? undefined,
      labWorkStatus: (record.labWorkStatus as LabWorkStatus | null) ?? undefined,
      priceStatus: record.priceStatus,
      yarnStatus: (record.yarnStatus as YarnStatus | null) ?? undefined,
      warpStatus: (record.warpStatus as WarpStatus | null) ?? undefined,
      finishingProcess: record.finishingProcess,
      note: record.note,
    }),
    [record]
  );

  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, startDelete] = React.useTransition();

  async function handleSubmit(values: CreateArgeInput) {
    const result = await updateArgeTalebi({ ...values, recordNo: record.recordNo });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`${record.recordNo} güncellendi`);
    router.refresh();
  }

  function handleDelete() {
    startDelete(async () => {
      const result = await deleteArgeTalebi(record.recordNo);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`${record.recordNo} silindi`);
      setDeleteOpen(false);
      // Two-pane'de seçili kaydı kapat + listeyi yenile, tam sayfadaysan /arge'ye dön
      router.push("/arge");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col h-full bg-card">
      {/* HEADER — Ar-Ge modül rengi (cyan) glow + büyük mono recordNo */}
      <header
        className="relative px-5 py-5 border-b border-border overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in oklch, var(--mod-arge) 12%, var(--card)) 0%, var(--card) 70%)",
        }}
      >
        <div
          className="absolute -top-12 -right-12 w-48 h-48 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklch, var(--mod-arge) 30%, transparent), transparent 70%)",
          }}
          aria-hidden
        />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-3 flex-wrap">
              <h3
                className="text-3xl font-bold font-mono tracking-tight leading-none"
                style={{ color: "var(--mod-arge)" }}
              >
                {record.recordNo}
              </h3>
              <StatusBadge status={record.finalStatus} />
              <RemainingDaysBadge
                dueDate={record.dueDate}
                completionDate={record.completionDate}
              />
            </div>
            <div className="mt-2 flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {customerName ?? "Müşteri atanmamış"}
              </span>
              <span className="text-muted-foreground/50">·</span>
              <span>
                Geliş <strong className="text-foreground">{formatTRLong(record.arrivalDate)}</strong>
              </span>
              <span className="text-muted-foreground/50">→</span>
              <span>
                Termin <strong className="text-foreground">{formatTRLong(record.dueDate)}</strong>
              </span>
            </div>
          </div>
          <div className="relative flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              title="Tam sayfa görünüm"
              render={<Link href={`/arge/${record.recordNo}`} />}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <DialogTrigger
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Kaydı sil"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  />
                }
              >
                <Trash2 className="h-4 w-4" />
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <div className="flex items-start gap-3">
                    <div
                      className="grid place-items-center h-9 w-9 rounded-full shrink-0 mt-0.5"
                      style={{
                        background:
                          "color-mix(in oklch, var(--destructive) 14%, transparent)",
                      }}
                    >
                      <AlertTriangle
                        className="h-4 w-4"
                        style={{ color: "var(--destructive)" }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <DialogTitle>Kaydı sil</DialogTitle>
                      <DialogDescription>
                        <strong className="font-mono">{record.recordNo}</strong>{" "}
                        kaydı ve bu kayda bağlı tüm hareket logu kalıcı olarak
                        silinecek. Bu işlem geri alınamaz.
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setDeleteOpen(false)}
                    disabled={deleting}
                  >
                    Vazgeç
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? "Siliniyor..." : "Evet, sil"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                title="Kapat (Esc)"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* CONTENT — kart yapısı */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-background/40">
        {/* Section 1: Detay Formu */}
        <section className="rounded-xl border border-border/60 bg-card overflow-hidden">
          <Collapsible defaultOpen>
            <CollapsibleTrigger
              render={
                <button
                  type="button"
                  className="group flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
                />
              }
            >
              <div className="flex items-center gap-2">
                <ScrollText
                  className="h-4 w-4"
                  style={{ color: "var(--mod-arge)" }}
                />
                <span className="text-sm font-semibold">Detay Formu</span>
              </div>
              <ChevronDown
                className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[panel-open]:rotate-180"
                aria-hidden="true"
              />
            </CollapsibleTrigger>
            <CollapsiblePanel>
              <div className="px-4 pb-4 pt-2 border-t border-border/60">
                <ArgeForm
                  key={record.recordNo}
                  customers={customers}
                  defaultValues={defaults}
                  onSubmit={handleSubmit}
                  submitLabel="Güncelle"
                />
              </div>
            </CollapsiblePanel>
          </Collapsible>
        </section>

        {/* Section 2: Hareket Logu */}
        <section className="rounded-xl border border-border/60 bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <History
              className="h-4 w-4"
              style={{ color: "var(--mod-arge)" }}
            />
            <h3 className="text-sm font-semibold">Hareket Logu</h3>
            <span className="text-xs tabular-nums text-muted-foreground">
              ({logs.length})
            </span>
          </div>
          <HareketLogPanel
            recordNo={record.recordNo}
            logs={logs}
            actionTypes={actionTypes}
          />
        </section>

        {/* Section 3: İlgili Numuneler */}
        <section className="rounded-xl border border-border/60 bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Layers3
              className="h-4 w-4"
              style={{ color: "var(--mod-numune)" }}
            />
            <h3 className="text-sm font-semibold">İlgili Numuneler</h3>
            <span className="text-xs tabular-nums text-muted-foreground">
              ({relatedNumuneler.length})
            </span>
          </div>
          <RelatedNumunelerPanel
            recordNo={record.recordNo}
            numuneler={relatedNumuneler}
          />
        </section>
      </div>
    </div>
  );
}
