import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { remainingDaysLabel } from "@/lib/utils/dates";

interface Props {
  dueDate: Date | string | null;
  completionDate: Date | string | null;
}

const colorMap = {
  green: "bg-green-600 hover:bg-green-600 text-white",
  yellow: "bg-amber-500 hover:bg-amber-500 text-white",
  red: "bg-red-600 hover:bg-red-600 text-white",
  gray: "bg-slate-400 hover:bg-slate-400 text-white",
};

export function RemainingDaysBadge({ dueDate, completionDate }: Props) {
  const { label, color } = remainingDaysLabel(dueDate, completionDate);
  return (
    <Badge variant="outline" className={cn("border-0", colorMap[color])}>
      {label}
    </Badge>
  );
}
