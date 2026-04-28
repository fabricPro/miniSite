"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NumuneListTable } from "./NumuneListTable";
import { NumuneDetailPanel } from "./NumuneDetailPanel";
import type { NumuneListRow } from "../server/queries";
import type { NumuneAtilim, NumuneVaryant } from "@/lib/db/schema";
import type { RelatedBoyahaneRow } from "@/modules/boyahane/server/queries";

interface CsrOption {
  recordNo: string;
  customerName: string | null;
}

interface SelectedPayload {
  numune: NumuneAtilim;
  customerName: string | null;
  varyantlar: NumuneVaryant[];
  boyahanePartileri: RelatedBoyahaneRow[];
}

interface Props {
  rows: NumuneListRow[];
  tezgahOptions: string[];
  csrOptions: CsrOption[];
  fasonOptions?: string[];
  selected: SelectedPayload | null;
  notFound?: boolean;
}

export function NumuneTwoPane({
  rows,
  tezgahOptions,
  csrOptions,
  fasonOptions = [],
  selected,
  notFound,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedNumuneNo = selected?.numune.numuneNo ?? null;

  const setSelected = React.useCallback(
    (numuneNo: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (numuneNo) params.set("n", numuneNo);
      else params.delete("n");
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      if (e.key === "Escape" && selectedNumuneNo) {
        e.preventDefault();
        setSelected(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedNumuneNo, setSelected]);

  const hasSelection = selected !== null;

  return (
    <div className="flex-1 min-h-0 flex gap-4">
      <aside
        className={cn(
          "lg:flex lg:w-[44%] xl:w-[40%] rounded-md border bg-card overflow-hidden",
          hasSelection ? "flex w-full" : "hidden"
        )}
      >
        {selected ? (
          <NumuneDetailPanel
            numune={selected.numune}
            customerName={selected.customerName}
            varyantlar={selected.varyantlar}
            csrOptions={csrOptions}
            boyahanePartileri={selected.boyahanePartileri}
            fasonOptions={fasonOptions}
            onClose={() => setSelected(null)}
          />
        ) : (
          <EmptyDetail notFound={notFound} />
        )}
      </aside>

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
        <NumuneListTable
          rows={rows}
          tezgahOptions={tezgahOptions}
          selectedNumuneNo={selectedNumuneNo}
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
          <p className="text-sm font-medium">Numune bulunamadı</p>
          <p className="text-xs text-muted-foreground mt-1">
            URL&apos;deki numune numarası silinmiş veya yanlış olabilir.
            Listeden bir numune seç.
          </p>
        </>
      ) : (
        <>
          <p className="text-sm font-medium">Detay için bir numune seç</p>
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
