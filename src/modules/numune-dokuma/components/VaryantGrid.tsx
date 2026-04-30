"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  addVaryant,
  deleteVaryant,
  updateVaryant,
} from "../server/actions";
import type { NumuneAtilim, NumuneVaryant } from "@/lib/db/schema";

interface Props {
  numune: Pick<
    NumuneAtilim,
    "id" | "atki1" | "atki2" | "atki3" | "atki4" | "atki5" | "atki6" | "atki7" | "atki8"
  >;
  varyantlar: NumuneVaryant[];
}

type RenkKey = "renk1" | "renk2" | "renk3" | "renk4" | "renk5" | "renk6" | "renk7" | "renk8";
type CellKey = RenkKey | "metre";

const RENK_KEYS: RenkKey[] = [
  "renk1",
  "renk2",
  "renk3",
  "renk4",
  "renk5",
  "renk6",
  "renk7",
  "renk8",
];

const ATKI_KEYS = [
  "atki1",
  "atki2",
  "atki3",
  "atki4",
  "atki5",
  "atki6",
  "atki7",
  "atki8",
] as const;

const NUMERIC_KEYS: CellKey[] = ["metre"];

const CELL_LABELS: Record<CellKey, string> = {
  renk1: "Renk 1",
  renk2: "Renk 2",
  renk3: "Renk 3",
  renk4: "Renk 4",
  renk5: "Renk 5",
  renk6: "Renk 6",
  renk7: "Renk 7",
  renk8: "Renk 8",
  metre: "Metre",
};

/** Numune'de dolu olan en yüksek atki indeksini bul → kaç renk kolonu göstereceğimiz. */
function activeAtkiCount(numune: Props["numune"]): number {
  let count = 1;
  for (let i = ATKI_KEYS.length - 1; i >= 0; i--) {
    const v = numune[ATKI_KEYS[i]];
    if (v != null && String(v).trim() !== "") {
      count = i + 1;
      break;
    }
  }
  return Math.max(1, count);
}

