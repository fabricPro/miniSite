import { SoftBadge } from "@/modules/shared/ui/SoftBadge";
import { numuneDurumLabels, type NumuneDurum } from "../labels";

const COLOR_VAR: Record<NumuneDurum, string> = {
  acik: "var(--muted-foreground)",
  dokumada: "var(--mod-numune)", // electric purple
  kalite_kontrolde: "var(--warning)", // amber
  tamamlandi: "var(--success)", // yeşil
  iptal: "var(--muted-foreground)",
};

interface Props {
  durum: NumuneDurum | string | null;
  size?: "xs" | "sm";
  className?: string;
}

export function NumuneDurumBadge({ durum, size = "sm", className }: Props) {
  const d = (durum ?? "acik") as NumuneDurum;
  return (
    <SoftBadge
      color={COLOR_VAR[d] ?? COLOR_VAR.acik}
      size={size}
      className={className}
      withDot
    >
      {numuneDurumLabels[d] ?? d}
    </SoftBadge>
  );
}
