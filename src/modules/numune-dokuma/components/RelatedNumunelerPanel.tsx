import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatTR } from "@/lib/utils/dates";
import { NumuneDurumBadge } from "./NumuneDurumBadge";
import type { RelatedNumuneRow } from "../server/queries";

interface Props {
  recordNo: string;
  numuneler: RelatedNumuneRow[];
}

export function RelatedNumunelerPanel({ recordNo, numuneler }: Props) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-muted-foreground">
          İlgili Numuneler
          <span className="ml-2 text-xs tabular-nums">
            ({numuneler.length})
          </span>
        </h3>
        <Button
          variant="outline"
          size="sm"
          render={
            <Link
              href={`/numune-dokuma/yeni?csr=${encodeURIComponent(recordNo)}`}
            />
          }
        >
          <Plus className="h-4 w-4" />
          Yeni Numune
        </Button>
      </div>

      {numuneler.length === 0 ? (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Bu kayda bağlı numune yok. &quot;Yeni Numune&quot; ile başla.
        </div>
      ) : (
        <ul className="space-y-2">
          {numuneler.map((n) => (
            <li
              key={n.id}
              className="flex items-center gap-3 rounded-md border bg-card p-3 text-sm hover:bg-muted/40 transition-colors"
            >
              <span className="font-medium text-indigo-600 dark:text-indigo-400 tabular-nums shrink-0">
                {n.numuneNo}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums shrink-0 w-16">
                {formatTR(n.date)}
              </span>
              <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                <NumuneDurumBadge durum={n.durum} size="xs" />
                {n.tezgah && (
                  <span className="text-xs">
                    Tezgah <strong>{n.tezgah}</strong>
                  </span>
                )}
                {n.desen && (
                  <span className="text-xs text-muted-foreground truncate">
                    {n.desen}
                  </span>
                )}
                <span className="text-xs tabular-nums text-muted-foreground">
                  {n.varyantCount} varyant
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                render={<Link href={`/numune-dokuma/${n.numuneNo}`} />}
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
