import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  /** Lucide ikon bileşeni */
  icon?: LucideIcon;
  /** Ana başlık (büyük) */
  title: string;
  /** Açıklama (alt metin, opsiyonel) */
  description?: string;
  /** Sağ alt CTA — Button vs. */
  action?: React.ReactNode;
  /** İkon rengi — varsayılan muted */
  iconColor?: string;
  className?: string;
}

/**
 * Modern empty state — ikon + başlık + alt metin + opsiyonel CTA.
 * Kullanım: liste boş, log yok, "henüz veri girilmemiş" durumlarında.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  iconColor,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 py-10 flex flex-col items-center justify-center text-center",
        className
      )}
    >
      {Icon && (
        <div
          className="grid place-items-center h-12 w-12 rounded-full mb-3"
          style={{
            background: iconColor
              ? `color-mix(in oklch, ${iconColor} 15%, transparent)`
              : "var(--muted)",
          }}
        >
          <Icon
            className="h-6 w-6"
            style={
              iconColor
                ? { color: iconColor }
                : { color: "var(--muted-foreground)" }
            }
            strokeWidth={2}
          />
        </div>
      )}
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description && (
        <p className="mt-1 text-xs text-muted-foreground max-w-sm">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
