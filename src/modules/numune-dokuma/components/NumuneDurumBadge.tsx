import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { numuneDurumLabels, type NumuneDurum } from "../labels";

const COLORS: Record<NumuneDurum, string> = {
  acik: "bg-slate-500 hover:bg-slate-500 text-white",
  dokumada: "bg-indigo-600 hover:bg-indigo-600 text-white",
  kalite_kontrolde: "bg-amber-500 hover:bg-amber-500 text-white",
  tamamlandi: "bg-green-600 hover:bg-green-600 text-white",
  iptal: "bg-zinc-400 hover:bg-zinc-400 text-white",
};

interface Props {
  durum: NumuneDurum | string | null;
  size?: "xs" | "sm";
  className?: string;
}

export function NumuneDurumBadge({ durum, size = "sm", className }: Props) {
  const d = (durum ?? "acik") as NumuneDurum;
  const sizeClass =
    size === "xs"
      ? "px-1.5 py-0 text-[10px] font-medium leading-4"
      : undefined;
  return (
    <Badge
      variant="outline"
      className={cn("border-0", COLORS[d] ?? COLORS.acik, sizeClass, className)}
    >
      {numuneDurumLabels[d] ?? d}
    </Badge>
  );
}
