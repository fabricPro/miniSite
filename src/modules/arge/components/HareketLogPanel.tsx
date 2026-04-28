"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatTR } from "@/lib/utils/dates";
import { deleteHareketLog } from "../server/actions";
import { HareketLogDialog } from "./HareketLogDialog";
import type { HareketLogRow } from "../server/queries";
import type { ActionTypeOption } from "../server/queries";

interface Props {
  recordNo: string;
  logs: HareketLogRow[];
  actionTypes: ActionTypeOption[];
}

export function HareketLogPanel({ recordNo, logs, actionTypes }: Props) {
  const router = useRouter();
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  async function handleDelete(id: string) {
    setPendingId(id);
    try {
      const result = await deleteHareketLog(id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Log silindi");
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-muted-foreground">
          Hareket Logu
          <span className="ml-2 text-xs tabular-nums">
            ({logs.length})
          </span>
        </h3>
        <HareketLogDialog recordNo={recordNo} actionTypes={actionTypes} />
      </div>

      {logs.length === 0 ? (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Henüz log kaydı yok. &quot;Log ekle&quot; ile ilk kaydı oluştur.
        </div>
      ) : (
        <ul className="space-y-2">
          {logs.map((log) => (
            <li
              key={log.id}
              className="flex items-start gap-3 rounded-md border bg-card p-3 text-sm"
            >
              <span className="tabular-nums text-xs text-muted-foreground shrink-0 w-16 pt-0.5">
                {formatTR(log.logDate)}
              </span>
              <div className="flex-1 min-w-0">
                {log.actionTypeNameTr ? (
                  <p className="font-medium">{log.actionTypeNameTr}</p>
                ) : (
                  <p className="text-muted-foreground italic">
                    (işlem tipi belirtilmemiş)
                  </p>
                )}
                {log.description && (
                  <p className="text-muted-foreground mt-0.5 whitespace-pre-wrap break-words">
                    {log.description}
                  </p>
                )}
                {log.creatorName && (
                  <p className="text-[11px] text-muted-foreground/70 mt-1">
                    {log.creatorName}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(log.id)}
                disabled={pendingId === log.id}
                className="shrink-0 text-muted-foreground hover:text-destructive"
                title="Log'u sil"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
