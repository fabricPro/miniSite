import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { FinalStatus } from "../types";

const LABELS: Record<FinalStatus, string> = {
  open: "Açık",
  closed: "Kapalı",
  cancelled: "İptal",
};

const COLORS: Record<FinalStatus, string> = {
  open: "bg-indigo-600 hover:bg-indigo-600 text-white",
  closed: "bg-green-600 hover:bg-green-600 text-white",
  cancelled: "bg-slate-400 hover:bg-slate-400 text-white",
};

interface Props {
  status: FinalStatus | string | null;
  size?: "xs" | "sm";
  className?: string;
}

export function StatusBadge({ status, size = "sm", className }: Props) {
  const s = (status ?? "open") as FinalStatus;
  const sizeClass =
    size === "xs"
      ? "px-1.5 py-0 text-[10px] font-medium leading-4"
      : undefined;
  return (
    <Badge
      variant="outline"
      className={cn("border-0", COLORS[s] ?? COLORS.open, sizeClass, className)}
    >
      {LABELS[s] ?? s}
    </Badge>
  );
}
