"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, ExternalLink, FileDown, Trash2, X } from "lucide-react";
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
import { formatTRLong } from "@/lib/utils/dates";
import { NumuneForm } from "./NumuneForm";
import { VaryantGrid } from "./VaryantGrid";
import { NumuneDurumBadge } from "./NumuneDurumBadge";
import { RelatedBoyahanePanel } from "@/modules/boyahane/components/RelatedBoyahanePanel";
import type { RelatedBoyahaneRow } from "@/modules/boyahane/server/queries";
import { deleteNumune, updateNumune } from "../server/actions";
import type { CreateNumuneInput } from "../schemas";
import type { NumuneAtilim, NumuneVaryant } from "@/lib/db/schema";

interface CsrOption {
  recordNo: string;
  customerName: string | null;
}

interface Props {
  numune: NumuneAtilim;
  customerName: string | null;
  varyantlar: NumuneVaryant[];
  csrOptions: CsrOption[];
  boyahanePartileri?: RelatedBoyahaneRow[];
  fasonOptions?: string[];
  onClose?: () => void;
}

export function NumuneDetailPanel({
  numune,
  customerName,
  varyantlar,
  csrOptions,
  boyahanePartileri = [],
  fasonOptions = [],
  onClose,
}: Props) {
  const router = useRouter();

  const defaults = React.useMemo<Partial<CreateNumuneInput>>(
    () => ({
      recordNo: numune.recordNo,
      date: numune.date,
      tezgah: numune.tezgah,
      desen: numune.desen,
      siklik: numune.siklik,
      rapor: numune.rapor,
      cozguAdi: numune.cozguAdi,
      atki1: numune.atki1 ?? "",
      atki2: numune.atki2,
      atki3: numune.atki3,
      atki4: numune.atki4,
      atki5: numune.atki5,
      atki6: numune.atki6,
      atki7: numune.atki7,
      atki8: numune.atki8,
      iro1: numune.iro1 ?? null,
      iro2: numune.iro2 ?? null,
      iro3: numune.iro3 ?? null,
      iro4: numune.iro4 ?? null,
      iro5: numune.iro5 ?? null,
      iro6: numune.iro6 ?? null,
      iro7: numune.iro7 ?? null,
      iro8: numune.iro8 ?? null,
      aciklama: numune.aciklama,
      kg:
        numune.kg !== null && numune.kg !== ""
          ? Number(numune.kg)
          : undefined,
      hamEn: numune.hamEn ?? undefined,
      mamulEn: numune.mamulEn ?? undefined,
      durum: (numune.durum as CreateNumuneInput["durum"]) ?? "acik",
      completionDate: numune.completionDate ?? undefined,
    }),
    [numune]
  );

  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, startDelete] = React.useTransition();

  async function handleSubmit(values: CreateNumuneInput) {
    const result = await updateNumune({
      ...values,
      numuneNo: numune.numuneNo,
    });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`${numune.numuneNo} güncellendi`);
    router.refresh();
  }

  function handleDelete() {
    startDelete(async () => {
      const result = await deleteNumune(numune.numuneNo);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`${numune.numuneNo} silindi`);
      setDeleteOpen(false);
      router.push("/numune-dokuma");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col h-full">
      <header className="px-5 py-4 border-b bg-muted/30">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-2xl font-semibold tracking-tight">
                {numune.numuneNo}
              </h3>
              <NumuneDurumBadge durum={numune.durum} />
              {numune.tezgah && (
                <span className="rounded-md bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                  Tezgah {numune.tezgah}
                </span>
              )}
              {numune.desen && (
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {numune.desen}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground truncate">
              {formatTRLong(numune.date)}
              {numune.recordNo && (
                <>
                  {" · "}
                  <Link
                    href={`/arge/${numune.recordNo}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {numune.recordNo}
                  </Link>
                  {customerName && ` · ${customerName}`}
                </>
              )}
              {!numune.recordNo && " · CSR atanmamış"}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              title="PDF indir (dokuma için)"
              render={
                <Link
                  href={`/api/numune-dokuma/${encodeURIComponent(
                    numune.numuneNo
                  )}/pdf`}
                  target="_blank"
                />
              }
            >
              <FileDown className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              title="Tam sayfa görünüm"
              render={<Link href={`/numune-dokuma/${numune.numuneNo}`} />}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <DialogTrigger
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Numuneyi sil"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  />
                }
              >
                <Trash2 className="h-4 w-4" />
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Numune sil</DialogTitle>
                  <DialogDescription>
                    <strong>{numune.numuneNo}</strong> ve {varyantlar.length}{" "}
                    varyantı kalıcı olarak silinecek. Bu işlem geri alınamaz.
                  </DialogDescription>
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

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
        <Collapsible defaultOpen>
          <CollapsibleTrigger
            render={
              <button
                type="button"
                className="group flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 -mx-2 text-left hover:bg-muted/50 transition-colors"
              />
            }
          >
            <span className="text-sm font-medium text-muted-foreground">
              Numune Bilgileri
            </span>
            <ChevronDown
              className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[panel-open]:rotate-180"
              aria-hidden="true"
            />
          </CollapsibleTrigger>
          <CollapsiblePanel>
            <div className="pt-4">
              <NumuneForm
                key={numune.numuneNo}
                csrOptions={csrOptions}
                defaultValues={defaults}
                onSubmit={handleSubmit}
                submitLabel="Güncelle"
              />
            </div>
          </CollapsiblePanel>
        </Collapsible>

        <div className="border-t pt-6">
          <VaryantGrid numune={numune} varyantlar={varyantlar} />
        </div>
        <div className="border-t pt-6">
          <RelatedBoyahanePanel
            numune={{
              id: numune.id,
              numuneNo: numune.numuneNo,
              hamEn: numune.hamEn,
              mamulEn: numune.mamulEn,
            }}
            partileri={boyahanePartileri}
            fasonOptions={fasonOptions}
          />
        </div>
      </div>
    </div>
  );
}
