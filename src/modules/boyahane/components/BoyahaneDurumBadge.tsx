import { SoftBadge } from "@/modules/shared/ui/SoftBadge";
import {
  boyahaneDurumLabels,
  isBoyahaneDurum,
  type BoyahaneDurum,
} from "../labels";

const COLOR_VAR: Record<BoyahaneDurum, string> = {
  talimat_atildi: "var(--muted-foreground)",
  islemde: "var(--mod-boyane)", // hot orange (modül rengi)
  islemden_gelmis: "var(--success)", // yeşil
  islemden_iade: "var(--destructive)", // kırmızı (urgency)
};

interface Props {
  durum: BoyahaneDurum | string | null;
  size?: "xs" | "sm";
  className?: string;
}

export function BoyahaneDurumBadge({ durum, size = "sm", className }: Props) {
  const d = isBoyahaneDurum(durum) ? durum : "talimat_atildi";
  return (
    <SoftBadge
      color={COLOR_VAR[d]}
      size={size}
      className={className}
      withDot
      withGlow={d === "islemden_iade"}
    >
      {boyahaneDurumLabels[d]}
    </SoftBadge>
  );
}