export function VaryantGrid({ numune, varyantlar }: Props) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [editingCell, setEditingCell] = React.useState<{
    id: string;
    key: CellKey;
  } | null>(null);
  const [editingValue, setEditingValue] = React.useState("");

  // Tab navigasyonu sırasında "blur → cancel + commit" zincirinin yanlış
  // tetiklenmesini engellemek için ref kullanıyoruz.
  const skipBlurRef = React.useRef(false);

  const renkColCount = activeAtkiCount(numune);
  const visibleRenkKeys = RENK_KEYS.slice(0, renkColCount);

  // Tab order için flat liste: her varyant için [renk1..renkN, metre]
  const cellOrder = React.useMemo(() => {
    const list: { vId: string; key: CellKey }[] = [];
    for (const v of varyantlar) {
      for (const k of visibleRenkKeys) list.push({ vId: v.id, key: k });
      list.push({ vId: v.id, key: "metre" });
    }
    return list;
  }, [varyantlar, visibleRenkKeys]);

  function rawCellValue(v: NumuneVaryant, key: CellKey): string {
    const raw = v[key];
    return raw === null || raw === undefined ? "" : String(raw);
  }

  function startEdit(v: NumuneVaryant, key: CellKey) {
    setEditingCell({ id: v.id, key });
    setEditingValue(rawCellValue(v, key));
  }

  function cancelEdit() {
    setEditingCell(null);
    setEditingValue("");
  }

  /**
   * Mevcut değeri kaydet (async). Tab/blur/Enter sırasında çağrılır.
   * `nextEdit` verilirse save'i fire-and-forget yapar ve hemen yeni hücreye geçer.
   */
  function commitEdit(
    v: NumuneVaryant,
    nextEdit?: { vId: string; key: CellKey } | null
  ) {
    if (!editingCell) return;
    const key = editingCell.key;
    const newRaw = editingValue.trim();
    const oldStr = rawCellValue(v, key);

    // Değişiklik yoksa save'i atla
    const changed = newRaw !== oldStr;

    if (changed) {
      const payload: Record<string, unknown> = {
        id: v.id,
        varyantNo: v.varyantNo,
        renk1: v.renk1,
        renk2: v.renk2,
        renk3: v.renk3,
        renk4: v.renk4,
        renk5: v.renk5,
        renk6: v.renk6,
        renk7: v.renk7,
        renk8: v.renk8,
        metre: v.metre,
      };
      payload[key] = NUMERIC_KEYS.includes(key)
        ? newRaw === ""
          ? ""
          : Number(newRaw.replace(",", "."))
        : newRaw;

      startTransition(async () => {
        const result = await updateVaryant(payload);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        // Sessiz toast — Tab navigasyonu sırasında her hücrede gürültü yapma
        if (!nextEdit) {
          toast.success(`${v.varyantNo} · ${CELL_LABELS[key]} güncellendi`);
        }
        router.refresh();
      });
    }

    if (nextEdit) {
      const nextV = varyantlar.find((x) => x.id === nextEdit.vId);
      if (nextV) {
        setEditingCell({ id: nextEdit.vId, key: nextEdit.key });
        setEditingValue(rawCellValue(nextV, nextEdit.key));
      } else {
        cancelEdit();
      }
    } else {
      cancelEdit();
    }
  }

  /** Tab basıldığında bir sonraki/önceki hücreyi bul. Satır sonu → sonraki satır. */
  function neighborCell(
    direction: 1 | -1
  ): { vId: string; key: CellKey } | null {
    if (!editingCell) return null;
    const idx = cellOrder.findIndex(
      (c) => c.vId === editingCell.id && c.key === editingCell.key
    );
    if (idx === -1) return null;
    const nextIdx = idx + direction;
    if (nextIdx < 0 || nextIdx >= cellOrder.length) return null;
    return cellOrder[nextIdx];
  }

  function handleDelete(v: NumuneVaryant) {
    if (!confirm(`${v.varyantNo} silinecek. Emin misin?`)) return;
    startTransition(async () => {
      const result = await deleteVaryant(v.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`${v.varyantNo} silindi`);
      router.refresh();
    });
  }

  function handleAdd() {
    startTransition(async () => {
      const result = await addVaryant(numune.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`${result.data.varyantNo} eklendi`);
      router.refresh();
    });
  }

  function renderCell(v: NumuneVaryant, key: CellKey) {
    const isEditing = editingCell?.id === v.id && editingCell.key === key;
    const raw = v[key];
    const display =
      raw === null || raw === undefined || raw === "" ? "—" : String(raw);

    if (isEditing) {
      return (
        <Input
          autoFocus
          value={editingValue}
          onChange={(e) => setEditingValue(e.target.value)}
          onBlur={() => {
            // Tab navigasyonu kendi state geçişini yapacak — blur'ı yoksay
            if (skipBlurRef.current) {
              skipBlurRef.current = false;
              return;
            }
            commitEdit(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitEdit(v);
            } else if (e.key === "Escape") {
              e.preventDefault();
              cancelEdit();
            } else if (e.key === "Tab") {
              e.preventDefault();
              const next = neighborCell(e.shiftKey ? -1 : 1);
              if (next) {
                skipBlurRef.current = true;
                commitEdit(v, next);
              } else {
                // Liste sınırı — son hücredeysen sadece commit + çık
                commitEdit(v);
              }
            }
          }}
          className="h-7 px-2 py-0 text-xs"
        />
      );
    }

    return (
      <button
        type="button"
        onClick={() => startEdit(v, key)}
        className={cn(
          "h-7 px-2 w-full text-left text-xs rounded hover:bg-muted/40 transition-colors truncate",
          display === "—" && "text-muted-foreground italic"
        )}
        title={display}
      >
        {display}
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAdd}
          disabled={pending}
        >
          <Plus className="h-4 w-4" />
          Varyant Ekle
        </Button>
      </div>

      <div className="rounded-md border bg-card overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/60 border-b">
            <tr>
              <th className="text-left px-2 py-2 font-medium text-muted-foreground w-14">
                Varyant
              </th>
              {visibleRenkKeys.map((k, i) => (
                <th
                  key={k}
                  className="text-left px-2 py-2 font-medium text-muted-foreground"
                >
                  Renk {i + 1}
                </th>
              ))}
              <th className="text-left px-2 py-2 font-medium text-muted-foreground w-20">
                Metre
              </th>
              <th className="text-right px-2 py-2 font-medium text-muted-foreground w-16">
                İşlem
              </th>
            </tr>
          </thead>
          <tbody>
            {varyantlar.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleRenkKeys.length + 3}
                  className="p-6 text-center text-muted-foreground"
                >
                  Henüz varyant yok. &quot;Varyant Ekle&quot; ile başla.
                </td>
              </tr>
            ) : (
              varyantlar.map((v) => (
                <tr key={v.id} className="border-b last:border-b-0">
                  <td className="px-2 py-1 font-medium tabular-nums">
                    {v.varyantNo}
                  </td>
                  {visibleRenkKeys.map((k) => (
                    <td key={k} className="px-1 py-1">
                      {renderCell(v, k)}
                    </td>
                  ))}
                  <td className="px-1 py-1">{renderCell(v, "metre")}</td>
                  <td className="px-1 py-1">
                    <div className="flex items-center justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        tabIndex={-1}
                        className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(v)}
                        disabled={pending}
                        title="Sil"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
