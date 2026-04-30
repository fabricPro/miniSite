"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Package2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { DangerDialogHeader } from "@/components/ui/danger-dialog-header";
import { formatTR } from "@/lib/utils/dates";
import { BoyahaneDurumBadge } from "./BoyahaneDurumBadge";
import { BulkTopDialog } from "./BulkTopDialog";
import { deleteBoyahaneParti } from "../server/actions";
import type { RelatedBoyahaneRow } from "../server/queries";

interface NumuneRef {
  id: string;
  numuneNo: string;
  hamEn: number | null;
  mamulEn: number | null;
}

interface Props {
  numune: NumuneRef;
  partileri: RelatedBoyahaneRow[];
  fasonOptions: string[];
}

export function RelatedBoyahanePanel({
  numune,
  partileri,
  fasonOptions,
}: Props) {
  const router = useRouter();
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<{
    id: string;
    topNo: string;
  } | null>(null);

  async function handleDelete() {
    if (!confirmDelete) return;
    setPendingId(confirmDelete.id);
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
      setPendingId(null);
    }
  }

  return (
    <section>
      <div className="flex items-center justify-end mb-3">
        <BulkTopDialog
          numune={numune}
          fasonOptions={fasonOptions}
          trigger={
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4" />
              Top Ekle
            </Button>
          }
        />
      </div>

      {partileri.length === 0 ? (
        <EmptyState
          icon={Package2}
          iconColor="var(--mod-boyane)"
          title="Bu numune için top yok"
          description="KK barkodlarını &ldquo;Top Ekle&rdquo; ile tek seferde ekleyebilirsin."
        />
      ) : (
        <ul className="space-y-2">
          {partileri.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 rounded-md border bg-card p-3 text-sm hover:bg-muted/40 transition-colors"
            >
              <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400 shrink-0 w-28 truncate">
                {p.topNo}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums shrink-0 w-16">
                {p.talepTarihi ? formatTR(p.talepTarihi) : "—"}
              </span>
              <BoyahaneDurumBadge durum={p.durum} size="xs" />
              <div className="flex-1 min-w-0 truncate text-xs">
                {p.yapilacakIslem && (
                  <span className="text-muted-foreground">
                    {p.yapilacakIslem}
                  </span>
                )}
              </div>
              {p.fasonFirma && (
                <span className="text-[11px] text-muted-foreground shrink-0 hidden md:inline">
                  {p.fasonFirma}
                </span>
              )}
              {p.metre && (
                <span className="text-xs tabular-nums text-muted-foreground shrink-0">
                  {p.metre} mt
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                render={<Link href={`/boyahane/${p.id}`} />}
                className="h-7 w-7 p-0 shrink-0"
                title="Detay"
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setConfirmDelete({ id: p.id, topNo: p.topNo })
                }
                disabled={pendingId === p.id}
                className="h-7 w-7 p-0 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                title="Sil"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {/* Confirm delete dialog */}
      <Dialog
        open={confirmDelete !== null}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <DialogContent className="max-w-md">
          <DangerDialogHeader title="Topu sil">
            <strong className="font-mono">{confirmDelete?.topNo}</strong>{" "}
            kalıcı olarak silinecek. Bu işlem geri alınamaz.
          </DangerDialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(null)}
              disabled={pendingId !== null}
            >
              Vazgeç
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={pendingId !== null}
            >
              {pendingId ? "Siliniyor..." : "Evet, sil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
