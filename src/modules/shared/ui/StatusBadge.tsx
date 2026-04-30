import { SoftBadge } from "./SoftBadge";
import type { FinalStatus } from "../types";

const LABELS: Record<FinalStatus, string> = {
  open: "Açık",
  closed: "Kapalı",
  cancelled: "İptal",
};

const COLOR_VAR: Record<FinalStatus, string> = {
  open: "var(--mod-arge)", // cyan-blue (Ar-Ge modülünün rengi)
  closed: "var(--success)", // yeşil
  cancelled: "var(--muted-foreground)", // muted gri
};

interface Props {
  status: FinalStatus | string | null;
  size?: "xs" | "sm";
  className?: string;
}

export function StatusBadge({ status, size = "sm", className }: Props) {
  const s = (status ?? "open") as FinalStatus;
  return (
    <SoftBadge
      color={COLOR_VAR[s] ?? COLOR_VAR.open}
      size={size}
      className={className}
      withDot
    >
      {LABELS[s] ?? s}
    </SoftBadge>
  );
}
