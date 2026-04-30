"use client";

import * as React from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRouter } from "next/navigation";
import { ArrowUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NumuneDurumBadge } from "./NumuneDurumBadge";
import { formatTR } from "@/lib/utils/dates";
import { cn } from "@/lib/utils";
import { NUMUNE_DURUM, numuneDurumLabels } from "../labels";
import type { NumuneListRow } from "../server/queries";

interface Props {
  rows: NumuneListRow[];
  tezgahOptions: string[];
  selectedNumuneNo?: string | null;
  onRowSelect?: (numuneNo: string) => void;
  compact?: boolean;
}

const ALL = "__all__" as const;

export function NumuneListTable({
  rows,
  tezgahOptions,
  selectedNumuneNo,
  onRowSelect,
  compact,
}: Props) {
  const router = useRouter();
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [search, setSearch] = React.useState("");
  const [durumFilter, setDurumFilter] = React.useState<string>("");
  const [tezgahFilter, setTezgahFilter] = React.useState<string>("");

  const hasActiveFilter = Boolean(search || durumFilter || tezgahFilter);

  const filteredRows = React.useMemo(() => {
    const q = search.trim().toLocaleLowerCase("tr-TR");
    return rows.filter((r) => {
      if (durumFilter && r.durum !== durumFilter) return false;
      if (tezgahFilter && r.tezgah !== tezgahFilter) return false;
      if (q) {
        const hay =
          r.numuneNo.toLocaleLowerCase("tr-TR") +
          " " +
          (r.recordNo ?? "").toLocaleLowerCase("tr-TR") +
          " " +
          (r.customerName ?? "").toLocaleLowerCase("tr-TR") +
          " " +
          (r.desen ?? "").toLocaleLowerCase("tr-TR");
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, durumFilter, tezgahFilter]);

  const columns = React.useMemo<ColumnDef<NumuneListRow>[]>(() => {
    return [
      {
        accessorKey: "numuneNo",
        header: ({ column }) => (
          <HeaderButton
            label="Numune No"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          />
        ),
        cell: ({ row }) => {
          const r = row.original;
          const showBadge =
            r.durum === "tamamlandi" || r.durum === "iptal";
          return (
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="font-mono font-semibold tracking-tight"
                style={{ color: "var(--mod-numune)" }}
              >
                {r.numuneNo}
              </span>
              {showBadge && (
                <NumuneDurumBadge
                  durum={r.durum}
                  size="xs"
                  className="shrink-0"
                />
              )}
            </div>
          );
        },
        size: compact ? 130 : 150,
      },
      {
        accessorKey: "date",
        header: ({ column }) => (
          <HeaderButton
            label="Tarih"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          />
        ),
        cell: ({ getValue }) => (
          <span className="tabular-nums">{formatTR(getValue<string>())}</span>
        ),
        size: 90,
      },
      {
        accessorKey: "recordNo",
        header: "CSR / Müşteri",
        cell: ({ row }) => {
          const csr = row.original.recordNo;
          if (!csr) return <span className="text-muted-foreground">—</span>;
          return (
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-sm font-medium">{csr}</span>
              {row.original.customerName && (
                <span className="text-[11px] text-muted-foreground truncate">
                  {row.original.customerName}
                </span>
              )}
            </div>
          );
        },
        size: compact ? 130 : 180,
      },
      {
        accessorKey: "desen",
        header: "Desen",
        cell: ({ getValue }) => (
          <span className="text-sm">{getValue<string | null>() ?? "—"}</span>
        ),
        size: compact ? 130 : 180,
      },
      {
        accessorKey: "tezgah",
        header: "Tezgah",
        cell: ({ getValue }) => (
          <span className="text-sm tabular-nums">
            {getValue<string | null>() ?? "—"}
          </span>
        ),
        size: 100,
      },
      {
        accessorKey: "durum",
        header: ({ column }) => (
          <HeaderButton
            label="Durum"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          />
        ),
        cell: ({ row }) => <NumuneDurumBadge durum={row.original.durum} />,
        size: 140,
      },
      {
        accessorKey: "varyantCount",
        header: "Varyant",
        cell: ({ getValue }) => (
          <span className="text-sm tabular-nums">
            {getValue<number>()} ad.
          </span>
        ),
        size: 90,
      },
    ];
  }, [compact]);

  const table = useReactTable({
    data: filteredRows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const tableContainerRef = React.useRef<HTMLDivElement>(null);
  const { rows: tableRows } = table.getRowModel();

  const totalColumnWidth = React.useMemo(
    () =>
      table.getHeaderGroups()[0]?.headers.reduce((s, h) => s + h.getSize(), 0) ??
      0,
    [table]
  );

  const rowVirtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 48,
    overscan: 10,
  });

  function handleClearFilters() {
    setSearch("");
    setDurumFilter("");
    setTezgahFilter("");
  }

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Input
          placeholder="Numune no, CSR, müşteri, desen ara..."
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
            {NUMUNE_DURUM.map((d) => (
              <SelectItem key={d} value={d}>
                {numuneDurumLabels[d]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={tezgahFilter || ALL}
          onValueChange={(v) => setTezgahFilter(!v || v === ALL ? "" : v)}
        >
          <SelectTrigger className="h-9 w-[140px]">
            <SelectValue placeholder="Tezgah" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tezgah: Tümü</SelectItem>
            {tezgahOptions.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleClearFilters}
          disabled={!hasActiveFilter}
          title="Filtreleri temizle"
        >
          <X className="h-4 w-4" />
          Temizle
        </Button>
        <span className="text-xs text-muted-foreground ml-auto tabular-nums">
          {tableRows.length} / {rows.length} numune
        </span>
      </div>

      <div
        ref={tableContainerRef}
        className="flex-1 overflow-auto rounded-md border bg-card"
      >
        <table
          className="text-sm"
          style={{ tableLayout: "fixed", width: totalColumnWidth }}
        >
          <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur border-b">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    style={{ width: header.getSize() }}
                    className="text-left px-3 py-2 font-medium text-muted-foreground"
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              position: "relative",
              display: "block",
            }}
          >
            {tableRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="p-8 text-center text-muted-foreground"
                >
                  {hasActiveFilter
                    ? "Filtreyle eşleşen numune yok. Temizle ile tüm listeye dön."
                    : "Numune kaydı yok. Sağ üstten yeni numune ekleyebilirsin."}
                </td>
              </tr>
            ) : (
              rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const row = tableRows[virtualRow.index];
                const numuneNo = row.original.numuneNo;
                const durum = row.original.durum;
                const isSelected = selectedNumuneNo === numuneNo;
                const handleClick = () => {
                  if (onRowSelect) onRowSelect(numuneNo);
                  else router.push(`/numune-dokuma/${numuneNo}`);
                };
                return (
                  <tr
                    key={row.id}
                    data-numune-no={numuneNo}
                    onClick={handleClick}
                    onDoubleClick={() =>
                      router.push(`/numune-dokuma/${numuneNo}`)
                    }
                    className={cn(
                      "cursor-pointer border-b transition-colors",
                      "absolute top-0 left-0 w-full flex",
                      !isSelected && "hover:bg-muted/40",
                      durum === "tamamlandi" && !isSelected && "opacity-70",
                      durum === "iptal" && !isSelected && "opacity-60"
                    )}
                    style={{
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                      ...(isSelected && {
                        background:
                          "color-mix(in oklch, var(--mod-numune) 12%, transparent)",
                        boxShadow:
                          "inset 3px 0 0 0 var(--mod-numune), 0 0 24px -8px color-mix(in oklch, var(--mod-numune) 40%, transparent)",
                      }),
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        style={{ width: cell.column.getSize() }}
                        className="px-3 py-2 truncate shrink-0 flex items-center"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HeaderButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="-ml-2 h-7 font-medium"
    >
      {label}
      <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
    </Button>
  );
}
