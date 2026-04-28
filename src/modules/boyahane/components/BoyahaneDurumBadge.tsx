import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  boyahaneDurumLabels,
  durumColors,
  isBoyahaneDurum,
  type BoyahaneDurum,
} from "../labels";

interface Props {
  durum: BoyahaneDurum | string | null;
  size?: "xs" | "sm";
  className?: string;
}

export function BoyahaneDurumBadge({ durum, size = "sm", className }: Props) {
  const d = isBoyahaneDurum(durum) ? durum : "talimat_atildi";
  const sizeClass =
    size === "xs"
      ? "px-1.5 py-0 text-[10px] font-medium leading-4"
      : undefined;
  return (
    <Badge
      variant="outline"
      className={cn("border-0", durumColors[d], sizeClass, className)}
    >
      {boyahaneDurumLabels[d]}
    </Badge>
  );
}
