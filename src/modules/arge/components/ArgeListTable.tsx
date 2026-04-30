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
import { StatusBadge } from "@/modules/shared/ui/StatusBadge";
import { RemainingDaysBadge } from "@/modules/shared/ui/RemainingDaysBadge";
import { formatTR, lastActionLabel } from "@/lib/utils/dates";
import { cn } from "@/lib/utils";
import type { ArgeListRow } from "../server/queries";

interface CustomerOption {
  id: string;
  name: string;
}

interface Props {
  rows: ArgeListRow[];
  /** Durum + müşteri filtreleri için müşteri listesi */
  customerOptions: CustomerOption[];
  /** Seçili kaydın recordNo'su — two-pane modunda satır highlight için */
  selectedRecordNo?: string | null;
  /** Satır seçilince çağrılır. Verilmezse /arge/[recordNo]'ya router.push edilir. */
  onRowSelect?: (recordNo: string) => void;
  /** Two-pane modunda kompakt görünüm için bazı kolonları gizle */
  compact?: boolean;
}

const ALL = "__all__" as const;

export function ArgeListTable({
  rows,
  customerOptions,
  selectedRecordNo,
  onRowSelect,
  compact,
}: Props) {
  const router = useRouter();
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("");
  const [customerFilter, setCustomerFilter] = React.useState<string>("");

  const hasActiveFilter = Boolean(search || statusFilter || customerFilter);

  const filteredRows = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter && r.finalStatus !== statusFilter) return false;
      if (customerFilter && r.customerId !== customerFilter) return false;
      if (q) {
        const hay =
          r.recordNo.toLowerCase() +
          " " +
          (r.customerName ?? "").toLowerCase() +
          " " +
          (r.fabricNameCode ?? "").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, statusFilter, customerFilter]);

  const columns = React.useMemo<ColumnDef<ArgeListRow>[]>(() => {
    const base: ColumnDef<ArgeListRow>[] = [
      {
        accessorKey: "recordNo",
        header: ({ column }) => (
          <HeaderButton
            label="Kayıt No"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          />
        ),
        cell: ({ row }) => {
          const status = row.original.finalStatus;
          const showStatus = status === "closed" || status === "cancelled";
          return (
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="font-mono font-semibold tracking-tight"
                style={{ color: "var(--mod-arge)" }}
              >
                {row.original.recordNo}
              </span>
              {showStatus && (
                <StatusBadge
                  status={status}
                  size="xs"
                  className="shrink-0"
                />
              )}
            </div>
          );
        },
        size: compact ? 130 : 140,
      },
      // Müşteri
      // — geniş ad'lar için (örn. "ANKARA TEKSTİL") rahat genişlik
      {
        accessorKey: "customerName",
        header: ({ column }) => (
          <HeaderButton
            label="Müşteri"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          />
        ),
        cell: ({ getValue }) => (
          <span className="truncate">{getValue<string | null>() ?? "-"}</span>
        ),
        size: compact ? 150 : 220,
      },
      {
        accessorKey: "fabricNameCode",
        header: "Kumaş Adı / Kod",
        cell: ({ getValue }) => (
          <span className="text-sm truncate">
            {getValue<string | null>() ?? "-"}
          </span>
        ),
        size: compact ? 170 : 260,
      },
      {
        accessorKey: "arrivalDate",
        header: ({ column }) => (
          <HeaderButton
            label="Geliş"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          />
        ),
        cell: ({ getValue }) => (
          <span className="tabular-nums">{formatTR(getValue<string>())}</span>
        ),
        size: 100,
      },
      {
        accessorKey: "dueDate",
        header: ({ column }) => (
          <HeaderButton
            label="Termin"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          />
        ),
        cell: ({ getValue }) => (
          <span className="tabular-nums">{formatTR(getValue<string>())}</span>
        ),
        size: 100,
      },
      {
        id: "remaining",
        header: "Kalan",
        cell: ({ row }) => (
          <RemainingDaysBadge
            dueDate={row.original.dueDate}
            completionDate={row.original.completionDate}
          />
        ),
        size: 140,
      },
      {
        id: "lastAction",
        header: "Son İşlem",
        cell: ({ row }) => {
          const { lastActionName, lastActionDate } = row.original;
          if (!lastActionName && !lastActionDate) {
            return <span className="text-muted-foreground">—</span>;
          }
          return (
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-sm font-medium truncate">
                {lastActionName ?? "—"}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {lastActionLabel(lastActionDate)}
              </span>
            </div>
          );
        },
        size: compact ? 170 : 240,
      },
    ];
    return base;
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

  // Virtualizer row'lar flex ile layout olurken hücreler w-full içinde shrink
  // oluyor. Column toplamını tabloya min-width olarak verip cell'lere shrink-0
  // ekleyerek squeeze'i engelliyoruz.
  const totalColumnWidth = React.useMemo(
    () => table.getHeaderGroups()[0]?.headers.reduce((s, h) => s + h.getSize(), 0) ?? 0,
    [table]
  );

  const rowVirtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 52,
    overscan: 10,
  });

  function handleClearFilters() {
    setSearch("");
    setStatusFilter("");
    setCustomerFilter("");
  }

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Input
          placeholder="Kayıt no, müşteri, kumaş ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select
          value={statusFilter || ALL}
          onValueChange={(v) => setStatusFilter(!v || v === ALL ? "" : v)}
        >
          <SelectTrigger className="h-9 w-[140px]">
            <SelectValue placeholder="Durum" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Durum: Tümü</SelectItem>
            <SelectItem value="open">Açık</SelectItem>
            <SelectItem value="closed">Kapalı</SelectItem>
            <SelectItem value="cancelled">İptal</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={customerFilter || ALL}
          onValueChange={(v) => setCustomerFilter(!v || v === ALL ? "" : v)}
        >
          <SelectTrigger className="h-9 w-[180px]">
            <SelectValue placeholder="Müşteri" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Müşteri: Tümü</SelectItem>
            {customerOptions.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
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
          {tableRows.length} / {rows.length} kayıt
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
                    ? "Filtreyle eşleşen kayıt yok. Temizle ile tüm listeye dön."
                    : "Kayıt bulunamadı. Sağ üstten yeni Ar-Ge talebi ekleyebilirsin."}
                </td>
              </tr>
            ) : (
              rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const row = tableRows[virtualRow.index];
                const recordNo = row.original.recordNo;
                const status = row.original.finalStatus;
                const isSelected = selectedRecordNo === recordNo;
                const handleClick = () => {
                  if (onRowSelect) onRowSelect(recordNo);
                  else router.push(`/arge/${recordNo}`);
                };
                return (
                  <tr
                    key={row.id}
                    data-record-no={recordNo}
                    onClick={handleClick}
                    onDoubleClick={() => router.push(`/arge/${recordNo}`)}
                    className={cn(
                      "cursor-pointer border-b transition-colors",
                      "absolute top-0 left-0 w-full flex",
                      !isSelected && "hover:bg-muted/40",
                      status === "closed" && !isSelected && "opacity-70",
                      status === "cancelled" && !isSelected && "opacity-60"
                    )}
                    style={{
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                      ...(isSelected && {
                        background:
                          "color-mix(in oklch, var(--mod-arge) 12%, transparent)",
                        boxShadow:
                          "inset 3px 0 0 0 var(--mod-arge), 0 0 24px -8px color-mix(in oklch, var(--mod-arge) 40%, transparent)",
                      }),
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        style={{ width: cell.column.getSize() }}
                        className="px-3 py-2 truncate shrink-0"
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
