import { SoftBadge } from "./SoftBadge";
import { remainingDaysLabel } from "@/lib/utils/dates";

interface Props {
  dueDate: Date | string | null;
  completionDate: Date | string | null;
}

const COLOR_VAR: Record<string, string> = {
  green: "var(--success)",
  yellow: "var(--warning)",
  red: "var(--destructive)",
  gray: "var(--muted-foreground)",
};

export function RemainingDaysBadge({ dueDate, completionDate }: Props) {
  const { label, color } = remainingDaysLabel(dueDate, completionDate);
  return (
    <SoftBadge
      color={COLOR_VAR[color] ?? COLOR_VAR.gray}
      withDot
      withGlow={color === "red"}
    >
      {label}
    </SoftBadge>
  );
}
