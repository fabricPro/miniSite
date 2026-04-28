"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArgeListTable } from "./ArgeListTable";
import { ArgeDetailPanel } from "./ArgeDetailPanel";
import type {
  ActionTypeOption,
  ArgeListRow,
  HareketLogRow,
} from "../server/queries";
import type { RelatedNumuneRow } from "@/modules/numune-dokuma/server/queries";

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

interface SelectedPayload {
  record: ArgeRecord;
  customerName: string | null;
  logs: HareketLogRow[];
  relatedNumuneler: RelatedNumuneRow[];
}

interface Props {
  rows: ArgeListRow[];
  customers: CustomerOption[];
  actionTypes: ActionTypeOption[];
  selected: SelectedPayload | null;
  /** URL'de ?csr= geldi ama kayıt bulunamadı (silinmiş / yanlış) */
  notFound?: boolean;
}

export function ArgeTwoPane({
  rows,
  customers,
  actionTypes,
  selected,
  notFound,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedRecordNo = selected?.record.recordNo ?? null;

  const setSelected = React.useCallback(
    (recordNo: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (recordNo) params.set("csr", recordNo);
      else params.delete("csr");
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  // Klavye: Esc = seçimi kapat
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Formda yazarken Esc'i form kullansın (ör. select açıkken)
      const target = e.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      if (e.key === "Escape" && selectedRecordNo) {
        e.preventDefault();
        setSelected(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedRecordNo, setSelected]);

  const hasSelection = selected !== null;

  return (
    <div className="flex-1 min-h-0 flex gap-4">
      {/* Sol pane (40%) — lg+'da hep görünür (seçim yoksa hint); mobile'da seçim varsa görünür */}
      <aside
        className={cn(
          "lg:flex lg:w-[44%] xl:w-[40%] rounded-md border bg-card overflow-hidden",
          hasSelection ? "flex w-full" : "hidden"
        )}
      >
        {selected ? (
          <ArgeDetailPanel
            record={selected.record}
            customerName={selected.customerName}
            customers={customers}
            logs={selected.logs}
            actionTypes={actionTypes}
            relatedNumuneler={selected.relatedNumuneler}
            onClose={() => setSelected(null)}
          />
        ) : (
          <EmptyDetail notFound={notFound} />
        )}
      </aside>

      {/* Sağ pane (60%) — sağ tablo */}
      <section
        className={cn(
          "flex-1 min-w-0",
          hasSelection ? "hidden lg:flex lg:flex-col" : "flex flex-col"
        )}
      >
        {hasSelection && (
          <div className="lg:hidden mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelected(null)}
            >
              <PanelRightClose className="h-4 w-4" />
              Listeye dön
            </Button>
          </div>
        )}
        <ArgeListTable
          rows={rows}
          customerOptions={customers}
          selectedRecordNo={selectedRecordNo}
          onRowSelect={setSelected}
          compact
        />
      </section>
    </div>
  );
}

function EmptyDetail({ notFound }: { notFound?: boolean }) {
  return (
    <div className="hidden lg:flex flex-1 flex-col items-center justify-center p-8 text-center">
      <PanelRightOpen className="h-10 w-10 text-muted-foreground/50 mb-3" />
      {notFound ? (
        <>
          <p className="text-sm font-medium">Kayıt bulunamadı</p>
          <p className="text-xs text-muted-foreground mt-1">
            URL&apos;deki CSR numarası silinmiş veya yanlış olabilir. Listeden bir
            kayıt seç.
          </p>
        </>
      ) : (
        <>
          <p className="text-sm font-medium">Detay için bir kayıt seç</p>
          <p className="text-xs text-muted-foreground mt-1">
            Sağdaki listeden satıra tıkla. Çift tık ile tam sayfa görünüme geç.
          </p>
          <p className="text-[11px] text-muted-foreground/70 mt-3">
            Esc ile seçimi kapat
          </p>
        </>
      )}
    </div>
  );
}
