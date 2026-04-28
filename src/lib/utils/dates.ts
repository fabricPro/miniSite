import { differenceInCalendarDays, format, isWeekend, addDays } from "date-fns";
import { tr } from "date-fns/locale";

export function formatTR(d: Date | string | null | undefined): string {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  return format(date, "dd.MM.yy", { locale: tr });
}

export function formatTRLong(d: Date | string | null | undefined): string {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  return format(date, "dd MMMM yyyy", { locale: tr });
}

export function networkDays(start: Date, end: Date): number {
  if (start > end) return -networkDays(end, start);
  let days = 0;
  let current = new Date(start);
  while (current <= end) {
    if (!isWeekend(current)) days++;
    current = addDays(current, 1);
  }
  return days;
}

export function remainingDaysLabel(
  dueDate: Date | string | null,
  completionDate: Date | string | null
): { value: number | null; label: string; color: "green" | "yellow" | "red" | "gray" } {
  if (completionDate) {
    return { value: null, label: "Tamamlandı", color: "gray" };
  }
  if (!dueDate) return { value: null, label: "-", color: "gray" };

  const due = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diff = differenceInCalendarDays(due, today);

  if (diff < 0) return { value: diff, label: `${Math.abs(diff)} gün gecikme`, color: "red" };
  if (diff < 7) return { value: diff, label: `${diff} gün kaldı`, color: "yellow" };
  return { value: diff, label: `${diff} gün kaldı`, color: "green" };
}

export function lastActionLabel(lastActionDate: Date | string | null): string {
  if (!lastActionDate) return "-";
  const d = typeof lastActionDate === "string" ? new Date(lastActionDate) : lastActionDate;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = differenceInCalendarDays(today, d);
  if (diff === 0) return "BUGÜN";
  return `${diff} gün önce`;
}

export function weekLabel(arrival: Date | string, due: Date | string): string {
  const a = typeof arrival === "string" ? new Date(arrival) : arrival;
  const d = typeof due === "string" ? new Date(due) : due;
  const total = networkDays(a, d);
  const weeks = Math.floor(total / 5);
  const days = total % 5;
  if (weeks === 0) return `${days} gün`;
  if (days === 0) return `${weeks} hafta`;
  return `${weeks} hafta ${days} gün`;
}
